'use client';

import { useState } from 'react';
import Image from 'next/image';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  // States from our original form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('developer');
  
  // New states for a better form
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Loading state
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  // Form validation logic
  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!termsAccepted) newErrors.terms = 'You must accept the terms of service';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Our original handleSubmit function, adapted for the new form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (res.ok) {
        router.push('/login'); // Redirect to login on success
      } else {
        const data = await res.json();
        setErrors({ api: data.message || 'User registration failed.' });
      }
    } catch (error) {
      setErrors({ api: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
      <div className="relative grid grid-cols-1 lg:grid-cols-2 w-full max-w-6xl mx-auto rounded-2xl overflow-hidden border border-neutral-800 shadow-[0_0_60px_-20px_rgba(0,0,0,0.6)] bg-neutral-950/60 backdrop-blur">
        
        {/* Left Column - Illustration */}
        <div className="hidden lg:flex relative items-end justify-start p-0 bg-neutral-950">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d"
              alt="Create your Career Hub account – connect with founders and showcase your skills"
              fill
              priority
              className="object-cover opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950/60 via-neutral-950/10 to-transparent" />
            {/* Quote Overlay */}
            <div className="absolute bottom-8 left-8 right-8 max-w-xl">
              <div className="backdrop-blur-sm bg-black/25 rounded-xl p-5 ring-1 ring-white/15">
                <p className="quote3d text-white text-2xl font-semibold leading-snug">
                  Join founders. Ship ideas. Grow together.
                </p>
                <p className="mt-2 text-white/85 text-sm font-medium tracking-wide">
                  Create your profile and start collaborating on real projects.
                </p>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none border-r border-neutral-800" />
        </div>

        {/* Right Column - Registration Form */}
        <div className="w-full p-8 sm:p-12 bg-neutral-950/40">
          <div className="mb-6">
            <Link href="/login" className="text-blue-600 hover:text-blue-700 transition-colors flex items-center">
              <i className="fas fa-arrow-left mr-2"></i>
              <span>Back to Login</span>
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Create your account</h2>
            <p className="text-slate-300 mt-2">Join the community of innovators and entrepreneurs</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5">
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-user text-gray-600"></i></div>
                <input 
                  id="name" 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className={`w-full pl-10 pr-3 py-3 rounded-lg focus:ring-2 transition-all text-white placeholder-slate-400 bg-neutral-900/80 border ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-neutral-700 focus:ring-sky-400/70'}`} 
                  placeholder="John Doe" 
                  required 
                />
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div className="mb-5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-envelope text-gray-600"></i></div>
                <input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className={`w-full pl-10 pr-3 py-3 rounded-lg focus:ring-2 transition-all text-white placeholder-slate-400 bg-neutral-900/80 border ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-neutral-700 focus:ring-sky-400/70'}`} 
                  placeholder="you@example.com" 
                  required 
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>
            
            <div className="mb-5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-lock text-gray-600"></i></div>
                <input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className={`w-full pl-10 pr-3 py-3 rounded-lg focus:ring-2 transition-all text-white placeholder-slate-400 bg-neutral-900/80 border ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-neutral-700 focus:ring-violet-400/70'}`} 
                  placeholder="••••••••" 
                  required 
                />
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            <div className="mb-5">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i className="fas fa-lock text-gray-600"></i></div>
                <input 
                  id="confirmPassword" 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className={`w-full pl-10 pr-3 py-3 rounded-lg focus:ring-2 transition-all text-white placeholder-slate-400 bg-neutral-900/80 border ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-neutral-700 focus:ring-violet-400/70'}`} 
                  placeholder="••••••••" 
                  required 
                />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
            </div>

            <div className="mb-6">
                <label htmlFor="role" className="block text-sm font-medium text-slate-300 mb-2">I am a:</label>
                <select 
                  id="role" 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)} 
                  className="w-full p-3 rounded-lg border border-neutral-700 focus:ring-2 focus:ring-sky-400/70 text-white bg-neutral-900/80"
                >
                    <option value="developer">Developer</option>
                    <option value="cofounder">Co-founder</option>
                </select>
            </div>

            <div className="mb-6 flex items-start">
                <input id="terms" type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                <label htmlFor="terms" className="ml-3 text-sm text-gray-700">I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a></label>
            </div>
            {errors.terms && <p className="mt-1 text-sm text-red-600">{errors.terms}</p>}
            
            {errors.api && <div className="p-3 text-sm text-red-300 bg-red-900/30 border border-red-700/60 rounded-md mb-4">{errors.api}</div>}

            <button type="submit" className="w-full bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white font-medium py-3 rounded-lg transition-all transform hover:scale-[1.02] disabled:bg-neutral-700 flex justify-center items-center shadow-[0_0_20px_-4px_rgba(56,189,248,0.6)]" disabled={loading}>
              {loading ? <i className="fas fa-circle-notch fa-spin"></i> : 'Create account'}
            </button>
          </form>
          
          <p className="mt-8 text-center text-sm text-slate-300">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-sky-400 hover:text-sky-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      {/* 3D Quote Styles */}
      <style jsx>{`
        .quote3d {
          position: relative;
          text-shadow:
            0 1px 0 rgba(0,0,0,0.22),
            0 2px 0 rgba(0,0,0,0.2),
            0 3px 0 rgba(0,0,0,0.18),
            0 4px 0 rgba(0,0,0,0.16),
            0 6px 12px rgba(0,0,0,0.35);
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