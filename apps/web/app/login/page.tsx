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
            <h1 className="text-xl font-bold text-gray-900">ThrivioHR</h1>
            <p className="text-sm text-gray-500 mt-1">ThrivioHR Platform</p>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-2">Welcome Back</h2>
          </div>

          {/* Login Form */}
          <form onSubmit={onSubmit} className="space-y-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                suppressHydrationWarning
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                suppressHydrationWarning
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
              suppressHydrationWarning
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">OR</span>
                </div>
              </div>

              <div className="mt-4">
                <a
                  href="/api/bff/oidc/authorize"
                  className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Login as Corporate
                </a>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Right Panel - Illustration and Features */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12 xl:px-20 bg-white">
        <div className="max-w-md mx-auto text-center">
          {/* Illustration */}
          <div className="mb-8 flex justify-end">
            <div className="relative">
              {/* Phone/Device mockup */}
              <div className="w-48 h-64 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-1 shadow-2xl">
                <div className="w-full h-full bg-white rounded-3xl p-4 flex flex-col items-center justify-center">
                  {/* Dollar signs in circles */}
                  <div className="flex space-x-2 mb-4">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 text-sm font-bold">$</span>
                    </div>
                    <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center">
                      <span className="text-orange-700 text-sm font-bold">$</span>
                    </div>
                  </div>
                  
                  {/* Person illustration */}
                  <div className="w-12 h-16 bg-gradient-to-b from-blue-200 to-blue-300 rounded-t-full mb-2 relative">
                    <div className="w-8 h-8 bg-blue-100 rounded-full absolute top-1 left-2"></div>
                  </div>
                  
                  {/* Laptop */}
                  <div className="w-8 h-5 bg-gray-700 rounded mb-2"></div>
                </div>
              </div>
              
              {/* Gift boxes floating around */}
              <div className="absolute -left-4 top-8">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-lg shadow-lg"></div>
              </div>
              <div className="absolute -right-2 top-16">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg shadow-lg"></div>
              </div>
              <div className="absolute -left-6 bottom-16">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg shadow-lg"></div>
              </div>
            </div>
          </div>

          {/* Main heading */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Empower Your Workplace
          </h2>
          <p className="text-gray-600 mb-8 text-base leading-relaxed">
            Connect, engage and recognize your colleagues with our<br />
            comprehensive employee engagement platform
          </p>

          {/* Features */}
          <div className="space-y-6 text-left">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                  <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Peer Recognition</h3>
                <p className="text-gray-600 text-sm">Celebrate achievements and milestones with colleagues</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                  <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582z" />
                    <path fillRule="evenodd" d="M11 14V8h1a1 1 0 000-2H8a1 1 0 000 2h1v6H8a1 1 0 100 2h4a1 1 0 100-2h-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Rewards & Redemption</h3>
                <p className="text-gray-600 text-sm">Earn and redeem points for real-world rewards</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                  <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Polls & Surveys</h3>
                <p className="text-gray-600 text-sm">Voice your opinion and participate in company decisions</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-400">© 2025 ThrivioHR. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}