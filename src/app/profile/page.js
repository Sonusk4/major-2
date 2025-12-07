'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

import Navbar from '@/components/Navbar';

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    fullName: '',
    age: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    village: '',
    district: '',
    state: '',
    college: '',
    totalExperienceYears: '',
    willingToMentor: false,
    phone: '',
    headline: '',
    bio: '',
    skills: '',
    parsedResumeText: '',
    profilePicture: '',
    resumePDF: ''
  });
  
  const [profileMessage, setProfileMessage] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [pictureFile, setPictureFile] = useState(null);
  const [pictureMessage, setPictureMessage] = useState('');
  const [pictureLoading, setPictureLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeMessage, setResumeMessage] = useState('');
  const [resumeLoading, setResumeLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const replaceResumeInputRef = useRef(null);
  const [isPhotoFocused, setIsPhotoFocused] = useState(false);
  const [stateToDistricts, setStateToDistricts] = useState({});
  const [stateOptions, setStateOptions] = useState([]);
  const [allSkills, setAllSkills] = useState({ technical: [], nonTechnical: [] });
  const [skillCategory, setSkillCategory] = useState('All');
  const [skillFilter, setSkillFilter] = useState('');
  const [downloadLoading, setDownloadLoading] = useState(false);

  useEffect(() => {
    // Preload districts mapping for all states
    const loadGeo = async () => {
      try {
        const res = await fetch('/data/india-districts.json');
        if (res.ok) {
          const all = await res.json();
          setStateToDistricts(all);
          setStateOptions(Object.keys(all).sort());
        }
      } catch (_e) {}
    };
    const loadSkills = async () => {
      try {
        const res = await fetch('/data/skills.json');
        if (res.ok) {
          const data = await res.json();
          setAllSkills({ technical: data.technical || [], nonTechnical: data.nonTechnical || [] });
        }
      } catch (_e) {}
    };
    loadGeo();
    loadSkills();

    const onEsc = (e) => {
      if (e.key === 'Escape') setIsPhotoFocused(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setProfileMessage("Please log in to view your profile.");
        return;
      }
      try {
        const res = await fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          console.log('Fetched profile data:', data.profile);
          setProfile({ 
            fullName: data.profile.fullName || '',
            age: data.profile.age || '',
            address: {
              street: data.profile.address?.street || '',
              city: data.profile.address?.city || '',
              state: data.profile.address?.state || '',
              zipCode: data.profile.address?.zipCode || '',
              country: data.profile.address?.country || ''
            },
            village: data.profile.village || '',
            district: data.profile.district || '',
            state: data.profile.state || '',
            college: data.profile.college || '',
            totalExperienceYears: typeof data.profile.totalExperienceYears === 'number' ? String(data.profile.totalExperienceYears) : '',
            willingToMentor: !!data.profile.willingToMentor,
            phone: data.profile.phone || '',
            headline: data.profile.headline || '',
            bio: data.profile.bio || '',
            skills: data.profile.skills ? data.profile.skills.join(', ') : '',
            parsedResumeText: data.profile.parsedResumeText || '',
            profilePicture: data.profile.profilePicture || '',
            resumePDF: data.profile.resumePDF || ''
          });
        } else {
          console.error('Failed to fetch profile:', res.status);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setProfileMessage('Error fetching profile data.');
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setProfile(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setProfile(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setProfileMessage('You must be logged in to update your profile.');
      return;
    }
    setProfileLoading(true);
    setProfileMessage('');
    
    try {
      const profileData = { 
        ...profile, 
        skills: profile.skills ? profile.skills.split(',').map(skill => skill.trim()) : [],
        age: profile.age ? parseInt(profile.age) : undefined,
        totalExperienceYears: profile.totalExperienceYears ? Number(profile.totalExperienceYears) : 0,
      };
      console.log('Submitting profile data:', profileData);
      
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(profileData),
      });
      const data = await res.json();
      setProfileMessage(data.message || 'Profile updated successfully!');
      
      // Refresh profile data after update
      if (res.ok) {
        const refreshRes = await fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setProfile({ 
            fullName: refreshData.profile.fullName || '',
            age: refreshData.profile.age || '',
            address: {
              street: refreshData.profile.address?.street || '',
              city: refreshData.profile.address?.city || '',
              state: refreshData.profile.address?.state || '',
              zipCode: refreshData.profile.address?.zipCode || '',
              country: refreshData.profile.address?.country || ''
            },
            village: refreshData.profile.village || '',
            district: refreshData.profile.district || '',
            state: refreshData.profile.state || '',
            college: refreshData.profile.college || '',
            totalExperienceYears: typeof refreshData.profile.totalExperienceYears === 'number' ? String(refreshData.profile.totalExperienceYears) : '',
            willingToMentor: !!refreshData.profile.willingToMentor,
            phone: refreshData.profile.phone || '',
            headline: refreshData.profile.headline || '',
            bio: refreshData.profile.bio || '',
            skills: refreshData.profile.skills ? refreshData.profile.skills.join(', ') : '',
            parsedResumeText: refreshData.profile.parsedResumeText || '',
            profilePicture: refreshData.profile.profilePicture || '',
            resumePDF: refreshData.profile.resumePDF || ''
          });
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileMessage('An error occurred while updating profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const [mentorMessage, setMentorMessage] = useState('');
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorResults, setMentorResults] = useState([]);

  const handleFindMentor = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMentorMessage('You must be logged in to find a mentor.');
      return;
    }
    setMentorLoading(true);
    setMentorMessage('');
    setMentorResults([]);
    try {
      const res = await fetch('/api/mentor/find', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        setMentorResults(Array.isArray(data.mentors) ? data.mentors : []);
        if (!data.mentors || data.mentors.length === 0) {
          setMentorMessage(data.message || 'No mentors found for your criteria.');
        }
      } else {
        setMentorMessage(data.message || 'Failed to find mentor.');
      }
    } catch (err) {
      setMentorMessage('An error occurred while finding a mentor.');
    } finally {
      setMentorLoading(false);
    }
  };

  const handlePictureUpload = async (e) => {
    e.preventDefault();
    if (!pictureFile) {
      setPictureMessage('Please select an image file first.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setPictureMessage('You must be logged in to upload a profile picture.');
      return;
    }
    setPictureLoading(true);
    setPictureMessage('');
    const formData = new FormData();
    formData.append('file', pictureFile);

    try {
      console.log('Uploading profile picture:', pictureFile.name);
      const res = await fetch('/api/profile/upload-picture', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setPictureMessage(data.message);
      
      if (res.ok) {
        setProfile(prev => ({ ...prev, profilePicture: data.fileUrl }));
        setPictureFile(null);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setPictureMessage('An error occurred during upload.');
    } finally {
      setPictureLoading(false);
    }
  };
  
  const uploadResume = async (fileToUpload) => {
    if (!fileToUpload) {
      setResumeMessage('Please select a PDF file first.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setResumeMessage('You must be logged in to upload a resume.');
      return;
    }
    setResumeLoading(true);
    setResumeMessage('');
    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
      console.log('Uploading resume file:', fileToUpload.name);
      const res = await fetch('/api/resume/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setResumeMessage(data.message);
      
      // Refresh profile data after resume upload
      if (res.ok) {
        const refreshRes = await fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setProfile(prev => ({ 
            ...prev,
            parsedResumeText: refreshData.profile.parsedResumeText || '',
            resumePDF: refreshData.profile.resumePDF || ''
          }));
          setResumeFile(null);
        }
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      setResumeMessage('An error occurred during upload.');
    } finally {
      setResumeLoading(false);
    }
  };

  const handleDownloadResume = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to download your resume.');
      return;
    }

    setDownloadLoading(true);
    try {
      const res = await fetch('/api/resume/download', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.pdfUrl) {
          // Direct fetch and download the PDF file
          const pdfResponse = await fetch(data.pdfUrl);
          const blob = await pdfResponse.blob();
          
          // Create blob URL and trigger download
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `resume-${Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up blob URL
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        }
      } else {
        alert('Failed to download resume. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading resume:', error);
      alert('An error occurred while downloading the resume.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleResumeSubmit = async (e) => {
    e.preventDefault();
    await uploadResume(resumeFile);
  };

  const handleReplaceResumeClick = () => {
    if (replaceResumeInputRef.current) {
      replaceResumeInputRef.current.click();
    }
  };

  const handleReplaceResumeSelected = async (e) => {
    const selected = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (selected) {
      await uploadResume(selected);
    }
    // Reset the input so selecting the same file again still triggers onChange
    e.target.value = '';
  };

  const handleAnalyzeFromProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setResumeMessage('You must be logged in to analyze your resume.');
      return;
    }
    setAnalysisLoading(true);
    setResumeMessage('');
    setAnalysisResult(null);
    try {
      const res = await fetch('/api/resume/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ resumeText: '' })
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
      } else {
        const data = await res.json();
        setResumeMessage(data.message || 'Failed to analyze resume.');
      }
    } catch (err) {
      setResumeMessage('An error occurred while analyzing.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-slate-900 to-violet-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold text-slate-100 mb-8 text-center drop-shadow-[0_0_16px_rgba(139,92,246,0.35)]">
          Your Developer Profile
        </h1>
      
        {/* Profile Picture Section */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur p-8 mb-8 shadow-[0_0_24px_rgba(139,92,246,0.25)] hover:border-violet-500/40 hover:shadow-[0_0_36px_rgba(139,92,246,0.45)] transition-all overflow-visible">
          <h2 className="text-2xl font-semibold text-slate-100 mb-6 flex items-center">
            <i className="fas fa-user-circle mr-3 text-blue-600"></i>
            Profile Picture
          </h2>
          
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0" onClick={() => setIsPhotoFocused(true)}>
              {profile.profilePicture ? (
                <div className="group relative inline-block rounded-full p-[3px] bg-gradient-to-r from-violet-600/60 to-fuchsia-600/60 transition-all duration-300 shadow-[0_0_18px_rgba(139,92,246,0.35)] hover:shadow-[0_0_36px_rgba(168,85,247,0.6)] will-change-transform hover:scale-110 hover:-translate-y-1">
                  <Image
                    src={profile.profilePicture}
                    alt="Profile"
                    width={128}
                    height={128}
                    className="rounded-full object-cover border-2 border-neutral-800 transition-all duration-300 w-32 h-32"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="group relative inline-flex w-32 h-32 rounded-full bg-neutral-800 items-center justify-center border-4 border-violet-300/30 shadow-[0_0_18px_rgba(139,92,246,0.25)] hover:shadow-[0_0_36px_rgba(168,85,247,0.6)] transition-transform duration-300 will-change-transform hover:scale-110 hover:-translate-y-1">
                  <i className="fas fa-user text-4xl text-slate-300"></i>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <form onSubmit={handlePictureUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Upload Profile Picture
                  </label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setPictureFile(e.target.files[0])} 
                    className="w-full px-4 py-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-neutral-900/80 text-slate-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-violet-600 file:text-white hover:file:bg-violet-700"
                  />
                  <p className="text-sm text-slate-300 mt-1">
                    Supported formats: JPG, PNG, GIF (Max 5MB)
                  </p>
                </div>
                
                <button 
                  type="submit" 
                  disabled={pictureLoading || !pictureFile}
                  className="px-6 py-2 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-[0_0_18px_rgba(139,92,246,0.35)] hover:shadow-[0_0_28px_rgba(168,85,247,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pictureLoading ? 'Uploading...' : 'Upload Picture'}
                </button>
                
                {pictureMessage && (
                  <div className={`p-3 rounded-lg text-sm ${
                    pictureMessage.includes('success') ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  }`}>
                    {pictureMessage}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur p-8 mb-8 shadow-[0_0_24px_rgba(139,92,246,0.25)] hover:border-violet-500/40 hover:shadow-[0_0_36px_rgba(139,92,246,0.45)] transition-all">
          <h2 className="text-2xl font-semibold text-slate-100 mb-6 flex items-center drop-shadow-[0_0_10px_rgba(139,92,246,0.35)]">
            <i className="fas fa-user mr-3 text-violet-400"></i>
            Personal Information
          </h2>
          
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Full Name *
                </label>
                <input 
                  name="fullName" 
                  type="text" 
                  placeholder="Enter your full name" 
                  value={profile.fullName} 
                  onChange={handleChange} 
                  required
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Age
                </label>
                <input 
                  name="age" 
                  type="number" 
                  placeholder="Enter your age" 
                  value={profile.age} 
                  onChange={handleChange} 
                  min="16" 
                  max="100"
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Phone Number
                </label>
                <input 
                  name="phone" 
                  type="tel" 
                  placeholder="Enter your phone number" 
                  value={profile.phone} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
            
            {/* Address fields removed to avoid duplication with Location & Mentorship section */}

            {/* Mentorship & Location Matching Fields */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Mentorship & Location
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  name="state"
                  value={profile.state}
                  onChange={(e) => {
                    // clear district when state changes
                    const newState = e.target.value;
                    setProfile(prev => ({ ...prev, state: newState, district: '' }));
                  }}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white text-gray-900"
                >
                  <option value="">Select State (required)</option>
                  {stateOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {stateToDistricts[profile.state] ? (
                  <select
                    name="district"
                    value={profile.district}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="">Select District</option>
                    {stateToDistricts[profile.state].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    name="district"
                    type="text"
                    placeholder="District"
                    value={profile.district}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                  />
                )}
                <input
                  name="village"
                  type="text"
                  placeholder="Village"
                  value={profile.village}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                />
                <input
                  name="college"
                  type="text"
                  placeholder="College"
                  value={profile.college}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                />
                <input
                  name="totalExperienceYears"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Total Experience (years)"
                  value={profile.totalExperienceYears}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                />
                <label className="inline-flex items-center gap-2 text-slate-200">
                  <input
                    name="willingToMentor"
                    type="checkbox"
                    checked={profile.willingToMentor}
                    onChange={handleChange}
                    className="h-5 w-5"
                  />
                  Willing to Mentor
                </label>
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={profileLoading}
              className="w-full px-6 py-3 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-[0_0_22px_rgba(139,92,246,0.35)] hover:shadow-[0_0_36px_rgba(168,85,247,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileLoading ? 'Saving...' : 'Save Personal Information'}
            </button>
            
            {profileMessage && (
              <div className={`p-4 rounded-lg ${
                profileMessage.includes('success') ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}>
                {profileMessage}
              </div>
            )}
          </form>
      </div>
      {isPhotoFocused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setIsPhotoFocused(false)}>
          <div className="relative" style={{ width: '90vw', height: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <Image
              src={profile.profilePicture || '/uploads/profile-pictures/profile-placeholder.png'}
              alt="Profile large"
              fill
              className="rounded-2xl shadow-[0_0_60px_rgba(167,139,250,0.6)] ring-2 ring-violet-400 object-cover transition-transform duration-300 scale-100"
              unoptimized
            />
          </div>
        </div>
      )}
      
        {/* Professional Information Section */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur p-8 mb-8 shadow-[0_0_24px_rgba(139,92,246,0.25)] hover:border-violet-500/40 hover:shadow-[0_0_36px_rgba(139,92,246,0.45)] transition-all">
          <h2 className="text-2xl font-semibold text-slate-100 mb-6 flex items-center drop-shadow-[0_0_10px_rgba(139,92,246,0.35)]">
            <i className="fas fa-briefcase mr-3 text-violet-400"></i>
            Professional Information
        </h2>
        
          <form onSubmit={handleProfileSubmit} className="space-y-6">
        <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Professional Headline *
          </label>
          <input 
            name="headline" 
            type="text" 
            placeholder="e.g., Senior Full-Stack Developer" 
            value={profile.headline} 
            onChange={handleChange} 
                required
                className="w-full px-4 py-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-neutral-900/80 text-white placeholder-slate-400"
                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
          />
        </div>
        
        <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
            Bio
          </label>
          <textarea 
            name="bio" 
            placeholder="Tell us about yourself, your experience, and what drives you..." 
            value={profile.bio} 
            onChange={handleChange} 
                rows="4" 
                className="w-full px-4 py-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-vertical bg-neutral-900/80 text-white placeholder-slate-400"
                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
          />
        </div>
        
        <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
            Skills
          </label>
          <input 
            name="skills" 
            type="text" 
            placeholder="e.g., React, Node.js, Python, AWS" 
            value={profile.skills} 
            onChange={handleChange} 
                className="w-full px-4 py-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-neutral-900/80 text-white placeholder-slate-400"
                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
          />
          {/* Skills Picker: dropdown-based like state/district */}
          {(allSkills.technical.length > 0 || allSkills.nonTechnical.length > 0) && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-slate-300 text-sm mb-1">Category</div>
                <select
                  value={skillCategory}
                  onChange={(e) => { setSkillCategory(e.target.value); setSkillFilter(''); }}
                  className="w-full px-3 py-2 border border-neutral-700 rounded-lg bg-neutral-900/80 text-white"
                >
                  <option value="All">All</option>
                  <option value="Technical">Technical</option>
                  <option value="Non-Technical">Non-Technical</option>
                </select>
              </div>
              <div>
                <div className="text-slate-300 text-sm mb-1">Search</div>
                <input
                  type="text"
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  placeholder="Search skills"
                  className="w-full px-3 py-2 border border-neutral-700 rounded-lg bg-neutral-900/80 text-white placeholder-slate-400"
                />
              </div>
              <div>
                <div className="text-slate-300 text-sm mb-1">Skills</div>
                <select
                  value=""
                  onChange={(e) => {
                    const s = e.target.value;
                    if (!s) return;
                    const list = (profile.skills || '').split(',').map(x => x.trim()).filter(Boolean);
                    if (!list.find(x => x.toLowerCase() === s.toLowerCase())) {
                      const next = [...list, s];
                      setProfile(prev => ({ ...prev, skills: next.join(', ') }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-neutral-700 rounded-lg bg-neutral-900/80 text-white"
                >
                  <option value="">Select a skill</option>
                  {(() => {
                    const pool = skillCategory === 'Technical' ? allSkills.technical : skillCategory === 'Non-Technical' ? allSkills.nonTechnical : [...allSkills.technical, ...allSkills.nonTechnical];
                    const filtered = pool.filter(s => s.toLowerCase().includes(skillFilter.toLowerCase()));
                    return filtered.map(s => <option key={s} value={s}>{s}</option>);
                  })()}
                </select>
              </div>
              <div className="md:col-span-3">
                <div className="text-slate-300 text-sm mb-1">Selected</div>
                <div className="flex flex-wrap gap-2">
                  {(profile.skills || '').split(',').map(x => x.trim()).filter(Boolean).map((s) => (
                    <span key={s} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border bg-neutral-800 text-slate-200 border-neutral-700">
                      {s}
                      <button
                        type="button"
                        onClick={() => {
                          const list = (profile.skills || '').split(',').map(x => x.trim()).filter(Boolean);
                          const next = list.filter(x => x.toLowerCase() !== s.toLowerCase());
                          setProfile(prev => ({ ...prev, skills: next.join(', ') }));
                        }}
                        className="text-slate-400 hover:text-rose-300"
                        aria-label={`Remove ${s}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <button 
          type="submit" 
          disabled={profileLoading} 
              className="w-full px-6 py-3 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-emerald-600 to-cyan-600 shadow-[0_0_22px_rgba(16,185,129,0.35)] hover:shadow-[0_0_36px_rgba(34,211,238,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileLoading ? 'Saving...' : 'Save Professional Information'}
        </button>
          </form>
        </div>

        {/* Resume Upload Section */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur p-8 mb-8 shadow-[0_0_24px_rgba(139,92,246,0.25)] hover:border-violet-500/40 hover:shadow-[0_0_36px_rgba(139,92,246,0.45)] transition-all">
          <h2 className="text-2xl font-semibold text-slate-100 mb-6 flex items-center drop-shadow-[0_0_10px_rgba(139,92,246,0.35)]">
            <i className="fas fa-file-pdf mr-3 text-violet-400"></i>
            Resume Upload
          </h2>
          
          {profile.resumePDF ? (
            <div className="text-center p-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
              <i className="fas fa-check-circle text-4xl text-emerald-400 mb-4"></i>
              <h3 className="text-lg font-semibold text-emerald-200 mb-2">Resume Uploaded Successfully!</h3>
              <p className="text-emerald-200/90 mb-4">
                Your resume has been uploaded and parsed. You can now use the AI Resume Analyzer and Interview Practice features.
              </p>
              <div className="flex justify-center flex-wrap gap-3">
                <a 
                  href="/resume-analyzer" 
                  className="px-6 py-2 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-indigo-600 to-fuchsia-600 shadow-[0_0_18px_rgba(99,102,241,0.35)] hover:shadow-[0_0_28px_rgba(168,85,247,0.5)] transition-all"
                >
                  <i className="fas fa-magic mr-2"></i>
                  Go to Resume Analyzer
                </a>
                <button
                  type="button"
                  onClick={handleAnalyzeFromProfile}
                  disabled={analysisLoading}
                  className="px-6 py-2 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-emerald-600 to-cyan-600 shadow-[0_0_18px_rgba(16,185,129,0.35)] hover:shadow-[0_0_28px_rgba(34,211,238,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-robot mr-2"></i>
                  {analysisLoading ? 'Analyzing...' : 'Quick Analyze Here'}
                </button>
                <a 
                  href="/interview-practice" 
                  className="px-6 py-2 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-purple-600 to-pink-600 shadow-[0_0_18px_rgba(147,51,234,0.35)] hover:shadow-[0_0_28px_rgba(236,72,153,0.5)] transition-all"
                >
                  <i className="fas fa-comments mr-2"></i>
                  Practice Interview
                </a>
                {profile.resumePDF && (
                  <button
                    type="button"
                    onClick={handleDownloadResume}
                    disabled={downloadLoading}
                    className="px-6 py-2 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-blue-600 to-cyan-600 shadow-[0_0_18px_rgba(59,130,246,0.35)] hover:shadow-[0_0_28px_rgba(34,211,238,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-download mr-2"></i>
                    {downloadLoading ? 'Downloading...' : 'Download PDF'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReplaceResumeClick}
                  disabled={resumeLoading}
                  className="px-6 py-2 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-amber-600 to-orange-600 shadow-[0_0_18px_rgba(245,158,11,0.35)] hover:shadow-[0_0_28px_rgba(234,88,12,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-edit mr-2"></i>
                  {resumeLoading ? 'Replacing...' : 'Edit/Replace Resume'}
                </button>
                <input
                  ref={replaceResumeInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleReplaceResumeSelected}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <form onSubmit={handleResumeSubmit} className="space-y-6">
          <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Upload Resume (PDF)
            </label>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={(e) => setResumeFile(e.target.files[0])} 
                  className="w-full px-4 py-3 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-neutral-900/80 text-slate-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-violet-600 file:text-white hover:file:bg-violet-700"
                />
                <p className="text-sm text-slate-300 mt-1">
                  Upload your resume in PDF format. The system will automatically parse the content.
                </p>
          </div>
          
          <button 
            type="submit" 
                disabled={resumeLoading || !resumeFile}
                className="w-full px-6 py-3 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-purple-600 to-pink-600 shadow-[0_0_22px_rgba(147,51,234,0.35)] hover:shadow-[0_0_36px_rgba(236,72,153,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resumeLoading ? 'Uploading and Parsing...' : 'Upload Resume'}
          </button>
          
          {/* Only show inline message for errors; success will be shown as a toast */}
          {resumeMessage && !/success/i.test(resumeMessage) && (
            <div className="p-4 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30">
              {resumeMessage}
            </div>
          )}
        </form>
          )}
        </div>

        {/* Mentor Finder Section */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 backdrop-blur p-8 mb-8 shadow-[0_0_24px_rgba(139,92,246,0.25)] hover:border-violet-500/40 hover:shadow-[0_0_36px_rgba(139,92,246,0.45)] transition-all">
          <h2 className="text-2xl font-semibold text-slate-100 mb-6 flex items-center drop-shadow-[0_0_10px_rgba(139,92,246,0.35)]">
            <i className="fas fa-hands-helping mr-3 text-violet-400"></i>
            Find a Mentor
          </h2>
          <p className="text-slate-300 mb-4">Matching uses your state (required), then district and college if provided, plus skill similarity. If available, AI helps refine the skill match.</p>
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              type="button"
              onClick={handleFindMentor}
              disabled={mentorLoading}
              className="px-6 py-2 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-indigo-600 to-fuchsia-600 shadow-[0_0_18px_rgba(99,102,241,0.35)] hover:shadow-[0_0_28px_rgba(168,85,247,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mentorLoading ? 'Finding...' : 'Find Mentor'}
            </button>
          </div>
          {mentorMessage && (
            <div className="p-3 rounded-lg text-sm bg-rose-500/10 text-rose-300 border border-rose-500/30 mb-4">{mentorMessage}</div>
          )}
          {mentorResults.length > 0 && (
            <div className="space-y-4">
              {mentorResults.map((m, idx) => (
                <div key={idx} className="rounded-lg border border-neutral-700 bg-neutral-900/80 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-100 font-semibold">{m.headline || 'Potential Mentor'}</div>
                      <div className="text-slate-300 text-sm">{[m.state, m.district, m.college].filter(Boolean).join(' • ')}</div>
                    </div>
                    <div className="text-right text-slate-300 text-sm">
                      <div>Experience: {m.totalExperienceYears}y</div>
                      {typeof m.finalScore === 'number' && <div>Score: {m.finalScore}</div>}
                    </div>
                  </div>
                  <div className="text-slate-200 text-sm mt-2">Skills: {(m.skills || []).join(', ')}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resume Content Section: hidden per request */}
        {false && profile.parsedResumeText && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <i className="fas fa-file-alt mr-3 text-blue-600"></i>
              Resume Content
            </h2>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <textarea 
                name="parsedResumeText" 
                placeholder="Your parsed resume content will appear here..." 
                value={profile.parsedResumeText} 
                onChange={handleChange} 
                rows="8" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical bg-white text-gray-900"
              />
            </div>
            
            <div className="mt-4 text-sm text-gray-900">
              <i className="fas fa-info-circle mr-2"></i>
              You can edit this content if the automatic parsing didn&#39;t work correctly.
            </div>
        </div>
      )}

        {analysisResult && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 mt-8">

            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <i className="fas fa-chart-line mr-3 text-green-600"></i>
              Resume Analysis
            </h2>
            <div className="space-y-6">
              {analysisResult.roleAnalysis?.map((role, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">{role.roleTitle}</h3>
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-bold text-blue-600">{role.matchPercentage}%</div>
                      <div className="text-sm text-gray-900">Match</div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Why this score?</h4>
                    <p className="text-gray-700">{role.justification}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Bottom-left toast for successful resume upload/replace */}
      {resumeMessage && /success/i.test(resumeMessage) && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-600 text-white shadow-lg border border-emerald-400/60">
            <i className="fas fa-check-circle mt-0.5"></i>
            <div>
              <div className="font-semibold">Success</div>
              <div className="text-sm opacity-90">{resumeMessage}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}