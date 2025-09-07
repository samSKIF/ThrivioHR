"use client";

import "../globals.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * CorporateLayout defines a professional header with Shadcn/UI-style tabs navigation
 */
export default function CorporateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Logout function
  const handleLogout = async () => {
    try {
      // Clear the corporate_token cookie
      document.cookie = "corporate_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      // Redirect to corporate login page
      router.push("/corporate/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Force redirect even if there's an error
      router.push("/corporate/login");
    }
  };
  
  const tabs = [
    { value: "overview", label: "Overview", href: "/corporate" },
    { value: "companies", label: "Organizations", href: "/corporate/organizations" },
    { value: "merchants", label: "Merchants", href: "/corporate/merchants" },
    { value: "products", label: "Products", href: "/corporate/products" },
    { value: "orders", label: "Orders", href: "/corporate/orders" },
  ];

  // Determine active tab based on pathname
  const activeTab = tabs.find(tab => {
    if (tab.href === "/corporate") {
      return pathname === "/corporate";
    }
    return pathname.startsWith(tab.href);
  })?.value || "overview";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                ThrivioHR Management
              </h1>
              <p className="text-sm text-gray-500">
                SaaS Platform Administration
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">Welcome, Corporate Admin</span>
              <button 
                onClick={handleLogout}
                className="bg-white text-gray-700 border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="space-y-4">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Shadcn/UI Tabs-style Navigation */}
            <div className="grid w-full grid-cols-5 bg-gray-100 rounded-lg p-1">
              {tabs.map((tab) => (
                <Link
                  key={tab.value}
                  href={tab.href}
                  className={`
                    inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                    disabled:pointer-events-none disabled:opacity-50
                    ${activeTab === tab.value
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }
                  `}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}