import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const EXPECTED_BOARDS = ['7pv4dzymsdgcg867', 's0237u2egsga2p3e4l7c'];
const LEGACY_SEASON_ID = 'padlet_v1_20260822';
const sourcePath = process.argv[2];
if (!sourcePath) {
  throw new Error('Usage: node scripts/build_legacy_leaderboard_archive.mjs <one-time-export.json>');
}

const source = JSON.parse(await readFile(resolve(sourcePath), 'utf8'));
if (!Array.isArray(source.boards) || source.boards.length !== EXPECTED_BOARDS.length) {
  throw new Error('The export must contain both archived Padlet boards.');
}

const latest = new Map();
const sourceBoards = [];
for (const boardId of EXPECTED_BOARDS) {
  const board = source.boards.find((entry) => entry.boardId === boardId);
  if (!board || !Array.isArray(board.snapshots) || board.snapshots.length === 0) {
    throw new Error(`Missing or empty board: ${boardId}`);
  }
  sourceBoards.push({boardId, recordCount: board.snapshots.length});
  for (const snapshot of board.snapshots) {
    if (
      snapshot.seasonId !== LEGACY_SEASON_ID ||
      typeof snapshot.userId !== 'string' ||
      !/^[A-Za-z0-9_-]{8,128}$/.test(snapshot.userId) ||
      typeof snapshot.nickname !== 'string' ||
      typeof snapshot.school !== 'string' ||
      !Number.isSafeInteger(snapshot.score) ||
      !Number.isSafeInteger(snapshot.totalXp) ||
      !Number.isSafeInteger(snapshot.seasonGames) ||
      typeof snapshot.recordedAt !== 'string'
    ) {
      throw new Error(`Invalid legacy record in board ${boardId}`);
    }
    const previous = latest.get(snapshot.userId);
    if (
      !previous ||
      snapshot.seasonGames > previous.seasonGames ||
      (snapshot.seasonGames === previous.seasonGames &&
        snapshot.recordedAt > previous.recordedAt)
    ) {
      latest.set(snapshot.userId, snapshot);
    }
  }
}

const players = [...latest.values()]
  .map((snapshot) => ({
    userIdHash: createHash('sha256').update(snapshot.userId).digest('hex'),
    nickname: snapshot.nickname,
    school: snapshot.school,
    score: snapshot.score,
    totalXp: snapshot.totalXp,
    recordedAt: snapshot.recordedAt,
  }))
  .sort((a, b) => a.userIdHash.localeCompare(b.userIdHash));

const archive = {
  version: 1,
  sourceBoards,
  sourceRecordCount: sourceBoards.reduce((sum, board) => sum + board.recordCount, 0),
  playerCount: players.length,
  players,
};
const outputPath = resolve('src/lib/leaderboard-legacy-archive.json');
const lines = [
  '{',
  `  "version": ${archive.version},`,
  `  "sourceBoards": ${JSON.stringify(archive.sourceBoards)},`,
  `  "sourceRecordCount": ${archive.sourceRecordCount},`,
  `  "playerCount": ${archive.playerCount},`,
  '  "players": [',
  ...players.map((player, index) =>
    `    ${JSON.stringify(player)}${index < players.length - 1 ? ',' : ''}`,
  ),
  '  ]',
  '}',
  '',
];
await writeFile(outputPath, lines.join('\n'), 'utf8');
console.log(`Archived ${archive.sourceRecordCount} posts as ${archive.playerCount} players: ${outputPath}`);
