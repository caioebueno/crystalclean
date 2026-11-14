import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookView } from "@/components/booking/BookView";
import { toPublic } from "@/lib/booking";
import { getLink } from "@/lib/bookingStore";
import { confirmBooking, markViewed } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book your clean",
  robots: { index: false, follow: false },
};

export default async function BookPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { code } = await params;
  const sp = await searchParams;
  const link = await getLink(code.toLowerCase()).catch(() => undefined);
  if (!link) notFound();
  // ?preview=1 (from admin) doesn't mark the link as viewed.
  return <BookView link={toPublic(link)} confirm={confirmBooking} onView={sp.preview ? undefined : markViewed} />;
}
