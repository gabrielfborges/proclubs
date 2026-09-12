export type PrizeSource = {
  registrationFeeCents: number;
  maxTeams: number;
  prizeFirstCents: number;
  prizeSecondCents: number;
  prizeThirdCents: number;
};

export type PrizeBreakdown = {
  first: number;
  second: number;
  third: number;
};

/**
 * Calculates the prize pool from 80% of the registration fees.
 * The configured prize values are used only as the distribution weights.
 */
export function calculatePrizeForTeams(championship: PrizeSource, teamCount: number): PrizeBreakdown {
  const maxTeams = Math.max(championship.maxTeams, 1);
  const size = Math.max(0, Math.min(teamCount, maxTeams));
  const weights = [championship.prizeFirstCents, championship.prizeSecondCents, championship.prizeThirdCents];
  const weightTotal = weights.reduce((sum, value) => sum + Math.max(0, value), 0) || 8;
  const effectiveWeights = weightTotal === 8 && weights.every((value) => value === 0) ? [5, 2, 1] : weights;
  const prizePool = Math.round(championship.registrationFeeCents * size * 0.8);
  const first = Math.round((prizePool * effectiveWeights[0]) / weightTotal);
  const second = Math.round((prizePool * effectiveWeights[1]) / weightTotal);
  const third = Math.max(0, prizePool - first - second);

  return { first, second, third };
}

export function formatPrize(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}