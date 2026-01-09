import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Profile from '@/models/Profile';
import Project from '@/models/Project';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

const getDataFromToken = (request) => {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] || '';
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (_error) {
    return null;
  }
};

// Try Gemini first, fall back to OpenRouter
async function analyzeWithGemini(prompt) {
  try {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    const responseTextOrFn = result?.response?.text;
    const responseText = typeof responseTextOrFn === 'function' ? responseTextOrFn() : responseTextOrFn;
    
    if (!responseText) return null;

    const cleaned = String(responseText).replace(/```json|```/gi, '').trim();
    const s = cleaned.indexOf('{');
    const e = cleaned.lastIndexOf('}');
    
    if (s === -1 || e === -1 || e <= s) return null;
    
    return JSON.parse(cleaned.slice(s, e + 1));
  } catch (error) {
    console.error('Gemini error:', error.message);
    return null;
  }
}

// OpenRouter fallback
async function analyzeWithOpenRouter(prompt) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey.includes('INVALID')) return null;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'amazon/nova-2-lite-v1:free',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      console.error('OpenRouter error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;

    const cleaned = String(content).replace(/```json|```/gi, '').trim();
    const s = cleaned.indexOf('{');
    const e = cleaned.lastIndexOf('}');
    
    if (s === -1 || e === -1 || e <= s) return null;
    
    return JSON.parse(cleaned.slice(s, e + 1));
  } catch (error) {
    console.error('OpenRouter error:', error.message);
    return null;
  }
}

export async function GET(request, { params }) {
  await dbConnect();
  try {
    const authUser = getDataFromToken(request);
    if (!authUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, developerId } = await params;
    if (!projectId || !developerId) {
      return NextResponse.json({ message: 'projectId and developerId are required' }, { status: 400 });
    }

    // Only co-founders can analyze developers
    const requester = await User.findById(authUser.id).select('role');
    if (requester?.role !== 'cofounder') {
      return NextResponse.json({ message: 'Forbidden: Only cofounders can analyze developers' }, { status: 403 });
    }

    // Verify developer exists
    const developer = await User.findById(developerId);
    if (!developer || developer.role !== 'developer') {
      return NextResponse.json({ message: 'Developer not found' }, { status: 404 });
    }

    const profile = await Profile.findOne({ user: developerId });
    const project = await Project.findById(projectId);

    if (!profile) {
      return NextResponse.json({ message: 'Developer profile not found.' }, { status: 404 });
    }
    if (!project) {
      return NextResponse.json({ message: 'Project not found.' }, { status: 404 });
    }

    // Build resume text from profile
    let resumeText = (profile.parsedResumeText || '').trim();
    if (!resumeText) {
      const headline = (profile.headline || '').trim();
      const bio = (profile.bio || '').trim();
      const skills = Array.isArray(profile.skills) ? profile.skills.join(', ') : '';
      const experience = Array.isArray(profile.experience)
        ? profile.experience.map(exp => `${exp.title || exp.position || 'Position'} at ${exp.company || ''} ${exp.description ? '- ' + exp.description : ''}`).join('\n')
        : '';
      const education = Array.isArray(profile.education)
        ? profile.education.map(ed => `${ed.degree || ''} in ${ed.fieldOfStudy || ed.field || ''} from ${ed.school || ed.institution || ''}`).join('\n')
        : '';
      const totalExp = profile.totalExperienceYears ? `${profile.totalExperienceYears} years of experience` : '';
      const synthetic = [headline, bio, skills, experience, education, totalExp].filter(Boolean).join('\n');
      resumeText = synthetic || 'No resume text available.';
    }

    const requiredSkills = Array.isArray(project.requiredSkills) ? project.requiredSkills.filter(Boolean) : [];
    const safeResume = String(resumeText).slice(0, 15000);
    
    const prompt = `You are a technical recruiter. Analyze this developer's skills against the project requirements.
Return ONLY valid JSON with no additional text, markdown, or code fences.

Developer Profile:
${safeResume}

Project Requirements:
Title: ${project.title || 'N/A'}
Required Skills: ${requiredSkills.join(', ') || 'Not specified'}
Description: ${project.description || 'N/A'}

Respond with this JSON structure exactly:
{
  "matchScore": <number 0-100>,
  "assessmentTitle": "<short title>",
  "executiveSummary": "<2-3 sentence summary>",
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "missingKeywords": ["<missing1>", "<missing2>"],
  "whyGood": [
    {
      "skill": "<skill name>",
      "reason": "<why they're good at this>",
      "percentage": <0-100>
    }
  ],
  "whyNotGood": [
    {
      "skill": "<skill/requirement>",
      "reason": "<why they lack this>",
      "percentage": <0-100 gap>
    }
  ]
}

Provide realistic percentages based on the actual resume content. For whyGood, list skills they DO have. For whyNotGood, list skills they DON'T have or lack experience in.`;

    console.log('[Cofounder Analyzer] Starting analysis for developer', developerId);

    // Try Gemini first
    let json = await analyzeWithGemini(prompt);
    
    if (!json) {
      console.log('[Cofounder Analyzer] Gemini failed, trying OpenRouter...');
      json = await analyzeWithOpenRouter(prompt);
    }

    // If both failed, return proper fallback with actual skills
    if (!json) {
      console.log('[Cofounder Analyzer] Both AI services failed, using fallback');
      
      const developerSkills = Array.isArray(profile.skills) ? profile.skills : [];
      const matchedSkills = developerSkills.filter(skill => 
        requiredSkills.some(req => req.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(req.toLowerCase()))
      );
      const missingSkills = requiredSkills.filter(req =>
        !developerSkills.some(skill => skill.toLowerCase().includes(req.toLowerCase()))
      );

      json = {
        matchScore: matchedSkills.length > 0 ? Math.round((matchedSkills.length / requiredSkills.length) * 100) : 0,
        assessmentTitle: matchedSkills.length > 0 ? 'Partial Match' : 'Limited Match',
        executiveSummary: `Developer has ${matchedSkills.length} of ${requiredSkills.length} required skills. ${missingSkills.length} skills need to be acquired.`,
        strengths: matchedSkills.length > 0 ? matchedSkills.map(s => `Experienced with ${s}`) : ['Profile data available for review'],
        weaknesses: missingSkills.length > 0 ? missingSkills.map(s => `Limited experience with ${s}`) : ['No gaps identified'],
        missingKeywords: missingSkills,
        whyGood: matchedSkills.slice(0, 5).map(skill => ({
          skill,
          reason: `Listed in developer's skill profile`,
          percentage: 80
        })),
        whyNotGood: missingSkills.slice(0, 5).map(skill => ({
          skill,
          reason: `Not mentioned in developer's profile`,
          percentage: 80
        }))
      };
    }

    console.log('[Cofounder Analyzer] Analysis complete, score:', json.matchScore);
    return NextResponse.json(json, { status: 200 });

  } catch (error) {
    console.error('[Cofounder Analyzer] Error:', error);
    return NextResponse.json({
      matchScore: 0,
      assessmentTitle: 'Analysis Error',
      executiveSummary: 'A server error occurred. Please try again.',
      strengths: [],
      weaknesses: [error.message || 'Unknown error'],
      missingKeywords: [],
      whyGood: [],
      whyNotGood: []
    }, { status: 200 });
  }
}
