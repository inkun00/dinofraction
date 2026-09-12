import {NextRequest, NextResponse} from 'next/server';

const PADLET_BASE_URL = 'https://api.padlet.dev/v1';
const SEASON_ID = 'padlet_v2_20260912';
const LEGACY_SEASON_ID = 'padlet_v1_20260822';
const RECORD_MARKER = 'DINO_FRACTION_LEADERBOARD_V1:';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

function normalizeBoardId(rawValue: string): string {
  const value = rawValue
    .trim()
    .replace(/^PADLET_BOARD_ID\s*=\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
  if (/^[A-Za-z0-9_-]{16,22}$/.test(value)) return value;

  // Padlet commonly places the 16-character board ID at the end of the URL,
  // after the human-readable slug. Accepting that URL makes Vercel setup less
  // error-prone while still sending only the validated ID to Padlet's API.
  const urlTail = value.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop() ?? '';
  const candidates = [urlTail, ...urlTail.split('-').reverse()];
  return candidates.find((candidate) => /^[A-Za-z0-9_-]{16,22}$/.test(candidate)) ?? '';
}

function getPadletConfig() {
  const apiKey = process.env.PADLET_API_KEY?.trim() ?? '';
  const boardId = normalizeBoardId(process.env.PADLET_BOARD_ID ?? '');
  const legacyBoardIds = (process.env.PADLET_LEGACY_BOARD_IDS ?? '')
    .split(',')
    .map(normalizeBoardId)
    .filter((id, index, ids) => id !== '' && id !== boardId && ids.indexOf(id) === index);
  const sectionId = process.env.PADLET_SECTION_ID?.trim() ?? '';
  if (!apiKey || !boardId) return null;
  return {apiKey, boardId, legacyBoardIds, sectionId};
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
    signal: AbortSignal.timeout(40_000),
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

function parseSnapshot(
  resource: PadletResource,
  expectedSeasonId: string,
): LeaderboardSnapshot | null {
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
      raw.seasonId !== expectedSeasonId ||
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
      seasonId: expectedSeasonId,
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

async function getBoardSnapshots(
  boardId: string,
  expectedSeasonId: string,
): Promise<LeaderboardSnapshot[]> {
  const config = getPadletConfig();
  if (!config) throw new Error('PADLET_NOT_CONFIGURED');
  let upstream: Response;
  try {
    upstream = await padletFetch(
      `/boards/${encodeURIComponent(boardId)}?include=posts`,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'UNKNOWN';
    throw new Error(`PADLET_READ_${boardId}_${reason}`);
  }
  if (!upstream.ok) throw new Error(`PADLET_READ_${upstream.status}`);
  const payload = (await upstream.json()) as {included?: PadletResource[]};
  return (payload.included ?? [])
    .map((resource) => parseSnapshot(resource, expectedSeasonId))
    .filter((snapshot): snapshot is LeaderboardSnapshot => snapshot !== null);
}

const legacyCache = new Map<
  string,
  {expiresAt: number; snapshots: LeaderboardSnapshot[]}
>();
const legacyPending = new Map<string, Promise<LeaderboardSnapshot[]>>();

async function getCachedLegacyBoardSnapshots(boardId: string) {
  const cached = legacyCache.get(boardId);
  if (cached && cached.expiresAt > Date.now()) return cached.snapshots;
  const pending = legacyPending.get(boardId);
  if (pending) return pending;

  const fetchSnapshots = getBoardSnapshots(boardId, LEGACY_SEASON_ID);
  legacyPending.set(boardId, fetchSnapshots);
  try {
    const snapshots = await fetchSnapshots;
    legacyCache.set(boardId, {expiresAt: Date.now() + 10 * 60_000, snapshots});
    return snapshots;
  } finally {
    legacyPending.delete(boardId);
  }
}

async function getAllPadletSnapshots(): Promise<LeaderboardSnapshot[]> {
  const config = getPadletConfig();
  if (!config) throw new Error('PADLET_NOT_CONFIGURED');
  const boardReads = [
    getBoardSnapshots(config.boardId, SEASON_ID),
    ...config.legacyBoardIds.map((boardId) =>
      getCachedLegacyBoardSnapshots(boardId),
    ),
  ];
  return (await Promise.all(boardReads)).flat();
}

function latestPlayerSnapshots(snapshots: LeaderboardSnapshot[]) {
  const players = new Map<string, Map<string, LeaderboardSnapshot>>();
  for (const snapshot of snapshots) {
    const seasons = players.get(snapshot.userId) ?? new Map<string, LeaderboardSnapshot>();
    const current = seasons.get(snapshot.seasonId);
    if (
      !current ||
      snapshot.seasonGames > current.seasonGames ||
      (snapshot.seasonGames === current.seasonGames &&
        snapshot.recordedAt > current.recordedAt)
    ) {
      seasons.set(snapshot.seasonId, snapshot);
    }
    players.set(snapshot.userId, seasons);
  }

  return [...players.values()].map((seasons) => {
    const legacy = seasons.get(LEGACY_SEASON_ID);
    const current = seasons.get(SEASON_ID);
    const latest = current ?? legacy!;
    const score = Math.max(legacy?.score ?? 0, current?.score ?? 0);
    // Each season's XP includes its own high-score bonus. Count that bonus
    // only once, then add the correct-answer XP earned in both periods.
    const answerXp = [legacy, current].reduce(
      (sum, snapshot) =>
        sum + Math.max(0, (snapshot?.totalXp ?? 0) - (snapshot?.score ?? 0) * 12),
      0,
    );
    return {
      ...latest,
      score,
      totalXp: safeNonNegativeInteger(score * 12 + answerXp),
    };
  });
}

async function queryLeaderboard(tabTypeValue: unknown, viewerIdValue: unknown) {
  const tabType = getTabType(tabTypeValue);
  if (!tabType) return jsonResponse({error: 'Invalid leaderboard tab.'}, 400);
  const viewerId =
    typeof viewerIdValue === 'string' ? viewerIdValue.slice(0, 128) : '';
  const players = latestPlayerSnapshots(await getAllPadletSnapshots());

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
  const ranked = players
    .sort(
      (a, b) =>
        b[metric] - a[metric] ||
        b.score - a.score ||
        a.recordedAt.localeCompare(b.recordedAt),
    )
    .map((player, index) => ({
      rank: index + 1,
      name: player.nickname,
      school: player.school,
      val: player[metric],
      dino: '공룡 러너',
      is_me: viewerId !== '' && player.userId === viewerId,
    }));
  const result = ranked.slice(0, 10);
  const viewer = ranked.find((entry) => entry.is_me && entry.rank > 10);
  if (viewer) result.push(viewer);
  return jsonResponse(result);
}

async function syncLeaderboard(body: Record<string, unknown>) {
  if (body.seasonId !== SEASON_ID) {
    return jsonResponse({error: 'Please reload the game to join the current leaderboard.'}, 409);
  }
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
  const config = getPadletConfig();
  if (!config) throw new Error('PADLET_NOT_CONFIGURED');
  const snapshots = await getBoardSnapshots(config.boardId, SEASON_ID);
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
    // Temporary one-time migration endpoint. Removed after the legacy snapshot
    // has been verified and checked in as a static dataset.
    if (body.action === 'archive_legacy') {
      const config = getPadletConfig();
      if (!config) throw new Error('PADLET_NOT_CONFIGURED');
      const boards = await Promise.all(config.legacyBoardIds.map(async (boardId) => ({
        boardId,
        snapshots: await getBoardSnapshots(boardId, LEGACY_SEASON_ID),
      })));
      return jsonResponse({boards});
    }
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
