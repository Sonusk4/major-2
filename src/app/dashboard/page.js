'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [updatingAppId, setUpdatingAppId] = useState(null);

  useEffect(() => {
    const fetchMyProjects = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError("You must be logged in to view this page.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/my-projects', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        } else {
          const data = await res.json();
          setError(data.message || "Failed to load projects.");
        }
      } catch (err) {
        setError("An error occurred while fetching projects.");
      } finally {
        setLoading(false);
      }
    };
    fetchMyProjects();
  }, []);

  const toggleApplicants = (projectId) => {
    setExpandedProjectId(prevId => (prevId === projectId ? null : projectId));
  };
  
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

  const updateApplicationStatus = async (projectId, applicationId, newStatus, notes = '') => {
    setUpdatingAppId(applicationId);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/projects/${projectId}/applications`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ applicationId, status: newStatus, notes })
      });
      if (res.ok) {
        // Optimistically update local state
        setProjects(prev => prev.map(p => {
          if (p._id !== projectId) return p;
          return {
            ...p,
            applications: p.applications.map(a => a.id === applicationId ? { ...a, status: newStatus } : a)
          };
        }));
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to update application');
      }
    } catch (_) {
      alert('Error updating application');
    } finally {
      setUpdatingAppId(null);
    }
  };
  
  const totalProjects = projects.length;
  const totalApplicants = projects.reduce((sum, project) => sum + (project.applications?.length || 0), 0);

  if (loading) return <p className="text-center mt-10 text-slate-200">Loading dashboard...</p>;
  if (error) return <p className="text-center mt-10 text-rose-400">{error}</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-slate-900 to-purple-950">
      <header className="bg-neutral-950/70 backdrop-blur border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 drop-shadow-[0_0_16px_rgba(168,85,247,0.35)]">Co-founder Dashboard</h1>
            <div className="flex items-center gap-3">
              <Link href="/login" className="px-4 py-2 rounded-lg font-medium text-slate-100 bg-neutral-800 border border-neutral-700 hover:border-amber-500/40 hover:shadow-[0_0_18px_rgba(245,158,11,0.35)] transition-all flex items-center">
                <i className="fas fa-sign-in-alt mr-2"></i>
                Go to Login
              </Link>
              <Link href="/post-project" className="px-5 py-2 rounded-lg font-medium text-slate-100 bg-gradient-to-r from-fuchsia-600 to-cyan-600 shadow-[0_0_22px_rgba(168,85,247,0.35)] hover:shadow-[0_0_36px_rgba(6,182,212,0.5)] transition-all flex items-center">
                <i className="fas fa-plus mr-2"></i>
                Post New Project
              </Link>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="relative p-6 rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur hover:border-fuchsia-500/40 hover:shadow-[0_0_28px_rgba(168,85,247,0.35)] transition-all">
            <div className="text-4xl font-extrabold text-slate-100 mb-2 drop-shadow-[0_0_12px_rgba(168,85,247,0.45)]">{totalProjects}</div>
            <div className="text-slate-300 text-sm font-medium">Total Projects Posted</div>
          </div>
          <div className="relative p-6 rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur hover:border-cyan-500/40 hover:shadow-[0_0_28px_rgba(6,182,212,0.35)] transition-all">
            <div className="text-4xl font-extrabold text-slate-100 mb-2 drop-shadow-[0_0_12px_rgba(6,182,212,0.45)]">{totalApplicants}</div>
            <div className="text-slate-300 text-sm font-medium">Total Applicants</div>
          </div>
          <div className="relative p-6 rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur hover:border-indigo-500/40 hover:shadow-[0_0_28px_rgba(99,102,241,0.35)] transition-all">
            <div className="text-4xl font-extrabold text-slate-100 mb-2 drop-shadow-[0_0_12px_rgba(99,102,241,0.45)]">{totalProjects}</div>
            <div className="text-slate-300 text-sm font-medium">Projects Awaiting Review</div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-100 mb-6 drop-shadow-[0_0_16px_rgba(59,130,246,0.35)]">Your Posted Projects</h2>
          
          {projects.length > 0 ? projects.map((project) => (
            <div key={project._id} className="relative rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur overflow-hidden hover:shadow-[0_0_28px_rgba(59,130,246,0.35)] hover:border-blue-500/40 transition-all">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-100 mb-2 drop-shadow-[0_0_10px_rgba(59,130,246,0.25)]">{project.title}</h3>
                    <p className="text-slate-300 text-sm mb-3">Posted on: {new Date(project.createdAt).toLocaleDateString()}</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      <i className="fas fa-user-plus mr-2"></i>
                      {project.applications?.length || 0} Applicants
                    </span>
                  </div>
                  <button onClick={() => toggleApplicants(project._id)} className="px-4 py-2 rounded-lg font-medium text-slate-100 bg-neutral-800 border border-neutral-700 hover:border-blue-500/40 hover:shadow-[0_0_18px_rgba(59,130,246,0.3)] transition-all flex items-center">
                    <i className="fas fa-users mr-2"></i>
                    View Applicants
                    <i className={`fas fa-chevron-${expandedProjectId === project._id ? 'up' : 'down'} ml-2 transition-transform`}></i>
                  </button>
                </div>
              </div>

              {expandedProjectId === project._id && (
                <div className="border-t border-neutral-800 bg-neutral-900/60 p-6">
                  <h4 className="text-md font-semibold text-slate-100 mb-4">Applicants ({project.applications?.length || 0})</h4>
                  <div className="space-y-4">
                    {project.applications && project.applications.length > 0 ? project.applications.map((application) => (
                      <div key={application.id} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/80">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                              <span className="text-lg font-semibold text-slate-100">{application.developer?.name?.charAt(0) || '?'}</span>
                            </div>
                            <div>
                              <h5 className="font-semibold text-slate-100">{application.developer?.name}</h5>
                              <p className="text-slate-300 text-sm">{application.developer?.email}</p>
                              <div className="mt-1">{getStatusBadge(application.status)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {['pending','reviewed'].includes(application.status) && (
                              <>
                                <button
                                  onClick={() => updateApplicationStatus(project._id, application.id, 'accepted')}
                                  disabled={updatingAppId === application.id}
                                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-500 text-sm"
                                >
                                  {updatingAppId === application.id ? 'Updating...' : '✅ Accept'}
                                </button>
                                <button
                                  onClick={() => updateApplicationStatus(project._id, application.id, 'rejected')}
                                  disabled={updatingAppId === application.id}
                                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-500 text-sm"
                                >
                                  {updatingAppId === application.id ? 'Updating...' : '❌ Reject'}
                                </button>
                                <button
                                  onClick={() => updateApplicationStatus(project._id, application.id, 'reviewed')}
                                  disabled={updatingAppId === application.id}
                                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-500 text-sm"
                                >
                                  {updatingAppId === application.id ? 'Updating...' : '👀 Mark Reviewed'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="mt-3">
                          <Link href={`/profile/${application.developer?.id}?projectId=${project._id}`} className="px-4 py-2 rounded-lg font-medium text-slate-100 bg-gradient-to-r from-blue-600 to-cyan-600 shadow-[0_0_16px_rgba(59,130,246,0.35)] hover:shadow-[0_0_24px_rgba(6,182,212,0.45)] transition-all inline-block">
                            <i className="fas fa-eye mr-2"></i>
                            View Profile
                          </Link>
                        </div>
                      </div>
                    )) : <p>No one has applied to this project yet.</p>}
                  </div>
                </div>
              )}
            </div>
          )) : (
             <div className="text-center py-12 rounded-lg border border-neutral-800 bg-neutral-900/80">
               <div className="w-16 h-16 bg-neutral-800 border border-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4">
                 <i className="fas fa-folder-open text-slate-300 text-2xl"></i>
               </div>
               <h3 className="text-lg font-medium text-slate-100 mb-2">No projects yet</h3>
                               <p className="text-slate-300 mb-6">Get started by posting your first project.</p>
               <Link href="/post-project" className="px-6 py-3 rounded-lg font-medium text-slate-100 bg-gradient-to-r from-fuchsia-600 to-cyan-600 shadow-[0_0_22px_rgba(168,85,247,0.35)] hover:shadow-[0_0_36px_rgba(6,182,212,0.5)] transition-all">
                 <i className="fas fa-plus mr-2"></i>
                 Post Your First Project
               </Link>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}