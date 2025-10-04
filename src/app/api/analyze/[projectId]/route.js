import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Profile from '@/models/Profile';
import Project from '@/models/Project';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY);

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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = params;

    const profile = await Profile.findOne({ user: userData.id });
    const project = await Project.findById(projectId);

    if (!profile || !profile.parsedResumeText) {
      return NextResponse.json({ message: "Resume not found. Please upload one first." }, { status: 404 });
    }
    if (!project) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    const prompt = `
      Analyze the following resume based on the job description for a "${project.title}".
      JOB DESCRIPTION: "${project.description}"
      Required Skills: ${project.requiredSkills.join(', ')}
      RESUME TEXT: "${profile.parsedResumeText}"
      Based on the analysis, provide a response in JSON format. The JSON object should have the following structure and nothing else:
      {
        "matchScore": <A number between 0 and 100>,
        "assessmentTitle": "<A short, encouraging title like 'Good Match'>",
        "executiveSummary": "<A 2-3 sentence professional summary>",
        "strengths": ["<A bullet point describing a strength.>"],
        "weaknesses": ["<A bullet point describing a weakness.>"],
        "missingKeywords": ["<An array of important missing keywords>"]
      }
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt + "\nReturn ONLY JSON. No prose, no code fences.");
    const respTextOrFn = result?.response?.text;
    const responseText = typeof respTextOrFn === 'function' ? respTextOrFn() : respTextOrFn;
    if (!responseText) {
      throw new Error('Empty Gemini response');
    }
    const cleaned = String(responseText).replace(/```json|```/gi, '').trim();
    const s = cleaned.indexOf('{');
    const e = cleaned.lastIndexOf('}');
    if (s === -1 || e === -1 || e <= s) {
      throw new Error('Gemini did not return JSON');
    }
    const jsonResponse = JSON.parse(cleaned.slice(s, e + 1));

    return NextResponse.json(jsonResponse, { status: 200 });
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ message: "An error occurred during AI analysis." }, { status: 500 });
  }
}