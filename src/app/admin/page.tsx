import type { Metadata } from "next";
import { adminConfigured, isAdmin } from "@/lib/adminAuth";
import { OpsPage } from "@/components/ops/OpsPage";
import { login } from "./actions";
import "./admin.css";

export const metadata: Metadata = { title: "Calendar", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Admin home: the calendar. Also the sign-in page. */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;

  if (!adminConfigured) {
    return (
      <main className="adm adm-narrow">
        <h1>Admin</h1>
        <p>
          Set an <code>ADMIN_PASSWORD</code> environment variable in Vercel (Project → Settings → Environment Variables), then redeploy.
        </p>
      </main>
    );
  }

  if (!(await isAdmin())) {
    return (
      <main className="adm adm-narrow">
        <h1>Crystal Clean admin</h1>
        <form action={login} className="login">
          <label>
            Password
            <input type="password" name="password" autoComplete="current-password" required autoFocus />
          </label>
          {sp.error && <p className="err">Wrong password.</p>}
          <button type="submit">Sign in</button>
        </form>
      </main>
    );
  }

  return <OpsPage view="cal" />;
}
