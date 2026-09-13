export function isSupportedPaidPullCount(count: number): count is 1 | 5 | 10 {
  return count === 1 || count === 5 || count === 10;
}
