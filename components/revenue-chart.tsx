"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface RevenueDayData {
  date: string;
  revenue: number;
  transactions: number;
}

interface RevenueChartProps {
  data: RevenueDayData[];
  currencyCode: string;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function RevenueChart({ data, currencyCode }: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-12">
        No sales data to display.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => `$${v}`}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value), currencyCode), "Revenue"]}
          labelStyle={{ fontWeight: 600 }}
          contentStyle={{ borderRadius: "6px", fontSize: "12px" }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-primary, #6366f1)"
          strokeWidth={2}
          fill="url(#revenueGradient)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
