const LYNX_BASE = "https://lynx.nayax.com/operational";

function getHeaders() {
  const token = process.env.NAYAX_API_TOKEN;
  if (!token) throw new Error("NAYAX_API_TOKEN is not set");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export interface NayaxDevice {
  deviceId: number;
  nayaxDeviceSerial: string;
  isConnected: boolean;
  statusId: number;
  machineId?: number;
  machineName?: string;
  actorId?: number;
  createdDt?: string;
  updatedDt?: string;
}

export interface NayaxSale {
  transactionId: string;
  machineId: number;
  authorizedAmount: number;
  settledAmount: number;
  currencyCode: string;
  paymentMethod: string;
  cardBrand?: string;
  productName?: string;
  quantity?: number;
  authorizedAt: string;
  settledAt?: string;
}

export async function getDevices(pageSize = 100): Promise<NayaxDevice[]> {
  const res = await fetch(
    `${LYNX_BASE}/v1/devices?pageSize=${pageSize}`,
    { headers: getHeaders(), next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`Nayax devices error: ${res.status}`);
  const data = await res.json();
  return data.items ?? data ?? [];
}

export async function getMachineLastSales(machineId: number): Promise<NayaxSale[]> {
  const res = await fetch(
    `${LYNX_BASE}/api/v1/machines/${machineId}/lastSales`,
    { headers: getHeaders(), next: { revalidate: 60 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
