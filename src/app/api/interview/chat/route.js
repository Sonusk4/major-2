import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/dbConnect';
import User from '@/models/User';
import Profile from '@/models/Profile';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
  try {
    await dbConnect();
    
    const { resumeText, targetRole, conversationHistory } = await request.json();
    
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

    if (!conversationHistory || conversationHistory.length === 0) {
      return NextResponse.json({ message: 'Conversation history is required' }, { status: 400 });
    }

    // Synthesize resume text from Profile if not provided
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

    // Get the last user message
    const lastUserMessage = conversationHistory[conversationHistory.length - 1];
    if (lastUserMessage.role !== 'user') {
      return NextResponse.json({ message: 'Last message must be from user' }, { status: 400 });
    }

    // Check how many assistant questions have been asked
    const questionsAsked = countAssistantTurns(conversationHistory);

    // Generate AVA's response via Gemini with strict JSON evaluation
    const avaResponse = await generateAvaResponse(
      textForInterview, 
      targetRole, 
      conversationHistory,
      lastUserMessage.content,
      questionsAsked
    );

    return NextResponse.json({ message: avaResponse });
  } catch (error) {
    console.error('Interview chat error:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

async function generateAvaResponse(resumeText, targetRole, conversationHistory, userMessage, questionsAsked) {
  try {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Missing GOOGLE_GENAI_API_KEY');
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelId = process.env.GEMINI_MODEL_ID || 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ model: modelId });

    // If 10 questions are done (assistant turns), return final feedback
    if (questionsAsked >= 10) {
      return await generateFinalFeedback(model, resumeText, targetRole, conversationHistory);
    }

    const system = `You are AVA, a rigorous technical interviewer. Evaluate the candidate's last answer briefly and ask exactly one next question tailored to their resume and the target role. Be concise.`;
    const schema = `{"message": string, "evaluation": {"correctness": "correct"|"partially_correct"|"incorrect", "reason": string}}`;
    const prompt = `${system}\nTarget role: ${targetRole}\nResume: ${resumeText}\nConversation so far: ${JSON.stringify(conversationHistory).slice(0, 6000)}\nUser answer: ${userMessage}\nReturn ONLY JSON in this schema: ${schema}`;

    const result = await model.generateContent(prompt + "\nReturn ONLY JSON. No prose, no code fences.");
    const respTextOrFn = result?.response?.text;
    const text = typeof respTextOrFn === 'function' ? respTextOrFn() : respTextOrFn;
    let data;
    try {
      data = JSON.parse(String(text).replace(/```json|```/g, '').trim());
    } catch (_) {
      // fallback: heuristic follow-up
      const conversationLength = conversationHistory.length;
      if (conversationLength <= 3) return generateTechnicalFollowUp(userMessage, resumeText, targetRole);
      if (conversationLength <= 6) return generateMixedQuestion(userMessage, resumeText, targetRole);
      return generateBehavioralQuestion(userMessage, resumeText, targetRole);
    }
    const msg = String(data?.message || '').trim();
    const correctness = data?.evaluation?.correctness;
    const reason = data?.evaluation?.reason;
    const prefix = correctness ? `[${correctness.toUpperCase()}] ${reason ? reason + ' ' : ''}` : '';
    return `${prefix}${msg || 'Let us dive deeper. Can you provide more specifics?'}`;
  } catch (err) {
    const conversationLength = conversationHistory.length;
    if (questionsAsked >= 10) return generateFallbackFinalFeedback(resumeText, targetRole, conversationHistory);
    if (conversationLength <= 3) return generateTechnicalFollowUp(userMessage, resumeText, targetRole);
    if (conversationLength <= 6) return generateMixedQuestion(userMessage, resumeText, targetRole);
    return generateBehavioralQuestion(userMessage, resumeText, targetRole);
  }
}

