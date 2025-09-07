import "../globals.css";

export const metadata = {
  title: "ThrivioHR Management",
  description: "Corporate admin panel",
};

/**
 * CorporateLayout defines header and navigation for corporate pages.
 * It no longer includes <html> or <body> tags, which are handled by Next.js.
 */
export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="corporate-header">
        <div className="corporate-header-left">
          <h1 className="text-xl font-bold">ThrivioHR Management</h1>
          <p className="text-sm text-gray-500">SaaS Platform Administration</p>
        </div>
        <div className="corporate-header-right">
          <span>Welcome, Corporate Admin</span>
          {/* TODO: Logout handler */}
          <button className="logout-button">Logout</button>
        </div>
      </header>
      <nav className="corporate-nav">
        <ul>
          <li><a href="/corporate">Overview</a></li>
          <li><a href="/corporate/organizations">Organizations</a></li>
          <li><a href="#">Merchants</a></li>
          <li><a href="#">Products</a></li>
          <li><a href="#">Orders</a></li>
        </ul>
      </nav>
      <main className="corporate-content">{children}</main>
    </div>
  );
}