import { getPricingItems } from "@/lib/sheets";
import { checkPrices, PriceComparison, Retailer } from "@/lib/price-check";
import { TrendingDown, Minus, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const revalidate = 86400; // 24 hours

const RETAILERS: Retailer[] = ["Walmart", "Amazon", "Sam's Club", "HEB", "Kroger"];

function fmt(n: number | null, prefix = "$") {
  if (n === null) return "—";
  return `${prefix}${n.toFixed(3)}`;
}

function SavingsBadge({ savings }: { savings: number | null }) {
  if (savings === null) return null;
  if (savings > 0.005) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 rounded-full px-2 py-0.5">
        <TrendingDown className="h-3 w-3" />
        save {fmt(savings)}/vend
      </span>
    );
  }
  if (savings < -0.005) {
    return (
      <span className="text-xs text-muted-foreground">
        +{fmt(Math.abs(savings))}/vend vs current
      </span>
    );
  }
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function PriceCell({
  comparison,
  retailer,
}: {
  comparison: PriceComparison;
  retailer: Retailer;
}) {
  const entry = comparison.retailers.find((r) => r.retailer === retailer);
  if (!entry || entry.costPerVend === null) {
    return <td className="px-3 py-2.5 text-xs text-muted-foreground text-center">—</td>;
  }

  const isBest = comparison.bestRetailer === retailer;
  const isCurrent = comparison.currentStore.toLowerCase().includes(retailer.toLowerCase());

  return (
    <td className={`px-3 py-2.5 text-xs text-center ${isBest ? "font-semibold text-green-700 dark:text-green-400" : ""}`}>
      <div>{fmt(entry.costPerVend)}</div>
      {entry.url && (
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-blue-500 hover:underline"
        >
          link
        </a>
      )}
      {isCurrent && <div className="text-[10px] text-muted-foreground">current</div>}
    </td>
  );
}

export default async function PricesPage() {
  const items = await getPricingItems();

  let comparisons: PriceComparison[] = [];
  let error: string | null = null;

  if (!process.env.ANTHROPIC_API_KEY) {
    error = "ANTHROPIC_API_KEY is not set — add it to your Vercel environment variables to enable price comparison.";
  } else {
    try {
      comparisons = await checkPrices(items);
    } catch (e) {
      error = e instanceof Error ? e.message : "Price check failed";
    }
  }

  const withSavings = comparisons
    .filter((c) => c.savingsPerVend !== null && c.savingsPerVend > 0.005)
    .sort((a, b) => (b.savingsPerVend ?? 0) - (a.savingsPerVend ?? 0));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Price Comparison</h1>
            <p className="text-sm text-muted-foreground">Cost/vend across retailers · refreshes daily</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {withSavings.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3">Savings Opportunities</h2>
            <div className="rounded-lg border bg-card divide-y">
              {withSavings.map((c) => (
                <div key={c.item} className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.item}</p>
                    <p className="text-xs text-muted-foreground">
                      Currently {fmt(c.currentCostPerVend)}/vend at {c.currentStore}
                      {c.size ? ` · ${c.size}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                      {fmt(c.bestCostPerVend)}/vend at {c.bestRetailer}
                    </p>
                    <SavingsBadge savings={c.savingsPerVend} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {comparisons.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3">All Items</h2>
            <div className="rounded-lg border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Item</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Current</th>
                    {RETAILERS.map((r) => (
                      <th key={r} className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        {r}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {comparisons.map((c) => (
                    <tr key={c.item} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-sm">{c.item}</div>
                        <div className="text-xs text-muted-foreground capitalize">{c.category}{c.size ? ` · ${c.size}` : ""}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-center">
                        <div>{fmt(c.currentCostPerVend)}</div>
                        <div className="text-[10px] text-muted-foreground">{c.currentStore}</div>
                      </td>
                      {RETAILERS.map((r) => (
                        <PriceCell key={r} comparison={c} retailer={r} />
                      ))}
                      <td className="px-3 py-2.5 text-center">
                        <SavingsBadge savings={c.savingsPerVend} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!error && comparisons.length === 0 && (
          <p className="text-center text-muted-foreground py-16">No items found in the sheet.</p>
        )}
      </main>
    </div>
  );
}
