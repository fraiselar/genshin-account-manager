import type { AccountData, PullEntry } from './types';

export interface PullSummary {
  totalPulls: number;
  fiveStars: number;
  fourStars: number;
  guaranteed: number;
  winRate: number;
  averagePity: number;
}

export function summarizePulls(pulls: PullEntry[]): PullSummary {
  const totalPulls = pulls.length;
  const fiveStars = pulls.filter((pull) => pull.rank >= 5).length;
  const fourStars = pulls.filter((pull) => pull.rank === 4).length;
  const guaranteed = pulls.filter((pull) => pull.result === 'guaranteed').length;
  const wins = pulls.filter((pull) => pull.result === 'win').length;

  return {
    totalPulls,
    fiveStars,
    fourStars,
    guaranteed,
    winRate: totalPulls === 0 ? 0 : wins / totalPulls,
    averagePity: totalPulls === 0 ? 0 : pulls.reduce((sum, pull) => sum + pull.pity, 0) / totalPulls,
  };
}

export function buildAccountOverview(data: AccountData) {
  const characterStats = summarizePulls(data.pulls.character);
  const weaponStats = summarizePulls(data.pulls.weapon);
  const chronicledStats = summarizePulls(data.pulls.chronicled);
  const standardStats = summarizePulls(data.pulls.standard);

  return {
    totalPulls: characterStats.totalPulls + weaponStats.totalPulls + chronicledStats.totalPulls + standardStats.totalPulls,
    characterStats,
    weaponStats,
    chronicledStats,
    standardStats,
  };
}

export function getGoalProgress(current: number, target: number) {
  if (target <= 0) {
    return { current, target, percent: 100 };
  }

  return {
    current,
    target,
    percent: Math.min((current / target) * 100, 100),
  };
}
