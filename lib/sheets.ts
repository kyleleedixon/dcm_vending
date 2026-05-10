import { NayaxMachineProduct } from "@/lib/nayax";

const SHEET_ID = "1Rmyu2g1DoCt2IlX9fYrQzOHVXz0ZAn3_2YdTIkMW5hg";

export type AlertLevel = "critical" | "warning";

export interface InventoryAlert {
  item: string;
  category: "drinks" | "snacks";
  level: AlertLevel;
  reason: string;
  detail?: string;
  // Machine inventory from Nayax (what's physically in the machine)
  machineInventory: number | null;
  machinePar: number | null;
  // Extra stock from sheet (backup supply for restocking)
  extraStock: number | null;
  extraStockPar: number | null;
  store: string;
}

interface ParsedItem {
  item: string;
  category: "drinks" | "snacks";
  extraStock: number | null;
  extraStockPar: number | null;
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
    const invRaw = row[invCol]?.trim();
    const extraStock = invRaw ? parseInt(invRaw, 10) || 0 : null;
    return [{
      item,
      category,
      extraStock,
      extraStockPar: parseInt(row[parCol] ?? "0", 10) || 0,
      expiry,
      daysToExpiry: expiry ? daysFromNow(expiry) : null,
      store: row[storeCol]?.trim() ?? "",
    }];
  });
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildMachineProductMap(products: NayaxMachineProduct[]): Map<string, NayaxMachineProduct> {
  const map = new Map<string, NayaxMachineProduct>();
  for (const p of products) {
    map.set(normalizeName(p.productName), p);
  }
  return map;
}

function buildAlerts(
  items: ParsedItem[],
  machineProductMap: Map<string, NayaxMachineProduct>
): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];

  for (const item of items) {
    const machineProduct = machineProductMap.get(normalizeName(item.item));
    const machineInventory = machineProduct?.machineInventory ?? null;
    const machinePar = machineProduct?.machinePar ?? null;
    const isVendedOut = machineProduct?.isVendedOut ?? false;
    const { daysToExpiry, extraStock, extraStockPar } = item;

    const base = {
      item: item.item,
      category: item.category,
      store: item.store,
      machineInventory,
      machinePar,
      extraStock,
      extraStockPar,
    };

    // Already expired
    if (daysToExpiry !== null && daysToExpiry < 0) {
      alerts.push({ ...base, level: "critical", reason: "Expired — remove from machine" });
      continue;
    }

    // Machine slot vended out (empty in machine)
    if (isVendedOut || machineInventory === 0) {
      alerts.push({ ...base, level: "critical", reason: "Out of stock in machine" });
      continue;
    }

    // Machine running low (below vend-out threshold, or below 25% of par)
    if (machineInventory !== null && machinePar !== null && machinePar > 0) {
      const threshold = machineProduct?.vendOutThreshold ?? Math.ceil(machinePar * 0.25);
      if (machineInventory <= threshold) {
        alerts.push({
          ...base,
          level: machineInventory <= (machineProduct?.vendOutThreshold ?? 1) ? "critical" : "warning",
          reason: `Low in machine — ${machineInventory} of ${machinePar}`,
          detail: extraStock !== null ? `${extraStock} extra in stock` : undefined,
        });
        continue;
      }
    }

    // Expiring soon
    if (daysToExpiry !== null && daysToExpiry <= 7) {
      alerts.push({
        ...base,
        level: "critical",
        reason: `Expires in ${daysToExpiry} day${daysToExpiry !== 1 ? "s" : ""}`,
      });
      continue;
    }
    if (daysToExpiry !== null && daysToExpiry <= 30) {
      alerts.push({
        ...base,
        level: "warning",
        reason: `Expires in ${daysToExpiry} days`,
      });
      continue;
    }

    // No extra stock to restock with
    if (extraStock === 0) {
      alerts.push({ ...base, level: "warning", reason: "No extra stock — order now" });
      continue;
    }

    // Extra stock below par
    if (extraStock !== null && extraStockPar !== null && extraStockPar > 0 && extraStock < extraStockPar) {
      alerts.push({
        ...base,
        level: extraStock < extraStockPar * 0.5 ? "critical" : "warning",
        reason: `Low extra stock — ${extraStock} of ${extraStockPar} par`,
      });
    }
  }

  return alerts.sort((a, b) =>
    (a.level === "critical" ? 0 : 1) - (b.level === "critical" ? 0 : 1) ||
    a.item.localeCompare(b.item)
  );
}

export async function getInventoryAlerts(
  machineProducts: { drinks: NayaxMachineProduct[]; snacks: NayaxMachineProduct[] }
): Promise<InventoryAlert[]> {
  const [drinkRows, snackRows] = await Promise.all([
    fetchCsv("Drinks"),
    fetchCsv("Snacks"),
  ]);

  const drinks = parseItems(drinkRows, "drinks");
  const snacks = parseItems(snackRows, "snacks");

  const drinkMap = buildMachineProductMap(machineProducts.drinks);
  const snackMap = buildMachineProductMap(machineProducts.snacks);

  return [
    ...buildAlerts(drinks, drinkMap),
    ...buildAlerts(snacks, snackMap),
  ].sort((a, b) =>
    (a.level === "critical" ? 0 : 1) - (b.level === "critical" ? 0 : 1)
  );
}
