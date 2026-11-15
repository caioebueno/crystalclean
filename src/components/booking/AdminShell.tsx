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

type Tab = "cal" | "customers" | "links" | "subs";
const TABS: { k: Tab; href: string; label: string; short: string; icon: string }[] = [
  { k: "cal", href: "/admin", label: "Calendar", short: "Calendar", icon: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
  { k: "customers", href: "/admin/customers", label: "Customers", short: "Customers", icon: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.5-3.5 3.2-6 6.5-6s6 2.5 6.5 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14c2 .7 3.3 3 3.5 6" },
  { k: "links", href: "/admin/links", label: "Booking links", short: "Links", icon: "M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" },
  { k: "subs", href: "/admin/submissions", label: "Submissions", short: "Requests", icon: "M4 13h4l2 3h4l2-3h4M4 13l2.5-8h11L20 13v6H4z" },
];

export function AdminShell({ tab, children }: { tab: Tab; children: React.ReactNode }) {
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
          <nav className="tabs htabs" aria-label="Admin sections">
            {TABS.map((t) => (
              <Link key={t.k} href={t.href} className={tab === t.k ? "tab on" : "tab"} aria-current={tab === t.k ? "page" : undefined}>
                {t.label}
              </Link>
            ))}
          </nav>
          <form action={logout} style={{ marginLeft: "auto" }}>
            <button type="submit" className="signout">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
      <div className="btab-space" aria-hidden="true" />
      <nav className="btabs" aria-label="Admin sections">
        {TABS.map((t) => (
          <Link key={t.k} href={t.href} className={tab === t.k ? "bt on" : "bt"} aria-current={tab === t.k ? "page" : undefined}>
            <span className="bti">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={tab === t.k ? "#0E1F3D" : "#5B6474"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={t.icon} />
              </svg>
            </span>
            {t.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}
