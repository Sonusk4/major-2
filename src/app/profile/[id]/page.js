'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [viewerRole, setViewerRole] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please log in to view profiles.');
          setLoading(false);
          return;
        }
        try {
          const decoded = JSON.parse(atob(token.split('.')[1] || ''));
          setViewerRole(decoded?.role || null);
        } catch (_) {
          setViewerRole(null);
        }
        const res = await fetch(`/api/profile/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ message: 'Failed to load profile' }));
          setError(data.message || 'Failed to load profile');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setProfile(data.profile);
        setLoading(false);
      } catch (err) {
        setError('Error loading profile');
        setLoading(false);
      }
    };
    if (params?.id) fetchProfile();
  }, [params?.id]);

  const isCofounderView = viewerRole === 'cofounder';
  const projectId = searchParams?.get('projectId') || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-slate-900 to-purple-950 text-slate-100">
      {!isCofounderView && <Navbar />}
      <main className={`${isCofounderView ? 'max-w-3xl' : 'max-w-5xl'} mx-auto px-4 py-10`}>
        {loading && <p className="text-center">Loading profile...</p>}
        {error && !loading && (
          <div className="mx-auto max-w-xl p-4 rounded-lg border border-neutral-800 bg-neutral-900/70 text-rose-300 text-center">
            {error}
          </div>
        )}
        {!loading && !error && profile && (
          <div className={`${isCofounderView ? 'space-y-6' : 'space-y-8'}`}>
            {isCofounderView && (
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 rounded-lg bg-neutral-800 text-slate-100 border border-neutral-700 hover:bg-neutral-700 transition-colors"
                >
                  ← Back to Co‑founder Dashboard
                </button>
                <span className="text-slate-400 text-sm">Applicant Profile</span>
              </div>
            )}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-[0_0_24px_rgba(168,85,247,0.25)]">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700">
                  {profile.profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.profilePicture} alt={profile.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
                      {profile.fullName?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold">{profile.fullName}</h1>
                  <p className="text-slate-300">{profile.headline}</p>
                </div>
                {isCofounderView && (
                  <div className="flex items-center gap-3">
                    {profile.resumePDF && (
                      <a
                        className="inline-block px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 shadow-[0_0_16px_rgba(168,85,247,0.35)] hover:shadow-[0_0_24px_rgba(219,39,119,0.45)]"
                        href={profile.resumePDF}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View PDF Resume
                      </a>
                    )}
                    <button
                      disabled={!projectId || analyzing}
                      onClick={async () => {
                        setShowModal(true);
                        setAnalyzing(true);
                        setAnalysis(null);
                        try {
                          const token = localStorage.getItem('token');
                          const res = await fetch(`/api/ai/analyze-user/${projectId}/${params.id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          const data = await res.json();
                          if (!res.ok) {
                            throw new Error(data.message || 'Analysis failed');
                          }
                          setAnalysis(data);
                        } catch (e) {
                          setAnalysis({ error: e.message || 'Failed to analyze' });
                        } finally {
                          setAnalyzing(false);
                        }
                      }}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${!projectId || analyzing ? 'bg-neutral-800 text-slate-400 border border-neutral-700 cursor-not-allowed' : 'text-slate-100 bg-gradient-to-r from-blue-600 to-cyan-600 shadow-[0_0_16px_rgba(59,130,246,0.35)] hover:shadow-[0_0_24px_rgba(6,182,212,0.45)]'}`}
                      title={!projectId ? 'Open this profile from a project to enable analysis' : 'Analyze resume vs project requirements'}
                    >
                      {analyzing ? 'Analyzing…' : 'Resume Analyzer'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            {isCofounderView ? (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-1">About</h2>
                  <p className="text-slate-300 whitespace-pre-wrap line-clamp-6">{profile.bio || 'No bio provided.'}</p>
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-1">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {(profile.skills || []).slice(0, 10).map((s, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30 text-sm">
                        {s}
                      </span>
                    ))}
                    {(profile.skills || []).length === 0 && (
                      <span className="text-slate-400">No skills listed.</span>
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-1">Resume (Parsed)</h2>
                  {profile.parsedResumeText ? (
                    <pre className="whitespace-pre-wrap text-slate-200 bg-neutral-950/60 p-4 rounded-lg border border-neutral-800 overflow-x-auto max-h-[40vh]">
                      {profile.parsedResumeText}
                    </pre>
                  ) : (
                    <p className="text-slate-400">No parsed resume text available.</p>
                  )}
                  {/* PDF button is moved to header row for cofounder view */}
                </div>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
                    <h2 className="text-lg font-semibold mb-2">About</h2>
                    <p className="text-slate-300 whitespace-pre-wrap">{profile.bio || 'No bio provided.'}</p>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
                    <h2 className="text-lg font-semibold mb-2">Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {(profile.skills || []).length > 0 ? (
                        profile.skills.map((s, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30 text-sm">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">No skills listed.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
                    <h2 className="text-lg font-semibold mb-3">Experience</h2>
                    <div className="space-y-3">
                      {(profile.experience || []).length > 0 ? (
                        profile.experience.map((exp, idx) => (
                          <div key={idx} className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/70">
                            <p className="font-semibold">{exp.title}</p>
                            <p className="text-slate-300 text-sm">{exp.company}</p>
                            <p className="text-slate-400 text-xs">{exp.years}</p>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400">No experience provided.</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
                    <h2 className="text-lg font-semibold mb-3">Education</h2>
                    <div className="space-y-3">
                      {(profile.education || []).length > 0 ? (
                        profile.education.map((ed, idx) => (
                          <div key={idx} className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/70">
                            <p className="font-semibold">{ed.school}</p>
                            <p className="text-slate-300 text-sm">{ed.degree}</p>
                            <p className="text-slate-400 text-xs">{ed.fieldOfStudy}</p>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400">No education provided.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
                  <h2 className="text-lg font-semibold mb-2">Resume (Parsed Text)</h2>
                  {profile.parsedResumeText ? (
                    <pre className="whitespace-pre-wrap text-slate-200 bg-neutral-950/60 p-4 rounded-lg border border-neutral-800 overflow-x-auto max-h-[60vh]">
                      {profile.parsedResumeText}
                    </pre>
                  ) : (
                    <p className="text-slate-400">No parsed resume text available.</p>
                  )}
                  {profile.resumePDF && (
                    <a
                      className="inline-block mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 shadow-[0_0_16px_rgba(168,85,247,0.35)] hover:shadow-[0_0_24px_rgba(219,39,119,0.45)]"
                      href={profile.resumePDF}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View PDF Resume
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Analysis Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowModal(false)}></div>
          <div className="relative w-full max-w-2xl mx-4 rounded-xl border border-neutral-800 bg-neutral-900/90 backdrop-blur p-6 shadow-[0_0_28px_rgba(59,130,246,0.35)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-100">Resume Analysis</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-white">✕</button>
            </div>
            {analyzing && (
              <p className="text-slate-300">Analyzing with Gemini…</p>
            )}
            {!analyzing && analysis && !analysis.error && (
              <div className="space-y-3 text-slate-200">
                <div className="flex items-center gap-3">
                  <span className="text-sm uppercase tracking-wide text-slate-400">Match Score</span>
                  <span className="text-lg font-bold">{analysis.matchScore ?? 0}%</span>
                </div>
                <div className="text-lg font-semibold">{analysis.assessmentTitle || 'Assessment'}</div>
                {analysis.executiveSummary && (
                  <p className="text-slate-300">{analysis.executiveSummary}</p>
                )}
                {Array.isArray(analysis.strengths) && analysis.strengths.length > 0 && (
                  <div>
                    <div className="font-semibold mb-1">Strengths</div>
                    <ul className="list-disc list-inside text-slate-300">
                      {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {Array.isArray(analysis.weaknesses) && analysis.weaknesses.length > 0 && (
                  <div>
                    <div className="font-semibold mb-1">Areas for Improvement</div>
                    <ul className="list-disc list-inside text-slate-300">
                      {analysis.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
                {Array.isArray(analysis.missingKeywords) && analysis.missingKeywords.length > 0 && (
                  <div>
                    <div className="font-semibold mb-1">Missing Keywords</div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.missingKeywords.map((k, i) => (
                        <span key={i} className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-500/30 text-xs">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {!analyzing && analysis && analysis.error && (
              <p className="text-rose-300">{analysis.error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


