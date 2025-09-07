"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

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
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Left side - Logo and Login Form */}
      <div className="md:w-1/2 bg-white p-8 flex flex-col justify-center items-center">
        <div className="max-w-md mx-auto w-full">
          {/* Branding Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xl font-bold">
              T
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                ThrivioHR
              </h1>
              <p className="text-sm text-gray-500">Growth Platform</p>
            </div>
          </div>

          {/* Login Card */}
          <div className="border-0 shadow-lg rounded-lg bg-white">
            <div className="text-center pb-4 pt-6 px-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Welcome Back
                </h2>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 pt-2 px-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm text-gray-600 block">
                    Email or Username
                  </label>
                  <input
                    id="email"
                    type="text"
                    placeholder="Enter your email or username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label htmlFor="password" className="text-sm text-gray-600">
                      Password
                    </label>
                    <a
                      href="#"
                      className="text-sm text-blue-500 hover:text-blue-400"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
              </div>
              
              <div className="flex flex-col space-y-4 pt-2 p-6">
                <button
                  type="submit"
                  className="w-full bg-gray-700 hover:bg-gray-800 text-white font-medium shadow-md py-2.5 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or</span>
                  </div>
                </div>
                <Link href="/corporate/login">
                  <button
                    type="button"
                    className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    Login as Corporate
                  </button>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right side - Hero Section */}
      <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-blue-50 to-blue-100 p-8">
        <div className="max-w-md mx-auto h-full flex flex-col">
          <div className="mb-8 text-center">
            <div className="inline-block p-4 bg-white rounded-2xl shadow-md mb-4">
              <img
                src="https://img.freepik.com/free-vector/employee-recognition-rewards-appreciation-concept-people-team-around-mobile-app-interface-showing-achievements-stars-gifts-handshake-celebration-flat-illustration_1150-55123.jpg"
                alt="Employee Recognition and Rewards Platform"
                className="h-64 w-auto rounded-xl"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Empower Your Workplace
            </h2>
            <p className="text-gray-600">
              Connect, engage and recognize your colleagues with our
              comprehensive employee engagement platform
            </p>
          </div>

          {/* Feature Cards */}
          <div className="space-y-4 mt-auto">
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Peer Recognition</h3>
                <p className="text-sm text-gray-500">
                  Celebrate achievements and milestones with colleagues
                </p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                  <path d="M2 7h20" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">
                  Rewards & Redemption
                </h3>
                <p className="text-sm text-gray-500">
                  Earn and redeem points for real-world rewards
                </p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M7 10h10" />
                  <path d="M7 14h10" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Polls & Surveys</h3>
                <p className="text-sm text-gray-500">
                  Voice your opinion and participate in company decisions
                </p>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-8">
            © 2025 ThrivioHR. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}