const SHEET_ID = "1Rmyu2g1DoCt2IlX9fYrQzOHVXz0ZAn3_2YdTIkMW5hg";

export type AlertLevel = "critical" | "warning";

export interface InventoryAlert {
  item: string;
  category: "drinks" | "snacks";
  level: AlertLevel;
  reason: string;
  detail?: string;
  inventory: number;
  par: number;
  store: string;
}

interface ParsedItem {
  item: string;
  category: "drinks" | "snacks";
  inventory: number;
  par: number;
  expiry: Date | null;
  daysToExpiry: number | null;
  store: string;
}

async function fetchCsv(sheetName: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Sheets fetch error: ${res.status}`);
  return parseCsv(await res.text());
}

function parseCsv(csv: string): string[][] {
  return csv.split("\n").map((line) => {
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === "," && !inQuotes) { cols.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  }).filter((row) => row.some((c) => c !== ""));
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function daysFromNow(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - now.getTime()) / 86400000);
}

function parseItems(rows: string[][], category: "drinks" | "snacks"): ParsedItem[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.findIndex((h) => h.includes(name));

  const itemCol = idx("item");
  const parCol = idx("par");
  const invCol = idx("inventory");
  // "expiry" must match before "days to expiry" — findIndex returns first match
  const expiryCol = idx("expiry");
  const storeCol = idx("store");

  return rows.slice(1).flatMap((row) => {
    const item = row[itemCol]?.trim();
    if (!item) return [];
    const expiry = parseDate(row[expiryCol]?.trim() ?? "");
    return [{
      item,
      category,
      inventory: parseInt(row[invCol] ?? "0", 10) || 0,
      par: parseInt(row[parCol] ?? "0", 10) || 0,
      expiry,
      daysToExpiry: expiry ? daysFromNow(expiry) : null,
      store: row[storeCol]?.trim() ?? "",
    }];
  });
}

function buildAlerts(items: ParsedItem[], dailyRate: number): InventoryAlert[] {
  const ratePerItem = items.length > 0 && dailyRate > 0
    ? dailyRate / items.length
    : 0;

  const alerts: InventoryAlert[] = [];

  for (const item of items) {
    const daysUntilEmpty = ratePerItem > 0
      ? Math.round(item.inventory / ratePerItem)
      : null;
    const { daysToExpiry } = item;

    // Already expired
    if (daysToExpiry !== null && daysToExpiry < 0) {
      alerts.push({ ...item, level: "critical", reason: "Expired — remove from machine" });
      continue;
    }

    // Out of stock
    if (item.inventory === 0) {
      alerts.push({ ...item, level: "critical", reason: "Out of stock" });
      continue;
    }

    // Will expire before selling through
    if (daysToExpiry !== null && daysUntilEmpty !== null && daysToExpiry < daysUntilEmpty) {
      alerts.push({
        ...item,
        level: daysToExpiry <= 7 ? "critical" : "warning",
        reason: `Expires in ${daysToExpiry}d — won't sell through`,
        detail: `Projects empty in ${daysUntilEmpty}d`,
      });
      continue;
    }

    // Will run out soon (projection-based order alert)
    if (daysUntilEmpty !== null && daysUntilEmpty <= 14) {
      alerts.push({
        ...item,
        level: daysUntilEmpty <= 7 ? "critical" : "warning",
        reason: `Order now — projects empty in ${daysUntilEmpty} day${daysUntilEmpty !== 1 ? "s" : ""}`,
        detail: daysToExpiry !== null ? `Expires in ${daysToExpiry}d` : undefined,
      });
      continue;
    }

    // Expiring soon (will sell through in time, but worth flagging)
    if (daysToExpiry !== null && daysToExpiry <= 7) {
      alerts.push({
        ...item,
        level: "critical",
        reason: `Expires in ${daysToExpiry} day${daysToExpiry !== 1 ? "s" : ""}`,
        detail: daysUntilEmpty !== null ? `Projects empty in ${daysUntilEmpty}d` : undefined,
      });
      continue;
    }
    if (daysToExpiry !== null && daysToExpiry <= 30) {
      alerts.push({
        ...item,
        level: "warning",
        reason: `Expires in ${daysToExpiry} days`,
        detail: daysUntilEmpty !== null ? `Projects empty in ${daysUntilEmpty}d` : undefined,
      });
      continue;
    }

    // Below par fallback (when no projection data available)
    if (!daysUntilEmpty && item.par > 0 && item.inventory < item.par) {
      alerts.push({
        ...item,
        level: item.inventory < item.par * 0.5 ? "critical" : "warning",
        reason: `Low stock — ${item.inventory} of ${item.par} par`,
      });
    }
  }

  return alerts.sort((a, b) =>
    (a.level === "critical" ? 0 : 1) - (b.level === "critical" ? 0 : 1) ||
    a.item.localeCompare(b.item)
  );
}

export async function getInventoryAlerts(
  dailyRates: { drinks: number; snacks: number }
): Promise<InventoryAlert[]> {
  const [drinkRows, snackRows] = await Promise.all([
    fetchCsv("Drinks"),
    fetchCsv("Snacks"),
  ]);

  const drinks = parseItems(drinkRows, "drinks");
  const snacks = parseItems(snackRows, "snacks");

  return [
    ...buildAlerts(drinks, dailyRates.drinks),
    ...buildAlerts(snacks, dailyRates.snacks),
  ].sort((a, b) =>
    (a.level === "critical" ? 0 : 1) - (b.level === "critical" ? 0 : 1)
  );
}
