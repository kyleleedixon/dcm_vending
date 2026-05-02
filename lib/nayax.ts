const LYNX_BASE = "https://lynx.nayax.com/operational/v1";

function getHeaders() {
  const token = process.env.NAYAX_API_TOKEN?.trim();
  if (!token) throw new Error("NAYAX_API_TOKEN is not set");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// Raw shapes as returned by the Nayax API (PascalCase)
interface RawMachine {
  MachineID: number;
  ActorID: number;
  MachineName: string;
  MachineStatusBit: number;
  DeviceID?: number;
  DeviceSerialNumber?: string;
  CreatedOn?: string;
  LastUpdated?: string;
}

interface RawSale {
  TransactionID: number;
  MachineID: number;
  AuthorizationValue: number;
  SettlementValue: number;
  CurrencyCode: string;
  PaymentMethod: string;
  CardBrand?: string;
  ProductName?: string;
  Quantity?: number;
  AuthorizationDateTimeGMT: string;
  SettlementDateTimeGMT?: string;
}

export interface NayaxDevice {
  deviceId: number;
  nayaxDeviceSerial?: string;
  isConnected: boolean;
  statusId: number;
  machineId: number;
  machineName: string;
  actorId: number;
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

function mapMachine(m: RawMachine): NayaxDevice {
  return {
    deviceId: m.MachineID,
    nayaxDeviceSerial: m.DeviceSerialNumber,
    isConnected: m.MachineStatusBit === 1,
    statusId: m.MachineStatusBit,
    machineId: m.MachineID,
    machineName: m.MachineName,
    actorId: m.ActorID,
  };
}

function mapSale(s: RawSale): NayaxSale {
  return {
    transactionId: String(s.TransactionID),
    machineId: s.MachineID,
    authorizedAmount: s.AuthorizationValue,
    settledAmount: s.SettlementValue,
    currencyCode: s.CurrencyCode,
    paymentMethod: s.PaymentMethod,
    cardBrand: s.CardBrand,
    productName: s.ProductName,
    quantity: s.Quantity,
    authorizedAt: s.AuthorizationDateTimeGMT,
    settledAt: s.SettlementDateTimeGMT,
  };
}

export async function getDevices(pageSize = 100): Promise<NayaxDevice[]> {
  const res = await fetch(
    `${LYNX_BASE}/machines?ResultsLimit=${pageSize}`,
    { headers: getHeaders(), next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`Nayax machines error: ${res.status}`);
  const data = await res.json();
  const items: RawMachine[] = Array.isArray(data) ? data : (data.items ?? []);
  return items.map(mapMachine);
}

export async function getMachineLastSales(machineId: number): Promise<NayaxSale[]> {
  const res = await fetch(
    `${LYNX_BASE}/machines/${machineId}/lastSales`,
    { headers: getHeaders(), next: { revalidate: 60 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const items: RawSale[] = Array.isArray(data) ? data : [];
  return items.map(mapSale);
}
