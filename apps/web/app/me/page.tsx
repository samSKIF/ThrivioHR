"use client";

import { useEffect, useState } from "react";
const BFF = (process.env.NEXT_PUBLIC_BFF_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");
import { useRouter } from "next/navigation";

type Me = {
  id?: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  orgId?: string;
  [k: string]: any;
};

export default function MePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function run() {
      try {
        // Call BFF with cookies
        const res = await fetch(`/api/bff/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: { "Accept": "application/json" },
        });
        if (!res.ok) {
          // Not authenticated, redirect to login
          router.push("/login");
          return;
        } else {
          const data = await res.json();
          setMe(data);
          setError(null);
        }
      } catch (e: any) {
        setError(e?.message || "Unknown error");
        setMe(null);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/bff/auth/logout", {
        method: "GET",
        credentials: "include",
      });
    } catch {
      // Ignore errors
    } finally {
      // Always redirect to login
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Authentication Error</h1>
          <p className="text-gray-600 mb-6">{error || "Unable to load profile"}</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">ThrivioHR</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {me.displayName || me.email}</span>
              <button
                onClick={handleLogout}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <div className="flex items-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-6">
              {(me.displayName || me.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h2>
              <p className="text-gray-600">View and manage your account information</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  {me.displayName || "Not set"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  {me.email || "Not set"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  {me.firstName || "Not set"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  {me.lastName || "Not set"}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  {me.orgId || "Not set"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm">
                  {me.id || "Not set"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
                <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  Active
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Raw Profile Data</h3>
            <pre className="p-4 bg-gray-50 border border-gray-200 rounded-lg overflow-auto text-sm font-mono max-h-64">
{JSON.stringify(me, null, 2)}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}