'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ProjectDetailsPage() {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyMessage, setApplyMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const params = useParams();
  const id = params?.id;

  useEffect(() => {
    if (id) {
      const fetchProjectDetails = async () => {
        try {
          const res = await fetch(`/api/projects/${id}`);
          if (res.ok) {
            const data = await res.json();
            setProject(data.project);
          }
        } catch (error) {
          console.error("Failed to fetch project details:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchProjectDetails();
    }
  }, [id]);

  const checkApplicationStatus = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`/api/projects/${id}/apply`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApplicationStatus(data);
      }
    } catch (error) {
      console.error('Error checking application status:', error);
    }
  }, [id]);

  useEffect(() => {
    // Check if user is logged in and get their role
    const token = localStorage.getItem('token');
    console.log('Token found:', !!token);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Token payload:', payload);
        console.log('User role from token:', payload.role);
        setUserRole(payload.role);
        // Always try to check application status when logged in
        checkApplicationStatus();
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    } else {
      console.log('No token found in localStorage');
    }
  }, [id, checkApplicationStatus]);

  // Poll application status periodically to keep it up to date for developers
  useEffect(() => {
    if (userRole !== 'developer') return;
    const interval = setInterval(() => {
      checkApplicationStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [userRole, checkApplicationStatus]);

  const handleApply = async () => {
    console.log('Apply button clicked!');
    console.log('Current userRole:', userRole);
    console.log('Current project ID:', id);
    
    setApplyMessage('');
    setApplying(true);
    
    const token = localStorage.getItem('token');
    console.log('Token for apply:', !!token);
    if (!token) {
      setApplyMessage('You must be logged in to apply.');
      setApplying(false);
      return;
    }

    try {
      console.log('Making POST request to:', `/api/projects/${id}/apply`);
      const res = await fetch(`/api/projects/${id}/apply`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({})
      });
      
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);
      
      if (res.ok) {
        setApplyMessage(data.message);
        setApplicationStatus({
          hasApplied: true,
          status: data.status,
          applicationId: data.applicationId
        });
      } else {
        setApplyMessage(data.message || 'Failed to apply. Please try again.');
      }
    } catch (error) {
      console.error('Error in handleApply:', error);
      setApplyMessage("An error occurred while applying. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  const getApplicationStatusText = () => {
    if (!applicationStatus?.hasApplied) return null;
    
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'reviewed': 'bg-blue-100 text-blue-800 border-blue-200',
      'accepted': 'bg-green-100 text-green-800 border-green-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200'
    };

    const statusText = {
      'pending': 'Application Pending Review',
      'reviewed': 'Application Under Review',
      'accepted': 'Application Accepted! 🎉',
      'rejected': 'Application Not Selected'
    };

    return (
      <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${statusColors[applicationStatus.status]}`}>
        <span className="mr-2">
          {applicationStatus.status === 'pending' && '⏳'}
          {applicationStatus.status === 'reviewed' && '👀'}
          {applicationStatus.status === 'accepted' && '✅'}
          {applicationStatus.status === 'rejected' && '❌'}
        </span>
        {statusText[applicationStatus.status]}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
        <i className="fas fa-circle-notch fa-spin text-4xl text-sky-400"></i>
        <p className="mt-4 text-slate-300">Loading Project Details...</p>
      </div>
    );
  }

  if (!project) return <p className="text-center mt-10">Project not found.</p>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="relative p-8 rounded-2xl border border-neutral-800 bg-neutral-950/60 backdrop-blur shadow-[0_0_0_1px_rgba(32,32,40,0.8)]">
        <div className="absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(800px_400px_at_-10%_-10%,rgba(56,189,248,0.12),transparent_60%),radial-gradient(600px_300px_at_120%_-10%,rgba(168,85,247,0.12),transparent_60%)]" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">{project.title}</h1>
            <p className="text-slate-300 mt-2">
              Posted by: {project.createdBy?.name || 'A Co-founder'} on {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          {/* Application Status or Apply Button */}
          <div className="mt-4 md:mt-0 flex-shrink-0">
            {console.log('Rendering apply section, userRole:', userRole, 'applicationStatus:', applicationStatus)}
            {userRole === 'developer' ? (
              <div className="text-center">
                {applicationStatus?.hasApplied ? (
                  <div className="mb-3">
                    {getApplicationStatusText()}
                  </div>
                ) : (
                  <button 
                    onClick={handleApply} 
                    disabled={applying}
                    className="px-6 py-3 font-semibold text-white rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_-6px_rgba(56,189,248,0.6)] bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 w-full md:w-auto"
                  >
                    {applying ? 'Applying...' : 'Apply Now'}
                  </button>
                )}
              </div>
            ) : userRole === 'cofounder' ? (
              <div className="text-center">
                <span className="px-4 py-2 bg-neutral-900 text-slate-300 rounded-lg text-sm border border-neutral-700">
                  👑 Co-founder View
                </span>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="px-6 py-3 font-semibold text-white rounded-lg transition-all shadow-[0_0_20px_-6px_rgba(56,189,248,0.6)] bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 w-full md:w-auto"
              >
                Login to Apply
              </Link>
            )}
          </div>
        </div>

        {/* Application information (limited) - visible only to developers */}
        {userRole === 'developer' && (
          <div className="mt-6 p-4 bg-neutral-900/70 rounded-lg text-sm border border-neutral-800 text-slate-300">
            <h4 className="font-semibold mb-2 text-white">Application</h4>
            <p>Project ID: {id || 'Not set'}</p>
            <p>Has Applied: {applicationStatus ? (applicationStatus.hasApplied ? 'Yes' : 'No') : '...'}</p>
            <p>Application Status: {applicationStatus ? (applicationStatus.status || 'None') : '...'}</p>
          </div>
        )}

        {/* Application Message */}
        {applyMessage && (
          <div className={`mb-6 p-4 rounded-lg border ${
            applyMessage.includes('successfully') 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p className="text-center font-medium">{applyMessage}</p>
          </div>
        )}
        
        <hr className="my-6" />

        <div>
          <h3 className="text-2xl font-semibold text-white">Description</h3>
          <p className="text-slate-300 mt-4 whitespace-pre-wrap leading-relaxed">{project.description}</p>
        </div>

        <div className="mt-8">
          <h3 className="text-2xl font-semibold text-white">Required Skills</h3>
          <div className="flex flex-wrap gap-3 mt-4">
            {project.requiredSkills.map(skill => (
              <span key={skill} className="px-4 py-2 rounded-full text-sm font-medium bg-neutral-900 text-slate-200 border border-neutral-700">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Removed Application Statistics panel from project page to avoid showing in developer view. */}

        <div className="mt-10 p-6 rounded-lg text-center border border-neutral-800 bg-neutral-950/60">
          <h3 className="text-xl font-semibold text-white">Ready to stand out?</h3>
          <p className="text-slate-300 mt-2 mb-4">
            {userRole === 'developer' 
              ? "See how your resume compares to this project's requirements with our advanced AI analysis."
              : "Help developers understand how well they match your project requirements."
            }
          </p>
          <Link 
            href={`/analyzer/${project._id}`} 
            className="inline-block px-8 py-3 font-semibold text-white rounded-lg bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 transition-all shadow-[0_0_20px_-6px_rgba(56,189,248,0.6)]"
          >
            {userRole === 'developer' ? 'Run AI Resume Analysis' : 'View AI Analysis'}
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}