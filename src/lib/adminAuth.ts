import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "cc_admin";
const password = process.env.ADMIN_PASSWORD ?? "";
export const adminConfigured = password.length > 0;

/** Cookie value: a hash of the password, so changing ADMIN_PASSWORD signs everyone out. */
export const sessionToken = () => createHash("sha256").update(`crystalclean-admin:${password}`).digest("hex");

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const checkPassword = (input: string) => adminConfigured && same(input, password);

export async function isAdmin() {
  if (!adminConfigured) return false;
  const c = (await cookies()).get(ADMIN_COOKIE)?.value ?? "";
  return same(c, sessionToken());
}
