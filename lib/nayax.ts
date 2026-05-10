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
  MachineName?: string;
  AuthorizationValue: number;
  SettlementValue: number;
  CurrencyCode: string;
  PaymentMethod: string;
  RecognitionMethod?: string;
  CardBrand?: string;
  ProductName?: string;
  Quantity?: number;
  AuthorizationDateTimeGMT: string;
  SettlementDateTimeGMT?: string;
  InstituteLocationName?: string;
}

interface RawMachineProduct {
  MachineProductID?: number;
  MachineID?: number;
  DEXProductName?: string | null;
  PAR?: number | null;
  MissingStockByDEX?: number | null;
  MissingStockByMDB?: number | null;
  SelectionVendOutBit?: boolean | null;
  VendOutAlertThreshold?: number | null;
}

export interface NayaxMachineProduct {
  machineProductId: number;
  productName: string;
  machinePar: number | null;
  machineInventory: number | null;
  isVendedOut: boolean;
  vendOutThreshold: number | null;
}

interface RawAlert {
  EventLogID: number;
  MachineID?: number;
  EventCode: number;
  EventGroupName?: string;
  EventGroupId?: number;
  EntityTypeName?: string;
  EventSourceName?: string;
  EventDateTimeGMT: string;
  TransactionID?: number;
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
  machineName?: string;
  authorizedAmount: number;
  settledAmount: number;
  currencyCode: string;
  paymentMethod: string;
  recognitionMethod?: string;
  cardBrand?: string;
  productName?: string;
  quantity?: number;
  authorizedAt: string;
  settledAt?: string;
  locationName?: string;
}

export interface NayaxAlert {
  eventLogId: number;
  machineId?: number;
  eventCode: number;
  eventGroupName?: string;
  entityTypeName?: string;
  eventSourceName?: string;
  eventDateTimeGMT: string;
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
    machineName: s.MachineName,
    authorizedAmount: s.AuthorizationValue,
    settledAmount: s.SettlementValue,
    currencyCode: s.CurrencyCode,
    paymentMethod: s.PaymentMethod,
    recognitionMethod: s.RecognitionMethod,
    cardBrand: s.CardBrand,
    productName: s.ProductName,
    quantity: s.Quantity,
    authorizedAt: s.AuthorizationDateTimeGMT,
    settledAt: s.SettlementDateTimeGMT,
    locationName: s.InstituteLocationName,
  };
}

function mapAlert(a: RawAlert): NayaxAlert {
  return {
    eventLogId: a.EventLogID,
    machineId: a.MachineID,
    eventCode: a.EventCode,
    eventGroupName: a.EventGroupName,
    entityTypeName: a.EntityTypeName,
    eventSourceName: a.EventSourceName,
    eventDateTimeGMT: a.EventDateTimeGMT,
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

export async function getMachineAlerts(machineId: number): Promise<NayaxAlert[]> {
  const res = await fetch(
    `${LYNX_BASE}/machines/${machineId}/lastAlerts`,
    { headers: getHeaders(), next: { revalidate: 60 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const items: RawAlert[] = Array.isArray(data) ? data : [];
  return items.map(mapAlert);
}

export async function getMachineProducts(machineId: number): Promise<NayaxMachineProduct[]> {
  const res = await fetch(
    `${LYNX_BASE}/machines/${machineId}/machineProducts`,
    { headers: getHeaders(), next: { revalidate: 300 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const items: RawMachineProduct[] = Array.isArray(data) ? data : [];
  return items
    .filter((p) => p.DEXProductName)
    .map((p) => {
      const par = p.PAR ?? null;
      const missing = p.MissingStockByDEX ?? p.MissingStockByMDB ?? null;
      const machineInventory = par !== null && missing !== null ? par - missing : null;
      return {
        machineProductId: p.MachineProductID ?? 0,
        productName: p.DEXProductName!,
        machinePar: par,
        machineInventory,
        isVendedOut: p.SelectionVendOutBit ?? false,
        vendOutThreshold: p.VendOutAlertThreshold ?? null,
      };
    });
}
