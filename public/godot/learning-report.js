(function () {
  "use strict";

  const PROBLEM_TYPES = [
    { key: "진분수+진분수", label: "진분수 덧셈", domain: "진분수의 덧셈" },
    { key: "진분수+진분수_합1초과", label: "합이 1을 넘는 진분수 덧셈", domain: "진분수의 덧셈" },
    { key: "진분수-진분수", label: "진분수 뺄셈", domain: "진분수의 뺄셈" },
    { key: "1-진분수", label: "1 - 진분수", domain: "자연수 - 분수의 뺄셈" },
    { key: "자연수-진분수", label: "자연수 - 진분수", domain: "자연수 - 분수의 뺄셈" },
    { key: "자연수-대분수", label: "자연수 - 대분수", domain: "자연수 - 분수의 뺄셈" },
    { key: "대분수+대분수", label: "대분수 덧셈", domain: "대분수의 덧셈" },
    { key: "대분수-대분수", label: "대분수 뺄셈", domain: "대분수의 뺄셈" },
    { key: "대분수-대분수(받아내림)", label: "받아내림이 있는 대분수 뺄셈", domain: "대분수의 뺄셈" }
  ];

  const DOMAINS = [
    "진분수의 덧셈",
    "진분수의 뺄셈",
    "자연수 - 분수의 뺄셈",
    "대분수의 덧셈",
    "대분수의 뺄셈"
  ];

  const DENOMINATORS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15];
  const DEFAULT_UPLOAD_URL = "https://samboard.vivasam.com/studentEntry/?brdId=brd-0RCJWNN7N34NC";
  const SCRIPT_BASE_URL = new URL(
    ".",
    document.currentScript?.src || window.location.href
  ).href;
  const PDF_VENDOR_SCRIPTS = {
    html2canvas: new URL("vendor/html2canvas-1.4.1.min.js", SCRIPT_BASE_URL).href,
    jspdf: new URL("vendor/jspdf-4.2.1.umd.min.js", SCRIPT_BASE_URL).href
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function hashSeed(input) {
    let hash = 2166136261;
    const text = String(input);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return function () {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  function pick(rng, values) {
    return values[randomInt(rng, 0, values.length - 1)];
  }

  function fraction(whole, num, den) {
    return { kind: "fraction", whole, num, den };
  }

  function number(value) {
    return { kind: "number", value };
  }

  function operator(value) {
    return { kind: "operator", value };
  }

  function worksheetProblem(tokens, totalNumerator, denominator) {
    const whole = Math.floor(totalNumerator / denominator);
    const numerator = totalNumerator % denominator;
    return {
      tokens,
      answer: numerator === 0
        ? { whole, num: 0, den: 1 }
        : { whole, num: numerator, den: denominator }
    };
  }

  function generateProblem(type, rng) {
    const den = pick(rng, DENOMINATORS);
    let n1;
    let n2;
    let w1;
    let w2;

    switch (type) {
      case "진분수+진분수":
        n1 = randomInt(rng, 1, den - 2);
        n2 = randomInt(rng, 1, den - 1 - n1);
        return worksheetProblem([fraction(0, n1, den), operator("+"), fraction(0, n2, den)], n1 + n2, den);
      case "진분수+진분수_합1초과":
        n1 = randomInt(rng, 2, den - 1);
        n2 = randomInt(rng, den - n1 + 1, den - 1);
        return worksheetProblem([fraction(0, n1, den), operator("+"), fraction(0, n2, den)], n1 + n2, den);
      case "진분수-진분수":
        n1 = randomInt(rng, 2, den - 1);
        n2 = randomInt(rng, 1, n1 - 1);
        return worksheetProblem([fraction(0, n1, den), operator("−"), fraction(0, n2, den)], n1 - n2, den);
      case "1-진분수":
        n1 = randomInt(rng, 1, den - 1);
        return worksheetProblem([number(1), operator("−"), fraction(0, n1, den)], den - n1, den);
      case "자연수-진분수":
        w1 = randomInt(rng, 2, 6);
        n1 = randomInt(rng, 1, den - 1);
        return worksheetProblem([number(w1), operator("−"), fraction(0, n1, den)], w1 * den - n1, den);
      case "자연수-대분수":
        w1 = randomInt(rng, 3, 7);
        w2 = randomInt(rng, 1, w1 - 2);
        n2 = randomInt(rng, 1, den - 1);
        return worksheetProblem([number(w1), operator("−"), fraction(w2, n2, den)], w1 * den - (w2 * den + n2), den);
      case "대분수+대분수":
        w1 = randomInt(rng, 1, 4);
        w2 = randomInt(rng, 1, 4);
        n1 = randomInt(rng, 1, den - 1);
        n2 = randomInt(rng, 1, den - 1);
        return worksheetProblem([fraction(w1, n1, den), operator("+"), fraction(w2, n2, den)], (w1 + w2) * den + n1 + n2, den);
      case "대분수-대분수(받아내림)":
        w1 = randomInt(rng, 2, 6);
        w2 = randomInt(rng, 1, w1 - 1);
        n1 = randomInt(rng, 1, den - 2);
        n2 = randomInt(rng, n1 + 1, den - 1);
        return worksheetProblem([fraction(w1, n1, den), operator("−"), fraction(w2, n2, den)], (w1 - w2) * den + n1 - n2, den);
      case "대분수-대분수":
      default:
        w1 = randomInt(rng, 2, 6);
        w2 = randomInt(rng, 1, w1 - 1);
        n1 = randomInt(rng, 1, den - 1);
        n2 = randomInt(rng, 1, n1);
        return worksheetProblem([fraction(w1, n1, den), operator("−"), fraction(w2, n2, den)], (w1 - w2) * den + n1 - n2, den);
    }
  }

  function getTypeStats(payload) {
    const correct = payload.correctByType || {};
    const wrong = payload.wrongByType || {};
    return PROBLEM_TYPES.map((type) => {
      const correctCount = Number(correct[type.key] || 0);
      const wrongCount = Number(wrong[type.key] || 0);
      const total = correctCount + wrongCount;
      return {
        ...type,
        correct: correctCount,
        wrong: wrongCount,
        total,
        accuracy: total > 0 ? Math.round((correctCount / total) * 100) : null
      };
    });
  }

  function getDomainStats(typeStats) {
    return DOMAINS.map((name) => {
      const children = typeStats.filter((item) => item.domain === name);
      const correct = children.reduce((sum, item) => sum + item.correct, 0);
      const wrong = children.reduce((sum, item) => sum + item.wrong, 0);
      const total = correct + wrong;
      return { name, children, correct, wrong, total, accuracy: total ? correct / total : null };
    });
  }

  function allocateQuestions(domainStats, totalQuestions) {
    const hasErrors = domainStats.some((domain) => domain.wrong > 0);
    let eligible = domainStats.filter((domain) => hasErrors ? domain.wrong > 0 : domain.total > 0);
    if (!eligible.length) eligible = domainStats;

    const weighted = eligible.map((domain) => {
      const weakness = domain.total ? 1 - domain.correct / domain.total : 0;
      const weight = hasErrors ? domain.wrong * 4 + weakness * 2 : Math.max(1, domain.total);
      return { domain, weight };
    });
    const weightSum = weighted.reduce((sum, item) => sum + item.weight, 0);
    const rows = weighted.map((item) => {
      const exact = (item.weight / weightSum) * totalQuestions;
      return { ...item, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
    });
    let assigned = rows.reduce((sum, item) => sum + item.count, 0);
    rows.sort((a, b) => b.remainder - a.remainder);
    for (let index = 0; assigned < totalQuestions; index = (index + 1) % rows.length) {
      rows[index].count += 1;
      assigned += 1;
    }
    return rows.filter((item) => item.count > 0);
  }

  function weightedType(rng, domain, hasErrors) {
    const candidates = domain.children;
    const weights = candidates.map((item) => {
      if (hasErrors && domain.wrong > 0) return item.wrong > 0 ? item.wrong : 0;
      return item.total > 0 ? item.total : 1;
    });
    const total = weights.reduce((sum, value) => sum + value, 0);
    let cursor = rng() * total;
    for (let index = 0; index < candidates.length; index += 1) {
      cursor -= weights[index];
      if (cursor <= 0) return candidates[index].key;
    }
    return candidates[candidates.length - 1].key;
  }

  function buildWorksheet(payload, typeStats) {
    const domainStats = getDomainStats(typeStats);
    const allocation = allocateQuestions(domainStats, 20);
    const hasErrors = domainStats.some((domain) => domain.wrong > 0);
    const seedSource = JSON.stringify([
      payload.studentName,
      payload.score,
      payload.correctByType,
      payload.wrongByType,
      payload.generatedAt
    ]);
    const rng = seededRandom(hashSeed(seedSource));
    const problems = [];
    const signatures = new Set();

    allocation.forEach(({ domain, count }) => {
      for (let i = 0; i < count; i += 1) {
        const type = weightedType(rng, domain, hasErrors);
        let generated = generateProblem(type, rng);
        let signature = JSON.stringify(generated.tokens);
        let retries = 0;
        while (signatures.has(signature) && retries < 20) {
          generated = generateProblem(type, rng);
          signature = JSON.stringify(generated.tokens);
          retries += 1;
        }
        signatures.add(signature);
        problems.push({ type, domain: domain.name, tokens: generated.tokens, answer: generated.answer });
      }
    });

    for (let i = problems.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [problems[i], problems[j]] = [problems[j], problems[i]];
    }
    return { problems, allocation, hasErrors };
  }

  function renderFraction(token) {
    const whole = token.whole ? `<span class="whole">${token.whole}</span>` : "";
    return `<span class="mixed-number">${whole}<span class="fraction"><span>${token.num}</span><span>${token.den}</span></span></span>`;
  }

  function renderTokens(tokens) {
    return tokens.map((token) => {
      if (token.kind === "fraction") return renderFraction(token);
      return `<span class="math-symbol">${escapeHtml(token.value)}</span>`;
    }).join("");
  }

  function renderAnswer(answer) {
    if (!answer || answer.num === 0) return `<span class="answer-whole">${answer?.whole ?? 0}</span>`;
    return renderFraction(answer);
  }

  function formatDate(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString("ko-KR");
    return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  }

  function safeImageUrl(value) {
    const url = String(value || "");
    if (/^data:image\/(png|jpeg|webp);base64,/i.test(url) || /^https?:\/\//i.test(url) || /^\//.test(url)) {
      return escapeHtml(url);
    }
    return "";
  }

  function safeUploadUrl(value) {
    try {
      const url = new URL(String(value || DEFAULT_UPLOAD_URL), window.location.href);
      return url.protocol === "https:" ? url.href : DEFAULT_UPLOAD_URL;
    } catch (_error) {
      return DEFAULT_UPLOAD_URL;
    }
  }

  function getFallbackTitle(score) {
    if (score >= 3000) return "태양의 분수 신룡";
    if (score >= 1500) return "시간을 다루는 분수 대가";
    if (score >= 700) return "루비 분수 정복자";
    if (score >= 300) return "사파이어 분수 탐험가";
    if (score >= 100) return "에메랄드 분수 사냥꾼";
    return "새싹 분수 탐험가";
  }

  function renderCertificate(payload, typeStats) {
    const total = Number(payload.correctCount || 0) + Number(payload.wrongCount || 0);
    const overall = total ? Math.round((Number(payload.correctCount || 0) / total) * 100) : 0;
    const dino = payload.dinosaur || {};
    const imageUrl = safeImageUrl(dino.imageDataUrl || dino.imageUrl);
    const isDashboard = payload.reportScope === "dashboard";
    const scoreLabel = isDashboard ? "최고 점수" : "최종 점수";
    const scopeLabel = isDashboard ? "학습 대시보드 누적 기준" : "이번 게임 기준";
    const challengeLabel = isDashboard
      ? `누적 ${Number(payload.totalGames || 0).toLocaleString("ko-KR")}회 · ${total}문항 도전`
      : `${total}문항 도전`;
    const statCards = typeStats.map((stat) => {
      const rate = stat.accuracy === null ? "-" : `${stat.accuracy}%`;
      const detail = stat.total ? `${stat.correct}/${stat.total}` : "미출제";
      return `<div class="type-card">
        <div class="type-label">${escapeHtml(stat.label)}</div>
        <div class="type-result"><strong>${rate}</strong><span>${detail}</span></div>
      </div>`;
    }).join("");

    return `<section class="page certificate-page">
      <div class="leaf leaf-a"></div><div class="leaf leaf-b"></div>
      <div class="certificate-frame">
        <div class="eyebrow">DINO FRACTIONS ADVENTURE</div>
        <h1>분수 탐험 인증서</h1>
        <div class="certificate-rule"><span></span><b>ACHIEVEMENT</b><span></span></div>
        <p class="recipient"><strong>${escapeHtml(payload.studentName || "용감한 공룡")}</strong> 탐험가</p>
        <p class="school">${escapeHtml(payload.school || "분수 탐험대")}</p>
        <p class="certificate-copy">분수의 덧셈과 뺄셈 탐험을 끝까지 완주하고<br>끈기 있게 문제를 해결했기에 이 인증서를 수여합니다.</p>

        <div class="hero-row">
          <div class="score-medal">
            <span>${scoreLabel}</span><strong>${Number(payload.score || 0).toLocaleString("ko-KR")}</strong><em>점</em>
          </div>
          <div class="title-block"><span>획득 칭호</span><strong>${escapeHtml(payload.title || getFallbackTitle(Number(payload.score || 0)))}</strong><small>전체 정답률 ${overall}% · ${challengeLabel}</small></div>
          <div class="dino-card">
            ${imageUrl ? `<img src="${imageUrl}" alt="${escapeHtml(dino.name || "최고 등급 공룡")}">` : `<div class="dino-fallback">DINO</div>`}
            <div><span>${escapeHtml(dino.grade || "일반")} 등급</span><strong>${escapeHtml(dino.name || "신비의 공룡")}</strong></div>
          </div>
        </div>

        <div class="section-heading"><span>문제 유형별 정답률</span><small>${scopeLabel}</small></div>
        <div class="type-grid">${statCards}</div>

        <div class="certificate-footer">
          <div><span>발급일</span><strong>${formatDate(payload.generatedAt)}</strong></div>
          <div class="seal"><span>DINO</span><strong>MASTER</strong></div>
          <div><span>인증 기관</span><strong>공룡 분수 탐험대</strong></div>
        </div>
      </div>
    </section>`;
  }

  function renderWorksheet(payload, worksheet) {
    const focus = worksheet.allocation
      .sort((a, b) => b.count - a.count)
      .map((item) => `<span><b>${escapeHtml(item.domain.name)}</b> ${item.count}문항</span>`)
      .join("");
    const problems = worksheet.problems.map((problem, index) => `<div class="question">
      <span class="question-number">${index + 1}.</span>
      <span class="expression">${renderTokens(problem.tokens)}<span class="equals">=</span><span class="answer-blank"></span></span>
    </div>`).join("");
    const answerKey = worksheet.problems.map((problem, index) =>
      `<span class="answer-item"><b>${index + 1}.</b>${renderAnswer(problem.answer)}</span>`
    ).join("");
    const isDashboard = payload.reportScope === "dashboard";
    const guide = worksheet.hasErrors
      ? `${isDashboard ? "학습 대시보드에서" : "이번 게임에서"} 오답이 많았던 영역일수록 더 많이 배정했어요. 풀이 과정을 쓰며 천천히 해결해 보세요.`
      : `${isDashboard ? "누적 학습 기록을" : "이번 게임을"} 바탕으로 도전한 유형을 중심으로 골고루 복습해 보세요.`;

    return `<section class="page worksheet-page">
      <header class="worksheet-header">
        <div><span class="worksheet-kicker">PERSONALIZED PRACTICE</span><h1>나만의 분수 집중 학습지</h1></div>
        <div class="worksheet-meta"><span>이름 <b>${escapeHtml(payload.studentName || "")}</b></span><span>날짜 <b>${formatDate(payload.generatedAt)}</b></span></div>
      </header>
      <div class="practice-guide"><strong>맞춤 출제 안내</strong><p>${guide}</p><div class="focus-list">${focus}</div></div>
      <div class="question-grid">${problems}</div>
      <div class="answer-key"><strong>정답</strong><div class="answer-grid">${answerKey}</div></div>
      <footer class="worksheet-footer"><span>20문항을 모두 풀었다면 다시 계산하여 검산해 보세요.</span><strong>DINO FRACTIONS · 2 / 2</strong></footer>
    </section>`;
  }

  function renderHtml(input, options) {
    const payload = typeof input === "string" ? JSON.parse(input) : (input || {});
    const typeStats = getTypeStats(payload);
    const worksheet = buildWorksheet(payload, typeStats);
    const captureOnly = Boolean(options?.captureOnly);
    const uploadUrl = options?.uploadUrl ? safeUploadUrl(options.uploadUrl) : "";
    const title = `${payload.studentName || "공룡 탐험가"}_분수탐험_인증서_학습지`;
    return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>
    <style>
      :root { --forest:#164e3b; --forest-dark:#0b3025; --mint:#dff5e9; --gold:#e8b648; --ink:#17231e; --muted:#64736b; --paper:#fffef8; }
      * { box-sizing:border-box; }
      html, body { margin:0; padding:0; background:#dce5e0; color:var(--ink); font-family:"Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",Arial,sans-serif; }
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .print-toolbar { position:sticky; top:0; z-index:10; display:flex; justify-content:center; gap:10px; padding:12px; background:#102a21; box-shadow:0 3px 16px #0004; }
      .print-toolbar button { border:0; border-radius:999px; padding:11px 22px; font-weight:800; cursor:pointer; color:white; background:#21845f; }
      .print-toolbar button.secondary { background:#356996; }
      .print-toolbar button.close { background:#52645c; }
      .page { position:relative; width:210mm; height:297mm; margin:10mm auto; overflow:hidden; background:var(--paper); box-shadow:0 8px 30px #0002; page-break-after:always; }
      .page:last-of-type { page-break-after:auto; }
      .certificate-page { padding:12mm; background:linear-gradient(145deg,#fbfff9 0%,#fffdf4 52%,#eff9f2 100%); }
      .certificate-frame { height:100%; border:1.4mm solid var(--forest); outline:.45mm solid var(--gold); outline-offset:-3.2mm; padding:13mm 12mm 9mm; text-align:center; position:relative; z-index:1; }
      .certificate-frame:before { content:""; position:absolute; inset:4mm; border:.3mm solid #b99743; pointer-events:none; }
      .leaf { position:absolute; width:65mm; height:65mm; opacity:.09; background:radial-gradient(ellipse at 50% 100%,transparent 42%,var(--forest) 43% 46%,transparent 47%),repeating-conic-gradient(from 15deg at 50% 100%,var(--forest) 0 5deg,transparent 5deg 18deg); z-index:0; }
      .leaf-a { top:-16mm; left:-22mm; transform:rotate(125deg); } .leaf-b { right:-20mm; bottom:-15mm; transform:rotate(-50deg); }
      .eyebrow { color:var(--forest); font-size:8.5pt; font-weight:900; letter-spacing:2.4px; }
      .certificate-page h1 { margin:4mm 0 1.5mm; font-size:29pt; letter-spacing:-1.2px; color:var(--forest-dark); }
      .certificate-rule { display:flex; align-items:center; justify-content:center; gap:4mm; color:#9a7220; font-size:7.5pt; letter-spacing:1.6px; }
      .certificate-rule span { width:32mm; height:.35mm; background:linear-gradient(90deg,transparent,var(--gold)); } .certificate-rule span:last-child { transform:scaleX(-1); }
      .recipient { margin:6mm 0 0; font-size:13pt; } .recipient strong { font-size:20pt; color:#173e31; border-bottom:.5mm solid var(--gold); padding:0 5mm 1mm; }
      .school { margin:2mm 0; color:var(--muted); font-size:9pt; }
      .certificate-copy { margin:4mm auto 5mm; font-size:10pt; line-height:1.75; color:#435149; }
      .hero-row { display:grid; grid-template-columns:34mm 1fr 48mm; gap:4mm; align-items:stretch; margin:0 auto 5mm; }
      .score-medal { border-radius:50%; aspect-ratio:1; align-self:center; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; background:radial-gradient(circle at 36% 30%,#f9d77d,#c18b22 72%); border:1.5mm solid #f5e4a8; box-shadow:0 1.5mm 0 #8e681e; }
      .score-medal span { font-size:5.5pt; font-weight:800; letter-spacing:.8px; } .score-medal strong { font-size:21pt; line-height:1; } .score-medal em { font-size:7pt; font-style:normal; }
      .title-block { border-radius:4mm; background:#e6f4ec; border:.35mm solid #a9d3bd; padding:4mm; display:flex; flex-direction:column; justify-content:center; }
      .title-block span { color:#4d695b; font-size:7pt; font-weight:800; } .title-block strong { color:var(--forest-dark); font-size:14pt; margin:1.5mm 0; } .title-block small { color:#597166; font-size:7.5pt; }
      .dino-card { border-radius:4mm; overflow:hidden; border:.35mm solid #d8c17e; background:linear-gradient(#fff8d8,#f2f8e8); position:relative; min-height:37mm; }
      .dino-card img { width:100%; height:31mm; object-fit:contain; display:block; padding:1mm 2mm 0; } .dino-card>div { position:absolute; inset:auto 0 0; padding:1.5mm 1mm; color:white; background:linear-gradient(transparent,#153a2e 35%); display:flex; flex-direction:column; }
      .dino-card span { font-size:6pt; color:#ffe08a; font-weight:800; } .dino-card strong { font-size:7.5pt; }
      .dino-fallback { position:static!important; height:100%; display:grid!important; place-items:center; background:#dfece4!important; color:#567064!important; font-weight:900; }
      .section-heading { display:flex; justify-content:space-between; align-items:end; margin:3mm 1mm 2mm; padding-bottom:1.5mm; border-bottom:.55mm solid var(--forest); text-align:left; }
      .section-heading span { font-size:11pt; font-weight:900; color:var(--forest-dark); } .section-heading small { font-size:6.5pt; color:var(--muted); }
      .type-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:2mm; text-align:left; }
      .type-card { min-height:14mm; border:.25mm solid #cfdad3; border-radius:2.5mm; padding:2.4mm 2.8mm; background:#fff; display:flex; align-items:center; justify-content:space-between; gap:2mm; }
      .type-label { font-size:7pt; line-height:1.25; font-weight:750; color:#34483e; }
      .type-result { min-width:15mm; text-align:right; } .type-result strong { display:block; color:#177257; font-size:11pt; } .type-result span { display:block; color:#829087; font-size:5.8pt; }
      .certificate-footer { position:absolute; left:13mm; right:13mm; bottom:10mm; display:grid; grid-template-columns:1fr 26mm 1fr; align-items:center; gap:8mm; text-align:center; }
      .certificate-footer>div:not(.seal) span { display:block; color:#78847e; font-size:6.5pt; } .certificate-footer>div:not(.seal) strong { display:block; margin-top:1mm; font-size:8pt; color:#263c31; }
      .seal { width:24mm; height:24mm; margin:auto; border-radius:50%; border:1.2mm double #c69024; color:#9c6f17; display:flex; flex-direction:column; justify-content:center; transform:rotate(-7deg); }
      .seal span { font-size:6pt; letter-spacing:1px; } .seal strong { font-size:8pt; }
      .worksheet-page { padding:13mm 14mm 10mm; background:#fff; }
      .worksheet-header { display:flex; justify-content:space-between; align-items:end; padding-bottom:4mm; border-bottom:1mm solid var(--forest); }
      .worksheet-kicker { color:#b27c19; font-size:7pt; font-weight:900; letter-spacing:1.4px; }
      .worksheet-header h1 { margin:1mm 0 0; color:var(--forest-dark); font-size:21pt; letter-spacing:-.7px; }
      .worksheet-meta { display:flex; flex-direction:column; gap:2mm; min-width:54mm; font-size:7.5pt; color:#65736b; }
      .worksheet-meta span { border-bottom:.25mm solid #a8b4ad; padding:1mm; } .worksheet-meta b { float:right; color:#22382d; max-width:38mm; overflow:hidden; white-space:nowrap; }
      .practice-guide { margin:4mm 0; border-radius:3mm; background:#edf7f1; border:.3mm solid #b7d8c5; padding:3mm 4mm; }
      .practice-guide>strong { color:#176349; font-size:8.5pt; } .practice-guide p { display:inline; margin-left:2mm; color:#52645a; font-size:7.2pt; }
      .focus-list { display:flex; flex-wrap:wrap; gap:1.3mm 3mm; margin-top:2mm; font-size:6.5pt; color:#476055; } .focus-list span { padding:1mm 2mm; border-radius:99px; background:#fff; border:.2mm solid #c6dbcf; }
      .question-grid { display:grid; grid-template-columns:1fr 1fr; grid-auto-flow:column; grid-template-rows:repeat(10,1fr); column-gap:10mm; height:198mm; border-top:.25mm solid #e2e8e4; }
      .question { display:flex; align-items:center; gap:3mm; border-bottom:.25mm solid #e2e8e4; min-width:0; }
      .question:nth-child(n+11) { border-left:.25mm solid #e2e8e4; padding-left:6mm; }
      .question-number { width:7mm; color:#196349; font-size:9pt; font-weight:900; }
      .expression { flex:1; display:flex; align-items:center; gap:2.4mm; white-space:nowrap; font-family:"Malgun Gothic",Arial,sans-serif; font-size:12pt; }
      .math-symbol { min-width:4mm; text-align:center; }
      .mixed-number { display:inline-flex; align-items:center; gap:1.2mm; }
      .whole { font-size:12pt; }
      .fraction { display:inline-grid; grid-template-rows:1fr 1fr; min-width:7mm; text-align:center; vertical-align:middle; line-height:1.05; font-size:8.5pt; }
      .fraction span:first-child { border-bottom:.35mm solid #17231e; padding:0 .8mm .5mm; } .fraction span:last-child { padding:.5mm .8mm 0; }
      .equals { margin-left:auto; }
      .answer-blank { width:17mm; height:10mm; border-bottom:.45mm solid #243c30; }
      .answer-key { position:absolute; left:14mm; right:14mm; bottom:11mm; min-height:13mm; display:grid; grid-template-columns:11mm 1fr; align-items:center; gap:2mm; padding:1.5mm 2.5mm; border:.25mm solid #d3ded8; border-radius:2mm; background:#f5f9f6; color:#506158; }
      .answer-key>strong { color:#1b5e46; font-size:6.5pt; text-align:center; }
      .answer-grid { display:grid; grid-template-columns:repeat(10,1fr); row-gap:.7mm; column-gap:1mm; font-family:"Malgun Gothic",Arial,sans-serif; font-size:6.76pt; line-height:1.1; white-space:nowrap; }
      .answer-item { display:flex; align-items:center; justify-content:center; gap:.7mm; text-align:center; min-height:4.81mm; }
      .answer-item b { color:#176349; }
      .answer-item .mixed-number { gap:.45mm; }
      .answer-item .whole, .answer-whole { font-size:6.76pt; }
      .answer-item .fraction { min-width:4.42mm; font-size:5.98pt; line-height:1; }
      .answer-item .fraction span:first-child { border-bottom:.22mm solid #31443a; padding:0 .35mm .2mm; }
      .answer-item .fraction span:last-child { padding:.2mm .35mm 0; }
      .worksheet-footer { position:absolute; left:14mm; right:14mm; bottom:4.5mm; display:flex; justify-content:space-between; color:#758179; font-size:6.5pt; }
      .worksheet-footer strong { color:#315646; }
      @page { size:A4 portrait; margin:0; }
      @media print { html,body { background:white; } .print-toolbar { display:none!important; } .page { margin:0; box-shadow:none; } }
      @media screen and (max-width:850px) { .page { transform-origin:top left; margin:0 auto 12px; } }
    </style></head><body>
      ${captureOnly ? "" : `<div class="print-toolbar">
        <button onclick="window.dinoReportPrintAndUpload()">${uploadUrl ? "PDF 저장 후 업로드로 이동" : "PDF로 저장 / 인쇄"}</button>
        ${uploadUrl ? `<button class="secondary" onclick="window.dinoReportOpenUpload()">업로드 페이지만 열기</button>` : ""}
        <button class="close" onclick="window.close()">닫기</button>
      </div>`}
      ${renderCertificate(payload, typeStats)}
      ${renderWorksheet(payload, worksheet)}
      ${captureOnly ? "" : `<script>(function(){
        var uploadUrl=${JSON.stringify(uploadUrl).replaceAll("<", "\\u003c")};
        window.dinoReportOpenUpload=function(){if(uploadUrl){window.open(uploadUrl,"_blank","noopener");}};
        window.dinoReportPrintAndUpload=function(){if(window.opener&&window.opener.DinoLearningReport){window.opener.DinoLearningReport.downloadReport(${JSON.stringify(JSON.stringify(payload)).replaceAll("<", "\\u003c")});}};
      })();<\/script>`}
    </body></html>`;
  }

  function loadScript(url, ready) {
    if (ready()) return Promise.resolve();
    const existing = document.querySelector(`script[data-dino-report-vendor="${url}"]`);
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.dataset.dinoReportVendor = url;
      script.addEventListener("load", () => ready() ? resolve() : reject(new Error(`PDF 모듈을 초기화하지 못했습니다: ${url}`)), { once: true });
      script.addEventListener("error", () => reject(new Error(`PDF 모듈을 불러오지 못했습니다: ${url}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  async function ensurePdfLibraries() {
    await loadScript(PDF_VENDOR_SCRIPTS.html2canvas, () => typeof window.html2canvas === "function");
    await loadScript(PDF_VENDOR_SCRIPTS.jspdf, () => Boolean(window.jspdf?.jsPDF));
  }

  function waitForFrame(frame) {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("PDF 레이아웃을 준비하는 데 시간이 너무 오래 걸립니다.")), 15000);
      frame.addEventListener("load", () => {
        window.clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  }

  async function waitForReportAssets(reportDocument) {
    const images = Array.from(reportDocument.images);
    await Promise.all(images.map((image) => image.complete
      ? Promise.resolve()
      : new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      })));
    if (reportDocument.fonts?.ready) await reportDocument.fonts.ready;
  }

  function makeDownloadFilename(payload) {
    const studentName = String(payload.studentName || "공룡_탐험가")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .trim()
      .slice(0, 40) || "공룡_탐험가";
    return `${studentName}_분수탐험_인증서_학습지.pdf`;
  }

  function showDownloadStatus(message, state) {
    let status = document.getElementById("dino-report-download-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "dino-report-download-status";
      Object.assign(status.style, {
        position: "fixed",
        left: "50%",
        bottom: "28px",
        transform: "translateX(-50%)",
        zIndex: "2147483647",
        maxWidth: "calc(100vw - 32px)",
        padding: "13px 22px",
        borderRadius: "999px",
        color: "#ffffff",
        font: "800 15px 'Malgun Gothic', sans-serif",
        textAlign: "center",
        boxShadow: "0 8px 28px rgba(0,0,0,.35)",
        pointerEvents: "none"
      });
      document.body.appendChild(status);
    }
    status.textContent = message;
    status.style.background = state === "error" ? "#b4232f" : state === "success" ? "#147a55" : "#173f32";
    status.hidden = false;
    window.clearTimeout(showDownloadStatus.hideTimer);
    if (state !== "working") {
      showDownloadStatus.hideTimer = window.setTimeout(() => { status.hidden = true; }, state === "error" ? 7000 : 4000);
    }
  }

  async function createPdfBlob(payloadJson) {
    const payload = typeof payloadJson === "string" ? JSON.parse(payloadJson) : (payloadJson || {});
    await ensurePdfLibraries();

    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    Object.assign(frame.style, {
      position: "fixed",
      left: "-12000px",
      top: "0",
      width: "900px",
      height: "1200px",
      border: "0",
      opacity: "0",
      pointerEvents: "none"
    });
    const loaded = waitForFrame(frame);
    frame.srcdoc = renderHtml(payload, { captureOnly: true });
    document.body.appendChild(frame);

    try {
      await loaded;
      const reportDocument = frame.contentDocument;
      if (!reportDocument) throw new Error("PDF 레이아웃 문서를 열 수 없습니다.");
      await waitForReportAssets(reportDocument);
      const pages = Array.from(reportDocument.querySelectorAll(".page"));
      if (pages.length !== 2) throw new Error(`PDF 페이지 수가 올바르지 않습니다: ${pages.length}`);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      for (let index = 0; index < pages.length; index += 1) {
        const canvas = await window.html2canvas(pages[index], {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false
        });
        if (index > 0) pdf.addPage("a4", "portrait");
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, 210, 297, undefined, "FAST");
      }
      return { blob: pdf.output("blob"), filename: makeDownloadFilename(payload) };
    } finally {
      frame.remove();
    }
  }

  function triggerDownload(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
  }

  async function downloadReport(payloadJson) {
    showDownloadStatus("인증서와 학습지 PDF를 만들고 있어요…", "working");
    try {
      const result = await createPdfBlob(payloadJson);
      triggerDownload(result.blob, result.filename);
      showDownloadStatus("PDF 다운로드가 시작되었습니다.", "success");
      return true;
    } catch (error) {
      console.error("Dino learning report PDF generation failed", error);
      showDownloadStatus("PDF 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.", "error");
      return false;
    }
  }

  async function downloadReportAndOpenUpload(payloadJson, uploadUrl) {
    const boardUrl = safeUploadUrl(uploadUrl);
    const boardWindow = window.open(boardUrl, "_blank");
    if (boardWindow) boardWindow.opener = null;
    return downloadReport(payloadJson);
  }

  function printReport(payloadJson) {
    return downloadReport(payloadJson);
  }

  function printReportAndOpenUpload(payloadJson, uploadUrl) {
    return downloadReportAndOpenUpload(payloadJson, uploadUrl);
  }

  function renderIntoCurrentDocument(payloadJson) {
    document.open();
    document.write(renderHtml(payloadJson, { captureOnly: false }));
    document.close();
  }

  window.DinoLearningReport = {
    createPdfBlob,
    downloadReport,
    downloadReportAndOpenUpload,
    printReport,
    printReportAndOpenUpload,
    renderHtml,
    renderIntoCurrentDocument
  };
})();
