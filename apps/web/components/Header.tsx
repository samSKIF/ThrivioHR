"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded ${active ? "bg-black text-white" : "underline"}`}
    >
      {children}
    </Link>
  );
}

export default function Header() {
  return (
    <header className="w-full border-b border-[#eaeaea]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold">ThrivioHR</Link>
        <nav className="flex items-center gap-2">
          <NavLink href="/directory/users">Employee directory</NavLink>
          <NavLink href="/me">Profile</NavLink>
          <a href="/api/bff/oidc/authorize" className="px-3 py-1.5 rounded bg-black text-white">
            Login with SSO
          </a>
        </nav>
      </div>
    </header>
  );
}