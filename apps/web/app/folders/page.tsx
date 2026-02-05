"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MonthSummary } from "@records/shared";
import { apiGet } from "@/lib/api";

function splitMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return { year, month };
}

export default function FolderPickerPage() {
  const router = useRouter();
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<MonthSummary[]>("/v1/months");
        setMonths(data);
        if (data.length > 0) {
          const first = splitMonthKey(data[0].monthKey);
          setSelectedYear(first.year);
          setSelectedMonth(first.month);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load folders");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const years = useMemo(() => {
    const unique = new Set(months.map((m) => splitMonthKey(m.monthKey).year));
    return Array.from(unique).sort((a, b) => b.localeCompare(a));
  }, [months]);

  const monthsByYear = useMemo(() => {
    return months
      .filter((m) => splitMonthKey(m.monthKey).year === selectedYear)
      .map((m) => splitMonthKey(m.monthKey).month)
      .sort((a, b) => b.localeCompare(a));
  }, [months, selectedYear]);

  function openFolder() {
    if (!selectedYear || !selectedMonth) return;
    router.push(`/folders/${selectedYear}-${selectedMonth}`);
  }

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Folder browser</p>
          <h1 className="text-3xl font-bold">Choose Year and Month</h1>
        </div>
        <Link href="/" className="btn-secondary">Back</Link>
      </div>

      <section className="panel mb-6 p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <select className="input" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select className="input" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            {monthsByYear.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={openFolder}>Open folder</button>
        </div>
      </section>

      {loading ? <p className="text-sm">Loading folders...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2">
        {months.map((month) => (
          <Link key={month.monthKey} href={`/folders/${month.monthKey}`} className="panel p-5 hover:border-tide/60">
            <h2 className="text-2xl font-semibold">{month.monthKey}</h2>
            <p className="mt-2 text-sm text-black/70">{month.categoryCount} categories • {month.entryCount} entries</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
