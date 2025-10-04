import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Project from '@/models/Project';
import Profile from '@/models/Profile';
import Application from '@/models/Application';
import jwt from 'jsonwebtoken';

const getDataFromToken = (request) => {
  try {
    const authHeader = request.headers.get('authorization');
    console.log('Authorization header:', authHeader);
    
    const token = authHeader?.split(' ')[1] || '';
    console.log('Extracted token:', token ? 'Token exists' : 'No token');
    
    if (!token) return null;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('JWT decoded successfully:', { id: decoded.id, role: decoded.role, email: decoded.email });
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return null;
  }
};

export async function POST(request, { params }) {
  await dbConnect();
  try {
    const userData = getDataFromToken(request);
    console.log('JWT Token verification result:', userData);
    
    if (!userData || userData.role !== 'developer') {
      console.log('Authorization failed:', { userData, role: userData?.role });
      return NextResponse.json({ 
        message: "Unauthorized: Only developers can apply" 
      }, { status: 401 });
    }

    const { id: projectId } = await params;
    console.log('Project ID from params:', projectId);
    console.log('User ID from token:', userData.id);
    
    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ 
        message: "Project ID is required" 
      }, { status: 400 });
    }

    // Check if project exists
    const project = await Project.findById(projectId).populate('createdBy', 'name email');
    console.log('Project found:', project ? 'Yes' : 'No');
    if (!project) {
      return NextResponse.json({ 
        message: "Project not found" 
      }, { status: 404 });
    }

    // Check if developer has a profile
    const developerProfile = await Profile.findOne({ user: userData.id });
    console.log('Developer profile found:', developerProfile ? 'Yes' : 'No');
    if (!developerProfile) {
      return NextResponse.json({ 
        message: "Please complete your profile before applying" 
      }, { status: 400 });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      project: projectId,
      developer: userData.id
    });
    console.log('Existing application found:', existingApplication ? 'Yes' : 'No');

    if (existingApplication) {
      return NextResponse.json({ 
        message: "You have already applied to this project",
        applicationId: existingApplication._id,
        status: existingApplication.status
      }, { status: 400 });
    }

    // Create new application
    const application = new Application({
      project: projectId,
      developer: userData.id,
      developerProfile: developerProfile._id,
      status: 'pending'
    });

    console.log('Creating application with data:', {
      project: projectId,
      developer: userData.id,
      developerProfile: developerProfile._id,
      status: 'pending'
    });

    await application.save();
    console.log('Application saved successfully');

    // Add to project applicants array
    project.applicants.push(userData.id);
    await project.save();
    console.log('Project applicants updated');

    // Return success with application details
    return NextResponse.json({ 
      message: "Application submitted successfully!",
      applicationId: application._id,
      status: application.status,
      projectTitle: project.title,
      cofounderName: project?.createdBy?.name || 'Unknown',
      appliedAt: application.appliedAt
    }, { status: 200 });

  } catch (error) {
    console.error('Application error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ 
      message: "Server Error", 
      error: error.message 
    }, { status: 500 });
  }
}

// Get application status for a developer
export async function GET(request, { params }) {
  await dbConnect();
  try {
    const userData = getDataFromToken(request);
    if (!userData) {
      return NextResponse.json({ 
        message: "Unauthorized" 
      }, { status: 401 });
    }

    const { id: projectId } = await params;
    
    const application = await Application.findOne({
      project: projectId,
      developer: userData.id
    }).populate('project', 'title');

    if (!application) {
      return NextResponse.json({ 
        hasApplied: false 
      }, { status: 200 });
    }

    return NextResponse.json({ 
      hasApplied: true,
      applicationId: application._id,
      status: application.status,
      appliedAt: application.appliedAt,
      projectTitle: application.project.title
    }, { status: 200 });

  } catch (error) {
    console.error('Get application error:', error);
    return NextResponse.json({ 
      message: "Server Error" 
    }, { status: 500 });
  }
}
