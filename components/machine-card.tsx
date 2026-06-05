"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GlassWater, Cookie } from "lucide-react";
import { NayaxDevice, NayaxMachineProduct, NayaxSale } from "@/lib/nayax";

function MachineIcon({ name }: { name: string }) {
  if (/\b13\b/.test(name)) return <GlassWater className="h-4 w-4 text-blue-400 shrink-0" />;
  if (/\b14\b/.test(name)) return <Cookie className="h-4 w-4 text-amber-400 shrink-0" />;
  return null;
}

interface MachineCardProps {
  device: NayaxDevice;
  sales: NayaxSale[];
  products: NayaxMachineProduct[];
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function cleanProductName(raw: string): string {
  return raw.replace(/\s*\(\d+\s*=\s*[\d.]+\)\s*$/, "").trim();
}

function isValidProductName(name: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return lower !== "unknown" && lower !== "n/a" && lower !== "-";
}

function buildSalesCounts(sales: NayaxSale[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sales) {
    if (!s.productName) continue;
    const name = cleanProductName(s.productName);
    if (!isValidProductName(name)) continue;
    map.set(name, (map.get(name) ?? 0) + (s.quantity || 1));
  }
  return map;
}

export function MachineCard({ device, sales, products }: MachineCardProps) {
  const lastSale = sales[0];
  const totalToday = sales
    .filter((s) => new Date(s.authorizedAt).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + s.settledAmount, 0);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const recentSales = sales.filter((s) => new Date(s.authorizedAt) >= cutoff);

  const oldestSale = recentSales.length > 0
    ? new Date(Math.min(...recentSales.map((s) => new Date(s.authorizedAt).getTime())))
    : null;
  const windowDays = oldestSale ? Math.round((Date.now() - oldestSale.getTime()) / 86400000) : null;

  const salesCounts = buildSalesCounts(recentSales);
  const topSellers = [...salesCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const slowMovers = products
    .map((p) => ({ name: p.productName, count: salesCounts.get(p.productName) ?? 0 }))
    .filter((p) => isValidProductName(p.name))
    .sort((a, b) => a.count - b.count)
    .slice(0, 5);

  const hasRankings = topSellers.length > 0 || slowMovers.length > 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-1.5 leading-tight">
            <MachineIcon name={device.machineName ?? ""} />
            {device.machineName ?? `Machine ${device.machineId ?? device.deviceId}`}
          </CardTitle>
          <Badge variant={device.isConnected ? "default" : "secondary"} className="shrink-0">
            {device.isConnected ? "Online" : "Offline"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Serial: {device.nayaxDeviceSerial}</p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-0">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Today&apos;s Sales</p>
            <p className="text-lg font-bold leading-tight">
              {sales.length > 0 ? formatCurrency(totalToday, lastSale?.currencyCode ?? "USD") : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Last Sale</p>
            <p className="text-sm font-medium leading-tight">
              {lastSale ? formatDate(lastSale.authorizedAt) : "No data"}
            </p>
          </div>
        </div>

        {/* Sales Rankings */}
        {hasRankings && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Sales Rankings{windowDays ? ` · Last ${windowDays}d` : ""}
            </p>
            <div className="grid grid-cols-2 gap-x-4">
              {/* Top Sellers */}
              <div>
                <p className="text-xs font-semibold mb-2 text-green-600 dark:text-green-400">Top Sellers</p>
                <div className="space-y-1.5">
                  {topSellers.map(([name, count], i) => (
                    <div key={name} className="flex items-center gap-2 text-xs min-w-0">
                      <span className="text-muted-foreground font-mono w-4 shrink-0 text-right">{i + 1}</span>
                      <span className="truncate flex-1 text-foreground">{name}</span>
                      <span className="font-semibold text-foreground shrink-0 tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Slow Movers */}
              <div>
                <p className="text-xs font-semibold mb-2 text-amber-600 dark:text-amber-400">Slow Movers</p>
                <div className="space-y-1.5">
                  {slowMovers.map(({ name, count }, i) => (
                    <div key={name} className="flex items-center gap-2 text-xs min-w-0">
                      <span className="text-muted-foreground font-mono w-4 shrink-0 text-right">{i + 1}</span>
                      <span className="truncate flex-1 text-foreground">{name}</span>
                      <span className="font-semibold text-foreground shrink-0 tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Sales */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Recent Sales
          </p>
          {sales.length > 0 ? (
            <div className="space-y-1.5">
              {sales.slice(0, 5).map((sale) => (
                <div key={sale.transactionId} className="flex items-center justify-between text-xs gap-3 min-w-0">
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {formatDate(sale.authorizedAt)}
                  </span>
                  <span className="truncate flex-1 text-center text-foreground">
                    {cleanProductName(sale.productName ?? "") || "—"}
                  </span>
                  <span className="font-semibold shrink-0 tabular-nums">
                    {formatCurrency(sale.settledAmount || sale.authorizedAmount, sale.currencyCode)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">No recent sales</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
