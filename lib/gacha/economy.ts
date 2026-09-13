export const GEMS_PER_USD = 15;
export const TEN_DOLLAR_BONUS_GEMS = 25;
export const FIFTEEN_DOLLAR_BONUS_GEMS = 50;
export const PAID_PULL_COST_GEMS = 3;
export const MIN_PURCHASE_AMOUNT_CENTS = 400;
export const LAUNCH_PROMOTION_MULTIPLIER = 2;
export const LAUNCH_PROMOTION_ENDS_AT = "2026-10-12T23:59:59.999Z";

const SELL_VALUES: Record<string, number> = {
  common: 1,
  rare: 2,
  epic: 5,
  legendary: 12,
};

export function isLaunchPromotionActive(now = new Date()) {
  return now.getTime() <= new Date(LAUNCH_PROMOTION_ENDS_AT).getTime();
}

export function calculateGemsFromUsdCents(amountCents: number, now = new Date()) {
  if (!Number.isFinite(amountCents) || amountCents < MIN_PURCHASE_AMOUNT_CENTS) return 0;
  const baseGems = Math.floor((amountCents * GEMS_PER_USD) / 100);
  const bonusGems = amountCents >= 1500 ? FIFTEEN_DOLLAR_BONUS_GEMS : amountCents >= 1000 ? TEN_DOLLAR_BONUS_GEMS : 0;
  const totalGems = baseGems + bonusGems;
  return isLaunchPromotionActive(now) ? totalGems * LAUNCH_PROMOTION_MULTIPLIER : totalGems;
}

export function getSellValue(rarity: string) {
  return SELL_VALUES[rarity.trim().toLowerCase()] ?? 0;
}
