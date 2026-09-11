import IntegrationChecker from "@/components/IntegrationChecker";

export const metadata = { title: "Integration Check — AniGarden", robots: { index: false, follow: false } };

export default function SetupPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-violet-400">Integration Check</h1>
        <p className="mt-1 text-sm text-slate-400">
          Verifies that the Supabase integrations are wired up correctly. Fill in
          <code className="mx-1 rounded bg-slate-800 px-1.5 py-0.5 text-xs">
            .env.local
          </code>
          first, then run the checks.
        </p>
      </header>
      <IntegrationChecker />
    </main>
  );
}
