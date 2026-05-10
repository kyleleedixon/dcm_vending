import { getDevices, getMachineLastSales } from "@/lib/nayax";
import { getInventoryAlerts, InventoryAlert } from "@/lib/sheets";
import { MachineCard } from "@/components/machine-card";
import { StatsBar } from "@/components/stats-bar";
import { RevenueChart, RevenueDayData } from "@/components/revenue-chart";
import { InventoryAlerts } from "@/components/inventory-alerts";

export const revalidate = 60;

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export default async function DashboardPage() {
  let devices: Awaited<ReturnType<typeof getDevices>> = [];
  let error: string | null = null;

  try {
    devices = await getDevices();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load machines";
  }

  let inventoryAlerts: InventoryAlert[] = [];
  try {
    inventoryAlerts = await getInventoryAlerts();
  } catch {
    // API key not yet configured — silently skip
  }

  const machineData = await Promise.all(
    devices.map(async (device) => ({
      device,
      sales: await getMachineLastSales(device.machineId),
    }))
  );

  const allSales = machineData.flatMap((m) => m.sales);
  const currencyCode = allSales.find((s) => s.currencyCode)?.currencyCode ?? "USD";
  const onlineCount = devices.filter((d) => d.isConnected).length;

  // Group all sales by calendar day, sorted chronologically
  const revenueByDay: RevenueDayData[] = (() => {
    const map = new Map<string, { revenue: number; transactions: number; ts: number }>();
    for (const sale of allSales) {
      const d = new Date(sale.authorizedAt);
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
      const monthDay = d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
      const key = `${weekday} ${monthDay}`;
      const existing = map.get(key) ?? { revenue: 0, transactions: 0, ts: d.setHours(0, 0, 0, 0) };
      existing.revenue += sale.settledAmount || sale.authorizedAmount;
      existing.transactions += 1;
      map.set(key, existing);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].ts - b[1].ts)
      .map(([date, { revenue, transactions }]) => ({ date, revenue, transactions }));
  })();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">DCM Vending</h1>
            <p className="text-sm text-muted-foreground">Machine Dashboard</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{onlineCount} / {devices.length} online</p>
            <p>Refreshes every 60s</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 mb-6 text-sm text-destructive">
            {error}
          </div>
        )}

        {!error && devices.length > 0 && (
          <>
            <StatsBar
              onlineCount={onlineCount}
              totalCount={devices.length}
              allSales={allSales}
              currencyCode={currencyCode}
            />

            <InventoryAlerts alerts={inventoryAlerts} />

            <div className="rounded-lg border bg-card p-4 mb-8">
              <h2 className="text-sm font-semibold mb-4">Revenue Over Time</h2>
              <RevenueChart data={revenueByDay} currencyCode={currencyCode} />
            </div>
          </>
        )}

        {!error && devices.length === 0 && (
          <p className="text-center text-muted-foreground py-16">No machines found on your account.</p>
        )}

        <div className={`grid grid-cols-1 gap-6 ${machineData.length === 1 ? "" : machineData.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
          {machineData.map(({ device, sales }) => (
            <MachineCard key={device.deviceId} device={device} sales={sales} />
          ))}
        </div>
      </main>
    </div>
  );
}
