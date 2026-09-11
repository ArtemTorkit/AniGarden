"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import ErrorModal from "@/components/ErrorModal";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ProfileSettings({ nickname: initialNickname, avatarUrl, hideInventory: initialHideInventory }: { nickname: string; avatarUrl: string | null; hideInventory: boolean }) {
  const [nickname, setNickname] = useState(initialNickname);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [hideInventory, setHideInventory] = useState(initialHideInventory);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : avatarUrl);
  }

  async function logout() {
    setLoggingOut(true);
    await createSupabaseBrowserClient().auth.signOut();
    window.location.assign("/login");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const formData = new FormData();
    formData.set("nickname", nickname);
    formData.set("hide_inventory", String(hideInventory));
    if (file) formData.set("avatar", file);

    try {
      const response = await fetch("/api/profile/update", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update profile");
      setMessage("Profile updated.");
      window.location.reload();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-center gap-4">
        <label className="group relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-lime-300/40 bg-garden-800">
          {preview ? <img src={preview} alt="Profile preview" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-3xl font-bold text-lime-300">✦</span>}
          <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">Change</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} className="sr-only" />
        </label>
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xl font-bold text-white">{nickname}</p>
          <p className="mt-1 text-sm text-slate-500">Your AniGarden profile</p>
        </div>
        <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
          <button type="button" onClick={() => setEditing((value) => !value)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-lime-300 hover:text-lime-200">{editing ? "Close" : "Edit profile"}</button>
          <button type="button" onClick={logout} disabled={loggingOut} className="rounded-xl px-2 py-2 text-xs font-semibold text-slate-500 transition hover:text-red-300 disabled:opacity-50">{loggingOut ? "…" : "Log out"}</button>
        </div>
      </div>
      {editing ? <form onSubmit={save} className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="nickname">Nickname</label>
            <input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={24} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-lime-300" />
            <p className="mt-2 text-xs text-slate-500">3–24 characters · choose an avatar above</p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-slate-300">
              <input type="checkbox" checked={hideInventory} onChange={(event) => setHideInventory(event.target.checked)} className="mt-0.5 h-4 w-4 accent-lime-300" />
              <span><span className="font-semibold text-white">Hide my inventory from other users</span><span className="mt-1 block text-xs text-slate-500">You will still see your own collection while signed in.</span></span>
            </label>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button type="submit" disabled={saving} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-garden-950 transition hover:bg-lime-300 disabled:opacity-60">{saving ? "Saving…" : "Save profile"}</button>
          {message ? <span className="text-sm text-lime-300">{message}</span> : null}
        {error ? <ErrorModal message={error} onClose={() => setError(null)} onRetry={() => setError(null)} /> : null}
        </div>
      </form> : null}
    </section>
  );
}
