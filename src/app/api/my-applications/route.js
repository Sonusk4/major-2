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
    if (!userData || userData.role !== 'developer') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Find all applications by this developer with project details
    const applications = await Application.find({ developer: userData.id })
      .populate({
        path: 'project',
        select: 'title createdBy',
        populate: { path: 'createdBy', select: 'name' }
      })
      .sort({ createdAt: -1 });

    // Normalize response
    const result = applications.map(app => ({
      id: app._id,
      status: app.status,
      appliedAt: app.appliedAt,
      project: {
        id: app.project?._id,
        title: app.project?.title || 'Untitled Project',
        cofounderName: app.project?.createdBy?.name || 'A Co-founder'
      }
    }));

    return NextResponse.json({ applications: result }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}