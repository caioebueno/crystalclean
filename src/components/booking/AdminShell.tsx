import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/admin/actions";
import { isAdmin } from "@/lib/adminAuth";
import { Roofline } from "@/components/brand";
import "./ap.css";

/** Signed-in admin pages only: sends everyone else to the /admin sign-in. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin");
}

export function AdminShell({ tab, children }: { tab: "subs" | "links"; children: React.ReactNode }) {
  return (
    <div className="ap">
      <header className="hdr">
        <div className="wrap hdr-in">
          <span className="logo" role="img" aria-label="Crystal Clean admin">
            <Roofline width={96} height={12} stroke={5.5} />
            <span className="logo-word" aria-hidden="true">
              Crystal Clean
            </span>
          </span>
          <nav className="tabs" aria-label="Admin sections">
            <Link href="/admin" className={tab === "subs" ? "tab on" : "tab"} aria-current={tab === "subs" ? "page" : undefined}>
              Submissions
            </Link>
            <Link href="/admin/links" className={tab === "links" ? "tab on" : "tab"} aria-current={tab === "links" ? "page" : undefined}>
              Booking links
            </Link>
          </nav>
          <form action={logout} style={{ marginLeft: "auto" }}>
            <button type="submit" className="signout">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
