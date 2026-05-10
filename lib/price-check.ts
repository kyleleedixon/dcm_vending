import Anthropic from "@anthropic-ai/sdk";
import type { PricingItem } from "./sheets";

const RETAILERS = ["Walmart", "Amazon", "Sam's Club", "HEB", "Kroger"] as const;
export type Retailer = (typeof RETAILERS)[number];

export interface RetailerPrice {
  retailer: Retailer;
  totalPrice: number | null;
  packSize: number | null;
  costPerVend: number | null;
  url: string | null;
}

export interface PriceComparison {
  item: string;
  category: "drinks" | "snacks";
  size: string;
  currentStore: string;
  currentCostPerVend: number | null;
  retailers: RetailerPrice[];
  bestRetailer: string | null;
  bestCostPerVend: number | null;
  savingsPerVend: number | null;
}

export async function checkPrices(items: PricingItem[]): Promise<PriceComparison[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || items.length === 0) return [];

  const client = new Anthropic({ apiKey });

  const itemList = items
    .map((it, i) => {
      const packInfo = it.packSize ? ` (${it.packSize}-pack)` : "";
      return `${i + 1}. "${it.item}"${it.size ? ` — ${it.size}${packInfo}` : ""}`;
    })
    .join("\n");

  const prompt = `You are a price comparison assistant for a vending machine operator. Search for current retail prices for these items at Walmart, Amazon, Sam's Club, HEB, and Kroger. For each item find the same pack size or the best equivalent bulk pack available.

Items to search:
${itemList}

For each item at each retailer:
- Find the current total package price
- Note the pack quantity (number of individual units)
- Calculate cost per vend = total price / pack quantity

Return ONLY valid JSON in exactly this format (no markdown, no explanation):
{
  "results": [
    {
      "item": "exact item name from list",
      "retailers": [
        {
          "retailer": "Walmart",
          "totalPrice": 8.98,
          "packSize": 28,
          "costPerVend": 0.321,
          "url": "https://www.walmart.com/..."
        },
        {
          "retailer": "Amazon",
          "totalPrice": null,
          "packSize": null,
          "costPerVend": null,
          "url": null
        }
      ]
    }
  ]
}

Include an entry for every retailer for every item. Use null when the item is not available at that retailer. Search each retailer separately.`;

  let text = "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.messages.create as any)(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8192,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      },
      { headers: { "anthropic-beta": "web-search-2025-03-05" } }
    );

    text = response.content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((b: any) => b.type === "text")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b: any) => b.text)
      .join("");
  } catch (e) {
    console.error("Price check API error:", e);
    return [];
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  let parsed: { results: Array<{ item: string; retailers: RetailerPrice[] }> };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }

  return parsed.results.map((r, i) => {
    const source = items[i];
    const valid = r.retailers.filter((p) => p.costPerVend !== null);
    valid.sort((a, b) => (a.costPerVend ?? 0) - (b.costPerVend ?? 0));
    const best = valid[0] ?? null;
    const current = source?.costPerVend ?? null;

    return {
      item: r.item,
      category: source?.category ?? "snacks",
      size: source?.size ?? "",
      currentStore: source?.currentStore ?? "",
      currentCostPerVend: current,
      retailers: r.retailers,
      bestRetailer: best?.retailer ?? null,
      bestCostPerVend: best?.costPerVend ?? null,
      savingsPerVend:
        current !== null && best?.costPerVend !== null
          ? current - best.costPerVend
          : null,
    };
  });
}
