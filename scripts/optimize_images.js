const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TARGET_DIRS = ['image', 'public', 'godot_dinofraction'];
const IGNORE_PATTERNS = ['node_modules', '.next', '.git', '.vercel', 'dist', 'build', '.import'];

function getAllImageFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (IGNORE_PATTERNS.some(ign => fullPath.includes(ign))) continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllImageFiles(fullPath, fileList);
    } else if (/\.(png|jpg|jpeg|webp)$/i.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function optimizeImage(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const originalBuffer = fs.readFileSync(filePath);
    const originalSize = originalBuffer.length;

    let pipeline = sharp(originalBuffer);

    let optimizedBuffer;
    if (ext === '.png') {
      // 1) 고품질 팔레트 양자화 시도 (알파 채널 보존, 화질 90)
      const quantBuffer = await sharp(originalBuffer)
        .png({
          compressionLevel: 9,
          effort: 7,
          palette: true,
          quality: 90
        })
        .toBuffer()
        .catch(() => null);

      // 2) 완전 무손실 압축 시도 (Deflate level 9)
      const losslessBuffer = await sharp(originalBuffer)
        .png({
          compressionLevel: 9,
          effort: 7,
          palette: false
        })
        .toBuffer()
        .catch(() => null);

      // 둘 중 더 작으면서 유효한 버퍼 선택
      if (quantBuffer && losslessBuffer) {
        optimizedBuffer = quantBuffer.length < losslessBuffer.length ? quantBuffer : losslessBuffer;
      } else {
        optimizedBuffer = quantBuffer || losslessBuffer;
      }
    } else if (ext === '.jpg' || ext === '.jpeg') {
      optimizedBuffer = await sharp(originalBuffer)
        .jpeg({
          quality: 85,
          mozjpeg: true
        })
        .toBuffer();
    } else if (ext === '.webp') {
      optimizedBuffer = await sharp(originalBuffer)
        .webp({
          quality: 85,
          effort: 6
        })
        .toBuffer();
    }

    if (optimizedBuffer && optimizedBuffer.length < originalSize) {
      fs.writeFileSync(filePath, optimizedBuffer);
      return {
        path: filePath,
        originalSize,
        optimizedSize: optimizedBuffer.length,
        saved: originalSize - optimizedBuffer.length,
        status: 'optimized'
      };
    } else {
      return {
        path: filePath,
        originalSize,
        optimizedSize: originalSize,
        saved: 0,
        status: 'skipped'
      };
    }
  } catch (err) {
    return {
      path: filePath,
      error: err.message,
      status: 'error'
    };
  }
}

async function run() {
  console.log('=== Dino Fractions 게임 이미지 전수 최적화 시작 ===');
  let allFiles = [];
  for (const dir of TARGET_DIRS) {
    const files = getAllImageFiles(dir);
    allFiles = allFiles.concat(files);
  }

  console.log(`총 발견된 이미지 파일: ${allFiles.length}개`);
  
  let totalOriginal = 0;
  let totalOptimized = 0;
  let optimizedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const CONCURRENCY = 16;
  for (let i = 0; i < allFiles.length; i += CONCURRENCY) {
    const batch = allFiles.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(f => optimizeImage(f)));

    for (const res of results) {
      if (res.status === 'optimized') {
        totalOriginal += res.originalSize;
        totalOptimized += res.optimizedSize;
        optimizedCount++;
      } else if (res.status === 'skipped') {
        totalOriginal += res.originalSize;
        totalOptimized += res.optimizedSize;
        skippedCount++;
      } else if (res.status === 'error') {
        errorCount++;
        console.error(`[Error] ${res.path}: ${res.error}`);
      }
    }

    if ((i + batch.length) % 100 === 0 || (i + batch.length) >= allFiles.length) {
      const currentIdx = Math.min(i + batch.length, allFiles.length);
      const progressPct = ((currentIdx / allFiles.length) * 100).toFixed(1);
      console.log(`[진행률 ${progressPct}%] ${currentIdx}/${allFiles.length} 처리 완료...`);
    }
  }

  const savedBytes = totalOriginal - totalOptimized;
  const savedMB = (savedBytes / (1024 * 1024)).toFixed(2);
  const origMB = (totalOriginal / (1024 * 1024)).toFixed(2);
  const optMB = (totalOptimized / (1024 * 1024)).toFixed(2);
  const savedPct = totalOriginal > 0 ? ((savedBytes / totalOriginal) * 100).toFixed(1) : 0;

  console.log('\n================== 최적화 완료 결과 ==================');
  console.log(`최적화 적용: ${optimizedCount}개`);
  console.log(`이미 최적 상태 유지: ${skippedCount}개`);
  console.log(`오류: ${errorCount}개`);
  console.log(`처리 전 총 용량: ${origMB} MB`);
  console.log(`최적화 후 총 용량: ${optMB} MB`);
  console.log(`절감된 용량: ${savedMB} MB (${savedPct}% 감소) 🚀`);
  console.log('=======================================================');
}

run();
