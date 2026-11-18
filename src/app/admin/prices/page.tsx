import type { Metadata } from "next";
import { AdminShell, requireAdmin } from "@/components/booking/AdminShell";
import { BED_LABELS, DEFAULT_PRICES, PRICE_KINDS, startingPrice } from "@/lib/pricing";
import { getPrices } from "@/lib/priceStore";
import { storageConfigured } from "@/lib/submissions";
import { resetPricesAction, savePricesAction } from "./actions";

export const metadata: Metadata = { title: "Prices", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const when = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "";

export default async function PricesPage({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const { prices, custom, updatedAt } = await getPrices();
  const example = startingPrice("biweekly", 2, 3, prices);
  return (
    <AdminShell tab="prices">
      <main className="wrap">
        <div className="phead">
          <div>
            <h1 className="ptitle">Prices</h1>
            <p className="psub">
              Starting prices shown on the quote form. Changes go live on the form right after you save.
              {custom && updatedAt ? ` Last saved ${when(updatedAt)}.` : " Showing the original prices."}
            </p>
          </div>
        </div>
        <form action={savePricesAction} className="form" style={{ paddingTop: 24, paddingBottom: 40 }}>
          {!storageConfigured && <div className="warn">No database connected, so saved prices are only kept until the server restarts. Add REDIS_URL in Vercel.</div>}
          {sp.saved === "1" && <div className="toast" style={{ padding: "14px 18px" }}>Prices saved. The quote form shows them now.</div>}
          {sp.saved === "reset" && <div className="toast" style={{ padding: "14px 18px" }}>Back to the original prices.</div>}
          {sp.err && <div className="warn err">{sp.err}</div>}
          <p className="help" style={{ margin: 0 }}>
            Each price is for up to 2 bathrooms. &quot;Each extra bathroom&quot; is added for every full bathroom above 2. For example, a 2-bed, 3-bath
            home every 2 weeks shows ${example}. Homes with 5 or more bedrooms show no price; Kyle texts it.
          </p>
          {PRICE_KINDS.map(({ k, label, help }) => (
            <section key={k} className="card sec">
              <div className="sec-h">
                <h2 className="h2">{label}</h2>
              </div>
              <p className="help">{help}</p>
              <div className="pgrid">
                {BED_LABELS.map((b, i) => (
                  <label key={b} className="field">
                    <span className="lbl">{b}</span>
                    <span className="money">
                      <span>$</span>
                      <input
                        className="input"
                        name={`p_${k}_${i}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={5000}
                        step={1}
                        required
                        defaultValue={prices.from[k][i]}
                        aria-label={`${label}, ${b}`}
                      />
                    </span>
                    {prices.from[k][i] !== DEFAULT_PRICES.from[k][i] && <span className="help">Was ${DEFAULT_PRICES.from[k][i]}</span>}
                  </label>
                ))}
                <label className="field">
                  <span className="lbl">Each extra bathroom</span>
                  <span className="money">
                    <span>+$</span>
                    <input
                      className="input"
                      name={`s_${k}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={1000}
                      step={1}
                      required
                      defaultValue={prices.bathStep[k]}
                      style={{ paddingLeft: 42 }}
                      aria-label={`${label}, each extra bathroom`}
                    />
                  </span>
                </label>
              </div>
            </section>
          ))}
          <div className="pbar">
            <button type="submit" className="btn btn-navy">
              Save prices
            </button>
            {custom && (
              <button type="submit" formAction={resetPricesAction} formNoValidate className="linkbtn">
                Use the original prices
              </button>
            )}
          </div>
        </form>
      </main>
    </AdminShell>
  );
}
