import mongoose from 'mongoose';

const ExperienceSchema = new mongoose.Schema({
  title: String,
  company: String,
  years: String,
});

const EducationSchema = new mongoose.Schema({
  school: String,
  degree: String,
  fieldOfStudy: String,
});

const ProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Personal Information
  fullName: {
    type: String,
    required: [true, 'Full name is required.'],
  },
  age: {
    type: Number,
    min: [16, 'Age must be at least 16'],
    max: [100, 'Age must be less than 100'],
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  // Location fields for mentor matching
  village: { type: String },
  district: { type: String },
  state: { type: String },
  college: { type: String },
  phone: {
    type: String,
  },
  // Profile Media
  profilePicture: {
    type: String, // URL to stored image
  },
  resumePDF: {
    type: String, // URL to stored PDF
  },
  // Professional Information
  headline: {
    type: String,
    required: [true, 'Headline is required.'],
  },
  bio: {
    type: String,
  },
  skills: {
    type: [String],
  },
  experience: [ExperienceSchema],
  education: [EducationSchema],
  // Aggregate experience to easily check mentor eligibility
  totalExperienceYears: { type: Number, default: 0 },
  // Optional toggle for users willing to mentor
  willingToMentor: { type: Boolean, default: false },
  parsedResumeText: { type: String }, 
}, { timestamps: true });

export default mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);