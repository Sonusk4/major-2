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

export async function GET(request, { params }) {
  await dbConnect();
  try {
    const authUser = getDataFromToken(request);
    if (!authUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, userId } = await params;
    if (!projectId || !userId) {
      return NextResponse.json({ message: 'projectId and userId are required' }, { status: 400 });
    }

    // Only co-founders can analyze other users' resumes
    const requester = await User.findById(authUser.id).select('role');
    if (requester?.role !== 'cofounder') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const profile = await Profile.findOne({ user: userId });
    const project = await Project.findById(projectId);

    if (!profile) {
      return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });
    }
    if (!project) {
      return NextResponse.json({ message: 'Project not found.' }, { status: 404 });
    }

    let resumeText = (profile.parsedResumeText || '').trim();
    if (!resumeText) {
      // Build synthetic text from profile if parsed text is missing
      const headline = (profile.headline || '').trim();
      const bio = (profile.bio || '').trim();
      const skills = Array.isArray(profile.skills) ? profile.skills.join(', ') : '';
      const experience = Array.isArray(profile.experience)
        ? profile.experience.map(exp => `${exp.title || exp.position || 'Position'} at ${exp.company || ''} ${exp.description ? '- ' + exp.description : ''}`).join('\n')
        : '';
      const education = Array.isArray(profile.education)
        ? profile.education.map(ed => `${ed.degree || ''} in ${ed.fieldOfStudy || ed.field || ''} from ${ed.school || ed.institution || ''}`).join('\n')
        : '';
      const synthetic = [headline, bio, skills, experience, education].filter(Boolean).join('\n');
      resumeText = synthetic || 'No resume text available.';
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return graceful fallback so UI still shows something
      return NextResponse.json({
        matchScore: 0,
        assessmentTitle: 'AI Key Missing',
        executiveSummary: 'The AI key is not configured on the server. Please set GOOGLE_GENAI_API_KEY in .env.local and restart.',
        strengths: [],
        weaknesses: ['Server missing GOOGLE_GENAI_API_KEY'],
        missingKeywords: []
      }, { status: 200 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const requiredSkills = Array.isArray(project.requiredSkills) ? project.requiredSkills.filter(Boolean) : [];
    const safeResume = String(resumeText).slice(0, 12000);
    const prompt = `Analyze this applicant's resume against the project requirements.
Return ONLY JSON. No prose, no markdown, no code fences.
Use this exact JSON schema keys: {"matchScore":number,"assessmentTitle":string,"executiveSummary":string,"strengths":string[],"weaknesses":string[],"missingKeywords":string[]}
Project Title: ${project.title || ''}
Project Required Skills: ${requiredSkills.length ? requiredSkills.join(', ') : 'None provided'}
Project Description: ${project.description || ''}
Resume Text: ${safeResume}`;

    let json;
    try {
      const result = await model.generateContent(prompt);
      const responseTextOrFn = result?.response?.text;
      const responseText = typeof responseTextOrFn === 'function' ? responseTextOrFn() : responseTextOrFn;
      if (!responseText) {
        throw new Error('Empty Gemini response');
      }
      const cleaned = String(responseText).replace(/```json|```/gi, '').trim();
      const s = cleaned.indexOf('{');
      const e = cleaned.lastIndexOf('}');
      if (s === -1 || e === -1 || e <= s) {
        throw new Error('Gemini did not return JSON');
      }
      json = JSON.parse(cleaned.slice(s, e + 1));
    } catch (aiError) {
      // Graceful fallback so UI never receives a 500
      json = {
        matchScore: 50,
        assessmentTitle: 'Preliminary Analysis',
        executiveSummary: 'AI could not fully parse a response at this time. Showing a generic assessment so you can proceed.',
        strengths: requiredSkills.slice(0, 5).map(s => `Experience may align with ${s}`),
        weaknesses: ['Detailed AI analysis unavailable right now'],
        missingKeywords: requiredSkills.slice(0, 8)
      };
    }

    return NextResponse.json(json, { status: 200 });
  } catch (error) {
    // Final safety net: still respond 200 with a minimal payload
    return NextResponse.json({
      matchScore: 0,
      assessmentTitle: 'Analysis Error',
      executiveSummary: 'A server error occurred while analyzing. Please try again, but you can still review the applicant resume below.',
      strengths: [],
      weaknesses: [error.message || 'Unknown error'],
      missingKeywords: []
    }, { status: 200 });
  }
}


