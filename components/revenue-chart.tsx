"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface RevenueByMachine {
  name: string;
  revenue: number;
  transactions: number;
}

interface RevenueChartProps {
  data: RevenueByMachine[];
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
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={data.length > 4 ? -30 : 0}
          textAnchor={data.length > 4 ? "end" : "middle"}
          height={data.length > 4 ? 50 : 30}
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
          contentStyle={{
            borderRadius: "6px",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]} className="fill-primary" />
      </BarChart>
    </ResponsiveContainer>
  );
}
