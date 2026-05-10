import { NayaxAlert } from "@/lib/nayax";
import { AlertTriangle } from "lucide-react";

export interface MachineAlerts {
  machineId: number;
  machineName: string;
  alerts: NayaxAlert[];
}

interface AlertsPanelProps {
  machineAlerts: MachineAlerts[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AlertsPanel({ machineAlerts }: AlertsPanelProps) {
  const withAlerts = machineAlerts.filter((m) => m.alerts.length > 0);

  if (withAlerts.length === 0) return null;

  const allAlerts = withAlerts.flatMap((m) =>
    m.alerts.slice(0, 3).map((a) => ({ ...a, machineName: m.machineName }))
  );

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Recent Alerts ({allAlerts.length})
        </h2>
      </div>
      <div className="space-y-2">
        {allAlerts.map((alert) => (
          <div
            key={alert.eventLogId}
            className="flex items-start justify-between text-xs gap-4"
          >
            <div className="min-w-0">
              <span className="font-medium text-amber-900 dark:text-amber-200">
                {alert.machineName}
              </span>
              <span className="text-amber-700 dark:text-amber-400 ml-2">
                {alert.eventGroupName ?? alert.entityTypeName ?? `Event ${alert.eventCode}`}
              </span>
              {alert.eventSourceName && (
                <span className="text-amber-600/70 dark:text-amber-500/70 ml-1">
                  · {alert.eventSourceName}
                </span>
              )}
            </div>
            <span className="text-amber-600/70 dark:text-amber-500/70 shrink-0">
              {formatDate(alert.eventDateTimeGMT)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
