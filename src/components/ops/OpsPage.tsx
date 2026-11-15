import { OpsApp } from "@/components/ops/OpsApp";
import { site } from "@/config/site";
import { quoteToPick } from "@/lib/bookingStore";
import { loadOps } from "@/lib/opsStore";
import { todayIso, type OpsCustomer } from "@/lib/ops";
import { listSubmissions, storageConfigured } from "@/lib/submissions";

/** Server part of the Calendar and Customers tabs: loads customers (importing newly booked links) and quote requests. */
export async function OpsPage({ view, cid }: { view: "cal" | "customers"; cid?: string }) {
  let customers: OpsCustomer[] = [];
  let today = todayIso();
  let loadErr = "";
  try {
    ({ customers, today } = await loadOps());
  } catch (e) {
    console.error("[customer] load failed", e);
    loadErr = e instanceof Error ? e.message : "Could not load customers.";
  }
  const quotes = (await listSubmissions().catch(() => []))
    .filter((s) => s.kind === "quote")
    .map(quoteToPick);
  if (loadErr) {
    return (
      <main style={{ padding: 24, fontFamily: "var(--font-dm), system-ui, sans-serif", color: "#0E1F3D" }}>
        <h1>Couldn&apos;t load the calendar</h1>
        <p>{loadErr}</p>
      </main>
    );
  }
  return <OpsApp initial={customers} today={today} startView={cid ? "customer" : view} startCid={cid} quotes={quotes} siteUrl={site.url} storageOk={storageConfigured} />;
}