async function generateAvaResponseWithOpenRouter(resumeText, targetRole, conversationHistory, userMessage, questionsAsked) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'amazon/nova-2-lite-v1:free';
  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  // If 10 questions are done (assistant turns), return final feedback
  if (questionsAsked >= 10) {
    const feedbackPrompt = `You are AVA, a rigorous technical interviewer. The interview has completed after ${questionsAsked} questions.
Provide concise final feedback on the candidate's performance for the "${targetRole}" role based on the resume and conversation.
Return ONLY JSON: {"feedback": string, "score": number (0-100), "strengths": string[], "improvements": string[]}
Resume: ${resumeText}
Conversation: ${JSON.stringify(conversationHistory).slice(0, 5000)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: feedbackPrompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';
    try {
      const parsed = JSON.parse(String(text).replace(/```json|```/g, '').trim());
      return `FINAL FEEDBACK: ${parsed.feedback} (Score: ${parsed.score}/100)`;
    } catch (_) {
      return `Interview complete. Feedback: ${text}`;
    }
  }

  const system = `You are AVA, a rigorous technical interviewer. Evaluate the candidate's last answer briefly and ask exactly one next question tailored to their resume and the target role. Be concise.`;
  const prompt = `${system}\nTarget role: ${targetRole}\nResume: ${resumeText}\nConversation so far: ${JSON.stringify(conversationHistory).slice(0, 6000)}\nUser answer: ${userMessage}\nReturn ONLY JSON: {"message": string, "evaluation": {"correctness": "correct"|"partially_correct"|"incorrect", "reason": string}}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  
  try {
    const parsed = JSON.parse(String(text).replace(/```json|```/g, '').trim());
    const msg = String(parsed?.message || '').trim();
    const correctness = parsed?.evaluation?.correctness;
    const reason = parsed?.evaluation?.reason;
    const prefix = correctness ? `[${correctness.toUpperCase()}] ${reason ? reason + ' ' : ''}` : '';
    return `${prefix}${msg || 'Let us dive deeper. Can you provide more specifics?'}`;
  } catch (_) {
    // Fallback to heuristic
    const conversationLength = conversationHistory.length;
    if (conversationLength <= 3) return generateTechnicalFollowUp(userMessage, resumeText, targetRole);
    if (conversationLength <= 6) return generateMixedQuestion(userMessage, resumeText, targetRole);
    return generateBehavioralQuestion(userMessage, resumeText, targetRole);
  }
}

function generateTechnicalFollowUp(userMessage, resumeText, targetRole) {
  const lowerMessage = userMessage.toLowerCase();
  const skills = extractSkillsFromResume(resumeText);
  
  // Check what the user mentioned in their response
  if (lowerMessage.includes('optimiz') || lowerMessage.includes('performance')) {
    return "That's interesting! When you mention optimization, what specific metrics did you use to measure the improvement? And what tools or techniques did you employ for monitoring performance?";
  }
  
  if (lowerMessage.includes('database') || lowerMessage.includes('sql') || lowerMessage.includes('mongodb')) {
    return "Great! Database work is crucial. Could you walk me through your database design decisions? What considerations did you make regarding scalability and data integrity?";
  }
  
  if (lowerMessage.includes('api') || lowerMessage.includes('rest') || lowerMessage.includes('endpoint')) {
    return "Excellent! API development is a key skill. How did you handle error handling and authentication in your API? What was your approach to API documentation?";
  }
  
  if (lowerMessage.includes('frontend') || lowerMessage.includes('ui') || lowerMessage.includes('user interface')) {
    return "That's great! User experience is so important. How did you approach responsive design and accessibility? What was your process for gathering user feedback?";
  }
  
  // Default technical follow-up
  const primarySkill = skills[0] || 'technology';
  return `Thanks for sharing that! I'd like to dive deeper into your ${primarySkill} experience. Can you tell me about a specific challenge you encountered while working with ${primarySkill} and how you debugged or resolved it?`;
}

function generateMixedQuestion(userMessage, resumeText, targetRole) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Check for team collaboration mentions
  if (lowerMessage.includes('team') || lowerMessage.includes('collaborat') || lowerMessage.includes('work with')) {
    return "That sounds like a great team experience! Can you tell me about a time when you had a disagreement with a team member on a technical decision? How did you handle it and what was the outcome?";
  }
  
  // Check for problem-solving mentions
  if (lowerMessage.includes('problem') || lowerMessage.includes('challenge') || lowerMessage.includes('issue')) {
    return "Problem-solving is a crucial skill. What's your typical approach when you encounter a bug or issue you've never seen before? Walk me through your debugging process.";
  }
  
  // Check for learning mentions
  if (lowerMessage.includes('learn') || lowerMessage.includes('new') || lowerMessage.includes('first time')) {
    return "Learning new technologies is essential in our field. How do you typically approach learning a new framework or technology? What resources do you find most helpful?";
  }
  
  // Default mixed question
  return "That's really insightful! Now, let me ask you a situational question: If you were given a project with an unclear scope and tight deadline, how would you approach it? What steps would you take to ensure success?";
}

