import {createHash} from 'node:crypto';

export const SEASON_ID = 'padlet_v2_20260912';
export const LEGACY_SEASON_ID = 'padlet_v1_20260822';

export type PlayerRecord = {
  userIdHash: string;
  nickname: string;
  school: string;
  score: number;
  totalXp: number;
  seasonGames: number;
  seasonId: string;
  recordedAt: string;
};

export function hashUserId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex');
}

export function latestPlayerSnapshots(snapshots: PlayerRecord[]) {
  const players = new Map<string, Map<string, PlayerRecord>>();
  for (const snapshot of snapshots) {
    const seasons = players.get(snapshot.userIdHash) ?? new Map<string, PlayerRecord>();
    const current = seasons.get(snapshot.seasonId);
    if (
      !current ||
      snapshot.seasonGames > current.seasonGames ||
      (snapshot.seasonGames === current.seasonGames &&
        snapshot.recordedAt > current.recordedAt)
    ) {
      seasons.set(snapshot.seasonId, snapshot);
    }
    players.set(snapshot.userIdHash, seasons);
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
      totalXp: Math.max(0, Math.min(Math.trunc(score * 12 + answerXp), 1_000_000_000)),
    };
  });
}
