"use client";

/**
 * Feed page - ThrivioHR social recognition feed
 * Three-column layout with points sidebar, main feed, and activity sidebar
 * 
 * Uses client-only rendering with error boundaries to handle browser extension conflicts.
 */
import React, { useState } from "react";
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
      <header className="sticky top-0 z-50 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-gray-200/60 rounded-full shadow-sm px-6 py-3">
            <div className="flex items-center justify-between">
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
              
              {/* User Profile */}
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center hover:bg-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  <span className="text-gray-600 text-sm font-medium">A</span>
                </button>
                
                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsDropdownOpen(false)}
                    ></div>
                    
                    {/* Dropdown Content */}
                    <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Employee</span>
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Analytics</span>
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3">
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar - Points & Priorities */}
          <div className="lg:col-span-1 space-y-6">
            {/* ThrivioHR Points */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200/60 hover:shadow-md transition-shadow duration-200">
              <h2 className="text-lg font-semibold mb-4">ThrivioHR Points</h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-blue-600 text-sm">💎 Available</span>
                  <span className="text-2xl font-bold text-blue-600">1250</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-green-600 text-sm">💚 Pending</span>
                  <span className="text-2xl font-bold text-green-600">1000</span>
                </div>
              </div>
              
              <button className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors duration-150">
                Send Points
              </button>
            </div>

            {/* Priorities */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200/60 hover:shadow-md transition-shadow duration-200">
              <h3 className="font-semibold mb-3">Priorities</h3>
              <p className="text-sm text-gray-600 mb-3">Looking out for the department</p>
              <p className="text-xs text-gray-500">You have not added new priority</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Composer */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200/60 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">👋</span>
                </div>
                <input
                  type="text"
                  placeholder="What's on your mind?"
                  className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white border border-gray-200/60 transition-all duration-200"
                  disabled
                />
                <button className="text-gray-400 hover:text-gray-600">😊</button>
              </div>
              
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 border border-slate-200 hover:border-slate-300 transition-all duration-150">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Share
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 transition-all duration-150">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Appreciate
                </button>
              </div>
            </div>

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

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* My Active Spaces */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200/60 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">My Active Spaces</h3>
                <button className="text-slate-600 text-sm hover:text-slate-800 transition-colors">View all →</button>
              </div>
              <p className="text-xs text-gray-500 mb-4">Your recently new active spaces yet</p>
              <button className="text-slate-600 text-sm hover:text-slate-800 transition-colors">Discover Spaces</button>
              
              <div className="mt-4 space-y-3">
                <div className="text-sm">
                  <div className="text-pink-600 font-medium">🎉 Celebrations</div>
                  <div className="text-xs text-gray-500">No celebrations today, but check what's coming up!</div>
                </div>
              </div>
            </div>

            {/* Last Thanked */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200/60 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Last Thanked</h3>
                <button className="text-cyan-600 text-sm hover:underline">View All</button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">DM</span>
                  </div>
                  <div className="text-sm">Donna Meagle</div>
                  <div className="ml-auto text-slate-500">👍</div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">AD</span>
                  </div>
                  <div className="text-sm">Andy Dwyer</div>
                  <div className="ml-auto text-slate-500">👍</div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">AP</span>
                  </div>
                  <div className="text-sm">Ann Perkins</div>
                  <div className="ml-auto text-slate-500">👍</div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t text-center">
                <div className="text-sm text-gray-600">You've recognized 65% of your team this month</div>
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
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300">
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

