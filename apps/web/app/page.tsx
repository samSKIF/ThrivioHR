"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/auth/me", {
          method: "GET",
          credentials: "include",
          headers: { "Accept": "application/json" },
        });
        
        if (res.ok) {
          // User is authenticated, redirect to /me
          router.push("/me");
        } else {
          // User is not authenticated, redirect to login
          router.push("/login");
        }
      } catch {
        // Network error or other issue, redirect to login
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}