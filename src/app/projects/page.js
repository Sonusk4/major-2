'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
        <i className="fas fa-circle-notch fa-spin text-4xl text-sky-400"></i>
        <p className="mt-4 text-slate-300">Loading Projects...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950" style={{ minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-dvh flex flex-col" style={{ minHeight: '100vh' }}>
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="text-2xl font-bold gradient-text hover:opacity-80 transition-opacity"
            title="Go back"
          >
            CareerHub
          </button>
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-8 tracking-tight">
          <span className="bg-gradient-to-r from-sky-300 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Explore Projects</span>
        </h1>
        <div className="grid gap-6 grid-cols-1 auto-rows-fr items-stretch flex-1 w-full place-items-center" style={{ gridAutoRows: '1fr' }}>
        {projects.length > 0 ? (
          projects.map(project => (
            <div key={project._id} className="group relative rounded-2xl border border-neutral-800 bg-neutral-950/50 backdrop-blur p-6 shadow-[0_0_0_1px_rgba(32,32,40,0.8)] transition-all hover:shadow-[0_0_40px_-10px_rgba(56,189,248,0.5)] hover:border-sky-500/50" style={{ width: '1300px', height: '300px' }}>
              <div className="absolute inset-0 -z-10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(400px_200px_at_20%_-10%,rgba(56,189,248,0.12),transparent_60%),radial-gradient(300px_150px_at_120%_-10%,rgba(168,85,247,0.12),transparent_60%)]" />
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-white mb-1">
                    <Link href={`/projects/${project._id}`} className="hover:text-sky-300 transition-colors">
                      {project.title}
                    </Link>
                  </h2>
                  <div className="text-xs text-slate-400 mb-4">
                    <span>Posted by: {project.createdBy?.name || 'A Co-founder'}</span>
                    <span className="mx-2">·</span>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-300/90 line-clamp-3">{project.description}</p>
                </div>
                <div className="mt-5">
                  <h4 className="font-medium text-slate-300 mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.requiredSkills.map(skill => (
                      <span key={skill} className="px-3 py-1 text-xs rounded-full bg-neutral-800/80 text-slate-200 ring-1 ring-neutral-700 group-hover:ring-sky-500/40">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-6">
                  <Link href={`/projects/${project._id}`} className="inline-flex items-center justify-center w-full bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 text-white font-medium px-4 py-2 rounded-lg transition-all shadow-[0_0_20px_-6px_rgba(56,189,248,0.6)]">
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 rounded-2xl border border-neutral-800 bg-neutral-950/60">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-neutral-900 ring-1 ring-neutral-800">
              <i className="fas fa-folder-open text-slate-400 text-3xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Projects Available</h3>
            <p className="text-slate-400">Please check back later for new opportunities.</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}