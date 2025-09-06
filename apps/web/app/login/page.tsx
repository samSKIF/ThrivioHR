"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, Award } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/bff/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Invalid email or password");
      }
      window.location.href = "/me";
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-card">
          <h1 className="text-2xl font-bold mb-2">ThrivioHR Platform</h1>
          <h2 className="text-xl font-semibold mb-6">Welcome Back</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block mb-2 text-gray-700">Email or Username</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:border-blue-500 focus:ring-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block mb-2 text-gray-700">Password</label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg py-3 px-4 text-base focus:border-blue-500 focus:ring-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-600 mb-4">{error}</p>}
            <button type="submit" className="sign-in-button" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <div className="text-center mt-4">
            <button type="button" className="secondary-button mb-3">
              Sign in with SSO
            </button>
            <p className="text-gray-600 mb-2">OR</p>
            <a href="/corporate-login">
              <button type="button" className="secondary-button">
                Login as Corporate
              </button>
            </a>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <Award size={64} className="mb-4" />
        <h2 className="text-3xl font-bold mb-2">Empower Your Workplace</h2>
        <p className="mb-6">
          Connect, engage and recognize your colleagues with our comprehensive employee engagement platform
        </p>
        <ul>
          <li className="auth-feature">
            <CheckCircle size={20} /> Peer Recognition
          </li>
          <li className="auth-feature">
            <CheckCircle size={20} /> Rewards &amp; Redemption
          </li>
          <li className="auth-feature">
            <CheckCircle size={20} /> Polls &amp; Surveys
          </li>
        </ul>
      </div>
    </div>
  );
}