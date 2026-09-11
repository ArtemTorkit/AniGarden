export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@sentry/nextjs").then((Sentry) => {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.1,
        enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
      });
    });
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("@sentry/nextjs").then((Sentry) => {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.1,
        enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
      });
    });
  }
}
