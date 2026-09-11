import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Reports which required env vars are present (value is never leaked).
export async function GET() {
  const required = {
    public: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_APP_URL",
    ],
    server: [
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
  };

  const present = (name: string) =>
    Boolean(process.env[name]) && process.env[name] !== "";

  const missing = [...required.public, ...required.server].filter(
    (name) => !present(name)
  );

  return NextResponse.json({
    ok: missing.length === 0,
    env: Object.fromEntries(
      [...required.public, ...required.server].map((name) => [
        name,
        present(name),
      ])
    ),
    missing,
  });
}
