"use client";

/**
 * Feed page - ThrivioHR social recognition feed
 * Three-column layout with points sidebar, main feed, and activity sidebar
 * 
 * Uses client-only rendering with error boundaries to handle browser extension conflicts.
 */
import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

/** Fetch the current user and org details. Returns { orgId, user }. */
async function fetchMe() {
  try {
    const res = await fetch("/api/bff/auth/me");
    if (!res.ok) {
      // For now, return mock data since endpoint doesn't exist yet
      return { org: { id: "jumia", name: "Jumia" }, user: { id: "admin", email: "admin@jumia.com" } };
    }
    return res.json();
  } catch {
    // Fallback for development
    return { org: { id: "jumia", name: "Jumia" }, user: { id: "admin", email: "admin@jumia.com" } };
  }
}

/** Fetch posts for the given orgId. */
async function fetchPosts(orgId: string) {
  try {
    const res = await fetch(`/api/social/posts?orgId=${orgId}`);
    if (!res.ok) {
      // Return empty array since endpoint doesn't exist yet
      return [];
    }
    return res.json();
  } catch {
    // Fallback for development
    return [];
  }
}

export default function FeedPage() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userRole, setUserRole] = useState("admin"); // Toggle between "admin" and "user" for testing
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Post creator state
  const [postContent, setPostContent] = useState('');
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [isRecognitionModalOpen, setIsRecognitionModalOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  
  const { data: me, isLoading: loadingMe } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });
  const orgId = me?.org?.id;
  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ["posts", orgId],
    queryFn: () => fetchPosts(orgId!),
    enabled: !!orgId,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  if (loadingMe) {
    return (
      <div className="min-h-screen bg-gray-50 p-4" suppressHydrationWarning={true}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/4 bg-gray-300 rounded"></div>
          <div className="h-4 w-1/2 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" suppressHydrationWarning={true}>
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">✓</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">ThrivioHR</span>
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-gray-100 border-0 rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Navigation Icons */}
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v16a2 2 0 002 2z" />
                </svg>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 6H4l5-5v5zM12 2l3.09 6.26L22 9l-5 4.74L18.18 22 12 18.27 5.82 22 7 13.74 2 9l6.91-.74L12 2z" />
                </svg>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 3h16a2 2 0 012 2v6.586a1 1 0 01-.293.707L12 21 2.293 12.293A1 1 0 012 11.586V5a2 2 0 012-2z" />
                </svg>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              </button>
              
              {/* Role Toggle for Testing */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setUserRole(userRole === "admin" ? "user" : "admin")}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    userRole === "admin" 
                      ? "bg-blue-100 border-blue-300 text-blue-800" 
                      : "bg-gray-100 border-gray-300 text-gray-600"
                  }`}
                >
                  {userRole === "admin" ? "👑 Admin" : "👤 User"}
                </button>

                {/* User Profile */}
                <div className="relative" ref={dropdownRef}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 text-sm font-medium">A</span>
                    </div>
                    <button 
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="py-2">
                        {/* My Account Section */}
                        <div className="px-4 py-2">
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">My Account</h3>
                          <button className="flex items-center gap-3 w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Profile
                          </button>
                        </div>

                        {/* Admin Only Sections */}
                        {userRole === "admin" && (
                          <>
                            <div className="border-t border-gray-100 px-4 py-2">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-sm font-semibold text-gray-900">My Activity</h3>
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Admin</span>
                              </div>
                            <div className="space-y-1">
                              <button className="flex items-center gap-3 w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                People & Organization
                              </button>
                              <button className="flex items-center gap-3 w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                Employees
                              </button>
                              <button className="flex items-center gap-3 w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                Org Chart
                              </button>
                              <button className="flex items-center gap-3 w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                Users Management
                              </button>
                              <button className="flex items-center gap-3 w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Onboarding
                              </button>
                              <button className="flex items-center gap-3 w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Audits & Controls
                              </button>
                              <button className="flex items-center gap-3 w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Organization Tools
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-gray-100 px-4 py-2">
                            <button className="flex items-center gap-3 w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              Analytics & Reports
                            </button>
                          </div>

                          <div className="border-t border-gray-100 px-4 py-2">
                            <button className="flex items-center gap-3 w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Business Settings
                            </button>
                          </div>
                          </>
                        )}

                        {/* Logout for all users */}
                        <div className="border-t border-gray-100 px-4 py-2">
                          <button className="flex items-center gap-3 w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main layout with improved responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 max-w-[2200px] mx-auto justify-center px-4">
        {/* Left sidebar - optimized width */}
        <div className="hidden lg:block lg:col-span-3 w-full max-w-[300px]">
          <div className="space-y-6">
            {/* Enhanced ThrivioHR Points Widget */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">ThrivioHR Points</h2>
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">💎</span>
                      </div>
                      <span className="text-blue-700 font-medium">Available</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">1,250</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">⏳</span>
                      </div>
                      <span className="text-green-700 font-medium">Pending</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">1,000</span>
                  </div>
                </div>
                
                <button className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Send Points
                  </div>
                </button>
              </div>
            </div>

            {/* Enhanced Priorities Widget */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Priorities</h3>
                  <button className="text-cyan-600 hover:text-cyan-700 text-sm font-medium">
                    Manage
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                    <p className="text-sm font-medium text-amber-800">Looking out for the department</p>
                    <p className="text-xs text-amber-600 mt-1">Active priority</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-xs text-gray-500 text-center">You have not added new priority</p>
                    <button className="w-full mt-2 text-cyan-600 hover:text-cyan-700 text-sm font-medium">
                      + Add Priority
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content - wider and centered */}
        <div className="lg:col-span-6 w-full max-w-[800px] space-y-6">
            {/* Enhanced Post Composer */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">A</span>
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      onFocus={() => setIsComposerExpanded(true)}
                      placeholder="What's on your mind?"
                      className="w-full bg-transparent resize-none text-gray-900 placeholder-gray-500 border-none outline-none text-lg min-h-[60px] max-h-[200px]"
                      style={{ height: 'auto' }}
                    />
                  </div>
                </div>

                {/* Expanded composer actions */}
                {(isComposerExpanded || postContent) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsRecognitionModalOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-medium hover:bg-amber-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          Recognize
                        </button>
                        <button 
                          onClick={() => setIsPollModalOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 rounded-full text-sm font-medium hover:bg-violet-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Poll
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          Attach
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        {postContent && (
                          <button 
                            onClick={() => {
                              setPostContent('');
                              setIsComposerExpanded(false);
                            }}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                          >
                            Cancel
                          </button>
                        )}
                        <button 
                          disabled={!postContent.trim()}
                          className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-full text-sm font-medium transition-colors"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recognition Modal Placeholder */}
            {isRecognitionModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4">Recognize Someone</h3>
                  <p className="text-gray-600 mb-4">Recognition feature coming soon!</p>
                  <button 
                    onClick={() => setIsRecognitionModalOpen(false)}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-md"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Poll Modal Placeholder */}
            {isPollModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4">Create Poll</h3>
                  <p className="text-gray-600 mb-4">Poll creation feature coming soon!</p>
                  <button 
                    onClick={() => setIsPollModalOpen(false)}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-md"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Filter */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Filter by:</div>
              <select className="text-sm border rounded-md px-3 py-1 bg-white">
                <option>My Company</option>
                <option>All</option>
              </select>
            </div>

            {/* Posts Feed */}
            <div className="space-y-4">
              {loadingPosts ? (
                // Loading skeleton
                <>
                  {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-6 shadow-sm animate-pulse">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-1/4 bg-gray-300 rounded"></div>
                          <div className="h-3 w-3/4 bg-gray-300 rounded"></div>
                          <div className="h-3 w-1/2 bg-gray-300 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                // Sample posts (will be replaced with real data)
                <>
                  <PostCard 
                    user="Emma"
                    content="Great team collaboration today on the engineering sprint. Love working with such talented people! 🚀"
                    initials="E"
                    bgColor="bg-green-500"
                  />
                  <PostCard 
                    user="Stephanie"
                    content="Great team collaboration today on the engineering sprint. Love working with such talented people! 🚀"
                    initials="S"
                    bgColor="bg-blue-500"
                  />
                  <PostCard 
                    user="Ruth"
                    content="Just finished a productive meeting with stakeholders. Exciting projects ahead! 🚀"
                    initials="R"
                    bgColor="bg-purple-500"
                  />
                  <PostCard 
                    user="Deborah"
                    content="Excited to share our latest design milestone! 🎨 The new user interface is coming together beautifully."
                    initials="D"
                    bgColor="bg-pink-500"
                  />
                </>
              )}
            </div>
        </div>

        {/* Right sidebar - optimized width */}
        <div className="hidden lg:block lg:col-span-3 w-full max-w-[300px]">
          <div className="space-y-6">
            {/* Enhanced My Active Spaces */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">My Active Spaces</h3>
                  <button className="text-cyan-600 text-sm hover:text-cyan-700 font-medium">View all →</button>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-xs text-gray-500 text-center mb-2">No active spaces yet</p>
                    <button className="w-full text-cyan-600 hover:text-cyan-700 text-sm font-medium">
                      Discover Spaces
                    </button>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">🎉</span>
                      </div>
                      <div className="text-pink-700 font-medium">Celebrations</div>
                    </div>
                    <div className="text-xs text-pink-600">No celebrations today, but check what's coming up!</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Last Thanked */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Last Thanked</h3>
                  <button className="text-cyan-600 text-sm hover:text-cyan-700 font-medium">View All</button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">DM</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Donna Meagle</div>
                      <div className="text-xs text-gray-500">2 hours ago</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-cyan-600">👍</span>
                      <span className="text-xs text-gray-400">+5</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">AD</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Andy Dwyer</div>
                      <div className="text-xs text-gray-500">1 day ago</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-cyan-600">👍</span>
                      <span className="text-xs text-gray-400">+10</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">AP</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Ann Perkins</div>
                      <div className="text-xs text-gray-500">2 days ago</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-cyan-600">👍</span>
                      <span className="text-xs text-gray-400">+15</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-sm text-green-700">
                        <div className="font-medium">Recognition Progress</div>
                        <div className="text-xs">65% of team this month</div>
                      </div>
                    </div>
                    <div className="w-12 h-2 bg-green-200 rounded-full">
                      <div className="w-8 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Post Card Component
function PostCard({ user, content, initials, bgColor }: {
  user: string;
  content: string;
  initials: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center`}>
          <span className="text-white font-medium">{initials}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{user}</h4>
            <button className="text-gray-400 hover:text-gray-600">⋯</button>
          </div>
          <p className="text-sm text-gray-700 mb-3">{content}</p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <button className="flex items-center gap-1 hover:text-blue-600">
              <span>👍</span>
              <span>Like</span>
            </button>
            <button className="flex items-center gap-1 hover:text-yellow-600">
              <span>🎉</span>
              <span>Celebrate</span>
            </button>
            <button className="flex items-center gap-1 hover:text-green-600">
              <span>💬</span>
              <span>Comment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

