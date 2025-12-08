import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import Profile from '@/models/Profile';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
  try {
    await dbConnect();
    
    const { resumeText, targetRole } = await request.json();
    
    // Get token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (!targetRole) {
      return NextResponse.json({ message: 'Target role is required' }, { status: 400 });
    }

    // If resumeText is empty, synthesize from stored Profile similar to resume analyzer
    let textForInterview = (resumeText || '').trim();
    if (!textForInterview) {
      const profile = await Profile.findOne({ user: decoded.id });
      const headline = (profile?.headline || '').trim();
      const bio = (profile?.bio || '').trim();
      const skills = Array.isArray(profile?.skills) ? profile.skills.join(', ') : '';
      const experience = Array.isArray(profile?.experience)
        ? profile.experience.map(exp => `${exp.title || exp.position || 'Position'} at ${exp.company || 'Company'} ${exp.years ? `(${exp.years})` : ''} - ${exp.description || ''}`).join('\n')
        : '';
      const education = Array.isArray(profile?.education)
        ? profile.education.map(edu => `${edu.degree || 'Degree'} in ${edu.fieldOfStudy || edu.field || 'Field'} from ${edu.institution || 'Institution'}`).join('\n')
        : '';
      const composed = [headline, bio, skills ? `Skills: ${skills}` : '', experience ? `Experience:\n${experience}` : '', education ? `Education:\n${education}` : '']
        .filter(Boolean).join('\n\n');
      if (composed.trim().length > 20) textForInterview = composed;
    }

    // Generate initial interview question via Gemini for role/resume specificity
    const initialQuestion = await generateInitialQuestion(textForInterview, targetRole);

    const candidateName = user?.name || 'there';
    const greeting = `Hi ${candidateName}, I'm AVA, your AI interviewer. We'll do a ${targetRole} mock interview of 10 questions. Answer concisely; I'll give final feedback at the end.\n\n`;

    return NextResponse.json({ message: greeting + initialQuestion });
  } catch (error) {
    console.error('Interview start error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

async function generateInitialQuestion(resumeText, targetRole) {
  try {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Missing GOOGLE_GENAI_API_KEY');
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelId = process.env.GEMINI_MODEL_ID || 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ model: modelId });

    const sys = `You are AVA, an interview coach. Generate exactly ONE specific first question focused PRIMARILY on the selected target role. Use resume context only to tailor terminology, but the question must be appropriate for the role even if the resume is empty. Be concise and professional.`;
    const prompt = `${sys}\n\nTarget role: ${targetRole}\nResume (optional context):\n${resumeText}\n\nReturn ONLY JSON with this schema: {"message": string}`;
    const result = await model.generateContent(prompt + "\nReturn ONLY JSON. No prose, no code fences.");
    const respTextOrFn = result?.response?.text;
    const text = typeof respTextOrFn === 'function' ? respTextOrFn() : respTextOrFn;
    let data;
    try {
      data = JSON.parse(String(text).replace(/```json|```/g, '').trim());
    } catch (_) {
      throw new Error('Gemini JSON parse failed');
    }
    return String(data?.message || '').trim() || 'Tell me about a project you are most proud of and why.';
  } catch (geminiErr) {
    console.error('Gemini failed, trying OpenRouter:', geminiErr?.message);
    try {
      return await generateInitialQuestionWithOpenRouter(resumeText, targetRole);
    } catch (openRouterErr) {
      console.error('OpenRouter failed, trying OpenAI:', openRouterErr?.message);
      try {
        return await generateInitialQuestionWithOpenAI(resumeText, targetRole);
      } catch (openaiErr) {
        console.error('All AI services failed, using heuristic:', openaiErr?.message);
        // ultimate fallback
        const skills = extractSkillsFromResume(resumeText);
        const projects = extractProjectsFromResume(resumeText);
        const experience = extractExperienceFromResume(resumeText);
        const greeting = `Hello! I'm AVA, your AI Virtual Advisor for the ${targetRole} interview.`;
        let firstQuestion = '';
        if (projects.length > 0) {
          const recentProject = projects[0];
          firstQuestion = `Walk me through your specific contributions to this project: ${recentProject}. What technologies did you use and why?`;
        } else if (skills.length > 0) {
          const primarySkill = skills[0];
          firstQuestion = `Tell me about a challenge you solved using ${primarySkill}. How did you approach it and measure success?`;
        } else if (experience > 0) {
          firstQuestion = `You mention ${experience} years of experience. Describe a significant technical challenge you recently solved and its impact.`;
        } else {
          firstQuestion = `Briefly summarize your background and why you're a strong fit for ${targetRole}.`;
        }
        return `${greeting}\n\n${firstQuestion}`;
      }
    }
  }
}

