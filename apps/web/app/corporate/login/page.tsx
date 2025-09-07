"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function CorporateLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
        const msg = (await res.json()).message || "Login failed";
        throw new Error(msg);
      }
      // Redirect to dashboard
      router.push("/corporate");
    } catch (err: any) {
      setError(err.message || "Login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Full-screen container that completely overrides any parent layout
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="corporate-login-page">
        <h2 className="text-xl font-semibold mb-4">Corporate Admin Login</h2>
        <form onSubmit={handleSubmit} className="corporate-login-form">
          <div className="mb-4">
            <label className="block mb-2 text-gray-700">Email</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2 text-gray-700">Password</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-600 mb-4">{error}</p>}
          <button type="submit" className="sign-in-button" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <div className="text-center mt-4">
          <a href="/login">
            <button type="button" className="secondary-button">
              Client Interface
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}