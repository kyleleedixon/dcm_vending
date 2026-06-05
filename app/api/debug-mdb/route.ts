import { getDevices, getMachineProducts, getOperatorProducts } from "@/lib/nayax";

function machineCategory(name: string): "drinks" | "snacks" | null {
  if (/\b13\b/.test(name)) return "drinks";
  if (/\b14\b/.test(name)) return "snacks";
  return null;
}

export async function GET() {
  const devices = await getDevices();
  const actorId = devices[0]?.actorId;
  const productNames = actorId ? await getOperatorProducts(actorId) : new Map<number, string>();

  const results: Record<string, unknown> = {};
  for (const device of devices) {
    const cat = machineCategory(device.machineName);
    if (!cat) continue;
    const products = await getMachineProducts(device.machineId, productNames);
    results[device.machineName] = products.map((p) => ({
      name: p.productName,
      mdbCode: p.mdbCode,
      inventory: p.machineInventory,
      par: p.machinePar,
    }));
  }

  return Response.json(results);
}
