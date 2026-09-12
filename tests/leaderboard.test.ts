import assert from 'node:assert/strict';
import test from 'node:test';
import {NextRequest} from 'next/server';
import legacyArchive from '../src/lib/leaderboard-legacy-archive.json';
import {
  hashUserId,
  latestPlayerSnapshots,
  LEGACY_SEASON_ID,
  SEASON_ID,
  type PlayerRecord,
} from '../src/lib/leaderboard-merge';
import {POST} from '../src/app/api/leaderboard/route';

const currentBoard = 's023i9sy71hjijvegv2q';

function padletPost(data: Record<string, unknown>) {
  return {
    type: 'post',
    attributes: {
      createdAt: data.recordedAt,
      content: {
        bodyHtml: `DINO_FRACTION_LEADERBOARD_V1:${Buffer.from(
          JSON.stringify(data),
        ).toString('base64url')}`,
      },
    },
  };
}

function snapshot(
  userId: string,
  score: number,
  totalXp: number,
  seasonGames: number,
  recordedAt: string,
) {
  return padletPost({
    userId,
    nickname: userId,
    school: '공룡초등학교',
    score,
    totalXp,
    seasonGames,
    seasonId: SEASON_ID,
    eventId: `${SEASON_ID}:${userId}:${seasonGames}`,
    recordedAt,
  });
}

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/leaderboard', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function record(
  userId: string,
  seasonId: string,
  score: number,
  totalXp: number,
  seasonGames: number,
  recordedAt: string,
): PlayerRecord {
  return {
    userIdHash: hashUserId(userId),
    nickname: userId,
    school: '공룡초등학교',
    score,
    totalXp,
    seasonGames,
    seasonId,
    recordedAt,
  };
}

test('legacy archive contains both earlier boards, deduplicated by player', () => {
  assert.deepEqual(legacyArchive.sourceBoards.map((board) => board.boardId), [
    '7pv4dzymsdgcg867',
    's0237u2egsga2p3e4l7c',
  ]);
  assert.equal(legacyArchive.sourceRecordCount, 13_009);
  assert.equal(legacyArchive.playerCount, 1695);
  assert.equal(legacyArchive.players.length, legacyArchive.playerCount);
  assert.equal(new Set(legacyArchive.players.map((player) => player.userIdHash)).size,
    legacyArchive.playerCount);
});

test('merges each player once across archived and live seasons', () => {
  const players = latestPlayerSnapshots([
    record('player_a', LEGACY_SEASON_ID, 80, 1020, 3, '2026-08-22T00:00:00Z'),
    record('player_a', LEGACY_SEASON_ID, 120, 1500, 5, '2026-09-11T00:00:00Z'),
    record('player_b', LEGACY_SEASON_ID, 100, 1250, 1, '2026-09-11T00:00:00Z'),
    record('player_a', SEASON_ID, 90, 1100, 1, '2026-09-12T00:00:00Z'),
    record('player_c', SEASON_ID, 30, 380, 1, '2026-09-12T00:00:00Z'),
  ]);
  assert.deepEqual(players.map((player) => [player.nickname, player.score, player.totalXp]), [
    ['player_a', 120, 1520],
    ['player_b', 100, 1250],
    ['player_c', 30, 380],
  ]);
});

test('queries only the live Padlet board and includes archived rankings', async () => {
  process.env.PADLET_API_KEY = 'test-key';
  process.env.PADLET_BOARD_ID = currentBoard;
  process.env.PADLET_LEGACY_BOARD_IDS = '7pv4dzymsdgcg867,s0237u2egsga2p3e4l7c';
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return new Response(JSON.stringify({included: [
      snapshot('player_new', 999_999, 12_000_000, 1, '2026-09-12T00:00:00Z'),
    ]}), {status: 200, headers: {'Content-Type': 'application/json'}});
  };

  try {
    const score = await POST(request({action: 'query', tabType: 'score', userId: 'player_new'}));
    assert.equal(score.status, 200);
    const rows = await score.json();
    assert.equal(rows[0].name, 'player_new');
    assert.equal(rows[0].val, 999_999);
    assert.equal(rows[0].is_me, true);
    assert.equal(rows.length, 10);
    assert.ok(rows.slice(1).every((row: {name: string}) => row.name !== 'player_new'));

    const school = await POST(request({action: 'query', tabType: 'school'}));
    assert.equal(school.status, 200);
    assert.ok((await school.json()).length > 0);
    assert.equal(calls.length, 2);
    assert.ok(calls.every((url) => url.includes(`/boards/${currentBoard}?include=posts`)));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('writes new games only to the live board', async () => {
  process.env.PADLET_API_KEY = 'test-key';
  process.env.PADLET_BOARD_ID = currentBoard;
  const originalFetch = globalThis.fetch;
  const calls: {url: string; method: string}[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({url: String(input), method: init?.method ?? 'GET'});
    return new Response(
      init?.method === 'POST' ? '{}' : JSON.stringify({included: []}),
      {status: init?.method === 'POST' ? 201 : 200},
    );
  };

  try {
    const response = await POST(request({
      action: 'sync',
      userId: 'player_a',
      nickname: '공룡',
      school: '공룡초등학교',
      score: 50,
      totalXp: 610,
      seasonGames: 1,
      seasonId: SEASON_ID,
    }));
    assert.equal(response.status, 201);
    assert.deepEqual(calls.map((call) => call.method), ['GET', 'POST']);
    assert.ok(calls.every((call) => call.url.includes(`/boards/${currentBoard}`)));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
