'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, X } from 'lucide-react';

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      try {
        const decoded = JSON.parse(atob(token.split('.')[1] || ''));
        setRole(decoded?.role || null);
      } catch (_) {
        setRole(null);
      }
    } else {
      setIsLoggedIn(false);
      setRole(null);
    }
  }, []); // This simple check runs once on load

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    router.push('/login');
    setIsMobileOpen(false);
  };

  return (
   <nav className="bg-white/95 backdrop-blur border-b border-neutral-200 shadow-sm w-full">
  <div className="w-full px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16 w-full">
      {/* CareerHub Logo - Left Side */}
      <div className="flex-shrink-0">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-gray-900">
          CareerHub
        </Link>
      </div>

      {/* Navigation Links - Right Side */}
      <div className="hidden sm:flex items-center justify-end flex-1 gap-2">
        {isLoggedIn ? (
          <>
            <Link href="/projects" className="relative px-3 py-2 rounded-md text-sm font-medium text-gray-800 transition-colors transform transition-transform duration-150 group hover:scale-105">
              <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(56,189,248,0.14)] ring-1 ring-neutral-200 group-hover:ring-sky-500/60 group-hover:shadow-[0_0_18px_rgba(56,189,248,0.45)]"></span>
              <span className="relative group-hover:text-sky-700">Projects</span>
            </Link>
            <Link href="/profile" className="relative px-3 py-2 rounded-md text-sm font-medium text-gray-800 transition-colors transform transition-transform duration-150 group hover:scale-105">
              <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(139,92,246,0.14)] ring-1 ring-neutral-200 group-hover:ring-violet-500/60 group-hover:shadow-[0_0_18px_rgba(139,92,246,0.45)]"></span>
              <span className="relative group-hover:text-violet-700">My Profile</span>
            </Link>
            <Link href="/my-applications" className="relative px-3 py-2 rounded-md text-sm font-medium text-gray-800 transition-colors transform transition-transform duration-150 group hover:scale-105">
              <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(217,70,239,0.14)] ring-1 ring-neutral-200 group-hover:ring-fuchsia-500/60 group-hover:shadow-[0_0_18px_rgba(217,70,239,0.45)]"></span>
              <span className="relative group-hover:text-fuchsia-700">My Applications</span>
            </Link>
            <Link href="/resume-analyzer" className="relative px-3 py-2 rounded-md text-sm font-medium text-gray-800 transition-colors transform transition-transform duration-150 group hover:scale-105">
              <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(99,102,241,0.14)] ring-1 ring-neutral-200 group-hover:ring-indigo-500/60 group-hover:shadow-[0_0_18px_rgba(99,102,241,0.45)]"></span>
              <span className="relative group-hover:text-indigo-700">Resume Analyzer</span>
            </Link>
            <Link href="/interview-practice" className="relative px-3 py-2 rounded-md text-sm font-medium text-gray-800 transition-colors transform transition-transform duration-150 group hover:scale-105">
              <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(34,211,238,0.14)] ring-1 ring-neutral-200 group-hover:ring-cyan-500/60 group-hover:shadow-[0_0_18px_rgba(34,211,238,0.45)]"></span>
              <span className="relative group-hover:text-cyan-700">Interview Practice</span>
            </Link>
            {role === 'developer' && (
              <Link href="/developer-dashboard" className="relative px-3 py-2 rounded-md text-sm font-medium text-gray-800 transition-colors transform transition-transform duration-150 group hover:scale-105">
                <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(16,185,129,0.14)] ring-1 ring-neutral-200 group-hover:ring-emerald-500/60 group-hover:shadow-[0_0_18px_rgba(16,185,129,0.45)]"></span>
                <span className="relative group-hover:text-emerald-700">Developer Dashboard</span>
              </Link>
            )}
            {role === 'cofounder' && (
              <Link href="/dashboard" className="relative px-3 py-2 rounded-md text-sm font-medium text-gray-800 transition-colors transform transition-transform duration-150 group hover:scale-105">
                <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(16,185,129,0.14)] ring-1 ring-neutral-200 group-hover:ring-emerald-500/60 group-hover:shadow-[0_0_18px_rgba(16,185,129,0.45)]"></span>
                <span className="relative group-hover:text-emerald-700">Co-founder Dashboard</span>
              </Link>
            )}
            <button onClick={handleLogout} className="relative bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors shadow-sm">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="relative px-3 py-2 rounded-md text-sm font-medium text-gray-800 transition-colors transform transition-transform duration-150 group hover:scale-105">
              <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(56,189,248,0.14)] ring-1 ring-neutral-200 group-hover:ring-sky-500/60 group-hover:shadow-[0_0_18px_rgba(56,189,248,0.45)]"></span>
              <span className="relative group-hover:text-sky-700">Login</span>
            </Link>
            <Link href="/signup" className="bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white px-3 py-2 rounded-md text-sm font-medium shadow-[0_0_18px_rgba(56,189,248,0.35)]">
              Sign Up
            </Link>
          </>
        )}
      </div>

      {/* Mobile menu button */}
      <div className="sm:hidden flex items-center">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
        >
          {isMobileOpen ? <X className="block h-6 w-6" /> : <MoreVertical className="block h-6 w-6" />}
        </button>
      </div>
    </div>
  </div>

  {/* Mobile menu */}
  {isMobileOpen && (
    <div className="sm:hidden">
      <div className="px-2 pt-2 pb-3 space-y-1">
        {isLoggedIn ? (
          <>
            <Link href="/projects" onClick={() => setIsMobileOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
              Projects
            </Link>
            <Link href="/profile" onClick={() => setIsMobileOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
              My Profile
            </Link>
            <Link href="/my-applications" onClick={() => setIsMobileOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
              My Applications
            </Link>
            <Link href="/resume-analyzer" onClick={() => setIsMobileOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
              Resume Analyzer
            </Link>
            <Link href="/interview-practice" onClick={() => setIsMobileOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
              Interview Practice
            </Link>
            {role === 'developer' && (
              <Link href="/developer-dashboard" onClick={() => setIsMobileOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                Developer Dashboard
              </Link>
            )}
            {role === 'cofounder' && (
              <Link href="/dashboard" onClick={() => setIsMobileOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                Co-founder Dashboard
              </Link>
            )}
            <button
              onClick={() => {
                handleLogout();
                setIsMobileOpen(false);
              }}
              className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-800 hover:bg-red-50"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              onClick={() => setIsMobileOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Login
            </Link>
            <Link
              href="/signup"
              onClick={() => setIsMobileOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-white bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </div>
  )}
</nav>
  );
}