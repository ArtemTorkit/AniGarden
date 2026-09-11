// Runs every integration check endpoint and prints a report.
// Usage: node scripts/check-integrations.mjs [base_url]
// Defaults to http://localhost:3000
//
// Start the dev server first (`npm run dev`) in another terminal, then run:
//   npm run check:integrations

const BASE = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const checks = [
  { name: "health", path: "/api/check/health" },
  { name: "env", path: "/api/check/env" },
  { name: "supabase", path: "/api/check/supabase" },
];

function fmt(label, ok) {
  return `${ok ? "PASS" : "FAIL"}  ${label}`;
}

async function run() {
  console.log(`Checking integrations against ${BASE}\n`);
  let allOk = true;

  for (const { name, path } of checks) {
    const url = BASE + path;
    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && data.ok !== false;
      if (!ok) allOk = false;
      console.log(fmt(name, ok));
      if (data.detail) console.log(`       detail: ${data.detail}`);
      if (data.missing?.length)
        console.log(`       missing env: ${data.missing.join(", ")}`);
      if (data.steps) {
        for (const [step, s] of Object.entries(data.steps)) {
          console.log(`       ${step}: ${s.ok ? "ok" : "fail"} — ${s.detail}`);
        }
      }
    } catch (e) {
      allOk = false;
      console.log(fmt(name, false));
      console.log(`       error: ${e.message}`);
    }
  }

  console.log(`\n${allOk ? "All integrations OK." : "Some checks failed."}`);
  process.exit(allOk ? 0 : 1);
}

run();
