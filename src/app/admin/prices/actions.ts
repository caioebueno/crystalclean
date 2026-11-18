"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/adminAuth";
import { BED_LABELS, PRICE_KINDS, type PriceTable } from "@/lib/pricing";
import { putPrices, resetPrices } from "@/lib/priceStore";

const whole = (v: FormDataEntryValue | null, max: number) => {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n) : null;
};

export async function savePricesAction(fd: FormData) {
  if (!(await isAdmin())) redirect("/admin");
  const table = { from: {}, bathStep: {} } as PriceTable;
  for (const { k, label } of PRICE_KINDS) {
    const row: number[] = [];
    for (let i = 0; i < BED_LABELS.length; i++) {
      const n = whole(fd.get(`p_${k}_${i}`), 5000);
      if (n === null) redirect(`/admin/prices?err=${encodeURIComponent(`${label}, ${BED_LABELS[i]}: enter a price from 0 to 5000.`)}`);
      row.push(n);
    }
    const step = whole(fd.get(`s_${k}`), 1000);
    if (step === null) redirect(`/admin/prices?err=${encodeURIComponent(`${label}, extra bathroom: enter an amount from 0 to 1000.`)}`);
    table.from[k] = row;
    table.bathStep[k] = step;
  }
  await putPrices(table);
  revalidatePath("/quote");
  revalidatePath("/admin/prices");
  redirect("/admin/prices?saved=1");
}

export async function resetPricesAction() {
  if (!(await isAdmin())) redirect("/admin");
  await resetPrices();
  revalidatePath("/quote");
  revalidatePath("/admin/prices");
  redirect("/admin/prices?saved=reset");
}
