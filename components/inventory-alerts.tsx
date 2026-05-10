import { InventoryAlert } from "@/lib/sheets";
import { AlertTriangle, ShoppingCart, Clock } from "lucide-react";

interface InventoryAlertsProps {
  alerts: InventoryAlert[];
  sheetError?: boolean;
}

const levelStyles = {
  critical: {
    row: "bg-red-50 dark:bg-red-950/20",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    icon: "text-red-500",
  },
  warning: {
    row: "bg-amber-50 dark:bg-amber-950/20",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    icon: "text-amber-500",
  },
  info: {
    row: "",
    badge: "bg-muted text-muted-foreground",
    icon: "text-muted-foreground",
  },
};

function AlertIcon({ reason }: { reason: string }) {
  const cls = "h-3.5 w-3.5 shrink-0 mt-0.5";
  if (reason.startsWith("Out")) return <ShoppingCart className={cls} />;
  if (reason.startsWith("Expires") || reason.startsWith("Expired")) return <Clock className={cls} />;
  return <AlertTriangle className={cls} />;
}

export function InventoryAlerts({ alerts, sheetError }: InventoryAlertsProps) {
  if (sheetError || alerts.length === 0) {
    return (
      <div className="rounded-lg border bg-card mb-8 px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Inventory Alerts</h2>
        <span className="text-xs text-muted-foreground">
          {sheetError
            ? "⚠ Stock List sheet is not publicly shared — open it and set to Anyone with link → Viewer"
            : "All good — no alerts right now"}
        </span>
      </div>
    );
  }

  const critical = alerts.filter((a) => a.level === "critical");
  const warning = alerts.filter((a) => a.level === "warning");

  return (
    <div className="rounded-lg border bg-card mb-8">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">Inventory Alerts</h2>
        <div className="flex items-center gap-2 text-xs">
          {critical.length > 0 && (
            <span className="rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 font-medium">
              {critical.length} critical
            </span>
          )}
          {warning.length > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 font-medium">
              {warning.length} warning
            </span>
          )}
        </div>
      </div>

      <div className="divide-y">
        {alerts.map((alert, i) => {
          const styles = levelStyles[alert.level];
          return (
            <div key={`${alert.category}-${alert.item}-${i}`} className={`flex items-start gap-3 px-4 py-2.5 ${styles.row}`}>
              <span className={styles.icon}>
                <AlertIcon reason={alert.reason} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{alert.item}</span>
                  <span className="text-xs text-muted-foreground capitalize">{alert.category}</span>
                  {alert.store && (
                    <span className="text-xs text-muted-foreground">· {alert.store}</span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 font-medium ${styles.icon}`}>{alert.reason}</p>
                {alert.detail && (
                  <p className="text-xs text-muted-foreground">{alert.detail}</p>
                )}
              </div>
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium shrink-0 ${styles.badge}`}>
                {alert.inventory ?? "?"} / {alert.par} par
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