function generateBehavioralQuestion(userMessage, resumeText, targetRole) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Check for leadership or mentoring mentions
  if (lowerMessage.includes('lead') || lowerMessage.includes('mentor') || lowerMessage.includes('guide')) {
    return "Leadership experience is valuable! Can you tell me about a time when you had to mentor a junior developer? What was the most challenging aspect and how did you help them grow?";
  }
  
  // Check for failure or mistake mentions
  if (lowerMessage.includes('fail') || lowerMessage.includes('mistake') || lowerMessage.includes('wrong')) {
    return "It's important to learn from mistakes. What's the most significant technical mistake you've made in your career? How did you handle it and what did you learn from it?";
  }
  
  // Check for success or achievement mentions
  if (lowerMessage.includes('success') || lowerMessage.includes('achieve') || lowerMessage.includes('proud')) {
    return "That's an impressive achievement! What do you think contributed most to that success? And how do you think that experience has prepared you for the challenges you might face in a ${targetRole} role?";
  }
  
  // Default behavioral questions
  const behavioralQuestions = [
    "Great conversation so far! Let me ask you about your career goals: Where do you see yourself in 3-5 years, and how does this ${targetRole} position align with those goals?",
    "Excellent! One final question: What's your approach to staying updated with the latest technologies and industry trends? How do you ensure you're continuously learning and growing?",
    "That's very insightful! As we wrap up, can you tell me about a time when you had to work with a difficult stakeholder or client? How did you manage the relationship and ensure project success?"
  ];
  
  return behavioralQuestions[Math.floor(Math.random() * behavioralQuestions.length)];
}

function countAssistantTurns(history) {
  return (history || []).filter(m => m.role === 'assistant').length;
}

async function generateFinalFeedback(model, resumeText, targetRole, conversationHistory) {
  const schema = `{"summary": string, "strengths": string[], "improvements": string[], "nextSteps": string[]}`;
  const prompt = `You are AVA, an interview coach. The mock interview for the role "${targetRole}" is complete. Based on the conversation, write:
  - A concise overall summary (2-3 sentences)
  - 3-5 strengths (bullet phrases)
  - 3-5 improvements (bullet phrases)
  - 3-5 next steps (courses, practice topics)
  Return ONLY JSON in this schema: ${schema}

  Resume (for context):\n${resumeText}
  Conversation (truncated JSON):\n${JSON.stringify(conversationHistory).slice(0, 12000)}`;

  try {
    const result = await model.generateContent(prompt + "\nReturn ONLY JSON. No prose, no code fences.");
    const textFn = result?.response?.text;
    const raw = typeof textFn === 'function' ? textFn() : textFn;
    const json = JSON.parse(String(raw).replace(/```json|```/g, '').trim());
    const strengths = (json.strengths || []).map(s => `• ${s}`).join('\n');
    const improvements = (json.improvements || []).map(s => `• ${s}`).join('\n');
    const nextSteps = (json.nextSteps || []).map(s => `• ${s}`).join('\n');
    return `Thanks for completing the interview!\n\nSummary:\n${json.summary}\n\nStrengths:\n${strengths}\n\nImprovements:\n${improvements}\n\nNext steps:\n${nextSteps}`;
  } catch (_) {
    return generateFallbackFinalFeedback(resumeText, targetRole, conversationHistory);
  }
}

function generateFallbackFinalFeedback(resumeText, targetRole, conversationHistory) {
  const lower = (JSON.stringify(conversationHistory) || '').toLowerCase();
  const strengths = [];
  if (lower.includes('react')) strengths.push('Strong React experience');
  if (lower.includes('api')) strengths.push('Clear API design communication');
  if (lower.includes('optimiz')) strengths.push('Performance awareness');
  if (strengths.length === 0) strengths.push('Communicated ideas clearly');
  const improvements = [
    'Add measurable outcomes to examples (metrics, impact)',
    'Deepen knowledge of data structures/algorithms for role-specific rounds',
    'Practice STAR format for behavioral answers'
  ];
  const nextSteps = [
    'Build a small project aligned with the target role and publish on GitHub',
    'Review system design basics (APIs, data modeling, scaling) if role is backend/fullstack',
    'Do 2-3 more mock interviews and refine concise answers'
  ];
  return `Thanks for completing the interview!\n\nSummary:\nGood session for ${targetRole}. You demonstrated core understanding and communication.\n\nStrengths:\n${strengths.map(s=>`• ${s}`).join('\n')}\n\nImprovements:\n${improvements.map(s=>`• ${s}`).join('\n')}\n\nNext steps:\n${nextSteps.map(s=>`• ${s}`).join('\n')}`;
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
