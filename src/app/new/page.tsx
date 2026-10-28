"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewAudit() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("title", title);
    files.forEach((f) => form.append("works", f));
    const response = await fetch("/api/audits", { method: "POST", body: form });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Something went wrong.");
      setBusy(false);
      return;
    }
    router.push(`/a/${body.id}?t=${body.adminToken}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold">New audit</h1>
      <p className="mt-3 text-muted">
        Choose 8–12 pieces your team actually reviews: designs, layouts, illustrations. Use work you have the right to
        share internally.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-6">
        <label className="block">
          <span className="text-sm font-medium">Audit name</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Design review, October"
            className="mt-2 w-full rounded-lg border border-line bg-white px-4 py-3"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Work to review (4–12 images)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="mt-2 block w-full text-sm"
          />
        </label>
        {files.length > 0 && <p className="text-sm text-muted">{files.length} images selected</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          disabled={busy || files.length < 4}
          className="rounded-full bg-foreground px-6 py-3 font-medium text-background disabled:opacity-40"
        >
          {busy ? "Preparing test set…" : "Create audit"}
        </button>
      </form>
    </main>
  );
}
