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
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your organization ID"
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@canva.com"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 text-gray-500">OR</span>
              </div>
            </div>

            {/* SSO Button */}
            <button
              type="button"
              onClick={handleSSOLogin}
              disabled={loading}
              className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Login with SSO
            </button>
          </form>
        </div>
      </div>

      {/* Right side - Illustration and Features */}
      <div className="hidden lg:flex flex-1 bg-white items-center justify-center px-8">
        <div className="max-w-md text-center">
          {/* Illustration */}
          <div className="mb-12">
            <svg className="w-64 h-64 mx-auto" viewBox="0 0 400 300" fill="none">
              {/* Phone/Device */}
              <rect x="120" y="40" width="160" height="220" rx="20" fill="#6366F1" stroke="#4F46E5" strokeWidth="2"/>
              <rect x="130" y="60" width="140" height="180" rx="8" fill="#EEF2FF"/>
              
              {/* Screen Content - Recognition symbols */}
              <circle cx="160" cy="120" r="20" fill="#F59E0B"/>
              <text x="160" y="125" textAnchor="middle" fontSize="16" fill="white">$</text>
              <circle cx="240" cy="120" r="20" fill="#EF4444"/>
              <text x="240" y="125" textAnchor="middle" fontSize="16" fill="white">$</text>
              
              <circle cx="200" cy="160" r="25" fill="#10B981"/>
              <text x="200" y="167" textAnchor="middle" fontSize="18" fill="white">$</text>
              
              {/* Person with laptop */}
              <g transform="translate(80,180)">
                <circle cx="40" cy="20" r="15" fill="#FCA5A5"/>
                <rect x="32" y="35" width="16" height="25" rx="8" fill="#3B82F6"/>
                <rect x="25" y="60" width="30" height="20" rx="4" fill="#374151"/>
                <rect x="27" y="62" width="26" height="16" rx="2" fill="#1F2937"/>
              </g>
              
              {/* Gift boxes */}
              <g transform="translate(280,200)">
                <rect x="10" y="10" width="25" height="20" fill="#F59E0B"/>
                <rect x="15" y="5" width="15" height="10" fill="#EF4444"/>
                <line x1="22.5" y1="5" x2="22.5" y2="30" stroke="#DC2626" strokeWidth="2"/>
                <line x1="10" y1="15" x2="35" y2="15" stroke="#DC2626" strokeWidth="2"/>
              </g>
            </svg>
          </div>

          {/* Title and Description */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Empower Your Workplace</h3>
            <p className="text-gray-600 leading-relaxed">
              Connect, engage and recognize your colleagues with our comprehensive employee engagement platform
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6 text-left">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Peer Recognition</h4>
                <p className="text-sm text-gray-600">Celebrate achievements and milestones with colleagues</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM8 7a1 1 0 012 0v3a1 1 0 11-2 0V7z"/>
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Rewards & Redemption</h4>
                <p className="text-sm text-gray-600">Earn and redeem points for real-world rewards</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"/>
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Polls & Surveys</h4>
                <p className="text-sm text-gray-600">Voice your opinion and participate in company decisions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}