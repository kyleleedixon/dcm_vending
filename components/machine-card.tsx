"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GlassWater, Cookie } from "lucide-react";
import { NayaxDevice, NayaxSale } from "@/lib/nayax";

function MachineIcon({ name }: { name: string }) {
  if (/\b13\b/.test(name)) return <GlassWater className="h-4 w-4 text-blue-400 shrink-0" />;
  if (/\b14\b/.test(name)) return <Cookie className="h-4 w-4 text-amber-400 shrink-0" />;
  return null;
}

interface MachineCardProps {
  device: NayaxDevice;
  sales: NayaxSale[];
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function MachineCard({ device, sales }: MachineCardProps) {
  const totalToday = sales
    .filter((s) => new Date(s.authorizedAt).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + s.settledAmount, 0);

  const lastSale = sales[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-1.5">
            <MachineIcon name={device.machineName ?? ""} />
            {device.machineName ?? `Machine ${device.machineId ?? device.deviceId}`}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Serial: {device.nayaxDeviceSerial}
          </p>
        </div>
        <Badge variant={device.isConnected ? "default" : "secondary"}>
          {device.isConnected ? "Online" : "Offline"}
        </Badge>
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
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[30%]">Time</TableHead>
                  <TableHead className="text-xs w-[30%]">Product</TableHead>
                  <TableHead className="text-xs w-[20%]">Method</TableHead>
                  <TableHead className="text-xs w-[20%] text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.slice(0, 5).map((sale) => (
                  <TableRow key={sale.transactionId}>
                    <TableCell className="text-xs whitespace-normal">{formatDate(sale.authorizedAt)}</TableCell>
                    <TableCell className="text-xs whitespace-normal">{sale.productName ?? "—"}</TableCell>
                    <TableCell className="text-xs whitespace-normal">{sale.paymentMethod ?? "—"}</TableCell>
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
