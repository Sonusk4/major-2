'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import jsPDF from 'jspdf';

export default function AnalyzerPage() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.projectId;
  const developerId = searchParams?.get('developerId');

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
        // If developerId is provided, analyze the developer's resume; otherwise analyze the project
        const endpoint = developerId 
          ? `/api/ai/analyze-user/${projectId}/${developerId}`
          : `/api/ai/analyze/${projectId}`;
        
        const res = await fetch(endpoint, {
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
  }, [projectId, developerId]);
  
  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-gray-800">
            <i className="fas fa-circle-notch fa-spin text-4xl mb-4 text-blue-600"></i>
            <h1 className="text-2xl font-semibold">Gemini is analyzing your resume...</h1>
            <p className="text-gray-900">This may take a moment.</p>
        </div>
    );
  }

  if (error) {
    return (
        <div className="text-center mt-10 max-w-2xl mx-auto">
            <p className="text-red-600 bg-red-100 p-4 rounded-lg">{error}</p>
            <Link href="/profile" className="inline-block mt-4 px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                Go to Profile to Upload Resume
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
        title: 'Resume Analysis Report',
        subject: 'AI-Powered Resume Analysis',
        author: 'Career Hub AI',
        creator: 'Career Hub'
      });

      // Add header
      doc.setFontSize(24);
      doc.setTextColor(59, 130, 246); // Blue color
      doc.text('Resume Analysis Report', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('Powered by Gemini AI', 105, 30, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 40, { align: 'center' });

      // Add overall assessment
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('Overall Assessment', 20, 60);
      
      doc.setFontSize(36);
      doc.setTextColor(59, 130, 246);
      doc.text(`${analysis.matchScore}%`, 105, 80, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('Match Score', 105, 90, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(analysis.assessmentTitle, 105, 100, { align: 'center' });

      // Add executive summary
      doc.setFontSize(16);
      doc.text('Executive Summary', 20, 120);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const summaryLines = doc.splitTextToSize(analysis.executiveSummary, 170);
      doc.text(summaryLines, 20, 130);

      // Add strengths
      let yPos = 150 + (summaryLines.length * 5);
      doc.setFontSize(16);
      doc.text('Strengths', 20, yPos);
      doc.setFontSize(10);
      
      analysis.strengths.forEach((strength, index) => {
        yPos += 10;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`• ${strength}`, 25, yPos);
      });

      // Add areas for improvement
      yPos += 15;
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(16);
      doc.text('Areas for Improvement', 20, yPos);
      doc.setFontSize(10);
      
      analysis.weaknesses.forEach((weakness, index) => {
        yPos += 10;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`• ${weakness}`, 25, yPos);
      });

      // Add missing keywords
      yPos += 15;
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(16);
      doc.text('Missing Keywords', 20, yPos);
      doc.setFontSize(10);
      
      let keywordX = 25;
      analysis.missingKeywords.forEach((keyword, index) => {
        if (keywordX > 150) {
          yPos += 10;
          keywordX = 25;
        }
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
          keywordX = 25;
        }
        doc.text(keyword, keywordX, yPos);
        keywordX += doc.getTextWidth(keyword) + 10;
      });

      // Save the PDF
      doc.save(`resume-analysis-${projectId}-${Date.now()}.pdf`);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (!analysis) return <p className="text-center mt-10">No analysis data available.</p>;

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link 
            href="/projects" 
            className="inline-flex items-center px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </Link>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-gray-900">Resume Analysis Report</h1>
            <p className="text-gray-900">Powered by Gemini AI</p>
          </div>
          
          <button
            onClick={downloadPDF}
            disabled={downloading}
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {downloading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating PDF...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF Report
              </>
            )}
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-center">Overall Assessment</h2>
          <div className="text-center">
            <p className="text-6xl font-bold text-blue-600">{analysis.matchScore}%</p>
            <p className="text-gray-900 mb-2">Match Score</p>
            <p className="text-xl font-medium text-gray-700">{analysis.assessmentTitle}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Executive Summary</h3>
                <p className="text-gray-700">{analysis.executiveSummary}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Strengths</h3>
                <ul className="list-disc list-inside space-y-2 text-green-600">
                    {analysis.strengths.map((item, index) => <li key={index}><span className="text-gray-700">{item}</span></li>)}
                </ul>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Areas for Improvement</h3>
                <ul className="list-disc list-inside space-y-2 text-yellow-600">
                    {analysis.weaknesses.map((item, index) => <li key={index}><span className="text-gray-700">{item}</span></li>)}
                </ul>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Missing Keywords</h3>
                <div className="flex flex-wrap gap-2">
                    {analysis.missingKeywords.map(keyword => (
                      <span key={keyword} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                        {keyword}
                      </span>
                    ))}
                </div>
            </div>
            {/* Recommended Skills card removed as requested */}
            {Array.isArray(analysis.suggestedCourses) && analysis.suggestedCourses.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Suggested YouTube Courses</h3>
                <ul className="list-disc list-inside space-y-2">
                  {analysis.suggestedCourses.map((c, idx) => (
                    <li key={idx}>
                      <a href={c.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{c.title}</a>
                      <span className="text-gray-600"> — {c.topic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}