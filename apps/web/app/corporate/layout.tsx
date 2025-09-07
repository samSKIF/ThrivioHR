'use client';

import "../globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const links = [
    { href: "/corporate", label: "Overview" },
    { href: "/corporate/organizations", label: "Organizations" },
    { href: "#", label: "Merchants" },
    { href: "#", label: "Products" },
    { href: "#", label: "Orders" },
  ];

  return (
    <div className="corporate-wrapper">
      <header className="corporate-header">
        <div className="corporate-title">
          <h1>ThrivioHR Management</h1>
          <p>SaaS Platform Administration</p>
        </div>
        <div className="corporate-user">
          <span>Welcome, Corporate Admin</span>
          <button className="logout-button">Logout</button>
        </div>
      </header>
      <nav className="corporate-nav">
      <ul>
        {links.map(link => (
          <li key={link.href}>
            <Link href={link.href} className={pathname === link.href ? "active-nav-link" : ""}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      </nav>
      <main className="corporate-content">{children}</main>
    </div>
  );
}