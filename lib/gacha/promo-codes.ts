const PROMO_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

export function normalizePromoCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function isValidPromoCodeFormat(code: string) {
  return PROMO_CODE_PATTERN.test(code);
}
