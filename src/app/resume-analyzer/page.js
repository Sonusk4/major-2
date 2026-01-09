'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function ResumeAnalyzerPage() {
  const [resumeText, setResumeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [profileSkills, setProfileSkills] = useState([]);
  const router = useRouter();

  // Prefill resume text from saved profile so users don't need to paste manually
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          // Auto-populate skills from profile
          if (Array.isArray(data.profile?.skills) && data.profile.skills.length > 0) {
            setProfileSkills(data.profile.skills);
          }
          // Prefill with parsed resume text if available (and it's not a placeholder)
          if (data.profile?.parsedResumeText && 
              !data.profile.parsedResumeText.includes('PDF Resume uploaded successfully') &&
              !data.profile.parsedResumeText.includes('PDF parsing failed') &&
              data.profile.parsedResumeText.trim().length > 50) {
            setResumeText(data.profile.parsedResumeText);
            setSuccessMessage('✅ Parsed resume content loaded from your profile!');
            setTimeout(() => setSuccessMessage(''), 5000);
          }
        }
      } catch (_) {}
    };
    loadProfileData();
  }, []);

  const handleAutoPopulate = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to auto-populate your resume');
        setSuccessMessage('');
        return;
      }
      
      const res = await fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.profile?.parsedResumeText) {
          const resumeContent = data.profile.parsedResumeText;
          setResumeText(resumeContent);
          setError('');
          setSuccessMessage(`✅ Resume content loaded successfully! (${resumeContent.length} characters)`);
          // Clear success message after 4 seconds
          setTimeout(() => setSuccessMessage(''), 4000);
          
          // Log for debugging
          console.log('Resume text loaded:', resumeContent.substring(0, 100) + '...');
        } else {
          setError('No parsed resume found. Please upload a resume in your profile first.');
          setSuccessMessage('');
          setResumeText('');
        }
      } else {
        setError('Failed to load profile data');
        setSuccessMessage('');
      }
    } catch (err) {
      setError('An error occurred while loading your resume: ' + err.message);
      setSuccessMessage('');
    }
  };

  const handleAnalyze = async () => {
    // If input is empty, backend will try to use stored profile resume
    // so we don't block the user here.

    setIsAnalyzing(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/resume/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ resumeText })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to analyze resume');
      }
    } catch (err) {
      setError('An error occurred while analyzing your resume');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-slate-900 to-indigo-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="relative rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur p-8 shadow-[0_0_28px_rgba(99,102,241,0.25)] transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.35)]">
          <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity bg-[radial-gradient(600px_300px_at_0%_0%,rgba(99,102,241,0.12),transparent_60%),radial-gradient(600px_300px_at_100%_100%,rgba(168,85,247,0.12),transparent_60%)]" />
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-100 mb-4 drop-shadow-[0_0_16px_rgba(99,102,241,0.35)]">AI Resume Analyzer</h1>
            <p className="text-slate-300 max-w-2xl mx-auto">
              Get detailed insights about your resume, discover job roles you&apos;re qualified for, 
              and receive personalized recommendations to improve your career prospects.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="resumeText" className="block text-sm font-medium text-slate-200">
                  Paste Your Resume Text
                </label>
                <button
                  type="button"
                  onClick={handleAutoPopulate}
                  className="px-4 py-2 text-sm font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all duration-200 hover:shadow-[0_0_12px_rgba(99,102,241,0.25)]"
                >
                  <i className="fas fa-magic mr-2"></i>
                  Auto-Populate from Profile
                </button>
              </div>
              <textarea
                id="resumeText"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your complete resume text here... Include your skills, experience, education, and projects. Or click 'Auto-Populate from Profile' to use your uploaded resume."
                className="w-full h-64 px-4 py-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-white bg-neutral-900/80 placeholder-slate-300 selection:bg-sky-500/30 selection:text-white font-mono text-sm leading-relaxed"
              />
              <p className="text-xs text-slate-400 mt-2">
                💡 Tip: If you&apos;ve uploaded a resume in your profile, click &quot;Auto-Populate from Profile&quot; to automatically fill this field.
              </p>
              
              {/* Profile Skills Display */}
              {profileSkills.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                  <div className="text-sm font-medium text-indigo-300 mb-2">
                    <i className="fas fa-star mr-2"></i>Skills from Your Profile
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profileSkills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full text-sm bg-indigo-600/40 text-indigo-100 border border-indigo-500/50">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-indigo-300 mt-2">
                    ✓ These skills will be used for analysis
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-lg">
                {successMessage}
              </div>
            )}

            <div className="text-center">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-8 py-3 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-indigo-600 to-fuchsia-600 shadow-[0_0_22px_rgba(99,102,241,0.35)] hover:shadow-[0_0_36px_rgba(168,85,247,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Analyzing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <i className="fas fa-magic mr-2 drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]"></i>
                    Analyze Resume
                  </span>
                )}
              </button>
            </div>
          </div>

          {analysis && (
            <div className="mt-12 space-y-8">
              <h2 className="text-2xl font-bold text-slate-100 text-center mb-8 drop-shadow-[0_0_16px_rgba(59,130,246,0.35)]">Your Career Analysis</h2>
              
              {analysis.roleAnalysis.map((role, index) => (
                <div key={index} className="relative rounded-lg p-6 border border-neutral-800 bg-neutral-900/60 transition-all hover:border-indigo-500/50 hover:shadow-[0_0_28px_rgba(99,102,241,0.35)]">
                  <div className="pointer-events-none absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity bg-[radial-gradient(400px_200px_at_0%_0%,rgba(99,102,241,0.12),transparent_60%),radial-gradient(400px_200px_at_100%_100%,rgba(168,85,247,0.12),transparent_60%)]" />
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-slate-100 drop-shadow-[0_0_10px_rgba(99,102,241,0.25)]">{role.roleTitle}</h3>
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-bold text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.45)]">{role.matchPercentage}%</div>
                      <div className="text-sm text-slate-300">Match</div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="font-medium text-slate-100 mb-2">Why this score?</h4>
                    <p className="text-slate-300">{role.justification}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-slate-100 mb-3">Skill Gaps & Recommendations</h4>
                    <div className="space-y-3">
                      {role.skillGaps.map((gap, gapIndex) => (
                        <div key={gapIndex} className="rounded-lg p-4 border border-neutral-800 bg-neutral-900/80">
                          <h5 className="font-medium text-slate-100 mb-2">{gap.gap}</h5>
                          <div className="space-y-2">
                            {gap.suggestions.map((suggestion, suggestionIndex) => (
                              <div key={suggestionIndex} className="flex items-center space-x-2 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                  suggestion.type === 'Course' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                                  suggestion.type === 'Certification' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' :
                                  'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30'
                                }`}>
                                  {suggestion.type}
                                </span>
                                <span className="text-slate-300">{suggestion.title}</span>
                                <span className="text-slate-200">({suggestion.platform})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
