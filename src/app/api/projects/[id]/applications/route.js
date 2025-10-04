import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Project from '@/models/Project';
import Application from '@/models/Application';
import jwt from 'jsonwebtoken';

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
    if (!userData || userData.role !== 'cofounder') {
      return NextResponse.json({ 
        message: "Unauthorized: Only co-founders can view applications" 
      }, { status: 403 });
    }

    const { id: projectId } = await params;
    
    // Check if project exists and belongs to this co-founder
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ 
        message: "Project not found" 
      }, { status: 404 });
    }

    if (project.createdBy.toString() !== userData.id) {
      return NextResponse.json({ 
        message: "Unauthorized: You can only view applications for your own projects" 
      }, { status: 403 });
    }

    // Get all applications for this project with developer details
    const applications = await Application.find({ project: projectId })
      .populate('developer', 'name email role')
      .populate('developerProfile', 'headline bio skills parsedResumeText')
      .sort({ createdAt: -1 });

    // Format the response
    const formattedApplications = applications.map(app => ({
      id: app._id,
      developer: {
        id: app.developer._id,
        name: app.developer.name,
        email: app.developer.email,
        role: app.developer.role
      },
      profile: {
        headline: app.developerProfile?.headline || 'No headline',
        bio: app.developerProfile?.bio || 'No bio provided',
        skills: app.developerProfile?.skills || [],
        hasResume: !!app.developerProfile?.parsedResumeText,
        resumeLength: app.developerProfile?.parsedResumeText?.length || 0
      },
      status: app.status,
      appliedAt: app.appliedAt,
      reviewedAt: app.reviewedAt,
      cofounderNotes: app.cofounderNotes || '',
      developerNotes: app.developerNotes || ''
    }));

    return NextResponse.json({ 
      project: {
        id: project._id,
        title: project.title,
        description: project.description,
        requiredSkills: project.requiredSkills
      },
      applications: formattedApplications,
      totalApplications: formattedApplications.length,
      pendingApplications: formattedApplications.filter(app => app.status === 'pending').length
    }, { status: 200 });

  } catch (error) {
    console.error('Get applications error:', error);
    return NextResponse.json({ 
      message: "Server Error", 
      error: error.message 
    }, { status: 500 });
  }
}

// Update application status (accept/reject)
export async function PATCH(request, { params }) {
  await dbConnect();
  try {
    const userData = getDataFromToken(request);
    if (!userData || userData.role !== 'cofounder') {
      return NextResponse.json({ 
        message: "Unauthorized: Only co-founders can update applications" 
      }, { status: 403 });
    }

    const { id: projectId } = await params;
    const { applicationId, status, notes } = await request.json();
    
    if (!applicationId || !status) {
      return NextResponse.json({ 
        message: "Application ID and status are required" 
      }, { status: 400 });
    }

    if (!['accepted', 'rejected', 'reviewed'].includes(status)) {
      return NextResponse.json({ 
        message: "Invalid status. Must be 'accepted', 'rejected', or 'reviewed'" 
      }, { status: 400 });
    }

    // Check if project belongs to this co-founder
    const project = await Project.findById(projectId);
    if (!project || project.createdBy.toString() !== userData.id) {
      return NextResponse.json({ 
        message: "Unauthorized: You can only update applications for your own projects" 
      }, { status: 403 });
    }

    // Update the application
    const application = await Application.findByIdAndUpdate(
      applicationId,
      { 
        status, 
        cofounderNotes: notes || '',
        reviewedAt: new Date()
      },
      { new: true }
    ).populate('developer', 'name email');

    if (!application) {
      return NextResponse.json({ 
        message: "Application not found" 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: `Application ${status} successfully`,
      application: {
        id: application._id,
        developerName: application.developer.name,
        developerEmail: application.developer.email,
        status: application.status,
        reviewedAt: application.reviewedAt,
        cofounderNotes: application.cofounderNotes
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Update application error:', error);
    return NextResponse.json({ 
      message: "Server Error", 
      error: error.message 
    }, { status: 500 });
  }
}
