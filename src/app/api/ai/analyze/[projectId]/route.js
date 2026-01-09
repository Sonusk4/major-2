import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Profile from '@/models/Profile';
import Project from '@/models/Project';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Support either env var name; many setups define GEMINI_API_KEY
const GEMINI_KEY = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID || "gemini-1.5-flash-latest";
const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;

// Map missing skills to high-quality free course links (YouTube-first) and a few platform links
function getCourseRecommendations(missingSkillsInput) {
  const normalize = (s) => String(s || '').toLowerCase().trim();
  const missing = Array.from(new Set((missingSkillsInput || []).map(normalize))).filter(Boolean);
  const catalog = {
    html: [
      { title: 'HTML Full Course - 4 Hours', url: 'https://www.youtube.com/watch?v=pQN-pnXPaVg' },
      { title: 'HTML Crash Course', url: 'https://www.youtube.com/watch?v=UB1O30fR-EE' },
      { title: 'MDN Web Docs - HTML', url: 'https://developer.mozilla.org/en-US/docs/Learn/HTML' }
    ],
    css: [
      { title: 'CSS Tutorial - Full Course', url: 'https://www.youtube.com/watch?v=OXGznpKZ_sA' },
      { title: 'Flexbox + Grid in 100 mins', url: 'https://www.youtube.com/watch?v=0xMQfnTU6oo' },
      { title: 'MDN Web Docs - CSS', url: 'https://developer.mozilla.org/en-US/docs/Learn/CSS' }
    ],
    tailwind: [
      { title: 'Tailwind CSS Crash Course', url: 'https://www.youtube.com/watch?v=UBOj6rqRUME' },
      { title: 'Tailwind Docs - Get Started', url: 'https://tailwindcss.com/docs/installation' }
    ],
    javascript: [
      { title: 'JavaScript Full Course (freeCodeCamp)', url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg' },
      { title: 'Modern JS in 1 Video', url: 'https://www.youtube.com/watch?v=WZQc7RUAg18' },
      { title: 'Eloquent JavaScript (book)', url: 'https://eloquentjavascript.net/' }
    ],
    typescript: [
      { title: 'TypeScript Crash Course', url: 'https://www.youtube.com/watch?v=30LWjhZzg50' },
      { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html' }
    ],
    react: [
      { title: 'React Course - Beginner to Advanced', url: 'https://www.youtube.com/watch?v=bMknfKXIFA8' },
      { title: 'React Tutorial for Beginners', url: 'https://www.youtube.com/watch?v=DLX62G4lc44' },
      { title: 'React Docs - Learn', url: 'https://react.dev/learn' }
    ],
    next: [
      { title: 'Next.js 14 Tutorial', url: 'https://www.youtube.com/watch?v=GhQdlIFylQ8' },
      { title: 'Next.js Docs - Learn', url: 'https://nextjs.org/learn' }
    ],
    node: [
      { title: 'Node.js Crash Course', url: 'https://www.youtube.com/watch?v=f2EqECiTBL8' },
      { title: 'Node.js Docs', url: 'https://nodejs.org/en/learn' }
    ],
    express: [
      { title: 'Express.js Crash Course', url: 'https://www.youtube.com/watch?v=SccSCuHhOw0' },
      { title: 'Express Docs - Guide', url: 'https://expressjs.com/en/guide/routing.html' }
    ],
    sql: [
      { title: 'SQL Full Course for Beginners', url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY' },
      { title: 'SQL Joins Tutorial', url: 'https://www.youtube.com/watch?v=9yeOJ0ZMUYw' }
    ],
    dbms: [
      { title: 'DBMS Full Course', url: 'https://www.youtube.com/watch?v=IN6Zl7m7Qjo' },
      { title: 'Database Design Tutorial', url: 'https://www.youtube.com/watch?v=ztHopE5Wnpc' }
    ],
    mongodb: [
      { title: 'MongoDB Crash Course', url: 'https://www.youtube.com/watch?v=-56x56UppqQ' },
      { title: 'MongoDB University - Basics', url: 'https://learn.mongodb.com/' }
    ],
    postgres: [
      { title: 'PostgreSQL Tutorial', url: 'https://www.youtube.com/watch?v=qw--VYLpxG4' },
      { title: 'Postgres Official Docs', url: 'https://www.postgresql.org/docs/' }
    ],
    python: [
      { title: 'Python Full Course', url: 'https://www.youtube.com/watch?v=rfscVS0vtbw' },
      { title: 'Python for Data Science', url: 'https://www.youtube.com/watch?v=LHBE6Q9XlzI' }
    ],
    java: [
      { title: 'Java Full Course', url: 'https://www.youtube.com/watch?v=eIrMbAQSU34' },
      { title: 'Spring Boot Crash Course', url: 'https://www.youtube.com/watch?v=9SGDpanrc8U' }
    ],
    'c++': [
      { title: 'C++ Full Course', url: 'https://www.youtube.com/watch?v=vLnPwxZdW4Y' }
    ],
    git: [
      { title: 'Git & GitHub Full Course', url: 'https://www.youtube.com/watch?v=RGOj5yH7evk' }
    ],
    docker: [
      { title: 'Docker Tutorial for Beginners', url: 'https://www.youtube.com/watch?v=pTFZFxd4hOI' }
    ],
    kubernetes: [
      { title: 'Kubernetes Crash Course', url: 'https://www.youtube.com/watch?v=X48VuDVv0do' }
    ],
    aws: [
      { title: 'AWS for Beginners', url: 'https://www.youtube.com/watch?v=ulprqHHWlng' }
    ],
    linux: [
      { title: 'Linux Crash Course', url: 'https://www.youtube.com/watch?v=iwolPf6kN-k' }
    ],
    'machine learning': [
      { title: 'Machine Learning - Full Course', url: 'https://www.youtube.com/watch?v=GwIo3gDZCVQ' },
      { title: 'fast.ai Practical Deep Learning', url: 'https://course.fast.ai/' }
    ],
    'deep learning': [
      { title: 'Deep Learning - Full Course', url: 'https://www.youtube.com/watch?v=8mAITcNt710' },
      { title: 'DeepLearning.AI Courses', url: 'https://www.deeplearning.ai/courses/' }
    ],
    nlp: [
      { title: 'NLP Course', url: 'https://www.youtube.com/watch?v=8rXD5-xhemo' }
    ]
  };

  const suggestions = [];
  for (const raw of missing) {
    const base = normalize(raw);
    const key = catalog[base]
      ? base
      : base.includes('react') ? 'react'
      : base.includes('next') ? 'next'
      : base.includes('node') ? 'node'
      : base.includes('express') ? 'express'
      : base.includes('sql') ? 'sql'
      : base.includes('db') ? 'dbms'
      : base.includes('nlp') ? 'nlp'
      : base;
    if (catalog[key]) {
      catalog[key].forEach(c => suggestions.push({ topic: raw, title: c.title, url: c.url }));
    }
  }
  return { recommendedSkills: missing.slice(0, 8), suggestedCourses: suggestions.slice(0, 24) };
}

const getDataFromToken = (request) => {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1] || '';
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export async function GET(request, { params }) {
  await dbConnect();
  try {
    const userData = getDataFromToken(request);
    if (!userData) {
      return NextResponse.json({ 
        message: "Unauthorized" 
      }, { status: 401 });
    }

    const { projectId } = await params;

    const profile = await Profile.findOne({ user: userData.id });
    const project = await Project.findById(projectId);

    console.log('User ID:', userData.id);
    console.log('Profile found:', !!profile);
    console.log('Project found:', !!project);

    if (!profile) {
      return NextResponse.json({ message: "Profile not found. Please complete your profile first." }, { status: 404 });
    }

    if (!project) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    // Get skills from user's profile
    const userSkills = Array.isArray(profile.skills) ? profile.skills : [];
    if (userSkills.length === 0) {
      return NextResponse.json({
        matchScore: 0,
        assessmentTitle: "No Skills in Profile",
        executiveSummary: "Please add skills to your profile to enable skill match analysis.",
        strengths: [],
        weaknesses: ["No skills found in your profile"],
        missingKeywords: project.requiredSkills || [],
        recommendedSkills: (project.requiredSkills || []).slice(0, 5),
        suggestedCourses: []
      }, { status: 200 });
    }

    const requiredSkills = Array.isArray(project.requiredSkills) ? project.requiredSkills.filter(Boolean) : [];
    if (requiredSkills.length === 0) {
      return NextResponse.json({
        matchScore: 100,
        assessmentTitle: "No Requirements Specified",
        executiveSummary: "This project has no specific skill requirements defined.",
        strengths: userSkills,
        weaknesses: [],
        missingKeywords: [],
        recommendedSkills: [],
        suggestedCourses: []
      }, { status: 200 });
    }

    // Normalize and match profile skills with required skills
    const normalizeSkill = (s) => String(s || '').toLowerCase().trim();
    const userSkillsNorm = new Set(userSkills.map(normalizeSkill));
    const requiredNorm = requiredSkills.map(normalizeSkill);
    
    // Synonym map for better matching
    const synonymMap = {
      'html': ['html', 'html5', 'hypertext markup language'],
      'css': ['css', 'css3', 'cascading style sheets', 'tailwind', 'bootstrap'],
      'javascript': ['javascript', 'js', 'es6', 'ecmascript'],
      'react': ['react', 'reactjs', 'next', 'nextjs'],
      'node': ['node', 'nodejs', 'express'],
      'dbms': ['dbms', 'database', 'databases', 'database management system', 'rdbms', 'sql', 'mysql', 'postgres', 'postgresql', 'mongodb'],
      'sql': ['sql', 'structured query language', 'mysql', 'postgres', 'postgresql', 'sqlite', 'mssql'],
      'python': ['python', 'py'],
      'java': ['java', 'jdk', 'jre', 'spring', 'springboot'],
      'c++': ['c++', 'cpp', 'c plus plus'],
      'ai': ['ai', 'artificial intelligence'],
      'machine learning': ['machine learning', 'ml'],
      'deep learning': ['deep learning', 'dl'],
      'natural language processing': ['natural language processing', 'nlp']
    };

    // Check if a required skill is present in user's skills
    const hasSkillOrSynonym = (requiredSkill) => {
      const base = normalizeSkill(requiredSkill);
      if (userSkillsNorm.has(base)) return true;
      
      // Check synonyms
      const variants = synonymMap[base] || [];
      for (const variant of variants) {
        if (userSkillsNorm.has(variant)) return true;
      }
      
      // Check if any user skill includes or matches the required skill
      for (const userSkill of userSkillsNorm) {
        if (userSkill.includes(base) || base.includes(userSkill)) return true;
      }
      
      return false;
    };

    const matchedSkills = [];
    const unmatchedSkills = [];
    for (const req of requiredSkills) {
      if (hasSkillOrSynonym(req)) {
        matchedSkills.push(req);
      } else {
        unmatchedSkills.push(req);
      }
    }

    const heuristicScore = requiredNorm.length > 0 ? Math.round((matchedSkills.length / requiredSkills.length) * 100) : 0;

    const prompt = `
      You are an expert recruiter analyzing a developer's profile skills against project requirements.
      - User's Skills from profile: ${userSkills.join(', ')}
      - Required Skills for project: ${requiredSkills.join(', ')}
      - Compare case-insensitively; allow common synonyms (e.g., html/html5, css/css3, dbms/database/sql).
      - "missingKeywords" MUST contain ONLY items from REQUIRED SKILLS that are NOT in user's profile skills.
      - Do NOT add any skills that are not in Required Skills. Do NOT repeat items.
      - Return ONLY JSON with the exact keys specified. No prose. No code fences.

      PROJECT TITLE: "${project.title}"
      JOB DESCRIPTION: "${project.description}"
      REQUIRED SKILLS (authoritative list): ${requiredSkills.join(', ')}
      USER SKILLS (from profile): ${userSkills.join(', ')}

      JSON Shape:
      {
        "matchScore": <number 0-100>,
        "assessmentTitle": "<short title like 'Good Match'>",
        "executiveSummary": "<2-3 sentence summary>",
        "strengths": ["<strength bullet>", "<strength bullet>"],
        "weaknesses": ["<improvement bullet>", "<improvement bullet>"],
        "missingKeywords": ["<items from REQUIRED SKILLS absent from user profile, no extras>"]
      }
    `;

    let responseText = '';
    try {
      if (!genAI) {
        throw new Error('Missing GOOGLE_GENAI_API_KEY/GEMINI_API_KEY');
      }
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_ID });
      const result = await model.generateContent(prompt);
      responseText = await result.response.text();
    } catch (geminiErr) {
      console.error('Gemini call failed, trying OpenRouter. Reason:', geminiErr?.message || geminiErr);
      try {
        responseText = await analyzeWithOpenRouter(prompt);
      } catch (openRouterErr) {
        console.error('OpenRouter call failed, using heuristic fallback. Reason:', openRouterErr?.message || openRouterErr);
        const jsonResponse = {
          matchScore: heuristicScore,
          assessmentTitle: "Analysis Available",
          executiveSummary: `Heuristic analysis: You have ${matchedSkills.length} of ${requiredSkills.length} required skills.`,
          strengths: matchedSkills.length > 0 ? matchedSkills : ["Skills comparison available"],
          weaknesses: unmatchedSkills.length > 0 ? unmatchedSkills : ["None detected"],
          missingKeywords: unmatchedSkills
        };
        // Enrich with recommended skills and courses similarly to the AI path
        try {
          const { recommendedSkills, suggestedCourses } = getCourseRecommendations(unmatchedSkills);
          jsonResponse.recommendedSkills = recommendedSkills;
          jsonResponse.suggestedCourses = suggestedCourses;
        } catch (_) {}

        return NextResponse.json(jsonResponse, { status: 200 });
      }
    }
    
    // Clean and parse JSON response
    let jsonResponse;
    try {
      const cleanedText = responseText.replace(/```json|```/gi, '').trim();
      const startIdx = cleanedText.indexOf('{');
      const endIdx = cleanedText.lastIndexOf('}');
      
      if (startIdx === -1 || endIdx === -1) {
        throw new Error('No valid JSON found in response');
      }
      
      const jsonString = cleanedText.slice(startIdx, endIdx + 1);
      jsonResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw response:', responseText);
      
      // Fallback response
      jsonResponse = {
        matchScore: heuristicScore,
        assessmentTitle: "Analysis Available",
        executiveSummary: `Heuristic analysis: You have ${matchedSkills.length} of ${requiredSkills.length} required skills.`,
        strengths: matchedSkills.length > 0 ? matchedSkills : ["Skills comparison available"],
        weaknesses: unmatchedSkills.length > 0 ? unmatchedSkills : ["None detected"],
        missingKeywords: unmatchedSkills
      };
    }

    // Reconcile AI result with heuristic to avoid false misses
    try {
      const aiMissing = Array.isArray(jsonResponse.missingKeywords) ? jsonResponse.missingKeywords.map(normalizeSkill) : [];
      // Only consider required skills as missing that are actually not in user's profile
      const filteredMissing = unmatchedSkills;
      const finalMissing = Array.from(new Set(filteredMissing));
      // Prefer deterministic overlap score; cap at 100
      const aiScore = typeof jsonResponse.matchScore === 'number' ? Math.min(100, Math.max(0, Math.round(jsonResponse.matchScore))) : 0;
      const finalScore = Math.max(heuristicScore, aiScore);
      jsonResponse.matchScore = finalScore;
      jsonResponse.missingKeywords = finalMissing;
      jsonResponse.matchedSkills = matchedSkills;
      if (finalScore >= 70 && (!jsonResponse.assessmentTitle || /further information needed/i.test(jsonResponse.assessmentTitle))) {
        jsonResponse.assessmentTitle = 'Good Match';
      }
      // Add recommended skills and YouTube courses
      const { recommendedSkills, suggestedCourses } = getCourseRecommendations(finalMissing);
      jsonResponse.recommendedSkills = recommendedSkills;
      jsonResponse.suggestedCourses = suggestedCourses; // richer list
    } catch (_) {}

    return NextResponse.json(jsonResponse, { status: 200 });
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json({ 
      message: "An error occurred during AI analysis.",
      error: error.message 
    }, { status: 500 });
  }
}

async function analyzeWithOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  const apiEndpoint = process.env.OPENROUTER_API_ENDPOINT || 'https://openrouter.ai/api/v1/chat/completions';
  const modelId = process.env.OPENROUTER_MODEL || 'amazon/nova-2-lite-v1:free';

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

    return text;
  } catch (error) {
    console.error('OpenRouter fetch error:', error);
    throw error;
  }
}