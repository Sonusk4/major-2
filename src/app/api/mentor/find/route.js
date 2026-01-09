import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Profile from '@/models/Profile';
import Mentorship from '@/models/Mentorship';
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

function computeLocationTier(mentee, mentor) {
  if (!mentee || !mentor) return 0;
  const stateMatch = mentee.state && mentor.state && mentee.state.toLowerCase() === mentor.state.toLowerCase();
  if (!stateMatch) return 0; // must match same state
  const districtMatch = mentee.district && mentor.district && mentee.district.toLowerCase() === mentor.district.toLowerCase();
  const collegeMatch = mentee.college && mentor.college && mentee.college.toLowerCase() === mentor.college.toLowerCase();
  if (stateMatch && districtMatch && collegeMatch) return 3; // state+district+college
  if (stateMatch && districtMatch) return 2; // state+district
  return 1; // state only
}

function jaccardOverlap(a = [], b = []) {
  const A = new Set((a || []).map(s => String(s).toLowerCase()));
  const B = new Set((b || []).map(s => String(s).toLowerCase()));
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

// Helper: Call OpenRouter API
async function callOpenRouter(prompt) {
  try {
    const response = await fetch(process.env.OPENROUTER_API_ENDPOINT || 'https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'amazon/nova-2-lite-v1:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (_e) {
    return null;
  }
}

export async function POST(request) {
  await dbConnect();
  try {
    const authUser = getDataFromToken(request);
    if (!authUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(authUser.id).select('role');
    if (!user || user.role !== 'developer') {
      return NextResponse.json({ message: 'Only developers can find mentors' }, { status: 403 });
    }

    const menteeProfile = await Profile.findOne({ user: authUser.id });
    if (!menteeProfile) {
      return NextResponse.json({ message: 'Profile not found for mentee' }, { status: 404 });
    }

    // Step 1: Ask Gemini (or OpenRouter) to derive matching preferences from mentee's profile
    const geminiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    let derived = {
      requiredSkills: [],
      preferSameCollege: true,
      preferSameDistrict: true,
      minExperienceYears: 1
    };
    
    if (geminiKey || openRouterKey) {
      try {
        const menteeSummary = `FullName: ${menteeProfile.fullName || ''}\nHeadline: ${menteeProfile.headline || ''}\nBio: ${menteeProfile.bio || ''}\nSkills: ${(Array.isArray(menteeProfile.skills) ? menteeProfile.skills : []).join(', ')}\nState: ${menteeProfile.state || menteeProfile.address?.state || ''}\nDistrict: ${menteeProfile.district || menteeProfile.address?.city || ''}\nCollege: ${menteeProfile.college || ''}`;
        const prompt = `From the following mentee profile, output JSON preferences for mentor matching. No prose, no markdown.
Use strictly this JSON schema: {"requiredSkills":string[],"preferSameCollege":boolean,"preferSameDistrict":boolean,"minExperienceYears":number}
Mentee Profile:\n${menteeSummary}`;
        
        let txt = null;
        
        // Try Gemini first
        if (geminiKey) {
          try {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const r = await model.generateContent(prompt);
            const txtFn = r?.response?.text;
            txt = typeof txtFn === 'function' ? txtFn() : txtFn;
          } catch (_e) {
            console.log('Gemini failed, trying OpenRouter...');
          }
        }
        
        // Fallback to OpenRouter if Gemini failed
        if (!txt && openRouterKey) {
          txt = await callOpenRouter(prompt);
        }
        
        if (txt) {
          const cleaned = String(txt || '').replace(/```json|```/gi, '').trim();
          const s = cleaned.indexOf('{');
          const e = cleaned.lastIndexOf('}');
          if (s !== -1 && e !== -1 && e > s) {
            const parsed = JSON.parse(cleaned.slice(s, e + 1));
            if (parsed && typeof parsed === 'object') {
              derived.requiredSkills = Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills.filter(Boolean) : [];
              derived.preferSameCollege = typeof parsed.preferSameCollege === 'boolean' ? parsed.preferSameCollege : derived.preferSameCollege;
              derived.preferSameDistrict = typeof parsed.preferSameDistrict === 'boolean' ? parsed.preferSameDistrict : derived.preferSameDistrict;
              const minYr = Number(parsed.minExperienceYears);
              derived.minExperienceYears = Number.isFinite(minYr) ? Math.max(1, Math.floor(minYr)) : 1;
            }
          }
        }
      } catch (_e) {
        // ignore AI extraction errors; keep defaults
      }
    }

    // Step 2: Build DB query using derived preferences
    const baseQuery = {
      user: { $ne: authUser.id },
      totalExperienceYears: { $gte: derived.minExperienceYears || 1 },
      willingToMentor: true,
    };

    // Mandatory: same state
    const menteeState = menteeProfile.state || menteeProfile.address?.state;
    if (menteeState) {
      baseQuery.state = menteeState;
    } else {
      return NextResponse.json({ message: 'Please set your state in profile to find a mentor.' }, { status: 400 });
    }

    // Optional pre-filtering by skills if Gemini suggested requiredSkills
    if (derived.requiredSkills && derived.requiredSkills.length > 0) {
      baseQuery.skills = { $in: derived.requiredSkills.map(s => new RegExp(`^${String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) };
    }

    // Exclude mentors that the mentee already has a pending or accepted mentorship with
    const existing = await Mentorship.find({ mentee: authUser.id, status: { $in: ['pending', 'accepted'] } }).select('mentor');
    const excludeIds = new Set(existing.map(m => String(m.mentor)));

    const potentialMentors = (await Profile.find(baseQuery).select('user skills village district state college totalExperienceYears willingToMentor headline'))
      .filter(p => !excludeIds.has(String(p.user)));
    if (!potentialMentors.length) {
      return NextResponse.json({ mentors: [], message: 'No mentors found in your state yet.' }, { status: 200 });
    }

    // Rank mentors: location tier first, then skills overlap, then AI score (if available)
    const menteeLoc = {
      village: menteeProfile.village,
      district: menteeProfile.district || menteeProfile.address?.city,
      state: menteeProfile.state || menteeProfile.address?.state,
      college: menteeProfile.college,
    };

    const menteeSkills = Array.isArray(menteeProfile.skills) ? menteeProfile.skills : [];

    const scored = potentialMentors.map(p => {
      const locTier = computeLocationTier(menteeLoc, { village: p.village, district: p.district, state: p.state, college: p.college });
      const overlap = jaccardOverlap(menteeSkills, p.skills || []);
      // Base deterministic score: location weight + skills overlap
      const deterministicScore = locTier * 60 + Math.round(overlap * 40);
      return { profile: p, locTier, overlap, deterministicScore, aiScore: null };
    });

    // If Gemini or OpenRouter key exists, refine scores with AI based on skills/summary
    if (geminiKey || openRouterKey) {
      try {
        const menteeSummary = `Skills: ${(menteeSkills || []).join(', ')}`;
        for (let i = 0; i < scored.length; i++) {
          const m = scored[i];
          const mentorSummary = `Skills: ${(m.profile.skills || []).join(', ')}` + (derived.requiredSkills?.length ? `\nFocus skills: ${derived.requiredSkills.join(', ')}` : '');
          const prompt = `Rate mentor suitability on a 0-100 scale considering skills.
Return JUST a number.
Mentee: ${menteeSummary}
Mentor: ${mentorSummary}`;
          try {
            let txt = null;
            
            // Try Gemini first
            if (geminiKey) {
              try {
                const genAI = new GoogleGenerativeAI(geminiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const result = await model.generateContent(prompt);
                const txtFn = result?.response?.text;
                txt = typeof txtFn === 'function' ? txtFn() : txtFn;
              } catch (_geminiErr) {
                console.log(`Gemini failed for mentor ${i}, trying OpenRouter...`);
              }
            }
            
            // Fallback to OpenRouter if Gemini failed
            if (!txt && openRouterKey) {
              txt = await callOpenRouter(prompt);
            }
            
            if (txt) {
              const num = Number(String(txt).match(/\d+/)?.[0] || '0');
              m.aiScore = Math.max(0, Math.min(100, num));
            } else {
              m.aiScore = null;
            }
          } catch (_e) {
            m.aiScore = null;
          }
        }
      } catch (_e) {
        // ignore outer AI errors entirely
      }
    }

    // Final composite score
    for (const item of scored) {
      const locationWeight = derived.preferSameCollege ? (item.locTier === 3 ? 1.2 : item.locTier === 2 && derived.preferSameDistrict ? 1.1 : 1.0) : (item.locTier >= 2 && derived.preferSameDistrict ? 1.1 : 1.0);
      const aiComponent = typeof item.aiScore === 'number' ? item.aiScore * 0.5 : 0; // weight AI if present
      const baseComponent = item.deterministicScore; // deterministic baseline
      item.finalScore = Math.round((baseComponent + aiComponent) * locationWeight);
    }

    // Sort by location tier desc, then final score desc
    scored.sort((a, b) => {
      if (b.locTier !== a.locTier) return b.locTier - a.locTier;
      return b.finalScore - a.finalScore;
    });

    // Prefer stricter match: state+district+college > state+district > state
    const bestTier = scored[0]?.locTier || 0;
    const bestMentors = scored.filter(s => s.locTier === bestTier).slice(0, 10);

    const response = bestMentors.map(s => ({
      user: s.profile.user,
      headline: s.profile.headline || '',
      skills: s.profile.skills || [],
      village: s.profile.village || '',
      district: s.profile.district || '',
      state: s.profile.state || '',
      college: s.profile.college || '',
      totalExperienceYears: s.profile.totalExperienceYears || 0,
      willingToMentor: !!s.profile.willingToMentor,
      locTier: s.locTier,
      overlap: s.overlap,
      aiScore: s.aiScore,
      finalScore: s.finalScore,
    }));

    return NextResponse.json({ mentors: response }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}


