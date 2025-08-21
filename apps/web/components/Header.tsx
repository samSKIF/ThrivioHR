"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link href={href} className={`link ${active ? "active" : ""}`}>{children}</Link>
  );
}

export default function Header() {
  return (
    <header className="site-header">
      <div className="container" style={{ padding: ".75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" className="link" style={{ fontWeight: 700, textDecoration: "none" }}>ThrivioHR</Link>
        <nav className="nav">
          <NavLink href="/directory/users">Employee directory</NavLink>
          <NavLink href="/me">Profile</NavLink>
          <a href="/api/bff/oidc/authorize" className="btn btn-primary">Login with SSO</a>
        </nav>
      </div>
    </header>
  );
}