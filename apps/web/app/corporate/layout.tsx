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
      <header className="bg-white">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-gray-900">ThrivioHR Management</h1>
            <p className="text-sm text-gray-500">SaaS Platform Administration</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Welcome, Corporate Admin</span>
            <button className="bg-white text-gray-700 border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="bg-gray-100 py-4">
        <nav className="max-w-7xl mx-auto">
          <ul className="flex gap-8 px-6 text-sm font-medium">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block px-0 py-2 ${
                    pathname === link.href
                      ? "text-gray-900 font-semibold border-b-2 border-blue-500"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <main className="px-6 py-8 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}