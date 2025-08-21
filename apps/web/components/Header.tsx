"use client";
import Link from "next/link";
export default function Header() {
  return (
    <header className="w-full border-b border-[#eaeaea] mb-6">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold">ThrivioHR</Link>
        <nav className="flex items-center gap-3">
          <Link href="/me" className="underline">Me</Link>
          <a href="/api/bff/oidc/authorize" className="rounded px-3 py-1.5 bg-black text-white">
            Sign in with SSO
          </a>
        </nav>
      </div>
    </header>
  );
}