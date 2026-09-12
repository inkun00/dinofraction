import assert from 'node:assert/strict';
import test from 'node:test';
import {NextRequest} from 'next/server';
import {POST} from '../src/app/api/leaderboard/route';

const currentBoard = 's023i9sy71hjijvegv2q';
const legacyBoards = ['7pv4dzymsdgcg867', 's0237u2egsga2p3e4l7c'];

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
  seasonId: string,
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
    seasonId,
    eventId: `${seasonId}:${userId}:${seasonGames}`,
    recordedAt,
  });
}

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/leaderboard', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

test('reads two earlier boards and the new board, merging each player once', async () => {
  process.env.PADLET_API_KEY = 'test-key';
  process.env.PADLET_BOARD_ID = currentBoard;
  process.env.PADLET_LEGACY_BOARD_IDS = legacyBoards.join(',');
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const posts = new Map<string, unknown[]>([
    [legacyBoards[0], [
      snapshot('player_a', 'padlet_v1_20260822', 80, 1020, 3, '2026-08-22T00:00:00Z'),
    ]],
    [legacyBoards[1], [
      snapshot('player_a', 'padlet_v1_20260822', 120, 1500, 5, '2026-09-11T00:00:00Z'),
      snapshot('player_b', 'padlet_v1_20260822', 100, 1250, 1, '2026-09-11T00:00:00Z'),
    ]],
    [currentBoard, [
      snapshot('player_a', 'padlet_v2_20260912', 90, 1100, 1, '2026-09-12T00:00:00Z'),
      snapshot('player_c', 'padlet_v2_20260912', 30, 380, 1, '2026-09-12T00:00:00Z'),
    ]],
  ]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    const boardId = url.match(/\/boards\/([^?]+)/)?.[1] ?? '';
    return new Response(JSON.stringify({included: posts.get(boardId) ?? []}), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  };

  try {
    const score = await POST(request({action: 'query', tabType: 'score', userId: 'player_a'}));
    assert.equal(score.status, 200);
    assert.deepEqual((await score.json()).map((row: {name: string; val: number}) => [row.name, row.val]), [
      ['player_a', 120], ['player_b', 100], ['player_c', 30],
    ]);

    const xp = await POST(request({action: 'query', tabType: 'xp', userId: 'player_a'}));
    assert.equal(xp.status, 200);
    assert.deepEqual((await xp.json()).map((row: {name: string; val: number}) => [row.name, row.val]), [
      ['player_a', 1520], ['player_b', 1250], ['player_c', 380],
    ]);

    const school = await POST(request({action: 'query', tabType: 'school'}));
    assert.equal(school.status, 200);
    assert.equal((await school.json())[0].val, 3150);
    assert.deepEqual(new Set(calls.map((url) => url.match(/\/boards\/([^?]+)/)?.[1])),
      new Set([currentBoard, ...legacyBoards]));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('writes new games only to the new board', async () => {
  process.env.PADLET_API_KEY = 'test-key';
  process.env.PADLET_BOARD_ID = currentBoard;
  process.env.PADLET_LEGACY_BOARD_IDS = legacyBoards.join(',');
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
      seasonId: 'padlet_v2_20260912',
    }));
    assert.equal(response.status, 201);
    assert.deepEqual(calls.map((call) => call.method), ['GET', 'POST']);
    assert.ok(calls.every((call) => call.url.includes(`/boards/${currentBoard}`)));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
