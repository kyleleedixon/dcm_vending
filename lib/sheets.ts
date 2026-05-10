const SHEET_ID = "1Rmyu2g1DoCt2IlX9fYrQzOHVXz0ZAn3_2YdTIkMW5hg";

export type AlertLevel = "critical" | "warning" | "info";

export interface InventoryItem {
  item: string;
  category: "drinks" | "snacks";
  inventory: number;
  par: number;
  expiry: Date | null;
  daysToExpiry: number | null;
  store: string;
  slot: string;
}

export interface InventoryAlert {
  item: string;
  category: "drinks" | "snacks";
  level: AlertLevel;
  reason: string;
  inventory: number;
  par: number;
  store: string;
}

async function fetchSheetValues(sheetName: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Sheets fetch error: ${res.status}`);
  const csv = await res.text();
  return parseCsv(csv);
}

function parseCsv(csv: string): string[][] {
  return csv.split("\n").map((line) => {
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { cols.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols;
  }).filter((row) => row.some((c) => c !== ""));
}

function parseExpiry(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function parseSheet(rows: string[][], category: "drinks" | "snacks"): InventoryItem[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());

  const col = (name: string) => headers.findIndex((h) => h.includes(name));
  const itemCol = col("item");
  const parCol = col("par");
  const invCol = col("inventory");
  const expiryCol = col("expiry") !== col("days") ? col("expiry") : -1;
  const storeCol = col("store");
  const slotCol = col("slot");

  return rows.slice(1).flatMap((row) => {
    const item = row[itemCol]?.trim();
    if (!item) return [];

    const inventory = parseInt(row[invCol] ?? "0", 10) || 0;
    const par = parseInt(row[parCol] ?? "0", 10) || 0;
    const expiryRaw = expiryCol >= 0 ? row[expiryCol]?.trim() : "";
    const expiry = parseExpiry(expiryRaw ?? "");
    const daysToExpiry = expiry ? daysUntil(expiry) : null;

    return [{
      item,
      category,
      inventory,
      par,
      expiry,
      daysToExpiry,
      store: row[storeCol]?.trim() ?? "",
      slot: row[slotCol]?.trim() ?? "",
    }];
  });
}

function buildAlerts(items: InventoryItem[]): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];

  for (const item of items) {
    // Out of stock
    if (item.inventory === 0) {
      alerts.push({
        ...item,
        level: "critical",
        reason: "Out of stock",
      });
      continue;
    }

    // Expiring very soon (≤7 days)
    if (item.daysToExpiry !== null && item.daysToExpiry <= 7) {
      alerts.push({
        ...item,
        level: "critical",
        reason: `Expires in ${item.daysToExpiry} day${item.daysToExpiry !== 1 ? "s" : ""}`,
      });
    // Expiring within 30 days
    } else if (item.daysToExpiry !== null && item.daysToExpiry <= 30) {
      alerts.push({
        ...item,
        level: "warning",
        reason: `Expires in ${item.daysToExpiry} days`,
      });
    }

    // Below par (and not already flagged for expiry)
    const alreadyFlagged = alerts.some((a) => a.item === item.item && a.category === item.category);
    if (!alreadyFlagged && item.par > 0 && item.inventory < item.par) {
      alerts.push({
        ...item,
        level: item.inventory < item.par * 0.5 ? "critical" : "warning",
        reason: `Low stock: ${item.inventory} of ${item.par} par`,
      });
    }
  }

  // Sort: critical first, then warning, then by item name
  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.level] - order[b.level] || a.item.localeCompare(b.item);
  });
}

export async function getInventoryAlerts(): Promise<InventoryAlert[]> {
  const [drinkRows, snackRows] = await Promise.all([
    fetchSheetValues("Drinks"),
    fetchSheetValues("Snacks"),
  ]);

  const drinks = parseSheet(drinkRows, "drinks");
  const snacks = parseSheet(snackRows, "snacks");

  return buildAlerts([...drinks, ...snacks]);
}
