"use client";

import { NayaxSale } from "@/lib/nayax";

interface StatsBarProps {
  onlineCount: number;
  totalCount: number;
  allSales: NayaxSale[];
  currencyCode: string;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export function StatsBar({ onlineCount, totalCount, allSales, currencyCode }: StatsBarProps) {
  const todaySales = allSales.filter((s) => isToday(s.authorizedAt));
  const totalRevenueToday = todaySales.reduce((sum, s) => sum + (s.settledAmount || s.authorizedAmount), 0);
  const offlineCount = totalCount - onlineCount;

  const stats = [
    {
      label: "Revenue Today",
      value: formatCurrency(totalRevenueToday, currencyCode),
      sub: `${todaySales.length} transactions`,
    },
    {
      label: "Machines Online",
      value: `${onlineCount} / ${totalCount}`,
      sub: offlineCount > 0 ? `${offlineCount} offline` : "All online",
      warn: offlineCount > 0,
    },
    {
      label: "Transactions Today",
      value: todaySales.length.toString(),
      sub: allSales.length > todaySales.length
        ? `${allSales.length} total in history`
        : "across all machines",
    },
    {
      label: "Avg per Machine",
      value: totalCount > 0
        ? formatCurrency(totalRevenueToday / totalCount, currencyCode)
        : "—",
      sub: "today",
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className={`text-2xl font-bold mt-1 ${stat.warn ? "text-destructive" : ""}`}>
            {stat.value}
          </p>
          <p className={`text-xs mt-0.5 ${stat.warn ? "text-destructive/70" : "text-muted-foreground"}`}>
            {stat.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
