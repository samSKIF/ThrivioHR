'use client';
import React, { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); 
    setLoading(true);
    const r = await fetch('/api/bff/auth/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    setLoading(false);
    if (!r.ok) { 
      setError('Invalid credentials'); 
      return; 
    }
    const data = await r.json();
    window.location.href = data?.passwordResetRequired ? '/password/new' : '/me';
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 max-w-md mx-auto lg:max-w-none lg:mx-0">
        <div className="w-full max-w-sm mx-auto lg:w-96">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">ThrivioHR</h1>
            <p className="text-sm text-gray-500 mt-1">Thought Platform</p>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome Back</h2>
          </div>

          {/* Login Form */}
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email or Username
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Enter your email or username"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <a href="/password/forgot" className="text-sm text-blue-600 hover:text-blue-500">
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">or</span>
                </div>
              </div>

              <div className="mt-6">
                <a
                  href="/api/bff/oidc/authorize"
                  className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Login as Corporate
                </a>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Right Panel - Illustration and Features */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12 xl:px-24 bg-white">
        <div className="max-w-md mx-auto text-center">
          {/* Illustration */}
          <div className="mb-8">
            <div className="w-64 h-48 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center relative overflow-hidden">
              {/* Main illustration - person with laptop and gift boxes */}
              <div className="relative">
                {/* Person */}
                <div className="w-16 h-20 bg-gradient-to-b from-orange-200 to-orange-300 rounded-t-full mx-auto mb-2 relative">
                  <div className="w-12 h-12 bg-orange-100 rounded-full absolute top-2 left-2"></div>
                  <div className="w-8 h-4 bg-orange-400 rounded absolute bottom-0 left-4"></div>
                </div>
                
                {/* Laptop */}
                <div className="w-12 h-8 bg-gray-700 rounded mx-auto mb-2 relative">
                  <div className="w-10 h-6 bg-blue-200 rounded absolute top-1 left-1"></div>
                </div>
                
                {/* Gift boxes */}
                <div className="absolute -top-4 -right-8">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded shadow-lg"></div>
                </div>
                <div className="absolute -top-2 -left-6">
                  <div className="w-6 h-6 bg-gradient-to-br from-red-400 to-red-600 rounded shadow-lg"></div>
                </div>
                
                {/* Floating elements */}
                <div className="absolute top-8 -right-12">
                  <div className="w-4 h-4 bg-yellow-300 rounded-full"></div>
                </div>
                <div className="absolute top-4 -left-8">
                  <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Main heading */}
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Empower Your Workplace
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            Connect, engage and recognize your colleagues with our comprehensive employee engagement platform
          </p>

          {/* Features */}
          <div className="space-y-6 text-left">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Peer Recognition</h3>
                <p className="text-gray-600">Celebrate achievements and milestones with colleagues</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582z" />
                    <path fillRule="evenodd" d="M11 14V8h1a1 1 0 000-2H8a1 1 0 000 2h1v6H8a1 1 0 100 2h4a1 1 0 100-2h-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Rewards & Redemption</h3>
                <p className="text-gray-600">Earn and redeem points for real-world rewards</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Polls & Surveys</h3>
                <p className="text-gray-600">Voice your opinion and participate in company decisions</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-400">© 2025 ThrivioHR. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}