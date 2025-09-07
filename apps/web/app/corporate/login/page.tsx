"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Gift, CircleUser } from "lucide-react";

export default function CorporateLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/corporate/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const msg = (await res.json()).message || "Invalid email or password";
        throw new Error(msg);
      }
      router.push("/corporate");
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-left">
        <h1 className="text-2xl font-bold mb-2">ThrivioHR Management</h1>
        <h2 className="text-lg font-semibold mb-6">Corporate Login</h2>
        <form onSubmit={handleLogin}>
          <div className="field mb-4">
            <label>Email</label>
            <input type="email" className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:border-blue-500"
                   value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field mb-4">
            <label>Password</label>
            <input type="password" className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:border-blue-500"
                   value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-600 mb-4">{error}</p>}
          <button type="submit" className="primary-button w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
      <div className="login-right">
        <h2 className="text-3xl font-bold mb-4">Empower Your Workplace</h2>
        <p className="mb-6">
          Connect, engage and recognize your colleagues with our comprehensive employee engagement platform
        </p>
        <ul className="login-features">
          <li><BadgeCheck size={20} /> Peer Recognition</li>
          <li><Gift size={20} /> Rewards &amp; Redemption</li>
          <li><CircleUser size={20} /> Polls &amp; Surveys</li>
        </ul>
      </div>
    </div>
  );
}