const LYNX_BASE = "https://lynx.nayax.com/operational";

let sessionToken: string | null = null;

async function getSessionToken(): Promise<string> {
  if (sessionToken) return sessionToken;

  const apiKey = process.env.NAYAX_API_TOKEN;
  const username = process.env.NAYAX_USERNAME;
  const password = process.env.NAYAX_PASSWORD;

  if (!apiKey || !username || !password) {
    throw new Error("Missing NAYAX_API_TOKEN, NAYAX_USERNAME, or NAYAX_PASSWORD");
  }

  const res = await fetch(`${LYNX_BASE}/v1/signin`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ usr: username, pwd: password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Nayax sign-in failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  sessionToken = data.token ?? data.accessToken ?? data.access_token ?? data;
  if (!sessionToken) throw new Error("Nayax sign-in returned no token");
  return sessionToken;
}

async function getHeaders() {
  const token = await getSessionToken();
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
    `${LYNX_BASE}/api/v1/devices?pageSize=${pageSize}`,
    { headers: await getHeaders(), next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`Nayax devices error: ${res.status}`);
  const data = await res.json();
  return data.items ?? data ?? [];
}

export async function getMachineLastSales(machineId: number): Promise<NayaxSale[]> {
  const res = await fetch(
    `${LYNX_BASE}/api/v1/machines/${machineId}/lastSales`,
    { headers: await getHeaders(), next: { revalidate: 60 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
