"use client";

import "../globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";


/**
 * CorporateLayout defines a professional header and tabbed navigation,
 * using Tailwind classes so the UI matches EmployeeRewards.
 */
export default function CorporateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const links = [
    { href: "/corporate", label: "Overview" },
    { href: "/corporate/organizations", label: "Organizations" },
    { href: "/corporate/merchants", label: "Merchants" },
    { href: "/corporate/products", label: "Products" },
    { href: "/corporate/orders", label: "Orders" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ThrivioHR Management</h1>
          <p className="text-sm text-gray-500">SaaS Platform Administration</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-700">Welcome, Corporate Admin</span>
          <button className="bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600">
            Logout
          </button>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <ul className="flex gap-6 px-6 py-2 text-sm font-medium">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block px-3 py-2 rounded-md ${
                  pathname === link.href
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <main className="px-6 py-8 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}