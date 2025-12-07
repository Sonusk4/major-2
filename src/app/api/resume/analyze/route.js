import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import Profile from '@/models/Profile';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
  try {
    await dbConnect();
    
    const { resumeText } = await request.json();
    
    // Get token from headers
    const authHeader = request.headers.get('authorization');
    console.log('Auth header:', authHeader); // Debug log
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized - No valid authorization header' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    console.log('Token extracted:', token ? 'Token exists' : 'No token'); // Debug log
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded); // Debug log
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    
    // Verify user exists
    const user = await User.findById(decoded.id);
    console.log('User found:', user ? 'Yes' : 'No'); // Debug log
    
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Try provided text first
    let textForAnalysis = (resumeText || '').trim();

    // Load profile once for potential fallbacks
    const profile = await Profile.findOne({ user: decoded.id });

    if (!textForAnalysis) {
      // Fallback to parsed resume stored in profile
      const stored = (profile?.parsedResumeText || '').trim();
      if (stored) {
        textForAnalysis = stored;
      }
    }

    // Final fallback: build text from known profile fields if parsing yielded little/no text
    if (!textForAnalysis || textForAnalysis.length < 50 || textForAnalysis.includes('PDF uploaded') || textForAnalysis.includes('manually enter')) {
      const headline = (profile?.headline || '').trim();
      const bio = (profile?.bio || '').trim();
      const skills = Array.isArray(profile?.skills) ? profile.skills.join(', ') : '';
      const experience = Array.isArray(profile?.experience) ? profile.experience.map(exp => 
        `${exp.position || 'Position'} at ${exp.company || 'Company'} - ${exp.description || ''}`
      ).join('\n') : '';
      const education = Array.isArray(profile?.education) ? profile.education.map(edu => 
        `${edu.degree || 'Degree'} in ${edu.field || 'Field'} from ${edu.institution || 'Institution'}`
      ).join('\n') : '';
      
      const synthetic = [headline, bio, skills, experience, education].filter(Boolean).join('\n');
      if (synthetic && synthetic.length >= 20) {
        textForAnalysis = synthetic;
        console.log('Using synthetic resume text from profile:', synthetic);
      }
    }

    // Try Gemini AI first; if unavailable, fall back to OpenRouter; if that fails, use local heuristic
    let analysis;
    try {
      analysis = await analyzeWithGemini(textForAnalysis);
    } catch (aiErr) {
      console.error('Gemini analysis failed, trying OpenRouter. Reason:', aiErr?.message || aiErr);
      try {
        analysis = await analyzeWithOpenRouter(textForAnalysis);
      } catch (openRouterErr) {
        console.error('OpenRouter analysis failed, falling back to local heuristic. Reason:', openRouterErr?.message || openRouterErr);
        analysis = await analyzeResumeWithAI(textForAnalysis);
      }
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Resume analysis error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

async function analyzeWithGemini(resumeText) {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GOOGLE_GENAI_API_KEY');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelId = process.env.GEMINI_MODEL_ID || 'gemini-1.5-flash-latest';
  const model = genAI.getGenerativeModel({ model: modelId });

  const prompt = `You are a career coach. Return ONLY valid JSON with no explanations or code fences. Use this exact schema:
  {"roleAnalysis":[{"roleTitle":string,"matchPercentage":number,"justification":string,"skillGaps":[{"gap":string,"suggestions":[{"type":string,"title":string,"platform":string}]}]}]}
  Resume:\n${resumeText}`;

  const result = await model.generateContent(prompt);
  const responseTextOrFn = result?.response?.text;
  const text = typeof responseTextOrFn === 'function' ? responseTextOrFn() : responseTextOrFn;
  if (!text) {
    throw new Error('Empty Gemini response');
  }
  // Normalize: remove code fences, extract first {...} block
  const fenceCleaned = String(text).replace(/```json|```/gi, '').trim();
  const startIdx = fenceCleaned.indexOf('{');
  const endIdx = fenceCleaned.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error('Gemini did not return JSON');
  }
  const jsonString = fenceCleaned.slice(startIdx, endIdx + 1);
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Invalid JSON from Gemini');
  }

  // Basic validation
  if (!parsed || !Array.isArray(parsed.roleAnalysis)) {
    throw new Error('Invalid JSON shape from Gemini');
  }
  // Coerce percentages to integers 0-100
  parsed.roleAnalysis = parsed.roleAnalysis.map(item => ({
    roleTitle: String(item.roleTitle || ''),
    matchPercentage: Math.max(0, Math.min(100, Math.round(Number(item.matchPercentage) || 0))),
    justification: String(item.justification || ''),
    skillGaps: Array.isArray(item.skillGaps) ? item.skillGaps.map(g => ({
      gap: String(g.gap || ''),
      suggestions: Array.isArray(g.suggestions) ? g.suggestions.map(s => ({
        type: String(s.type || 'Course'),
        title: String(s.title || ''),
        platform: String(s.platform || '')
      })) : []
    })) : []
  }));

  return parsed;
}

