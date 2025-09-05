'use client';

import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/bff/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Login failed');
      }

      const data = await response.json();
      
      if (data.success) {
        window.location.href = '/profile';
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f9fafb' }}>
      {/* Left Column - Login Form (50% width on desktop, full width on mobile) */}
      <div style={{ width: '50%', backgroundColor: 'white', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div className="max-w-md mx-auto w-full">
          {/* Logo/Brand Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xl font-bold">
              T
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">ThrivioHR</h1>
              <p className="text-sm text-gray-500">ThrivioHR Platform</p>
            </div>
          </div>

          {/* Login Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <h2 className="text-lg font-semibold text-gray-800">Welcome Back</h2>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-2">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-gray-600">
                    Email or Username
                  </Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="Enter your email or username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    className="focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="password" className="text-sm text-gray-600">
                      Password
                    </Label>
                    <a href="#" className="text-sm text-blue-500 hover:text-blue-400">
                      Forgot password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-4 pt-2">
                {/* Primary Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    backgroundColor: '#374151',
                    color: 'white',
                    fontWeight: '500',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '0.875rem'
                  }}
                  onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#1f2937'}
                  onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#374151'}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
                
                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or</span>
                  </div>
                </div>
                
                {/* Secondary Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => window.location.href = '/api/bff/oidc/authorize'}
                >
                  Login as Corporate
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>

      {/* Right Column - Hero Section (50% width on desktop, hidden on mobile) */}
      <div style={{ width: '50%', background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)', padding: '2rem' }}>
        <div className="h-full flex flex-col justify-between max-w-md mx-auto">
          {/* Hero Image and Content */}
          <div className="flex-1 flex flex-col justify-center">
          <div className="mb-8 text-center">
            <div className="inline-block p-4 bg-white rounded-2xl shadow-md mb-4">
              <img
                src="https://img.freepik.com/free-vector/people-celebrating-achievement-award-ceremony-winners-competition-company-managers-achievement-announcement-award-receiving-ceremony-concept-illustration_335657-2378.jpg?w=700"
                alt="Team Recognition"
                style={{ height: '16rem', width: 'auto', borderRadius: '0.75rem' }}
                onError={(e) => {
                  // Fallback to illustration if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const nextSibling = target.nextSibling as HTMLElement;
                  if (nextSibling) {
                    nextSibling.style.display = 'flex';
                  }
                }}
              />
              <div style={{ 
                height: '16rem', 
                width: '16rem', 
                background: 'linear-gradient(to bottom right, #3b82f6, #8b5cf6)',
                borderRadius: '0.75rem',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{
                    width: '4rem',
                    height: '4rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    margin: '0 auto 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{ width: '2rem', height: '2rem', backgroundColor: 'white', borderRadius: '50%' }}></div>
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>Team Recognition</div>
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Empower Your Workplace
            </h2>
            <p className="text-gray-600">
              Connect, engage and recognize your colleagues with our comprehensive employee engagement platform
            </p>
          </div>
          </div>

          {/* Feature Cards - Positioned at bottom */}
          <div className="space-y-4">
            {/* Feature 1: Peer Recognition */}
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mr-3 flex-shrink-0">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Peer Recognition</h3>
                <p className="text-sm text-gray-500">Celebrate achievements and milestones with colleagues</p>
              </div>
            </div>
            
            {/* Feature 2: Rewards & Redemption */}
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mr-3 flex-shrink-0">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Rewards & Redemption</h3>
                <p className="text-sm text-gray-500">Earn and redeem points for real-world rewards</p>
              </div>
            </div>
            
            {/* Feature 3: Polls & Surveys */}
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mr-3 flex-shrink-0">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Polls & Surveys</h3>
                <p className="text-sm text-gray-500">Voice your opinion and participate in company decisions</p>
              </div>
            </div>
          </div>

            {/* Footer */}
            <p className="text-center text-sm text-gray-500 mt-6">
              © 2025 ThrivioHR. All rights reserved.
            </p>
        </div>
      </div>
    </div>
  );
}