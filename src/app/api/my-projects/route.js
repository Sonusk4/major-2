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

export async function GET(request) {
  await dbConnect();
  try {
    const userData = getDataFromToken(request);
    if (!userData || userData.role !== 'cofounder') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const projects = await Project.find({ createdBy: userData.id });

    // For each project, fetch applications and include developer info
    const projectsWithApplications = await Promise.all(
      projects.map(async (project) => {
        const applications = await Application.find({ project: project._id })
          .populate('developer', 'name email')
          .sort({ createdAt: -1 });

        const formattedApplications = applications.map(app => ({
          id: app._id,
          developer: {
            id: app.developer?._id,
            name: app.developer?.name,
            email: app.developer?.email
          },
          status: app.status,
          appliedAt: app.appliedAt,
          reviewedAt: app.reviewedAt || null
        }));

        return {
          _id: project._id,
          title: project.title,
          description: project.description,
          requiredSkills: project.requiredSkills,
          createdAt: project.createdAt,
          applications: formattedApplications,
        };
      })
    );

    return NextResponse.json({ projects: projectsWithApplications }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}