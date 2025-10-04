'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const params = useParams();
  const projectId = params?.projectId;

  // Determine role from JWT so we can restrict actions to cofounders only
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserRole(payload.role);
    } catch (_) {
      // ignore parse errors
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    if (!projectId) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to view applications.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications);
        setProject(data.project);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to fetch applications.');
      }
    } catch (error) {
      setError('An error occurred while fetching applications.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  

  const updateApplicationStatus = async (applicationId, newStatus, notes = '') => {
    setUpdatingStatus(applicationId);
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
        // Update local state
        setApplications(prev => prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: newStatus, cofounderNotes: notes }
            : app
        ));
        
        // Show success message
        alert(`Application ${newStatus} successfully!`);
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Failed to update application status.');
      }
    } catch (error) {
      alert('An error occurred while updating the application.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: '⏳ Pending' },
      'reviewed': { color: 'bg-blue-100 text-blue-800 border-blue-200', text: '👀 Reviewed' },
      'accepted': { color: 'bg-green-100 text-green-800 border-green-200', text: '✅ Accepted' },
      'rejected': { color: 'bg-red-100 text-red-800 border-red-200', text: '❌ Rejected' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <i className="fas fa-circle-notch fa-spin text-4xl text-blue-600"></i>
        <p className="mt-4 text-gray-900">Loading Applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-10 max-w-2xl mx-auto">
        <p className="text-red-600 bg-red-100 p-4 rounded-lg">{error}</p>
        <Link href="/projects" className="inline-block mt-4 px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Project Applications</h1>
            <p className="text-gray-900 mt-2">
              Managing applications for: <span className="font-semibold">{project?.title}</span>
            </p>
          </div>
          <Link 
            href="/projects" 
            className="px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            ← Back to Projects
          </Link>
        </div>

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">{applications.length}</div>
            <div className="text-gray-900">Total Applications</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-yellow-600">
              {applications.filter(app => app.status === 'pending').length}
            </div>
            <div className="text-gray-900">Pending Review</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-green-600">
              {applications.filter(app => app.status === 'accepted').length}
            </div>
            <div className="text-gray-900">Accepted</div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
            <p className="text-gray-900">Developers haven&apos;t applied to this project yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {applications.map((application) => (
              <div key={application.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  {/* Developer Info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {application.developer.name}
                      </h3>
                      {getStatusBadge(application.status)}
                    </div>
                    
                    <div className="text-sm text-gray-900 mb-2">
                      📧 {application.developer.email}
                    </div>
                    
                    <div className="text-sm text-gray-900 mb-2">
                      💼 {application.profile.headline}
                    </div>
                    
                    {application.profile.bio && (
                      <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                        {application.profile.bio}
                      </p>
                    )}
                    
                    {/* Skills */}
                    {application.profile.skills.length > 0 && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-700 mr-2">Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {application.profile.skills.map((skill, index) => (
                            <span 
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Resume Status */}
                    <div className="text-sm text-gray-900">
                      📄 Resume: {application.profile.hasResume ? 
                        `Available (${application.profile.resumeLength} characters)` : 
                        'Not uploaded'
                      }
                    </div>
                    
                    <div className="text-sm text-gray-900 mt-2">
                      Applied: {new Date(application.appliedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col gap-2">
                    <Link
                      href={`/profile/${application.developer.id}?projectId=${projectId}`}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium text-center"
                    >
                      👤 View Profile
                    </Link>
                    {userRole === 'cofounder' && application.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateApplicationStatus(application.id, 'accepted')}
                          disabled={updatingStatus === application.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          {updatingStatus === application.id ? 'Updating...' : '✅ Accept'}
                        </button>
                        <button
                          onClick={() => updateApplicationStatus(application.id, 'rejected')}
                          disabled={updatingStatus === application.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          {updatingStatus === application.id ? 'Updating...' : '❌ Reject'}
                        </button>
                        <button
                          onClick={() => updateApplicationStatus(application.id, 'reviewed')}
                          disabled={updatingStatus === application.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          {updatingStatus === application.id ? 'Updating...' : '👀 Mark Reviewed'}
                        </button>
                      </>
                    )}
                    
                    {userRole === 'cofounder' && application.status === 'reviewed' && (
                      <>
                        <button
                          onClick={() => updateApplicationStatus(application.id, 'accepted')}
                          disabled={updatingStatus === application.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          {updatingStatus === application.id ? 'Updating...' : '✅ Accept'}
                        </button>
                        <button
                          onClick={() => updateApplicationStatus(application.id, 'rejected')}
                          disabled={updatingStatus === application.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          {updatingStatus === application.id ? 'Updating...' : '❌ Reject'}
                        </button>
                      </>
                    )}
                    
                    {/* View AI Analysis */}
                    <Link
                      href={`/analyzer/${projectId}?developerId=${application.developer.id}`}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium text-center"
                    >
                      🤖 AI Analysis
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
