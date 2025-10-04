'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PostProjectPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('You must be logged in to post a project.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          requiredSkills: skills.split(',').map(skill => skill.trim()),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Project created successfully! Redirecting...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setMessage(data.message || 'Failed to create project.');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="relative rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur p-8 shadow-[0_0_28px_rgba(245,158,11,0.2)] transition-all duration-300 hover:border-amber-500/50 hover:shadow-[0_0_40px_rgba(245,158,11,0.35)]">
          <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity bg-[radial-gradient(600px_300px_at_0%_0%,rgba(245,158,11,0.14),transparent_60%),radial-gradient(600px_300px_at_100%_100%,rgba(56,189,248,0.14),transparent_60%)]" />
          <h1 className="text-3xl font-extrabold text-white mb-6 drop-shadow-[0_0_16px_rgba(245,158,11,0.35)]">Post a New Project</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-200 mb-1">Project Title</label>
              <input
                id="title"
                type="text"
                placeholder="e.g., AI-Powered E-commerce Platform"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-900/80 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-slate-400"
                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-200 mb-1">Project Description</label>
              <textarea
                id="description"
                placeholder="Describe the project in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="8"
                className="w-full px-4 py-3 bg-neutral-900/80 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-slate-400"
                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                required
              ></textarea>
            </div>
            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-slate-200 mb-1">Required Skills</label>
              <input
                id="skills"
                type="text"
                placeholder="e.g., React, Node.js, MongoDB"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-900/80 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-slate-400"
                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                required
              />
              <p className="text-xs text-slate-300 mt-1">Please provide a comma-separated list of skills.</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 font-semibold text-white rounded-md bg-gradient-to-r from-amber-500 to-sky-500 hover:from-amber-400 hover:to-sky-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-0 disabled:bg-neutral-700 shadow-[0_0_22px_rgba(245,158,11,0.35)] hover:shadow-[0_0_32px_rgba(56,189,248,0.45)] transition-all"
            >
              {loading ? 'Submitting...' : 'Submit Project'}
            </button>
            {message && <p className="mt-4 text-center text-slate-300">{message}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}