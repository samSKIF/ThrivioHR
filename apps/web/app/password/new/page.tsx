'use client';
import React, { useState, useEffect } from 'react';

interface PasswordStrength {
  score: number; // 0-4
  color: string;
  text: string;
  percentage: number;
}

interface PasswordRequirement {
  key: string;
  text: string;
  met: boolean;
}

export default function FirstPasswordPage() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [policy, setPolicy] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    fetch('/api/bff/auth/password/policy').then(r=>r.json()).then(setPolicy).catch(()=>{});
  }, []);

  // Calculate password strength
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (!password) return { score: 0, color: 'bg-gray-300', text: 'Enter a password', percentage: 0 };
    
    let score = 0;
    const checks = [
      password.length >= (policy?.minLength || 8), // length
      /[a-z]/.test(password), // lowercase
      /[A-Z]/.test(password), // uppercase  
      /[0-9]/.test(password), // number
      /[^a-zA-Z0-9]/.test(password), // special character
    ];
    
    score = checks.filter(Boolean).length;
    
    if (score === 0) return { score: 0, color: 'bg-gray-300', text: 'Very weak', percentage: 20 };
    if (score === 1) return { score: 1, color: 'bg-red-500', text: 'Weak', percentage: 25 };
    if (score === 2) return { score: 2, color: 'bg-orange-500', text: 'Fair', percentage: 50 };
    if (score === 3) return { score: 3, color: 'bg-yellow-500', text: 'Good', percentage: 75 };
    if (score === 4) return { score: 4, color: 'bg-green-500', text: 'Strong', percentage: 90 };
    return { score: 5, color: 'bg-green-600', text: 'Very strong', percentage: 100 };
  };

  // Get password requirements
  const getPasswordRequirements = (password: string): PasswordRequirement[] => {
    const minLength = policy?.minLength || 8;
    return [
      {
        key: 'length',
        text: `At least ${minLength} characters`,
        met: password.length >= minLength
      },
      {
        key: 'lowercase',
        text: 'One lowercase letter (a-z)',
        met: /[a-z]/.test(password)
      },
      {
        key: 'uppercase', 
        text: 'One uppercase letter (A-Z)',
        met: /[A-Z]/.test(password)
      },
      {
        key: 'number',
        text: 'One number (0-9)',
        met: /[0-9]/.test(password)
      },
      {
        key: 'special',
        text: 'One special character (!@#$%^&*)',
        met: /[^a-zA-Z0-9]/.test(password)
      }
    ];
  };

  const strength = calculatePasswordStrength(pw);
  const requirements = getPasswordRequirements(pw);
  const allRequirementsMet = requirements.every(req => req.met);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (!allRequirementsMet) {
      setError('Please meet all password requirements');
      return;
    }
    
    if (pw !== pw2) { 
      setError('Passwords do not match'); 
      return; 
    }
    
    const r = await fetch('/api/bff/auth/password/first-set', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ passwordNew: pw })
    });
    
    if (!r.ok) {
      const j = await r.json().catch(()=>({error:'error'}));
      setError(j?.error === 'weak_password' ? `Weak password: ${(j.reasons||[]).join(', ')}` : 'Error updating password');
      return;
    }
    
    setOk(true);
    setTimeout(()=>{ window.location.href='/feed'; }, 700);
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-6">Set your new password</h1>
      
      <form onSubmit={submit} className="space-y-4">
        {/* New Password Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>
          <input 
            type="password" 
            value={pw} 
            onChange={e=>setPw(e.target.value)} 
            placeholder="Enter your new password" 
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            required 
          />
        </div>

        {/* Password Strength Indicator */}
        {pw && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Password Strength</span>
              <span className={`text-sm font-medium ${
                strength.score >= 4 ? 'text-green-600' : 
                strength.score >= 3 ? 'text-yellow-600' : 
                strength.score >= 2 ? 'text-orange-600' : 'text-red-600'
              }`}>
                {strength.text}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${strength.color}`}
                style={{ width: `${strength.percentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Password Requirements */}
        {pw && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Password Requirements</h3>
            <div className="space-y-2">
              {requirements.map((req) => (
                <div key={req.key} className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    req.met ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    {req.met && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${req.met ? 'text-green-700' : 'text-gray-600'}`}>
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirm Password Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <input 
            type="password" 
            value={pw2} 
            onChange={e=>setPw2(e.target.value)} 
            placeholder="Confirm your new password" 
            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              pw2 && pw !== pw2 ? 'border-red-500' : 'border-gray-300'
            }`}
            required 
          />
          {pw2 && pw !== pw2 && (
            <p className="text-red-600 text-sm mt-1">Passwords do not match</p>
          )}
        </div>

        {/* Error and Success Messages */}
        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        {ok && <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg p-3">Password updated successfully! Redirecting...</p>}

        {/* Submit Button */}
        <button 
          type="submit"
          disabled={!allRequirementsMet || pw !== pw2 || !pw || !pw2}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            allRequirementsMet && pw === pw2 && pw && pw2
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Save Password
        </button>
      </form>
    </main>
  );
}