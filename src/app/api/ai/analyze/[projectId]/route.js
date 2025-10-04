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
    console.log('Profile data:', profile);
    console.log('Project found:', !!project);

    if (!profile) {
      return NextResponse.json({ message: "Profile not found. Please upload a resume first." }, { status: 404 });
    }
    // Build comprehensive resume text from profile data
    let resumeText = (profile.parsedResumeText || '').trim();
    
    // If parsed text is missing or just placeholder, build rich synthetic resume
    if (!resumeText || resumeText.includes('PDF uploaded') || resumeText.includes('manually enter')) {
      const headline = (profile.headline || '').trim();
      const bio = (profile.bio || '').trim();
      const skills = Array.isArray(profile.skills) ? profile.skills : [];
      const experience = Array.isArray(profile.experience) ? profile.experience : [];
      const education = Array.isArray(profile.education) ? profile.education : [];
      
      // Build structured resume content
      const sections = [];
      
      if (headline) sections.push(`PROFESSIONAL SUMMARY: ${headline}`);
      if (bio) sections.push(`ABOUT: ${bio}`);
      
      if (skills.length > 0) {
        sections.push(`TECHNICAL SKILLS: ${skills.join(', ')}`);
      }
      
      if (experience.length > 0) {
        sections.push('WORK EXPERIENCE:');
        experience.forEach((exp, idx) => {
          const title = exp.title || exp.position || 'Position';
          const company = exp.company || 'Company';
          const duration = exp.years || exp.duration || '';
          const desc = exp.description || '';
          sections.push(`${idx + 1}. ${title} at ${company}${duration ? ` (${duration})` : ''}${desc ? ` - ${desc}` : ''}`);
        });
      }
      
      if (education.length > 0) {
        sections.push('EDUCATION:');
        education.forEach((edu, idx) => {
          const degree = edu.degree || 'Degree';
          const field = edu.fieldOfStudy || edu.field || '';
          const school = edu.school || edu.institution || 'Institution';
          sections.push(`${idx + 1}. ${degree}${field ? ` in ${field}` : ''} from ${school}`);
        });
      }
      
      resumeText = sections.join('\n\n');
    }
    
    // Ensure we have some content to analyze
    if (!resumeText || resumeText.trim().length < 10) {
      return NextResponse.json({
        matchScore: 0,
        assessmentTitle: "Profile Incomplete",
        executiveSummary: "Please complete your profile with professional information, skills, and experience to enable analysis.",
        strengths: [],
        weaknesses: ["Profile information is incomplete or missing"],
        missingKeywords: requiredSkills,
        recommendedSkills: requiredSkills.slice(0, 5),
        suggestedCourses: []
      }, { status: 200 });
    }
    if (!project) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    const requiredSkills = Array.isArray(project.requiredSkills) ? project.requiredSkills.filter(Boolean) : [];

    // Heuristic baseline: compute overlap to avoid 0% when there are matches
    const normalizedResume = String(resumeText).toLowerCase();
    const tokenize = (s) => s.toLowerCase().replace(/[^a-z0-9+#.\-\s]/g, ' ').split(/\s+/).filter(Boolean);
    const resumeTokens = new Set(tokenize(normalizedResume));
    const normalizeSkill = (s) => String(s || '').toLowerCase().trim();
    const normalizedSkills = requiredSkills.map(normalizeSkill);
    // Synonym map to better match common variants
    const synonymMap = {
      'html': ['html', 'html5', 'hypertext markup language'],
      'css': ['css', 'css3', 'cascading style sheets', 'tailwind', 'bootstrap'],
      'javascript': ['javascript', 'js', 'es6', 'ecmascript'],
      'react': ['react', 'reactjs', 'next', 'nextjs'],
      'node': ['node', 'nodejs', 'express'],
      'dbms': ['dbms', 'database', 'databases', 'database management system', 'rdbms', 'sql', 'mysql', 'postgres', 'mongodb'],
      'sql': ['sql', 'structured query language', 'mysql', 'postgres', 'postgresql', 'sqlite', 'mssql'],
      'python': ['python', 'py'],
      'java': ['java', 'jdk', 'jre', 'spring', 'springboot'],
      'c++': ['c++', 'cpp', 'c plus plus'],
      'ai': ['ai', 'artificial intelligence'],
      'machine learning': ['machine learning', 'ml'],
      'deep learning': ['deep learning', 'dl'],
      'natural language processing': ['natural language processing', 'nlp']
    };
    const hasTokenOrSynonym = (skill) => {
      const base = normalizeSkill(skill);
      const variants = new Set([base, ...(synonymMap[base] || [])]);
      for (const v of variants) {
        if (resumeTokens.has(v)) return true;
        // also allow substring presence for terms like "database management"
        if (normalizedResume.includes(v)) return true;
      }
      // fallback: check each word of multi-word skill
      const parts = base.split(/\s+|[,/]/).filter(Boolean);
      if (parts.length > 1) {
        const allPresent = parts.every(p => resumeTokens.has(p) || normalizedResume.includes(p));
        if (allPresent) return true;
      }
      return false;
    };
    const matchedSkills = [];
    const unmatchedSkills = [];
    for (const sk of normalizedSkills) {
      if (hasTokenOrSynonym(sk)) matchedSkills.push(sk); else unmatchedSkills.push(sk);
    }
    const unique = (arr) => Array.from(new Set(arr.map(normalizeSkill)));
    const requiredMissing = unique(unmatchedSkills);
    const heuristicScore = normalizedSkills.length > 0 ? Math.round((matchedSkills.length / normalizedSkills.length) * 100) : 0;

    const prompt = `
      You are an evaluator. Use ONLY the project's Required Skills to assess the resume.
      - Take the resume text from the profile below.
      - Take the Required Skills from the project below.
      - Compare case-insensitively; allow common synonyms (e.g., html/html5, css/css3, dbms/database/sql, c++/cpp).
      - "missingKeywords" MUST contain ONLY items from Required Skills that are NOT present in the resume.
      - Do NOT add any skills that are not in Required Skills. Do NOT repeat items.
      - Return ONLY JSON with the exact keys specified. No prose. No code fences.

      PROJECT TITLE: "${project.title}"
      JOB DESCRIPTION: "${project.description}"
      REQUIRED SKILLS (authoritative list): ${requiredSkills.join(', ')}
      RESUME TEXT: "${resumeText}"

      JSON Shape:
      {
        "matchScore": <number 0-100>,
        "assessmentTitle": "<short title like 'Good Match'>",
        "executiveSummary": "<2-3 sentence summary>",
        "strengths": ["<strength bullet>", "<strength bullet>"],
        "weaknesses": ["<improvement bullet>", "<improvement bullet>"],
        "missingKeywords": ["<items from REQUIRED SKILLS absent from resume, no extras>"]
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
      console.error('Gemini call failed, using heuristic fallback. Reason:', geminiErr?.message || geminiErr);
      const jsonResponse = {
        matchScore: heuristicScore,
        assessmentTitle: "Analysis Available",
        executiveSummary: "Heuristic analysis based on keyword overlap. Detailed AI analysis was unavailable.",
        strengths: matchedSkills.length > 0 ? ["Some required skills found in resume"] : ["Could not confirm required skills"],
        weaknesses: unmatchedSkills.length ? ["Missing or unclear skills present in requirements"] : ["None detected by heuristic"],
        missingKeywords: unmatchedSkills,
        matchedSkills
      };
      // Enrich with recommended skills and courses similarly to the AI path
      try {
        const { recommendedSkills, suggestedCourses } = getCourseRecommendations(unmatchedSkills);
        jsonResponse.recommendedSkills = recommendedSkills;
        jsonResponse.suggestedCourses = suggestedCourses;
      } catch (_) {}

      return NextResponse.json(jsonResponse, { status: 200 });
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
        executiveSummary: "Heuristic analysis based on keyword overlap. Detailed AI analysis was unavailable.",
        strengths: matchedSkills.length > 0 ? ["Some required skills found in resume"] : ["Could not confirm required skills"],
        weaknesses: unmatchedSkills.length ? ["Missing or unclear skills present in requirements"] : ["None detected by heuristic"],
        missingKeywords: unmatchedSkills
      };
    }

    // Reconcile AI result with heuristic to avoid false 0% and false misses
    try {
      const aiMissing = Array.isArray(jsonResponse.missingKeywords) ? jsonResponse.missingKeywords.map(normalizeSkill) : [];
      // Only consider required skills as missing; drop anything already present in resume
      const filteredMissing = requiredMissing.filter(k => !hasTokenOrSynonym(k));
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