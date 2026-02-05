"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MonthSummary } from "@records/shared";
import { apiGet } from "@/lib/api";

export default function MonthsPage() {
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setError("");
        const data = await apiGet<MonthSummary[]>("/v1/months");
        setMonths(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load months");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const content = useMemo(() => {
    if (loading) return <p className="text-sm">Loading months...</p>;
    if (error) return <p className="text-sm text-red-600">{error}</p>;
    if (!months.length) return <p className="text-sm">No records yet. Create your first category in a month page.</p>;

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {months.map((month) => (
          <Link key={month.monthKey} href={`/months/${month.monthKey}`} className="panel p-5 hover:border-tide/60">
            <p className="text-xs font-semibold uppercase tracking-widest text-black/55">Month</p>
            <h2 className="mt-1 text-2xl font-semibold">{month.monthKey}</h2>
            <div className="mt-4 flex gap-4 text-sm text-black/70">
              <span>{month.categoryCount} categories</span>
              <span>{month.entryCount} entries</span>
            </div>
          </Link>
        ))}
      </div>
    );
  }, [error, loading, months]);

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Records</p>
          <h1 className="text-3xl font-bold">Monthly Records</h1>
        </div>
        <Link href="/folders" className="btn-primary">
          Open folder picker
        </Link>
      </header>

      {content}
    </main>
  );
}
