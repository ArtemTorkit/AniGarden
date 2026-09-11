export const MIN_BUY_ME_A_COFFEE_AMOUNT_CENTS = 100;
export const MAX_BUY_ME_A_COFFEE_AMOUNT_CENTS = 50_000;

export function calculateGemsFromUsdCents(amountCents: number) {
  if (!Number.isFinite(amountCents) || amountCents < MIN_BUY_ME_A_COFFEE_AMOUNT_CENTS) return 0;

  const baseGems = Math.floor((amountCents * 3) / 100);
  const bonusGems = amountCents >= 1_500 ? 10 : amountCents >= 1_000 ? 5 : 0;
  return baseGems + bonusGems;
}