async function generateInitialQuestionWithOpenAI(resumeText, targetRole) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  
  const modelId = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
  const sys = `You are AVA, an interview coach. Generate exactly ONE specific first question focused PRIMARILY on the selected target role. Use resume context only to tailor terminology, but the question must be appropriate for the role even if the resume is empty. Be concise and professional.`;
  const prompt = `${sys}\n\nTarget role: ${targetRole}\nResume (optional context):\n${resumeText}\n\nReturn ONLY JSON with this schema: {"message": string}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt + "\nReturn ONLY JSON. No prose, no code fences." }],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid OpenAI response');
  }

  const text = data.choices[0].message.content;
  const parsed = JSON.parse(String(text).replace(/```json|```/g, '').trim());
  return String(parsed?.message || '').trim() || 'Tell me about a project you are most proud of and why.';
}

async function generateInitialQuestionWithOpenRouter(resumeText, targetRole) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');
  
  const modelId = process.env.OPENROUTER_MODEL || 'amazon/nova-2-lite-v1:free';
  const apiEndpoint = process.env.OPENROUTER_API_ENDPOINT || 'https://openrouter.ai/api/v1/chat/completions';
  const sys = `You are AVA, an interview coach. Generate exactly ONE specific first question focused PRIMARILY on the selected target role. Use resume context only to tailor terminology, but the question must be appropriate for the role even if the resume is empty. Be concise and professional.`;
  const prompt = `${sys}\n\nTarget role: ${targetRole}\nResume (optional context):\n${resumeText}\n\nReturn ONLY JSON with this schema: {"message": string}`;

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://careerhub.com',
      'X-Title': 'CareerHub'
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt + "\nReturn ONLY JSON. No prose, no code fences." }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter response error:', response.status, errorText);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid OpenRouter response');
  }

  const text = data.choices[0].message.content;
  const parsed = JSON.parse(String(text).replace(/```json|```/g, '').trim());
  return String(parsed?.message || '').trim() || 'Tell me about a project you are most proud of and why.';
}

function extractSkillsFromResume(resumeText) {
  const skillKeywords = [
    'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'mongodb',
    'docker', 'kubernetes', 'aws', 'azure', 'html', 'css', 'typescript',
    'vue', 'angular', 'express', 'django', 'flask', 'machine learning',
    'pandas', 'numpy', 'tensorflow', 'pytorch', 'git', 'jenkins',
    'linux', 'bash', 'api', 'rest', 'graphql', 'microservices'
  ];
  
  return skillKeywords.filter(skill => resumeText.toLowerCase().includes(skill));
}

function extractProjectsFromResume(resumeText) {
  // Simple project extraction - look for project-related keywords
  const projectKeywords = ['project', 'application', 'system', 'platform', 'website', 'app'];
  const sentences = resumeText.split(/[.!?]+/);
  
  const projectSentences = sentences.filter(sentence => 
    projectKeywords.some(keyword => sentence.toLowerCase().includes(keyword))
  );
  
  return projectSentences.slice(0, 3); // Return top 3 project mentions
}

function extractExperienceFromResume(resumeText) {
  const yearMatches = resumeText.match(/(\d+)\s*(?:years?|yrs?)/gi);
  if (yearMatches) {
    const years = yearMatches.map(match => parseInt(match.match(/\d+/)[0]));
    return Math.max(...years);
  }
  return 0;
}
