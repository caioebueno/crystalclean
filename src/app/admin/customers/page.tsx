import type { Metadata } from "next";
import { requireAdmin } from "@/components/booking/AdminShell";
import { OpsPage } from "@/components/ops/OpsPage";

export const metadata: Metadata = { title: "Customers", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  return <OpsPage view="customers" cid={sp.c} />;
}
