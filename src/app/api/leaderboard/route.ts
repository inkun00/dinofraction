import {NextRequest, NextResponse} from 'next/server';

const PADLET_BASE_URL = 'https://api.padlet.dev/v1';
const SEASON_ID = 'padlet_v1_20260822';
const RECORD_MARKER = 'DINO_FRACTION_LEADERBOARD_V1:';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TabType = 'score' | 'xp' | 'school';

type LeaderboardSnapshot = {
  userId: string;
  nickname: string;
  school: string;
  score: number;
  totalXp: number;
  seasonGames: number;
  seasonId: string;
  eventId: string;
  recordedAt: string;
};

type PadletResource = {
  id?: string;
  type?: string;
  attributes?: {
    createdAt?: string;
    content?: {bodyHtml?: string | null};
  };
};

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {'Cache-Control': 'no-store'},
  });
}

function safeNonNegativeInteger(value: unknown, maximum = 1_000_000_000): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(Math.trunc(parsed), maximum));
}

function getTabType(value: unknown): TabType | null {
  return value === 'score' || value === 'xp' || value === 'school' ? value : null;
}

function getPadletConfig() {
  const apiKey = process.env.PADLET_API_KEY?.trim() ?? '';
  const boardId = process.env.PADLET_BOARD_ID?.trim() ?? '';
  const sectionId = process.env.PADLET_SECTION_ID?.trim() ?? '';
  if (!apiKey || !/^[A-Za-z0-9_-]{16,22}$/.test(boardId)) return null;
  return {apiKey, boardId, sectionId};
}

