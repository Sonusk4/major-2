'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function InterviewPracticePage() {
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [error, setError] = useState('');
  const [answerText, setAnswerText] = useState('');
  const router = useRouter();

  const jobRoles = [
    'Software Engineer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'Data Scientist',
    'DevOps Engineer',
    'Product Manager',
    'UI/UX Designer',
    'Mobile Developer',
    'Machine Learning Engineer',
    'Cloud Engineer',
    'Cybersecurity Analyst'
  ];

  const startInterview = async () => {
    if (!resumeText.trim() || !targetRole) {
      setError('Please provide both resume text and select a target role');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          resumeText, 
          targetRole,
          conversationHistory: []
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConversation([{ role: 'assistant', content: data.message }]);
        setIsInterviewStarted(true);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to start interview');
      }
    } catch (err) {
      setError('An error occurred while starting the interview');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (message) => {
    if (!message.trim()) return;

    const userMessage = { role: 'user', content: message };
    setConversation(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          resumeText,
          targetRole,
          conversationHistory: [...conversation, userMessage]
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConversation(prev => [...prev, { role: 'assistant', content: data.message }]);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to get response');
      }
    } catch (err) {
      setError('An error occurred while sending message');
    } finally {
      setIsLoading(false);
    }
  };

  const resetInterview = () => {
    setConversation([]);
    setIsInterviewStarted(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-slate-900 to-cyan-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Back Button */}
        <Link href="/developer-dashboard" className="text-cyan-400 hover:text-cyan-300 mb-4 inline-flex items-center gap-2 w-fit">
          <span>←</span> Back to Developer Dashboard
        </Link>

        <div className="relative rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur p-8 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_42px_rgba(34,211,238,0.45)] shadow-[0_0_28px_rgba(34,211,238,0.25)]">
          <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity bg-[radial-gradient(640px_320px_at_-10%_-10%,rgba(34,211,238,0.18),transparent_60%),radial-gradient(520px_260px_at_110%_110%,rgba(168,85,247,0.18),transparent_60%)]" />
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-100 mb-4 drop-shadow-[0_0_16px_rgba(34,211,238,0.35)]">AI Interview Practice</h1>
            <p className="text-slate-300 max-w-2xl mx-auto">
              Practice with AVA. Get resume- and role-specific questions, instant feedback, and tailored follow-ups.
            </p>
          </div>

          {!isInterviewStarted ? (
            <div className="space-y-6">
              <div>
                <label htmlFor="resumeText" className="block text-sm font-medium text-slate-200 mb-2">
                  Paste Your Resume Text
                </label>
                <textarea
                  id="resumeText"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your complete resume text here... Include your skills, experience, education, and projects."
                  className="w-full h-48 px-4 py-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none text-white caret-cyan-300 bg-neutral-900/80 placeholder-slate-400"
                  style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                />
              </div>

              <div>
                <label htmlFor="targetRole" className="block text-sm font-medium text-slate-200 mb-2">
                  Select Target Role
                </label>
                <select
                  id="targetRole"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-neutral-900/80 text-white appearance-none"
                  style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                >
                  <option value="">Choose a role...</option>
                  {jobRoles.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={startInterview}
                  disabled={isLoading}
                  className="px-8 py-3 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-cyan-600 to-fuchsia-600 shadow-[0_0_22px_rgba(34,211,238,0.35)] hover:shadow-[0_0_36px_rgba(168,85,247,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Starting Interview...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <i className="fas fa-play mr-2 drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]"></i>
                      Start Interview with AVA
                    </span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.35)]">
                  Interviewing for: {targetRole}
                </h2>
                <button
                  onClick={resetInterview}
                  className="text-slate-300 hover:text-slate-100 text-sm font-medium"
                >
                  <i className="fas fa-refresh mr-1"></i>
                  Start New Interview
                </button>
              </div>

              <div className="rounded-lg p-4 h-96 overflow-y-auto border border-neutral-800 bg-neutral-900/60">
                <div className="space-y-4">
                  {conversation.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl transition-all ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white shadow-[0_0_18px_rgba(34,211,238,0.45)] hover:shadow-[0_0_28px_rgba(168,85,247,0.55)]'
                            : 'bg-neutral-900/80 border border-neutral-800 text-slate-100 hover:border-cyan-500/40 hover:shadow-[0_0_24px_rgba(34,211,238,0.25)]'
                        }`}
                      >
                        <div className="text-xs font-semibold mb-1 opacity-80 tracking-wide">
                          {message.role === 'user' ? 'You' : 'AVA'}
                        </div>
                        <div className="text-sm leading-relaxed">{message.content}</div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-neutral-900/80 border border-neutral-800 text-slate-100 px-4 py-3 rounded-xl">
                        <div className="text-xs font-semibold mb-1 opacity-80 tracking-wide">AVA</div>
                        <div className="text-sm"><i className="fas fa-spinner fa-spin mr-2"></i>Typing...</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Type your response..."
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading && answerText.trim()) {
                      sendMessage(answerText.trim());
                      setAnswerText('');
                    }
                  }}
                  className="flex-1 px-4 py-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white caret-cyan-300 bg-neutral-900/80 placeholder-slate-400"
                  style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                />
                <button
                  onClick={() => {
                    if (answerText.trim() && !isLoading) {
                      sendMessage(answerText.trim());
                      setAnswerText('');
                    }
                  }}
                  disabled={isLoading}
                  className="px-6 py-3 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-cyan-600 to-fuchsia-600 shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:shadow-[0_0_30px_rgba(168,85,247,0.55)] transition-all disabled:opacity-50"
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>

              <div className="text-center text-sm text-slate-300">
                <p className="drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]">💡 Tip: Be specific and detailed. AVA adapts questions to your answers.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
