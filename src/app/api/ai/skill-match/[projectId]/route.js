import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Profile from '@/models/Profile';
import Project from '@/models/Project';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_KEY = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID || "gemini-1.5-flash-latest";
const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'amazon/nova-2-lite-v1:free';
const OPENROUTER_ENDPOINT = process.env.OPENROUTER_API_ENDPOINT || 'https://openrouter.ai/api/v1/chat/completions';

// Intelligent fallback skill matching when AI fails
function intelligentSkillMatching(userSkills, requiredSkills) {
  const userSkillsNorm = (userSkills || []).map(s => s.toLowerCase().trim());
  const requiredNorm = (requiredSkills || []).map(s => s.toLowerCase().trim());

  const whyGood = [];
  const whyNotGood = [];

  requiredNorm.forEach(req => {
    const matchIdx = userSkillsNorm.findIndex(u => u.includes(req) || req.includes(u));
    if (matchIdx >= 0) {
      whyGood.push({
        skill: requiredSkills[requiredNorm.indexOf(req)],
        reason: `Developer has "${userSkills[matchIdx]}" which matches the requirement`,
        percentage: 85
      });
    } else {
      whyNotGood.push({
        skill: req,
        reason: `Developer does not have this skill in their profile`,
        percentage: 0
      });
    }
  });

  const matchScore = whyGood.length > 0 
    ? Math.round((whyGood.length / requiredNorm.length) * 100)
    : 0;

  return {
    matchScore,
    assessmentTitle: `Skill Match Analysis`,
    executiveSummary: `Based on profile skills comparison, the developer has ${whyGood.length} of ${requiredNorm.length} required skills.`,
    strengths: whyGood.map(w => w.skill),
    weaknesses: whyNotGood.map(w => w.skill),
    missingKeywords: whyNotGood.map(w => w.skill),
    whyGood,
    whyNotGood
  };
}

async function analyzeWithGemini(userSkills, projectRequirements) {
  if (!genAI) return null;

  const prompt = `You are an expert recruiter analyzing a developer's skills against project requirements.

Developer's Skills: ${userSkills.join(', ')}
Project Required Skills: ${projectRequirements.join(', ')}

Analyze the match between developer's skills and project requirements. Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "matchScore": <0-100 percentage>,
  "assessmentTitle": "<short title>",
  "executiveSummary": "<2-3 sentence summary>",
  "strengths": [<list of matching skills the developer has>],
  "weaknesses": [<list of skills the developer lacks>],
  "missingKeywords": [<skills not in developer profile>],
  "whyGood": [
    { "skill": "<skill name>", "reason": "<why this skill matches>", "percentage": <0-100> }
  ],
  "whyNotGood": [
    { "skill": "<skill name>", "reason": "<why this is a gap>", "percentage": <0-100> }
  ]
}`;

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_ID });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText;
    if (responseText.includes('```json')) {
      jsonStr = responseText.split('```json')[1].split('```')[0].trim();
    } else if (responseText.includes('```')) {
      jsonStr = responseText.split('```')[1].split('```')[0].trim();
    }
    
    const analysis = JSON.parse(jsonStr);
    return analysis;
  } catch (error) {
    console.error('Gemini analysis error:', error.message);
    return null;
  }
}

async function analyzeWithOpenRouter(userSkills, projectRequirements) {
  if (!OPENROUTER_API_KEY) return null;

  const prompt = `You are an expert recruiter analyzing a developer's skills against project requirements.

Developer's Skills: ${userSkills.join(', ')}
Project Required Skills: ${projectRequirements.join(', ')}

Analyze the match between developer's skills and project requirements. Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "matchScore": <0-100 percentage>,
  "assessmentTitle": "<short title>",
  "executiveSummary": "<2-3 sentence summary>",
  "strengths": [<list of matching skills the developer has>],
  "weaknesses": [<list of skills the developer lacks>],
  "missingKeywords": [<skills not in developer profile>],
  "whyGood": [
    { "skill": "<skill name>", "reason": "<why this skill matches>", "percentage": <0-100> }
  ],
  "whyNotGood": [
    { "skill": "<skill name>", "reason": "<why this is a gap>", "percentage": <0-100> }
  ]
}`;

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.error('OpenRouter error:', response.statusText);
      return null;
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content || '';
    
    // Extract JSON from response
    let jsonStr = responseText;
    if (responseText.includes('```json')) {
      jsonStr = responseText.split('```json')[1].split('```')[0].trim();
    } else if (responseText.includes('```')) {
      jsonStr = responseText.split('```')[1].split('```')[0].trim();
    }
    
    const analysis = JSON.parse(jsonStr);
    return analysis;
  } catch (error) {
    console.error('OpenRouter analysis error:', error.message);
    return null;
  }
}

export async function GET(req, { params }) {
  try {
    // Verify authentication
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch (error) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    await dbConnect();

    const { projectId } = await params;

    // Fetch user's profile to get their skills
    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      return NextResponse.json({ message: 'Profile not found' }, { status: 404 });
    }

    const userSkills = profile.skills || [];
    if (userSkills.length === 0) {
      return NextResponse.json({ 
        message: 'No skills in your profile. Please add skills to get a skill match analysis.' 
      }, { status: 400 });
    }

    // Fetch project to get required skills
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    const requiredSkills = project.requiredSkills || [];
    if (requiredSkills.length === 0) {
      return NextResponse.json({ 
        message: 'Project has no required skills defined' 
      }, { status: 400 });
    }

    // Try Gemini first
    let analysis = await analyzeWithGemini(userSkills, requiredSkills);

    // Fallback to OpenRouter if Gemini fails
    if (!analysis) {
      console.log('Gemini failed, trying OpenRouter...');
      analysis = await analyzeWithOpenRouter(userSkills, requiredSkills);
    }

    // Final fallback to intelligent skill matching
    if (!analysis) {
      console.log('Both AI services failed, using intelligent skill matching...');
      analysis = intelligentSkillMatching(userSkills, requiredSkills);
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Skill match analysis error:', error);
    return NextResponse.json(
      { message: 'Error analyzing skills', error: error.message },
      { status: 500 }
    );
  }
}
