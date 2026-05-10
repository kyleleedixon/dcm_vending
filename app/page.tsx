import { getDevices, getMachineLastSales, getMachineAlerts } from "@/lib/nayax";
import { MachineCard } from "@/components/machine-card";
import { StatsBar } from "@/components/stats-bar";
import { RevenueChart, RevenueByMachine } from "@/components/revenue-chart";
import { AlertsPanel, MachineAlerts } from "@/components/alerts-panel";

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

  const machineData = await Promise.all(
    devices.map(async (device) => ({
      device,
      sales: await getMachineLastSales(device.machineId),
      alerts: await getMachineAlerts(device.machineId),
    }))
  );

  const allSales = machineData.flatMap((m) => m.sales);
  const currencyCode = allSales.find((s) => s.currencyCode)?.currencyCode ?? "USD";
  const onlineCount = devices.filter((d) => d.isConnected).length;

  const revenueByMachine: RevenueByMachine[] = machineData.map(({ device, sales }) => {
    const todaySales = sales.filter((s) => isToday(s.authorizedAt));
    return {
      name: device.machineName ?? `Machine ${device.machineId}`,
      revenue: todaySales.reduce((sum, s) => sum + (s.settledAmount || s.authorizedAmount), 0),
      transactions: todaySales.length,
    };
  });

  const machineAlerts: MachineAlerts[] = machineData.map(({ device, alerts }) => ({
    machineId: device.machineId,
    machineName: device.machineName ?? `Machine ${device.machineId}`,
    alerts,
  }));

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

            <AlertsPanel machineAlerts={machineAlerts} />

            <div className="rounded-lg border bg-card p-4 mb-8">
              <h2 className="text-sm font-semibold mb-4">Revenue Today by Machine</h2>
              <RevenueChart data={revenueByMachine} currencyCode={currencyCode} />
            </div>
          </>
        )}

        {!error && devices.length === 0 && (
          <p className="text-center text-muted-foreground py-16">No machines found on your account.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {machineData.map(({ device, sales, alerts }) => (
            <MachineCard key={device.deviceId} device={device} sales={sales} alertCount={alerts.length} />
          ))}
        </div>
      </main>
    </div>
  );
}
