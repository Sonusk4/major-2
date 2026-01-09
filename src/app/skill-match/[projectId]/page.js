'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import jsPDF from 'jspdf';

export default function SkillMatchPage() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  
  const params = useParams();
  const projectId = params?.projectId;

  useEffect(() => {
    const runAnalysis = async () => {
      if (!projectId) {
        setError("Project ID is required.");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setError("You must be logged in to view this page.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/ai/skill-match/${projectId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setAnalysis(data);
        } else {
          const data = await res.json();
          setError(data.message || "Failed to get analysis.");
        }
      } catch (err) {
        console.error('Analysis error:', err);
        setError("An error occurred during AI analysis.");
      } finally {
        setLoading(false);
      }
    };
    
    if (projectId) {
      runAnalysis();
    }
  }, [projectId]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
        <i className="fas fa-circle-notch fa-spin text-4xl mb-4 text-sky-400"></i>
        <h1 className="text-2xl font-semibold text-white">AI is analyzing your skills...</h1>
        <p className="text-slate-300">This may take a moment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-10 max-w-2xl mx-auto px-4">
        <p className="text-red-400 bg-red-950/30 p-4 rounded-lg border border-red-800">{error}</p>
        <Link href="/projects" className="inline-block mt-4 px-6 py-2 text-white bg-sky-600 rounded-lg hover:bg-sky-700">
          Back to Projects
        </Link>
      </div>
    );
  }

  const downloadPDF = async () => {
    if (!analysis) return;
    
    setDownloading(true);
    try {
      const doc = new jsPDF();
      
      // Set document properties
      doc.setProperties({
        title: 'Skill Match Analysis Report',
        subject: 'AI-Powered Skill Analysis',
        author: 'Career Hub AI',
        creator: 'Career Hub'
      });

      // Add header
      doc.setFillColor(20, 20, 30);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('Skill Match Analysis', 20, 25);

      // Add match score
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(`Match Score: ${analysis.matchScore || 0}%`, 20, 50);

      // Add assessment title
      doc.setFontSize(12);
      doc.setTextColor(60, 60, 60);
      doc.text(analysis.assessmentTitle || 'Skill Assessment', 20, 60);

      // Add executive summary
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      const summaryLines = doc.splitTextToSize(analysis.executiveSummary || '', 170);
      doc.text(summaryLines, 20, 70);

      let yPos = 70 + summaryLines.length * 5 + 10;

      // Add Why Good Section
      if (analysis.whyGood && analysis.whyGood.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(34, 197, 94);
        doc.text('✓ Skills You Have:', 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        analysis.whyGood.forEach(item => {
          const lines = doc.splitTextToSize(`${item.skill} (${item.percentage}%) - ${item.reason}`, 170);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 4 + 2;
        });
        yPos += 5;
      }

      // Add Why Not Good Section
      if (analysis.whyNotGood && analysis.whyNotGood.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(217, 119, 6);
        doc.text('⚠ Skills to Develop:', 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        analysis.whyNotGood.forEach(item => {
          const lines = doc.splitTextToSize(`${item.skill} - ${item.reason}`, 170);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 4 + 2;
        });
      }

      doc.save('skill-match-analysis.pdf');
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (!analysis) {
    return (
      <div className="text-center mt-10">
        <p>No analysis available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href={`/projects/${projectId}`} className="text-sky-400 hover:text-sky-300 mb-6 inline-flex items-center gap-2">
          <span>←</span> Back to Project
        </Link>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 backdrop-blur p-8 shadow-xl">
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-white mb-2">Skill Match Analysis</h1>
            <p className="text-slate-300">{analysis.assessmentTitle}</p>
          </div>

          {/* Match Score Card */}
          <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-sky-500/10 to-violet-600/10 border border-sky-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-slate-300 text-sm font-medium mb-1">Overall Match Score</h2>
                <p className="text-slate-300 text-sm">{analysis.executiveSummary}</p>
              </div>
              <div className="text-5xl font-bold text-transparent bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text">
                {analysis.matchScore || 0}%
              </div>
            </div>
          </div>

          {/* Why Good (Skills You Have) */}
          {analysis.whyGood && analysis.whyGood.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">✓</span>
                <span className="text-green-400">Skills You Have</span>
              </h3>
              <div className="grid gap-4">
                {analysis.whyGood.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-green-950/20 border border-green-900/50 hover:border-green-700/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-white font-semibold">{item.skill}</h4>
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                        {item.percentage}% Match
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Why Not Good (Skills to Develop) */}
          {analysis.whyNotGood && analysis.whyNotGood.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">⚠</span>
                <span className="text-amber-400">What&apos;s Missing/Gaps</span>
              </h3>
              <div className="grid gap-4">
                {analysis.whyNotGood.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/50 hover:border-amber-700/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-white font-semibold">{item.skill}</h4>
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Gap: {item.percentage}%
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths Summary */}
          {analysis.strengths && analysis.strengths.length > 0 && (
            <div className="mb-8 p-4 rounded-lg bg-neutral-900/50 border border-neutral-800">
              <h4 className="text-white font-semibold mb-3">Your Strengths</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.strengths.map((strength, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-sm border border-green-500/30">
                    {strength}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Download PDF Button */}
          <div className="mt-10 flex gap-4">
            <button
              onClick={downloadPDF}
              disabled={downloading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-lg transition-all shadow-[0_0_20px_-6px_rgba(56,189,248,0.6)]"
            >
              {downloading ? '⏳ Downloading...' : '📥 Download PDF Report'}
            </button>
            <Link
              href="/projects"
              className="flex-1 px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-slate-300 font-semibold rounded-lg transition-all border border-neutral-700 text-center"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
