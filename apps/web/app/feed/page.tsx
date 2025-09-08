"use client";

/**
 * Feed page - ThrivioHR social recognition feed
 * Three-column layout with points sidebar, main feed, and activity sidebar
 * 
 * Uses client-only rendering with error boundaries to handle browser extension conflicts.
 */
import React from "react";
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
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar - Points & Priorities */}
          <div className="lg:col-span-1 space-y-6">
            {/* ThrivioHR Points */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
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
              
              <button className="w-full mt-4 bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-md text-sm font-medium">
                Send Points
              </button>
            </div>

            {/* Priorities */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold mb-3">Priorities</h3>
              <p className="text-sm text-gray-600 mb-3">Looking out for the department</p>
              <p className="text-xs text-gray-500">You have not added new priority</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Composer */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">👋</span>
                </div>
                <input
                  type="text"
                  placeholder="What's on your mind?"
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled
                />
                <button className="text-gray-400 hover:text-gray-600">😊</button>
              </div>
              
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium hover:bg-green-200">
                  📢 Share
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium hover:bg-yellow-200">
                  👏 Appreciate
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-200">
                  📊 Poll
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
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">My Active Spaces</h3>
                <button className="text-teal-600 text-sm hover:underline">View all →</button>
              </div>
              <p className="text-xs text-gray-500 mb-4">Your recently new active spaces yet</p>
              <button className="text-teal-600 text-sm hover:underline">Discover Spaces</button>
              
              <div className="mt-4 space-y-3">
                <div className="text-sm">
                  <div className="text-pink-600 font-medium">🎉 Celebrations</div>
                  <div className="text-xs text-gray-500">No celebrations today, but check what's coming up!</div>
                </div>
              </div>
            </div>

            {/* Last Thanked */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Last Thanked</h3>
                <button className="text-teal-600 text-sm hover:underline">View All</button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">DM</span>
                  </div>
                  <div className="text-sm">Donna Meagle</div>
                  <div className="ml-auto text-teal-600">👍</div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">AD</span>
                  </div>
                  <div className="text-sm">Andy Dwyer</div>
                  <div className="ml-auto text-teal-600">👍</div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">AP</span>
                  </div>
                  <div className="text-sm">Ann Perkins</div>
                  <div className="ml-auto text-teal-600">👍</div>
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

