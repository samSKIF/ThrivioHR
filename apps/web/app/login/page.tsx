'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Heart, Store, List } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/bff/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Login failed');
      }

      const responseData = await response.json();
      
      if (responseData.success) {
        window.location.href = '/profile';
      } else {
        setError(responseData.message || 'Login failed');
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
              E
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
            
            <form onSubmit={handleSubmit(onSubmit)}>
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
                    {...register('email')}
                    disabled={loading}
                    className="focus:border-blue-500 focus:ring-blue-500"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
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
                    {...register('password')}
                    disabled={loading}
                    className="focus:border-blue-500 focus:ring-blue-500"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                  )}
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
      <div className="hidden md:block" style={{ width: '50%', background: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.1))', padding: '2rem' }}>
        <div className="h-full flex flex-col max-w-md mx-auto">
          {/* Spacer to push hero content to center */}
          <div className="flex-1"></div>
          
          {/* Hero Image and Content - Centered */}
          <div className="text-center">
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

          {/* Spacer to push feature cards to bottom */}
          <div className="flex-1"></div>

          {/* Feature Cards - At the bottom */}
          <div className="space-y-3 mb-4">
            {/* Feature 1: Peer Recognition */}
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mr-3 flex-shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Peer Recognition</h3>
                <p className="text-sm text-gray-500">Celebrate achievements and milestones with colleagues</p>
              </div>
            </div>
            
            {/* Feature 2: Rewards & Redemption */}
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mr-3 flex-shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Rewards & Redemption</h3>
                <p className="text-sm text-gray-500">Earn and redeem points for real-world rewards</p>
              </div>
            </div>
            
            {/* Feature 3: Polls & Surveys */}
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mr-3 flex-shrink-0">
                <List className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Polls & Surveys</h3>
                <p className="text-sm text-gray-500">Voice your opinion and participate in company decisions</p>
              </div>
            </div>
          </div>

          {/* Footer - Even lower */}
          <div className="text-center text-sm text-gray-500">
            © 2025 ThrivioHR. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}