import {NextRequest, NextResponse} from 'next/server';

const PROJECT_ID = 'dinorun-math-c599c';
const COLLECTION = 'leaderboard_season_20260822';
const SEASON_ID = 'season_20260822';
const FIRESTORE_BASE_URL =
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const FIRESTORE_QUERY_URL = `${FIRESTORE_BASE_URL}:runQuery`;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {'Cache-Control': 'no-store'},
  });
}

function safeNonNegativeInteger(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(Math.trunc(parsed), Number.MAX_SAFE_INTEGER));
}

async function queryLeaderboard(tabType: unknown) {
  if (tabType !== 'score' && tabType !== 'xp' && tabType !== 'school') {
    return jsonResponse({error: 'Invalid leaderboard tab.'}, 400);
  }

  const orderField = tabType === 'score' ? 'score' : 'totalXp';
  const limit = tabType === 'school' ? 200 : 10;
  const upstream = await fetch(FIRESTORE_QUERY_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      structuredQuery: {
        from: [{collectionId: COLLECTION}],
        orderBy: [
          {field: {fieldPath: orderField}, direction: 'DESCENDING'},
        ],
        limit,
      },
    }),
    cache: 'no-store',
  });

  const responseBody = await upstream.text();
  if (!upstream.ok) {
    return jsonResponse({error: 'Firestore query failed.'}, upstream.status);
  }

  return new NextResponse(responseBody, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

async function syncLeaderboard(request: NextRequest, body: Record<string, unknown>) {
  const authorization = request.headers.get('authorization') ?? '';
  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!authorization.startsWith('Bearer ') || !/^[A-Za-z0-9]{1,128}$/.test(userId)) {
    return jsonResponse({error: 'Authentication required.'}, 401);
  }

  const nickname =
    (typeof body.nickname === 'string' ? body.nickname.trim().slice(0, 12) : '') ||
    '용감한 공룡';
  const school =
    (typeof body.school === 'string' ? body.school.trim().slice(0, 30) : '') ||
    '소속 미설정';
  const score = safeNonNegativeInteger(body.score);
  const totalXp = safeNonNegativeInteger(body.totalXp);

  const updateMask = new URLSearchParams();
  for (const field of ['nickname', 'school', 'score', 'totalXp', 'seasonId']) {
    updateMask.append('updateMask.fieldPaths', field);
  }
  const documentUrl =
    `${FIRESTORE_BASE_URL}/${COLLECTION}/${encodeURIComponent(userId)}?${updateMask}`;
  const upstream = await fetch(documentUrl, {
    method: 'PATCH',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        nickname: {stringValue: nickname},
        school: {stringValue: school},
        score: {integerValue: String(score)},
        totalXp: {integerValue: String(totalXp)},
        seasonId: {stringValue: SEASON_ID},
      },
    }),
    cache: 'no-store',
  });

  if (!upstream.ok) {
    return jsonResponse({error: 'Firestore sync failed.'}, upstream.status);
  }
  return jsonResponse({ok: true});
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === 'query') {
      return queryLeaderboard(body.tabType);
    }
    if (body.action === 'sync') {
      return syncLeaderboard(request, body);
    }
    return jsonResponse({error: 'Invalid action.'}, 400);
  } catch {
    return jsonResponse({error: 'Invalid request.'}, 400);
  }
}
