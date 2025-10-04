import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Project from '@/models/Project';
import User from '@/models/User'; // We need this to check the user's role
import jwt from 'jsonwebtoken';

// Helper function to get and verify the token
const getDataFromToken = (request) => {
    try {
        const token = request.cookies.get('token')?.value || '';
        if (!token) {
            // For API testing, check authorization header
            const authHeader = request.headers.get('authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const headerToken = authHeader.substring(7, authHeader.length);
                const decodedToken = jwt.verify(headerToken, process.env.JWT_SECRET);
                return decodedToken;
            }
            return null;
        }
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        return decodedToken;
    } catch (error) {
        return null;
    }
};


// Function to handle POST requests (Create a new project)
export async function POST(request) {
    await dbConnect();

    try {
        const userData = getDataFromToken(request);
        if (!userData) {
            return NextResponse.json({ message: "Unauthorized access" }, { status: 401 });
        }

        // Ensure the user is a co-founder
        if (userData.role !== 'cofounder') {
            return NextResponse.json({ message: "Only co-founders can create projects" }, { status: 403 });
        }

        const { title, description, requiredSkills } = await request.json();

        const newProject = await Project.create({
            title,
            description,
            requiredSkills,
            createdBy: userData.id, // Link project to the logged-in co-founder
        });

        return NextResponse.json({ message: "Project created successfully", project: newProject }, { status: 201 });

    } catch (error) {
        return NextResponse.json({ message: 'Server error.', error: error.message }, { status: 500 });
    }
}


// Function to handle GET requests (Fetch all projects)
export async function GET(request) {
    await dbConnect();

    try {
        // This is a public route, anyone can see projects
        const projects = await Project.find({}).populate('createdBy', 'name'); // Populate author's name
        return NextResponse.json({ projects }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Server error.', error: error.message }, { status: 500 });
    }
}