'use client';

import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
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
    <div className="min-h-screen flex flex-col md:flex-row bg-muted">
      {/* Left side - Logo and branding */}
      <div className="md:w-1/2 bg-background p-8 flex flex-col justify-center items-center">
        <div className="max-w-md mx-auto w-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
              T
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">ThrivioHR</h1>
              <p className="text-sm text-muted-foreground">ThrivioHR Platform</p>
            </div>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Welcome Back
                </h2>
              </div>
            </CardHeader>

            <div className="w-full">
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm text-muted-foreground">
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
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm text-muted-foreground">
                        Password
                      </Label>
                      <a href="#" className="text-sm text-primary hover:underline">
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
                    />
                  </div>

                  {error && (
                    <div className="bg-destructive/15 border border-destructive/30 rounded-md p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-700 hover:bg-slate-800 text-white"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-background text-muted-foreground">OR</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.href = '/api/bff/oidc/authorize'}
                  >
                    Login as Corporate
                  </Button>
                </CardContent>
              </form>
            </div>
          </Card>
        </div>
      </div>

      {/* Right side - Illustration and Features */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12 xl:px-20 bg-background">
        <div className="max-w-md mx-auto text-center">
          {/* Illustration */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              {/* Phone/Device mockup */}
              <div className="w-40 h-56 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-1 shadow-xl">
                <div className="w-full h-full bg-background rounded-2xl p-3 flex flex-col items-center justify-center">
                  {/* Dollar signs in circles */}
                  <div className="flex space-x-1 mb-3">
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 text-xs font-bold">$</span>
                    </div>
                    <div className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center">
                      <span className="text-orange-700 text-xs font-bold">$</span>
                    </div>
                  </div>
                  
                  {/* Person illustration */}
                  <div className="w-10 h-14 bg-gradient-to-b from-blue-200 to-blue-300 rounded-t-full mb-2 relative">
                    <div className="w-6 h-6 bg-blue-100 rounded-full absolute top-1 left-2"></div>
                  </div>
                  
                  {/* Laptop */}
                  <div className="w-6 h-4 bg-gray-700 rounded mb-2"></div>
                </div>
              </div>
              
              {/* Gift boxes floating around */}
              <div className="absolute -left-3 top-6">
                <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded shadow-lg"></div>
              </div>
              <div className="absolute -right-1 top-12">
                <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-orange-600 rounded shadow-lg"></div>
              </div>
              <div className="absolute -left-4 bottom-12">
                <div className="w-7 h-7 bg-gradient-to-br from-purple-400 to-purple-600 rounded shadow-lg"></div>
              </div>
            </div>
          </div>

          {/* Main heading */}
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Empower Your Workplace
          </h2>
          <p className="text-muted-foreground mb-8 text-base leading-relaxed">
            Connect, engage and recognize your colleagues with our<br />
            comprehensive employee engagement platform
          </p>

          {/* Features */}
          <div className="space-y-6 text-left">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center">
                  <svg className="w-3 h-3 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Peer Recognition</h3>
                <p className="text-muted-foreground text-sm">Celebrate achievements and milestones with colleagues</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center">
                  <svg className="w-3 h-3 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Rewards & Redemption</h3>
                <p className="text-muted-foreground text-sm">Earn and redeem points for real-world rewards</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center">
                  <svg className="w-3 h-3 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Polls & Surveys</h3>
                <p className="text-muted-foreground text-sm">Voice your opinion and participate in company decisions</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">© 2025 ThrivioHR. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}