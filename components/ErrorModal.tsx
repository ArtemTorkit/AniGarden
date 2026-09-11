"use client";

export default function ErrorModal({ message = "Something went wrong. Please try again later.", onClose, onRetry }: { message?: string; onClose?: () => void; onRetry?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="error-modal-title">
      <div className="w-full max-w-sm rounded-2xl border border-red-300/20 bg-slate-900 p-6 text-center shadow-2xl shadow-black/50">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-400/10 text-xl text-red-300">!</div>
        <h2 id="error-modal-title" className="mt-4 text-lg font-bold text-white">Something went wrong</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          {onClose ? <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-500">Close</button> : null}
          {onRetry ? <button type="button" onClick={onRetry} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-garden-950 hover:bg-lime-300">Try again</button> : null}
        </div>
      </div>
    </div>
  );
}
