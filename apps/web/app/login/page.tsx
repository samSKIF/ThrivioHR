'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

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
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Left side - Logo and branding */}
      <div className="md:w-1/2 bg-white p-8 flex flex-col justify-center items-center">
        <div className="max-w-md mx-auto w-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-primary-color text-white flex items-center justify-center text-xl font-bold">
              E
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">ThrivioHR</h1>
              <p className="text-sm text-gray-500">ThrivioHR Platform</p>
            </div>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Welcome Back
                </h2>
              </div>
            </CardHeader>

            <div className="w-full">
              <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm text-gray-600">
                      Email or Username
                    </Label>
                    <Input
                      id="email"
                      type="text"
                      placeholder="Enter your email or username"
                      {...register('email')}
                      className="focus:border-primary-color focus:ring-primary-color"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="password" className="text-sm text-gray-600">
                        Password
                      </Label>
                      <a href="#" className="text-sm text-primary-color hover:text-primary-color/80">
                        Forgot password?
                      </a>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      {...register('password')}
                      className="focus:border-primary-color focus:ring-primary-color"
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
                  <Button
                    type="submit"
                    className="w-full bg-gray-700 hover:bg-gray-800 text-white font-medium shadow-md"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={() => window.location.href = '/api/bff/oidc/authorize'}
                    disabled={loading}
                  >
                    Login as Corporate
                  </Button>
                </CardFooter>
              </form>
            </div>
          </Card>
        </div>
      </div>

      {/* Right side - Hero image and features */}
      <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-primary-color/5 to-primary-color/10 p-8">
        <div className="max-w-md mx-auto h-full flex flex-col">
          <div className="mb-8 text-center">
            <div className="inline-block p-4 bg-white rounded-2xl shadow-md mb-4">
              <img
                src="https://img.freepik.com/free-vector/people-celebrating-achievement-award-ceremony-winners-competition-company-managers-achievement-announcement-award-receiving-ceremony-concept-illustration_335657-2378.jpg?w=700"
                alt="Team Recognition"
                className="h-64 w-auto rounded-xl"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Empower Your Workplace
            </h2>
            <p className="text-gray-600">
              Connect, engage and recognize your colleagues with our
              comprehensive employee engagement platform
            </p>
          </div>

          <div className="space-y-4 mt-auto">
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-primary-color/10 rounded-full flex items-center justify-center text-primary-color mr-3 flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">
                  Peer Recognition
                </h3>
                <p className="text-sm text-gray-500">
                  Celebrate achievements and milestones with colleagues
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-primary-color/10 rounded-full flex items-center justify-center text-primary-color mr-3 flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                  <path d="M2 7h20" />
                  <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">
                  Rewards & Redemption
                </h3>
                <p className="text-sm text-gray-500">
                  Earn and redeem points for real-world rewards
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm flex items-start">
              <div className="w-10 h-10 bg-primary-color/10 rounded-full flex items-center justify-center text-primary-color mr-3 flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M7 10h10" />
                  <path d="M7 14h10" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Polls & Surveys</h3>
                <p className="text-sm text-gray-500">
                  Voice your opinion and participate in company decisions
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            © 2025 ThrivioHR. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}