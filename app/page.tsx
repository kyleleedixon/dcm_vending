import { getDevices, getMachineLastSales } from "@/lib/nayax";
import { MachineCard } from "@/components/machine-card";

export const revalidate = 60;

export default async function DashboardPage() {
  let devices: Awaited<ReturnType<typeof getDevices>> = [];
  let error: string | null = null;

  try {
    devices = await getDevices();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load machines";
  }

  const machinesWithSales = await Promise.all(
    devices.map(async (device) => ({
      device,
      sales: await getMachineLastSales(device.machineId),
    }))
  );

  const onlineCount = devices.filter((d) => d.isConnected).length;

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

        {!error && devices.length === 0 && (
          <p className="text-center text-muted-foreground py-16">No machines found on your account.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {machinesWithSales.map(({ device, sales }) => (
            <MachineCard key={device.deviceId} device={device} sales={sales} />
          ))}
        </div>
      </main>
    </div>
  );
}
