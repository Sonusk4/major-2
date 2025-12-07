'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function DeveloperDashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorMessage, setMentorMessage] = useState('');
  const [mentorResults, setMentorResults] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  // Inline component: a line of text where hovered word lights up,
  // and the entire line glows for 0.2s when hover lands on a word.
  const GlowLine = ({ text, className = '' }) => {
    const [hovered, setHovered] = useState(-1);
    const [lineLit, setLineLit] = useState(false);

    const words = String(text).split(' ');

    const handleEnter = (idx) => {
      setHovered(idx);
      setLineLit(true);
      setTimeout(() => setLineLit(false), 200);
    };

    const handleLeave = () => {
      setHovered(-1);
    };

    return (
      <p
        className={`transition-shadow duration-200 ${lineLit ? 'drop-shadow-[0_0_16px_rgba(125,211,252,0.55)]' : ''} ${className}`}
      >
        {words.map((w, i) => (
          <span
            key={`${w}-${i}`}
            onMouseEnter={() => handleEnter(i)}
            onMouseLeave={handleLeave}
            className={`inline-block mr-1 transition-colors duration-200 ${
              hovered === i ? 'text-sky-300 drop-shadow-[0_0_12px_rgba(125,211,252,0.95)]' : ''
            }`}
          >
            {w}
          </span>
        ))}
      </p>
    );
  };

  // Render a heading where each word glows sky-blue on hover
  const renderGlowingHeading = (text) => {
    return (
      <span className="select-none">
        {text.split(' ').map((word, idx) => (
          <span
            key={idx}
            className="inline-block mr-2 transition-colors duration-150 hover:text-sky-300 hover:drop-shadow-[0_0_12px_rgba(125,211,252,0.95)] cursor-default"
          >
            {word}
          </span>
        ))}
      </span>
    );
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    
    const fetchUserProfile = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch('/api/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          // API returns { profile }, not { user }
          setUser({ name: data.profile?.fullName || 'Developer' });
          // Load my mentorship requests
          const mr = await fetch('/api/mentor/my-requests', { headers: { 'Authorization': `Bearer ${token}` } });
          if (mr.ok) {
            const d = await mr.json();
            setMyRequests(Array.isArray(d.requests) ? d.requests : []);
          }
          // Load incoming requests (if user is a mentor)
          const inc = await fetch('/api/mentor/incoming', { headers: { 'Authorization': `Bearer ${token}` } });
          if (inc.ok) {
            const d2 = await inc.json();
            setIncomingRequests(Array.isArray(d2.requests) ? d2.requests : []);
          }
        } else {
          const data = await res.json();
          setError(data.message || "Failed to load profile.");
        }
      } catch (err) {
        setError("An error occurred while fetching profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  if (loading) return <p className="text-center mt-10 text-slate-200">Loading dashboard...</p>;
  if (error) return <p className="text-center mt-10 text-rose-400">{error}</p>;

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-br from-[#9ECAD6] via-[#F5CBCB] to-[#FFEAEA]" style={{ minHeight: '100vh' }}>
      <Navbar />
      <header className="bg-neutral-950/70 backdrop-blur border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 text-3d">
            {renderGlowingHeading('Developer Dashboard')}
          </h1>
          <div className="flex items-center space-x-4">
            {/* Desktop welcome text */}
            <span className="hidden md:inline text-slate-200/90 drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]">
              Welcome back, {user?.name || 'Developer'}!
            </span>
            {/* Mobile overflow menu trigger */}
            <button
              type="button"
              className="md:hidden p-2 rounded-md hover:bg-neutral-800/60 focus:outline-none focus:ring-2 focus:ring-sky-400 text-slate-200"
              aria-label="Open menu"
              aria-haspopup="menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <i className="fas fa-ellipsis-v" />
            </button>
          </div>

          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute right-4 top-[calc(100%+0.5rem)] z-50 glass rounded-lg p-2 w-60 animate-fade-in" role="menu" aria-label="Developer dashboard menu">
              <div className="px-3 py-2 text-slate-100/90 border-b border-white/10">
                Welcome back, {user?.name || 'Developer'}!
              </div>
              <nav className="py-1 flex flex-col" onClick={() => setMobileMenuOpen(false)}>
                <Link href="/projects" className="px-3 py-2 rounded hover:bg-white/5" role="menuitem">
                  Browse Projects
                </Link>
                <Link href="/my-applications" className="px-3 py-2 rounded hover:bg-white/5" role="menuitem">
                  My Applications
                </Link>
                <Link href="/profile" className="px-3 py-2 rounded hover:bg-white/5" role="menuitem">
                  Profile
                </Link>
                <Link href="/developer-dashboard" className="px-3 py-2 rounded hover:bg-white/5" role="menuitem">
                  Dashboard Home
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 min-h-dvh flex flex-col" style={{ minHeight: 'calc(100vh - 72px)' }}>
        {/* AI Career Tools Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-100 mb-6 drop-shadow-[0_0_16px_rgba(59,130,246,0.35)] text-3d">
            {renderGlowingHeading('AI Career Tools')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 dash-3d-wrapper">
            {/* Resume Analyzer Card */}
            <div className="dash-3d-scene" tabIndex={0} role="button" aria-label="Flip to see more about Resume Analyzer">
              <div className="dash-3d-cube">
                <div className="dash-3d-icon dash-3d-card-front rounded-2xl p-8">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-[#9ECAD6]/30 border border-[#9ECAD6]/40 rounded-xl flex items-center justify-center mr-4">
                      <i className="fas fa-file-alt text-[#0f172a] text-xl"></i>
                    </div>
                    <h3 className="text-xl font-semibold text-[#0f172a]">
                      {renderGlowingHeading('Resume Analyzer')}
                    </h3>
                  </div>
                  <GlowLine className="text-[#0f172a]/70 mb-6" text={"Get AI-powered insights about your resume. Discover job roles you're qualified for, match percentages, and personalized recommendations to improve your career prospects."} />
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-[#0f172a]"><i className="fas fa-check text-emerald-600 mr-2"></i><GlowLine text="Job role matching with percentage scores" /></div>
                    <div className="flex items-center text-sm text-[#0f172a]"><i className="fas fa-check text-emerald-600 mr-2"></i><GlowLine text="Skill gap analysis and recommendations" /></div>
                    <div className="flex items-center text-sm text-[#0f172a]"><i className="fas fa-check text-emerald-600 mr-2"></i><GlowLine text="Course and certification suggestions" /></div>
                  </div>
                  <Link href="/resume-analyzer" className="relative inline-flex items-center px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#9ECAD6] to-[#F5CBCB] shadow-lg hover:shadow-xl transition-all duration-200">
                    <i className="fas fa-magic mr-2"></i>
                    Analyze My Resume
                  </Link>
                </div>
                <div
                  className="dash-3d-icon-back dash-3d-card-back rounded-2xl bg-photo-overlay text-white"
                  style={{ backgroundImage: "url('https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?q=80&w=1600&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <div className="glass-caption">
                    <h3 className="quote3d font-semibold text-lg md:text-xl">Let’s improve your resume</h3>
                    <p className="mt-1 text-sm text-white/85">Polish content, match roles, and highlight impact.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interview Practice Card */}
            <div className="dash-3d-scene" tabIndex={0} role="button" aria-label="Flip to see more about Interview Practice">
              <div className="dash-3d-cube">
                <div className="dash-3d-icon dash-3d-card-front rounded-2xl p-8">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-[#FFEAEA]/40 border border-[#FFEAEA]/60 rounded-xl flex items-center justify-center mr-4">
                      <i className="fas fa-comments text-[#0f172a] text-xl"></i>
                    </div>
                    <h3 className="text-xl font-semibold text-[#0f172a]">
                      {renderGlowingHeading('Interview Practice')}
                    </h3>
                  </div>
                  <GlowLine className="text-[#0f172a]/70 mb-6" text={"Practice your interview skills with AVA (AI Virtual Advisor). Get personalized questions based on your resume and target role to improve your interview performance."} />
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-[#0f172a]"><i className="fas fa-check text-emerald-600 mr-2"></i><GlowLine text="Personalized questions based on your resume" /></div>
                    <div className="flex items-center text-sm text-[#0f172a]"><i className="fas fa-check text-emerald-600 mr-2"></i><GlowLine text="Technical and behavioral interview practice" /></div>
                    <div className="flex items-center text-sm text-[#0f172a]"><i className="fas fa-check text-emerald-600 mr-2"></i><GlowLine text="Real-time conversation with AI interviewer" /></div>
                  </div>
                  <Link href="/interview-practice" className="relative inline-flex items-center px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#F5CBCB] to-[#9ECAD6] shadow-lg hover:shadow-xl transition-all duration-200">
                    <i className="fas fa-play mr-2"></i>
                    Start Interview Practice
                  </Link>
                </div>
                <div
                  className="dash-3d-icon-back dash-3d-card-back rounded-2xl bg-photo-overlay text-white"
                  style={{ backgroundImage: "url('https://images.unsplash.com/photo-1526378722484-bd91ca387e72?q=80&w=1600&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  {/* Modern glass chat panel with high contrast and clear avatars */}
                  <div className="absolute right-4 top-4 bottom-4 w-[44%] min-w-[240px] max-w-[320px] bg-neutral-900/70 ring-1 ring-white/10 rounded-xl backdrop-blur-md p-3 z-[15] hidden sm:flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
                    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/10">
                      <div className="w-8 h-8 rounded-full bg-sky-500/25 flex items-center justify-center ring-1 ring-sky-300/30">
                        <i className="fas fa-robot text-sky-300 text-sm"></i>
                      </div>
                      <div className="text-xs text-white/90 font-medium">AVA • AI Interviewer</div>
                    </div>
                    <div className="space-y-2 text-[13px] leading-relaxed overflow-y-auto pr-1">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-sky-500/25 flex items-center justify-center ring-1 ring-sky-300/30 shrink-0">
                          <i className="fas fa-robot text-sky-300 text-xs"></i>
                        </div>
                        <div className="bg-neutral-800/80 rounded-lg p-2 text-white shadow">
                          Tell me about a time you resolved a production issue. What steps did you take?
                        </div>
                      </div>
                      <div className="flex items-start gap-2 justify-end">
                        <div className="bg-sky-600/80 rounded-lg p-2 text-white shadow max-w-[80%]">
                          I triaged logs, rolled back, wrote a postmortem, and added alerts.
                        </div>
                        <div className="w-7 h-7 rounded-full bg-white/15 text-white flex items-center justify-center ring-1 ring-white/20 shrink-0">
                          <span className="text-[11px] font-semibold">{(user?.name || 'You').charAt(0).toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-sky-500/25 flex items-center justify-center ring-1 ring-sky-300/30 shrink-0">
                          <i className="fas fa-robot text-sky-300 text-xs"></i>
                        </div>
                        <div className="bg-neutral-800/80 rounded-lg p-2 text-white shadow">
                          How do you design a scalable API for growing traffic?
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="glass-caption z-30" style={{ left: '1rem', right: 'calc(44% + 1rem)' }}>
                    <h3 className="quote3d font-semibold text-sm sm:text-base md:text-xl leading-snug break-words tracking-tight">Level up your interviews</h3>
                    <p className="mt-1 text-sm text-white/85">Practice behavioral and technical questions with AI.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-100 mb-6 drop-shadow-[0_0_16px_rgba(59,130,246,0.35)] text-3d">
            {renderGlowingHeading('Quick Actions')}
          </h2>
          <div className="actions-grid">
            <Link href="/projects" className="action-card fancy-hover card-aura">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <i className="fas fa-briefcase text-blue-400 text-xl"></i>
                  <h3 className="card-title text-3d">Browse Projects</h3>
                </div>
                <p className="card-desc">Find exciting projects to work on</p>
              </div>
            </Link>

            <Link href="/my-applications" className="action-card fancy-hover card-aura">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <i className="fas fa-paper-plane text-emerald-400 text-xl"></i>
                  <h3 className="card-title text-3d">My Applications</h3>
                </div>
                <p className="card-desc">Track your project applications</p>
              </div>
            </Link>

            <Link href="/profile" className="action-card fancy-hover card-aura">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <i className="fas fa-user text-fuchsia-400 text-xl"></i>
                  <h3 className="card-title text-3d">Update Profile</h3>
                </div>
                <p className="card-desc">Keep your profile current</p>
              </div>
            </Link>

            {/* Find Mentor Quick Action (styled same size) */}
            <div className="action-card fancy-hover card-aura">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <i className="fas fa-hands-helping text-violet-400 text-xl"></i>
                  <h3 className="card-title text-3d">Find Mentor</h3>
                </div>
                <p className="card-desc">Get matched to mentors in your state with similar skills.</p>
                <button
                  type="button"
                  onClick={async () => {
                  const token = localStorage.getItem('token');
                  if (!token) {
                    setMentorMessage('Please log in to find a mentor.');
                    return;
                  }
                  setMentorLoading(true);
                  setMentorMessage('');
                  setMentorResults([]);
                  try {
                    const res = await fetch('/api/mentor/find', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                    const data = await res.json();
                    if (res.ok) {
                      setMentorResults(Array.isArray(data.mentors) ? data.mentors : []);
                      if (!data.mentors || data.mentors.length === 0) setMentorMessage(data.message || 'No mentors found for your criteria.');
                    } else {
                      setMentorMessage(data.message || 'Failed to find mentor.');
                    }
                  } catch (_e) {
                    setMentorMessage('An error occurred while finding a mentor.');
                  } finally {
                    setMentorLoading(false);
                  }
                }}
                disabled={mentorLoading}
                className="mt-3 self-start inline-flex items-center px-3 py-1.5 rounded-md font-semibold text-slate-100 bg-indigo-600/90 hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-search mr-2"></i>{mentorLoading ? 'Finding...' : 'Find Mentor'}
              </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mentor Results */}
        {(mentorMessage || (mentorResults && mentorResults.length > 0)) && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-100 mb-4 drop-shadow-[0_0_16px_rgba(139,92,246,0.35)]">
              {renderGlowingHeading('Mentor Matches')}
            </h2>
            {mentorMessage && (
              <div className="p-3 rounded-lg text-sm bg-rose-500/10 text-rose-300 border border-rose-500/30 mb-4">{mentorMessage}</div>
            )}
            {mentorResults && mentorResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mentorResults.filter(m => !myRequests.some(r => r.mentorUserId === m.user && (r.status === 'pending' || r.status === 'accepted'))).map((m, idx) => (
                  <div key={idx} className="relative p-6 rounded-lg border border-neutral-800 bg-neutral-900/70 hover:border-violet-500/40 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-slate-100 font-semibold">{m.headline || 'Potential Mentor'}</div>
                      <div className="text-slate-300 text-sm">{typeof m.finalScore === 'number' ? `Score: ${m.finalScore}` : ''}</div>
                    </div>
                    <div className="text-slate-300 text-sm mb-1">{[m.state, m.district, m.college].filter(Boolean).join(' • ')}</div>
                    <div className="text-slate-200 text-sm">Skills: {(m.skills || []).join(', ')}</div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={async () => {
                          const token = localStorage.getItem('token');
                          if (!token) {
                            setMentorMessage('Please log in to request a mentor.');
                            return;
                          }
                          try {
                            const res = await fetch('/api/mentor/request', {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                              body: JSON.stringify({ mentorUserId: m.user })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setMentorMessage(data.message || 'Request sent.');
                              // refresh my requests list
                              const mr = await fetch('/api/mentor/my-requests', { headers: { 'Authorization': `Bearer ${token}` } });
                              if (mr.ok) {
                                const d = await mr.json();
                                setMyRequests(Array.isArray(d.requests) ? d.requests : []);
                              }
                            } else {
                              setMentorMessage(data.message || 'Failed to send request.');
                            }
                          } catch (_e) {
                            setMentorMessage('An error occurred while sending request.');
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold text-slate-100 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-[0_0_20px_rgba(168,85,247,0.45)] transition-all"
                      >
                        <i className="fas fa-paper-plane mr-2" />
                        Request Mentorship
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Requests & Contact */}
        {myRequests && myRequests.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-100 mb-4 drop-shadow-[0_0_16px_rgba(59,130,246,0.35)]">
              {renderGlowingHeading('My Mentorship Requests')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myRequests.map((r) => (
                <div key={r.id} className="relative p-6 rounded-lg border border-neutral-800 bg-neutral-900/70 hover:border-blue-500/40 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-slate-100 font-semibold">{r.mentorName} {r.mentorHeadline ? `• ${r.mentorHeadline}` : ''}</div>
                    <div className={`text-xs uppercase tracking-wide ${r.status === 'accepted' ? 'text-emerald-400' : r.status === 'pending' ? 'text-amber-300' : 'text-rose-400'}`}>{r.status}</div>
                  </div>
                  <div className="text-slate-300 text-sm mb-1">{[r.mentorState, r.mentorDistrict, r.mentorCollege].filter(Boolean).join(' • ')}</div>
                  {r.mentorSkills && r.mentorSkills.length > 0 && (
                    <div className="text-slate-300 text-sm mb-2">Skills: {r.mentorSkills.join(', ')}</div>
                  )}
                  {r.status === 'accepted' && (
                    <div className="mt-2 flex gap-2">
                      {r.mentorEmail && (
                        <a
                          href={`mailto:${r.mentorEmail}?subject=Mentorship%20Follow-up&body=Hi%20${encodeURIComponent(r.mentorName)},%20%0A%0AThanks%20for%20accepting%20my%20mentorship%20request!%20`}
                          className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold text-slate-100 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.45)] transition-all"
                        >
                          <i className="fas fa-envelope mr-2" />
                          Email Mentor
                        </a>
                      )}
                      <a
                        href={`/chat/${r.id}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold text-slate-100 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:shadow-[0_0_20px_rgba(168,85,247,0.45)] transition-all"
                      >
                        <i className="fas fa-comments mr-2" />
                        Message
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incoming Mentorship Requests (for mentors) */}
        {incomingRequests && incomingRequests.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-100 mb-4 drop-shadow-[0_0_16px_rgba(16,185,129,0.35)]">
              {renderGlowingHeading('Incoming Mentorship Requests')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {incomingRequests.map((r) => (
                <div key={r.id} className="relative p-6 rounded-lg border border-neutral-800 bg-neutral-900/70 hover:border-emerald-500/40 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-slate-100 font-semibold">{r.menteeName} {r.menteeHeadline ? `• ${r.menteeHeadline}` : ''}</div>
                    <div className={`text-xs uppercase tracking-wide ${r.status === 'accepted' ? 'text-emerald-400' : r.status === 'pending' ? 'text-amber-300' : 'text-rose-400'}`}>{r.status}</div>
                  </div>
                  <div className="text-slate-300 text-sm mb-1">{[r.menteeState, r.menteeDistrict, r.menteeCollege].filter(Boolean).join(' • ')}</div>
                  <div className="text-slate-200 text-sm">Skills: {(r.menteeSkills || []).join(', ')}</div>
                  {r.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const token = localStorage.getItem('token');
                          if (!token) return;
                          const res = await fetch('/api/mentor/respond', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ mentorshipId: r.id, action: 'accept' }) });
                          if (res.ok) {
                            const inc = await fetch('/api/mentor/incoming', { headers: { 'Authorization': `Bearer ${token}` } });
                            if (inc.ok) {
                              const d2 = await inc.json();
                              setIncomingRequests(Array.isArray(d2.requests) ? d2.requests : []);
                            }
                            const mr = await fetch('/api/mentor/my-requests', { headers: { 'Authorization': `Bearer ${token}` } });
                            if (mr.ok) {
                              const d = await mr.json();
                              setMyRequests(Array.isArray(d.requests) ? d.requests : []);
                            }
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold text-slate-100 bg-emerald-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.45)] transition-all"
                      >
                        <i className="fas fa-check mr-2" />
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const token = localStorage.getItem('token');
                          if (!token) return;
                          const res = await fetch('/api/mentor/respond', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ mentorshipId: r.id, action: 'decline' }) });
                          if (res.ok) {
                            const inc = await fetch('/api/mentor/incoming', { headers: { 'Authorization': `Bearer ${token}` } });
                            if (inc.ok) {
                              const d2 = await inc.json();
                              setIncomingRequests(Array.isArray(d2.requests) ? d2.requests : []);
                            }
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold text-slate-100 bg-rose-600 hover:shadow-[0_0_20px_rgba(244,63,94,0.45)] transition-all"
                      >
                        <i className="fas fa-times mr-2" />
                        Decline
                      </button>
                    </div>
                  )}
                  {r.status === 'accepted' && (
                    <div className="mt-2">
                      <a
                        href={`/chat/${r.id}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold text-slate-100 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:shadow-[0_0_20px_rgba(168,85,247,0.45)] transition-all"
                      >
                        <i className="fas fa-comments mr-2" />
                        Message
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips Section as balanced cards */}
        <div className="mb-2">
          <h2 className="text-2xl font-bold text-slate-100 mb-4 drop-shadow-[0_0_16px_rgba(59,130,246,0.35)]">
            {renderGlowingHeading('Career Tips')}
          </h2>
          <div className="tips-grid">
            <div className="tip-card fancy-hover card-aura">
              <div className="card-body">
                <h3 className="card-title text-3d">💡 Resume Optimization</h3>
                <p className="card-desc">Use the analyzer to find gaps and get personalized course recommendations.</p>
              </div>
            </div>
            <div className="tip-card fancy-hover card-aura">
              <div className="card-body">
                <h3 className="card-title text-3d">🎯 Interview Preparation</h3>
                <p className="card-desc">Practice with AVA to get comfortable with technical and behavioral questions.</p>
              </div>
            </div>
            <div className="tip-card">
              <div className="card-body">
                <h3 className="card-title text-3d">📈 Skill Development</h3>
                <p className="card-desc">Prioritize in-demand skills for your target roles with AI guidance.</p>
              </div>
            </div>
            <div className="tip-card">
              <div className="card-body">
                <h3 className="card-title text-3d">🤝 Networking</h3>
                <p className="card-desc">Collaborate on projects to expand your network and experience.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