async function padletFetch(path: string, init: RequestInit = {}) {
  const config = getPadletConfig();
  if (!config) throw new Error('PADLET_NOT_CONFIGURED');
  return fetch(`${PADLET_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.api+json',
      'X-API-KEY': config.apiKey,
      ...(init.body ? {'Content-Type': 'application/vnd.api+json'} : {}),
      ...init.headers,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });
}

function decodeHtmlText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .trim();
}

function parseSnapshot(resource: PadletResource): LeaderboardSnapshot | null {
  if (resource.type !== 'post') return null;
  const bodyHtml = resource.attributes?.content?.bodyHtml;
  if (!bodyHtml) return null;
  const body = decodeHtmlText(bodyHtml);
  const markerIndex = body.indexOf(RECORD_MARKER);
  if (markerIndex < 0) return null;
  const encoded = body
    .slice(markerIndex + RECORD_MARKER.length)
    .split(/\s/)[0]
    .trim();

  try {
    const raw = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as Partial<LeaderboardSnapshot>;
    if (
      raw.seasonId !== SEASON_ID ||
      typeof raw.userId !== 'string' ||
      !/^[A-Za-z0-9_-]{8,128}$/.test(raw.userId)
    ) {
      return null;
    }
    return {
      userId: raw.userId,
      nickname:
        typeof raw.nickname === 'string' && raw.nickname.trim()
          ? raw.nickname.trim().slice(0, 12)
          : '용감한 공룡',
      school:
        typeof raw.school === 'string' && raw.school.trim()
          ? raw.school.trim().slice(0, 30)
          : '소속 미설정',
      score: safeNonNegativeInteger(raw.score),
      totalXp: safeNonNegativeInteger(raw.totalXp),
      seasonGames: safeNonNegativeInteger(raw.seasonGames, 100_000),
      seasonId: SEASON_ID,
      eventId: typeof raw.eventId === 'string' ? raw.eventId : '',
      recordedAt:
        typeof raw.recordedAt === 'string'
          ? raw.recordedAt
          : resource.attributes?.createdAt ?? '',
    };
  } catch {
    return null;
  }
}

async function getPadletSnapshots(): Promise<LeaderboardSnapshot[]> {
  const config = getPadletConfig();
  if (!config) throw new Error('PADLET_NOT_CONFIGURED');
  const upstream = await padletFetch(
    `/boards/${encodeURIComponent(config.boardId)}?include=posts`,
  );
  if (!upstream.ok) throw new Error(`PADLET_READ_${upstream.status}`);
  const payload = (await upstream.json()) as {included?: PadletResource[]};
  return (payload.included ?? [])
    .map(parseSnapshot)
    .filter((snapshot): snapshot is LeaderboardSnapshot => snapshot !== null);
}

function latestPlayerSnapshots(snapshots: LeaderboardSnapshot[]) {
  const players = new Map<string, LeaderboardSnapshot>();
  for (const snapshot of snapshots) {
    const current = players.get(snapshot.userId);
    if (
      !current ||
      snapshot.seasonGames > current.seasonGames ||
      (snapshot.seasonGames === current.seasonGames &&
        snapshot.recordedAt > current.recordedAt)
    ) {
      players.set(snapshot.userId, snapshot);
    }
  }
  return [...players.values()];
}

async function queryLeaderboard(tabTypeValue: unknown, viewerIdValue: unknown) {
  const tabType = getTabType(tabTypeValue);
  if (!tabType) return jsonResponse({error: 'Invalid leaderboard tab.'}, 400);
  const viewerId =
    typeof viewerIdValue === 'string' ? viewerIdValue.slice(0, 128) : '';
  const players = latestPlayerSnapshots(await getPadletSnapshots());

  if (tabType === 'school') {
    const schools = new Map<string, {xp: number; members: number}>();
    for (const player of players) {
      if (!player.school || player.school === '소속 미설정') continue;
      const current = schools.get(player.school) ?? {xp: 0, members: 0};
      current.xp += player.totalXp;
      current.members += 1;
      schools.set(player.school, current);
    }
    const result = [...schools.entries()]
      .map(([school, value]) => ({
        school,
        val: value.xp,
        members: `${value.members}명 참여`,
      }))
      .sort((a, b) => b.val - a.val || a.school.localeCompare(b.school, 'ko'))
      .slice(0, 10)
      .map((entry, index) => ({...entry, rank: index + 1}));
    return jsonResponse(result);
  }

  const metric = tabType === 'score' ? 'score' : 'totalXp';
  const result = players
    .sort(
      (a, b) =>
        b[metric] - a[metric] ||
        b.score - a.score ||
        a.recordedAt.localeCompare(b.recordedAt),
    )
    .slice(0, 10)
    .map((player, index) => ({
      rank: index + 1,
      name: player.nickname,
      school: player.school,
      val: player[metric],
      dino: '공룡 러너',
      is_me: viewerId !== '' && player.userId === viewerId,
    }));
  return jsonResponse(result);
}

async function syncLeaderboard(body: Record<string, unknown>) {
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(userId)) {
    return jsonResponse({error: 'Invalid player identifier.'}, 400);
  }
  const nickname =
    (typeof body.nickname === 'string' ? body.nickname.trim().slice(0, 12) : '') ||
    '용감한 공룡';
  const school =
    (typeof body.school === 'string' ? body.school.trim().slice(0, 30) : '') ||
    '소속 미설정';
  const score = safeNonNegativeInteger(body.score);
  const totalXp = safeNonNegativeInteger(body.totalXp);
  const seasonGames = safeNonNegativeInteger(body.seasonGames, 100_000);
  if (seasonGames < 1) {
    return jsonResponse({error: 'A completed game is required.'}, 400);
  }

  const eventId = `${SEASON_ID}:${userId}:${seasonGames}`;
  const snapshots = await getPadletSnapshots();
  if (snapshots.some((snapshot) => snapshot.eventId === eventId)) {
    return jsonResponse({ok: true, duplicate: true});
  }

  const snapshot: LeaderboardSnapshot = {
    userId,
    nickname,
    school,
    score,
    totalXp,
    seasonGames,
    seasonId: SEASON_ID,
    eventId,
    recordedAt: new Date().toISOString(),
  };
  const encoded = Buffer.from(JSON.stringify(snapshot), 'utf8').toString('base64url');
  const config = getPadletConfig();
  if (!config) throw new Error('PADLET_NOT_CONFIGURED');
  const relationships = config.sectionId
    ? {section: {data: {id: config.sectionId}}}
    : undefined;
  const upstream = await padletFetch(
    `/boards/${encodeURIComponent(config.boardId)}/posts`,
    {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'post',
          attributes: {
            content: {
              subject: `🏆 ${nickname} · ${school} · ${score}점 · ${totalXp}XP`,
              body: `${RECORD_MARKER}${encoded}`,
            },
            color: 'orange',
          },
          ...(relationships ? {relationships} : {}),
        },
      }),
    },
  );
  if (!upstream.ok) throw new Error(`PADLET_WRITE_${upstream.status}`);
  return jsonResponse({ok: true}, 201);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === 'query') {
      return await queryLeaderboard(body.tabType, body.userId);
    }
    if (body.action === 'sync') return await syncLeaderboard(body);
    return jsonResponse({error: 'Invalid action.'}, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    console.error('[Padlet leaderboard]', message);
    if (message === 'PADLET_NOT_CONFIGURED') {
      return jsonResponse({error: 'Padlet leaderboard is not configured.'}, 503);
    }
    return jsonResponse({error: 'Padlet leaderboard request failed.'}, 502);
  }
}
