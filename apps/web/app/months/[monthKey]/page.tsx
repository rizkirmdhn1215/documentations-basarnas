"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiSend } from "@/lib/api";
import { CategorySummary } from "@records/shared";

export default function MonthDetailPage() {
  const params = useParams<{ monthKey: string }>();
  const monthKey = params.monthKey;
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await apiGet<CategorySummary[]>(`/v1/months/${monthKey}/categories`);
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    }
  }, [monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function createCategory() {
    if (!newName.trim()) return;
    try {
      setBusy(true);
      await apiSend(`/v1/months/${monthKey}/categories`, {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function renameCategory(categoryId: string, current: string) {
    const name = window.prompt("New category name", current);
    if (!name || name === current) return;

    try {
      setBusy(true);
      await apiSend(`/v1/categories/${categoryId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(categoryId: string) {
    if (!window.confirm("Delete this category?")) return;

    try {
      setBusy(true);
      await apiSend(`/v1/categories/${categoryId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <Link href="/" className="mb-6 inline-flex text-sm text-black/70 hover:text-ink">
        Back to months
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Month detail</p>
          <h1 className="text-3xl font-bold">{monthKey}</h1>
        </div>
      </div>

      <section className="panel mb-6 p-4">
        <h2 className="mb-3 text-lg font-semibold">Add category</h2>
        <div className="flex gap-2">
          <input className="input" placeholder="Category name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn-primary" disabled={busy} onClick={createCategory}>Create</button>
        </div>
      </section>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2">
        {categories.map((category) => (
          <article key={category.id} className="panel p-4">
            <Link href={`/categories/${category.id}`} className="block">
              <h3 className="text-xl font-semibold">{category.name}</h3>
            </Link>
            <p className="mt-2 text-sm text-black/65">{category.entryCount} entries</p>
            <div className="mt-4 flex gap-2">
              <button className="btn-secondary" onClick={() => renameCategory(category.id, category.name)} disabled={busy}>
                Edit
              </button>
              <button className="btn-secondary" onClick={() => deleteCategory(category.id)} disabled={busy}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
