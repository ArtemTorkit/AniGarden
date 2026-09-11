import Link from "next/link";

export default function SiteFooter() {
  return <footer className="mx-auto mt-12 flex max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-6 py-6 text-xs text-slate-500 sm:px-10">
    <p>AniGarden · Gems and characters have no cash-out or real-world monetary value.</p>
    <nav className="flex gap-4"><Link href="/terms" className="hover:text-lime-300">Terms</Link><Link href="/privacy" className="hover:text-lime-300">Privacy</Link><Link href="/payments" className="hover:text-lime-300">Payments & refunds</Link></nav>
  </footer>;
}
