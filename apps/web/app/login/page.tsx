"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [organization, setOrganization] = useState("9e2e7679-e33e-4cbe-9edc-195f13e9f909");
  const [email, setEmail] = useState("dev.user@example.com");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleTraditionalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization.trim() || !email.trim()) {
      setError("Please fill in both organization and email");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call BFF login endpoint via proxy
      const res = await fetch("/api/bff/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          orgId: organization.trim(),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(`Login failed: ${text.slice(0, 200)}`);
        return;
      }

      // Success - redirect to /me
      router.push("/me");
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = () => {
    // Redirect to OIDC authorize endpoint via proxy, passing current origin
    const origin = window.location.origin;
    window.location.href = `/api/bff/oidc/authorize?origin=${encodeURIComponent(origin)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ThrivioHR</h1>
            <p className="text-sm text-gray-600 mb-8">ThrivioHR Platform</p>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Welcome Back</h2>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleTraditionalLogin} className="space-y-6">
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
                Organization
              </label>
              <input
                id="organization"
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your organization ID"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email or Username
              </label>
              <input
                id="email"
                type="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@canva.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-900 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 text-gray-500">OR</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSSOLogin}
              className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Login with SSO
            </button>
          </form>
        </div>
      </div>

      {/* Right side - Features */}
      <div className="hidden lg:flex flex-1 bg-white items-center justify-center px-8">
        <div className="max-w-md text-center">
          {/* Logo/Illustration */}
          <div className="mb-12">
            <svg className="mx-auto h-32 w-32 text-blue-600" fill="currentColor" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" className="opacity-20"/>
              <circle cx="50" cy="35" r="12"/>
              <path d="M30 70 Q50 60 70 70 L70 85 Q50 75 30 85 Z"/>
              <circle cx="25" cy="25" r="3" className="opacity-60"/>
              <circle cx="75" cy="25" r="3" className="opacity-60"/>
              <circle cx="25" cy="75" r="3" className="opacity-60"/>
              <circle cx="75" cy="75" r="3" className="opacity-60"/>
            </svg>
          </div>

          {/* Content */}
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Empower Your Workplace
          </h2>
          
          <div className="space-y-4 text-left">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-gray-600">
                <span className="font-semibold">Recognition & Rewards:</span> Celebrate achievements and boost team morale
              </p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-gray-600">
                <span className="font-semibold">Performance Insights:</span> Track engagement and productivity metrics
              </p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-gray-600">
                <span className="font-semibold">Team Collaboration:</span> Foster connection and communication across departments
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">ThrivioHR</span> - Where teams flourish and businesses grow
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}