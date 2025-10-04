 'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!email || !password) {
      setError('Both email and password are required.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        const decodedToken = JSON.parse(atob(data.token.split('.')[1]));

        // Route users based on role to avoid unauthorized dashboard API calls
        if (decodedToken.role === 'cofounder') {
          router.push('/dashboard');
        } else {
          router.push('/developer-dashboard');
        }
      } else {
        const data = await res.json();
        setError(data.message || 'Login failed.');
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Enhanced Background with more blur elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-700/30 via-gray-800/20 to-gray-900/30"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl"></div>
      
      {/* Custom Background Circles */}
      <div className="absolute top-8 right-8 w-28 h-28 bg-orange-300/40 rounded-full blur-sm"></div>
      <div className="absolute top-1/2 left-8 w-24 h-24 bg-green-300/40 rounded-full blur-sm transform -translate-y-1/2"></div>
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      <div className="relative grid grid-cols-1 lg:grid-cols-2 w-full max-w-6xl mx-auto rounded-lg overflow-hidden" style={{
        backdropFilter: 'blur(30px)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>

        {/* Left Column - Illustration */}
        <div className="hidden lg:flex relative items-end justify-start p-0">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c"
              alt="Sign in to Career Hub – discover jobs and collaborate with teams"
              fill
              priority
              className="object-cover opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent" />
            {/* Quote Overlay */}
            <div className="absolute bottom-8 left-8 right-8 max-w-xl">
              <div className="backdrop-blur-sm bg-black/20 rounded-xl p-5 ring-1 ring-white/20">
                <p className="quote3d text-white text-2xl font-semibold leading-snug">
                  Build your career, one connection at a time.
                </p>
                <p className="mt-2 text-white/80 text-sm font-medium tracking-wide">
                  Discover roles, showcase skills, and collaborate with teams.
                </p>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none border-r border-white/30" />
        </div>

        {/* Right Column - Login Form */}
        <div className="w-full p-8 sm:p-12 flex flex-col justify-center relative" style={{
          backdropFilter: 'blur(30px)',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-black">Welcome back</h2>
            <p className="text-gray-300 mt-2">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email Input */}
            <div className="mb-5">
              <label htmlFor="email" className="block text-sm font-medium text-black mb-2">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-envelope text-gray-400"></i></div>
                <input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-white/30 bg-white/20 backdrop-blur-md text-black placeholder-gray-500 caret-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-300 focus:bg-white/30 transition-all duration-200" 
                  autoComplete="off"
                  placeholder="you@example.com" 
                  required 
                  suppressHydrationWarning
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="mb-6 relative">
              {/* Circle behind password field */}
              <div className="absolute -top-2 -right-2 w-20 h-20 bg-sky-300/30 rounded-full blur-md"></div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-black">Password</label>
                <a href="#" className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-lock text-gray-400"></i></div>
                <input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-white/30 bg-white/20 backdrop-blur-md text-black placeholder-gray-500 caret-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-300 focus:bg-white/30 transition-all duration-200" 
                  autoComplete="new-password"
                  placeholder="••••••••" 
                  required 
                  suppressHydrationWarning
                />
              </div>
            </div>

            {/* Error Message */}
            {error && <div className="p-3 text-sm text-red-700 bg-red-100/20 border border-red-200/30 rounded-xl mb-4 backdrop-blur-md">{error}</div>}

            {/* Submit Button */}
            <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-medium py-3 rounded-xl transition-all transform hover:scale-[1.02] disabled:bg-gray-400 flex justify-center items-center shadow-lg hover:shadow-xl disabled:transform-none" disabled={loading} suppressHydrationWarning>
              {loading ? <i className="fas fa-circle-notch fa-spin"></i> : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-300">
            New to Career Hub?{' '}
            <Link href="/signup" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
      {/* 3D Quote Styles */}
      <style jsx>{`
        .quote3d {
          position: relative;
          text-shadow:
            0 1px 0 rgba(0,0,0,0.2),
            0 2px 0 rgba(0,0,0,0.2),
            0 3px 0 rgba(0,0,0,0.18),
            0 4px 0 rgba(0,0,0,0.16),
            0 5px 10px rgba(0,0,0,0.35);
          transform: perspective(800px) rotateX(6deg) rotateY(-4deg) translateZ(0);
          animation: floatTilt 5s ease-in-out infinite;
        }
        @keyframes floatTilt {
          0%   { transform: perspective(800px) rotateX(6deg) rotateY(-4deg) translateY(0); }
          50%  { transform: perspective(800px) rotateX(4deg) rotateY(-2deg) translateY(-6px); }
          100% { transform: perspective(800px) rotateX(6deg) rotateY(-4deg) translateY(0); }
        }
      `}</style>
    </div>
  );
}