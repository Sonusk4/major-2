'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MyApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Check user role from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }

    const fetchApplications = async () => {
      if (!token) {
        setError('You must be logged in to view your applications.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/my-applications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setApplications(data.applications || []);
        } else {
           const data = await res.json();
           setError(data.message || "Failed to load applications.");
        }
      } catch (err) {
        setError("An error occurred.");
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  if (loading) return <p className="text-center mt-10 text-slate-200">Loading your applications...</p>;
  if (error) return <p className="text-center mt-10 text-rose-400">{error}</p>;

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: '⏳ Pending' },
      reviewed: { color: 'bg-blue-100 text-blue-800 border-blue-200', text: '👀 Reviewed' },
      accepted: { color: 'bg-green-100 text-green-800 border-green-200', text: '✅ Accepted' },
      rejected: { color: 'bg-red-100 text-red-800 border-red-200', text: '❌ Rejected' }
    };
    const cfg = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
        {cfg.text}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-slate-900 to-emerald-950">
      {/* Navbar */}
      <nav className="bg-neutral-950/80 backdrop-blur border-b border-neutral-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/dashboard" className="text-2xl font-bold gradient-text hover:opacity-80 transition-opacity">
              CareerHub
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/projects" className="text-slate-300 hover:text-white transition-colors">
                Projects
              </Link>
              <Link href="/my-applications" className="text-slate-300 hover:text-white transition-colors font-medium border-b-2 border-emerald-500">
                My Applications
              </Link>
              <Link href="/profile" className="text-slate-300 hover:text-white transition-colors">
                My Profile
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button className="text-slate-300 hover:text-white">
                <i className="fas fa-bars text-xl"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold text-slate-100 mb-6 drop-shadow-[0_0_16px_rgba(16,185,129,0.35)]">My Applications</h1>
        <div className="flex flex-col gap-4">
          {applications.length > 0 ? (
            applications.map(app => (
              <div key={app.id} className="rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur p-5 hover:border-emerald-500/40 hover:shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all">
                <h2 className="text-xl font-semibold mb-2">
                  <Link href={`/projects/${app.project?.id}`} className="text-emerald-300 hover:text-emerald-200 drop-shadow-[0_0_10px_rgba(16,185,129,0.45)]">
                    {app.project?.title}
                  </Link>
                </h2>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-slate-300"><span className="font-medium text-slate-100">Posted by:</span> {app.project?.cofounderName}</p>
                  {getStatusBadge(app.status)}
                </div>
                <p className="text-slate-400 text-sm mt-2">Applied on {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : '-'}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-300">You have not applied to any projects yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}