async function analyzeWithOpenRouter(resumeText) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  const apiEndpoint = process.env.OPENROUTER_API_ENDPOINT || 'https://openrouter.ai/api/v1/chat/completions';
  const modelId = process.env.OPENROUTER_MODEL || 'amazon/nova-2-lite-v1:free';

  const prompt = `You are a career coach. Return ONLY valid JSON with no explanations or code fences. Use this exact schema:
  {"roleAnalysis":[{"roleTitle":string,"matchPercentage":number,"justification":string,"skillGaps":[{"gap":string,"suggestions":[{"type":string,"title":string,"platform":string}]}]}]}
  Resume:\n${resumeText}`;

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  const payload = {
    model: modelId,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  };

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid OpenRouter response structure');
    }

    const text = data.choices[0].message.content;
    if (!text) {
      throw new Error('Empty OpenRouter response');
    }

    // Normalize: remove code fences, extract first {...} block
    const fenceCleaned = String(text).replace(/```json|```/gi, '').trim();
    const startIdx = fenceCleaned.indexOf('{');
    const endIdx = fenceCleaned.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      throw new Error('OpenRouter did not return JSON');
    }
    const jsonString = fenceCleaned.slice(startIdx, endIdx + 1);
    
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('Invalid JSON from OpenRouter');
    }

    // Basic validation
    if (!parsed || !Array.isArray(parsed.roleAnalysis)) {
      throw new Error('Invalid JSON shape from OpenRouter');
    }

    // Coerce percentages to integers 0-100
    parsed.roleAnalysis = parsed.roleAnalysis.map(item => ({
      roleTitle: String(item.roleTitle || ''),
      matchPercentage: Math.max(0, Math.min(100, Math.round(Number(item.matchPercentage) || 0))),
      justification: String(item.justification || ''),
      skillGaps: Array.isArray(item.skillGaps) ? item.skillGaps.map(g => ({
        gap: String(g.gap || ''),
        suggestions: Array.isArray(g.suggestions) ? g.suggestions.map(s => ({
          type: String(s.type || 'Course'),
          title: String(s.title || ''),
          platform: String(s.platform || '')
        })) : []
      })) : []
    }));

    return parsed;
  } catch (error) {
    console.error('OpenRouter fetch error:', error);
    throw error;
  }
}

async function analyzeResumeWithAI(resumeText) {
  // This is a simulated AI analysis - replace with actual AI service integration
  // For now, we'll provide a structured analysis based on common patterns
  
  const lowerResume = resumeText.toLowerCase();
  
  // Extract skills and technologies
  const skills = extractSkills(lowerResume);
  const experience = extractExperience(lowerResume);
  const education = extractEducation(lowerResume);
  
  // Define role templates
  const roleTemplates = [
    {
      title: 'Full Stack Developer',
      keywords: ['javascript', 'react', 'node.js', 'python', 'sql', 'html', 'css'],
      requiredSkills: ['javascript', 'react', 'node.js', 'database'],
      platforms: ['Coursera', 'Udemy', 'edX']
    },
    {
      title: 'Frontend Developer',
      keywords: ['javascript', 'react', 'vue', 'angular', 'html', 'css', 'typescript'],
      requiredSkills: ['javascript', 'html', 'css', 'react'],
      platforms: ['Coursera', 'Udemy', 'freeCodeCamp']
    },
    {
      title: 'Backend Developer',
      keywords: ['python', 'java', 'node.js', 'sql', 'mongodb', 'api', 'server'],
      requiredSkills: ['python', 'database', 'api'],
      platforms: ['Coursera', 'edX', 'AWS']
    },
    {
      title: 'Data Scientist',
      keywords: ['python', 'machine learning', 'pandas', 'numpy', 'sql', 'statistics'],
      requiredSkills: ['python', 'statistics', 'machine learning'],
      platforms: ['Coursera', 'edX', 'Kaggle']
    },
    {
      title: 'AI Engineer',
      keywords: ['ai', 'machine learning', 'deep learning', 'python', 'tensorflow', 'pytorch', 'computer vision', 'natural language processing'],
      requiredSkills: ['python', 'machine learning', 'ai'],
      platforms: ['Coursera', 'edX', 'Fast.ai']
    },
    {
      title: 'Machine Learning Engineer',
      keywords: ['machine learning', 'deep learning', 'python', 'tensorflow', 'pytorch', 'ai', 'computer vision'],
      requiredSkills: ['python', 'machine learning', 'deep learning'],
      platforms: ['Coursera', 'edX', 'Udacity']
    },
    {
      title: 'DevOps Engineer',
      keywords: ['docker', 'kubernetes', 'aws', 'ci/cd', 'linux', 'jenkins'],
      requiredSkills: ['docker', 'aws', 'linux'],
      platforms: ['AWS', 'Coursera', 'Linux Academy']
    }
  ];

  const roleAnalysis = roleTemplates.map(role => {
    const matchScore = calculateMatchScore(skills, experience, role);
    const skillGaps = identifySkillGaps(skills, role.requiredSkills);
    
    return {
      roleTitle: role.title,
      matchPercentage: matchScore,
      justification: generateJustification(skills, experience, education, role, matchScore),
      skillGaps: skillGaps.map(gap => ({
        gap: gap,
        suggestions: generateSuggestions(gap, role.platforms)
      }))
    };
  });

  // Sort by match percentage and return top 3-5
  return {
    roleAnalysis: roleAnalysis
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, 4)
  };
}

