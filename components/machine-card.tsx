import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NayaxDevice, NayaxSale } from "@/lib/nayax";

interface MachineCardProps {
  device: NayaxDevice;
  sales: NayaxSale[];
  alertCount?: number;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function MachineCard({ device, sales, alertCount = 0 }: MachineCardProps) {
  const totalToday = sales
    .filter((s) => new Date(s.authorizedAt).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + s.settledAmount, 0);

  const lastSale = sales[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">
            {device.machineName ?? `Machine ${device.machineId ?? device.deviceId}`}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Serial: {device.nayaxDeviceSerial}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {alertCount > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0">
              {alertCount} alert{alertCount !== 1 ? "s" : ""}
            </Badge>
          )}
          <Badge variant={device.isConnected ? "default" : "secondary"}>
            {device.isConnected ? "Online" : "Offline"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Today&apos;s Sales</p>
            <p className="text-xl font-bold">
              {sales.length > 0
                ? formatCurrency(totalToday, lastSale?.currencyCode ?? "USD")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Transaction</p>
            <p className="text-sm font-medium">
              {lastSale ? formatDate(lastSale.authorizedAt) : "No data"}
            </p>
          </div>
        </div>

        {sales.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Recent Sales</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs">Method</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.slice(0, 5).map((sale) => (
                  <TableRow key={sale.transactionId}>
                    <TableCell className="text-xs">{formatDate(sale.authorizedAt)}</TableCell>
                    <TableCell className="text-xs">{sale.productName ?? "—"}</TableCell>
                    <TableCell className="text-xs">{sale.paymentMethod ?? "—"}</TableCell>
                    <TableCell className="text-xs text-right">
                      {formatCurrency(sale.settledAmount || sale.authorizedAmount, sale.currencyCode)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {sales.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No recent sales</p>
        )}
      </CardContent>
    </Card>
  );
}
