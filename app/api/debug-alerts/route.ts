import { getDevices, getMachineProducts, NayaxMachineProduct } from "@/lib/nayax";

const SHEET_ID = "1Rmyu2g1DoCt2IlX9fYrQzOHVXz0ZAn3_2YdTIkMW5hg";

function machineCategory(name: string): "drinks" | "snacks" | null {
  if (/\b13\b/.test(name)) return "drinks";
  if (/\b14\b/.test(name)) return "snacks";
  return null;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
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

async function fetchCsv(sheet: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status}`);
  const text = await res.text();
  return text.split("\n").map((line) => {
    const cols: string[] = [];
    let cur = "", inQuotes = false;
    for (const ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === "," && !inQuotes) { cols.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  }).filter((r) => r.some((c) => c !== ""));
}

function parseExpiredItems(rows: string[][], category: "drinks" | "snacks") {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.findIndex((h) => h.includes(name));
  const itemCol = idx("item");
  const expiryCol = idx("expiry");

  return rows.slice(1).flatMap((row) => {
    const item = row[itemCol]?.trim();
    if (!item) return [];
    const expiry = parseDate(row[expiryCol]?.trim() ?? "");
    const daysToExpiry = expiry ? daysFromNow(expiry) : null;
    if (daysToExpiry === null || daysToExpiry >= 0) return [];
    return [{ item, category, daysToExpiry }];
  });
}

export async function GET() {
  const devices = await getDevices();
  const machineProducts: { drinks: NayaxMachineProduct[]; snacks: NayaxMachineProduct[] } = { drinks: [], snacks: [] };

  for (const device of devices) {
    const cat = machineCategory(device.machineName);
    if (cat) machineProducts[cat] = await getMachineProducts(device.machineId);
  }

  const drinkMap = new Map(machineProducts.drinks.map((p) => [normalizeName(p.productName), p]));
  const snackMap = new Map(machineProducts.snacks.map((p) => [normalizeName(p.productName), p]));

  const [drinkRows, snackRows] = await Promise.all([fetchCsv("Drinks"), fetchCsv("Snacks")]);

  const expiredItems = [
    ...parseExpiredItems(drinkRows, "drinks"),
    ...parseExpiredItems(snackRows, "snacks"),
  ].map((i) => {
    const map = i.category === "drinks" ? drinkMap : snackMap;
    const normalized = normalizeName(i.item);
    const mp = map.get(normalized);
    const machineInventory = mp?.machineInventory ?? null;
    const isVendedOut = mp?.isVendedOut ?? false;
    return {
      item: i.item,
      category: i.category,
      daysToExpiry: i.daysToExpiry,
      normalizedName: normalized,
      nayaxMatch: mp?.productName ?? null,
      machineInventory,
      machinePar: mp?.machinePar ?? null,
      isVendedOut,
      alertReason: machineInventory !== null && machineInventory > 0 && !isVendedOut
        ? "Expired — remove from machine"
        : "Expired — re-order needed",
    };
  });

  return Response.json({
    expiredItems,
    devices: devices.map((d) => ({ name: d.machineName, id: d.machineId, category: machineCategory(d.machineName) })),
    nayaxProducts: {
      drinks: machineProducts.drinks.map((p) => ({ name: p.productName, normalized: normalizeName(p.productName), inventory: p.machineInventory, par: p.machinePar, isVendedOut: p.isVendedOut })),
      snacks: machineProducts.snacks.map((p) => ({ name: p.productName, normalized: normalizeName(p.productName), inventory: p.machineInventory, par: p.machinePar, isVendedOut: p.isVendedOut })),
    },
  });
}