function extractSkills(resumeText) {
  const skillKeywords = [
    'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'mongodb',
    'docker', 'kubernetes', 'aws', 'azure', 'html', 'css', 'typescript',
    'vue', 'angular', 'express', 'django', 'flask', 'machine learning',
    'pandas', 'numpy', 'tensorflow', 'pytorch', 'git', 'jenkins',
    'linux', 'bash', 'api', 'rest', 'graphql', 'microservices',
    'ai', 'emotion detection', 'deep learning', 'computer vision',
    'natural language processing', 'c++', 'dbms', 'database'
  ];
  
  const lowerText = resumeText.toLowerCase();
  return skillKeywords.filter(skill => lowerText.includes(skill.toLowerCase()));
}

function extractExperience(resumeText) {
  // Simple experience extraction - look for years mentioned
  const yearMatches = resumeText.match(/(\d+)\s*(?:years?|yrs?)/gi);
  if (yearMatches) {
    const years = yearMatches.map(match => parseInt(match.match(/\d+/)[0]));
    return Math.max(...years);
  }
  return 0;
}

function extractEducation(resumeText) {
  const educationKeywords = ['bachelor', 'master', 'phd', 'degree', 'university', 'college'];
  return educationKeywords.some(keyword => resumeText.includes(keyword));
}

function calculateMatchScore(skills, experience, role) {
  let score = 0;
  
  // Skills match (60% weight)
  const skillMatches = skills.filter(skill => role.keywords.includes(skill)).length;
  const skillScore = (skillMatches / role.keywords.length) * 60;
  score += skillScore;
  
  // Experience bonus (20% weight)
  if (experience >= 3) score += 20;
  else if (experience >= 1) score += 10;
  
  // Required skills bonus (20% weight)
  const requiredMatches = skills.filter(skill => role.requiredSkills.includes(skill)).length;
  const requiredScore = (requiredMatches / role.requiredSkills.length) * 20;
  score += requiredScore;
  
  return Math.min(Math.round(score), 100);
}

function identifySkillGaps(skills, requiredSkills) {
  return requiredSkills.filter(skill => !skills.includes(skill));
}

function generateJustification(skills, experience, education, role, score) {
  const skillMatches = skills.filter(skill => role.keywords.includes(skill));
  
  if (score >= 80) {
    return `Strong match! You have ${skillMatches.length} relevant skills including ${skillMatches.slice(0, 3).join(', ')}. Your ${experience} years of experience and ${education ? 'educational background' : 'practical experience'} make you well-qualified for this role.`;
  } else if (score >= 60) {
    return `Good potential! You have ${skillMatches.length} relevant skills. With some additional training in missing areas, you could be an excellent candidate for this position.`;
  } else {
    return `While you have some relevant experience, you'll need to develop more skills specific to this role. Focus on the recommended courses and projects to improve your qualifications.`;
  }
}

function generateSuggestions(skillGap, platforms) {
  const suggestions = [];
  
  // Course suggestions
  suggestions.push({
    type: 'Course',
    title: `${skillGap.charAt(0).toUpperCase() + skillGap.slice(1)} Fundamentals`,
    platform: platforms[Math.floor(Math.random() * platforms.length)]
  });
  
  // Project suggestions
  suggestions.push({
    type: 'Project',
    title: `Build a ${skillGap} project on GitHub`,
    platform: 'GitHub'
  });
  
  return suggestions;
}
