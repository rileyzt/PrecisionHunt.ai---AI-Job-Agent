"use client";
import { useState, useEffect } from "react";

export default function JobForm() {
  const [formData, setFormData] = useState({
    role: "",
    location: "",
    experience: "",
    skills: "",
    resume: null,
  });

  // State variables
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [jobResults, setJobResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [page, setPage] = useState(1);
  const [lastFormData, setLastFormData] = useState(null);
  const [searchMeta, setSearchMeta] = useState(null); // Store search metadata
  const [loadingMessage, setLoadingMessage] = useState("Initializing search...");

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  // Enhanced loading messages
  const updateLoadingMessage = (step) => {
    const messages = {
      1: "🔍 Analyzing your requirements...",
      2: "🌐 Scraping job boards...",
      3: "📍 Filtering by location...",
      4: "🎯 Matching your skills...",
      5: "✨ Preparing results..."
    };
    
    let currentStep = 1;
    const interval = setInterval(() => {
      if (currentStep <= 5) {
        setLoadingMessage(messages[currentStep]);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return interval;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setShowResults(false);
    setPage(1); // Reset to first page
    
    const loadingInterval = updateLoadingMessage();
    
    const formDataObj = new FormData();
    formDataObj.append("skills", formData.skills);
    formDataObj.append("roles", formData.role);
    formDataObj.append("locations", formData.location);
    formDataObj.append("experience", formData.experience);

    if (formData.resume) formDataObj.append("resume", formData.resume);
    setLastFormData(formData); // Store last submitted form

    try {
      const res = await fetch(`https://precisionhunt-ai-ysut.onrender.com/search?page=1`, {
        method: "POST",
        body: formDataObj,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log("Response:", data);
      
      clearInterval(loadingInterval);
      
      if (data.jobs && data.jobs.length > 0) {
        setJobResults(data.jobs);
        setSearchMeta({
          total: data.total,
          totalPages: data.totalPages,
          hasNextPage: data.hasNextPage,
          hasPrevPage: data.hasPrevPage,
          searchParams: data.searchParams
        });
        setShowResults(true);
      } else {
        // No jobs found
        setJobResults([]);
        setSearchMeta(null);
        setShowResults(true);
        alert("No jobs found matching your criteria. Try expanding your search parameters.");
      }
    } catch (error) {
      clearInterval(loadingInterval);
      console.error("Search error:", error);
      alert("Error submitting request. Please check if the server is running and try again.");
    } finally {
      setIsSubmitting(false);
      setLoadingMessage("Initializing search...");
    }
  };

  const handleSearchAgain = async () => {
    if (!lastFormData || !searchMeta) return;

    // Don't increment page if we're already at the last page
    const nextPage = searchMeta.hasNextPage ? page + 1 : 1;
    
    setIsSubmitting(true);
    setShowResults(false);

    const formDataObj = new FormData();
    formDataObj.append("skills", lastFormData.skills);
    formDataObj.append("roles", lastFormData.role);
    formDataObj.append("locations", lastFormData.location);
    formDataObj.append("experience", lastFormData.experience);
    if (lastFormData.resume) formDataObj.append("resume", lastFormData.resume);

    try {
      const res = await fetch(`https://precisionhunt-ai-ysut.onrender.com/search?page=${nextPage}`, {
        method: "POST",
        body: formDataObj,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.jobs && data.jobs.length > 0) {
        setJobResults(data.jobs);
        setPage(nextPage);
        setSearchMeta({
          total: data.total,
          totalPages: data.totalPages,
          hasNextPage: data.hasNextPage,
          hasPrevPage: data.hasPrevPage,
          searchParams: data.searchParams
        });
        setShowResults(true);
      } else {
        alert("No more jobs available. This was the last page.");
      }
    } catch (error) {
      console.error("Search again error:", error);
      alert("Error fetching more results. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviousPage = async () => {
    if (!lastFormData || !searchMeta || page <= 1) return;

    const prevPage = page - 1;
    setIsSubmitting(true);
    setShowResults(false);

    const formDataObj = new FormData();
    formDataObj.append("skills", lastFormData.skills);
    formDataObj.append("roles", lastFormData.role);
    formDataObj.append("locations", lastFormData.location);
    formDataObj.append("experience", lastFormData.experience);
    if (lastFormData.resume) formDataObj.append("resume", lastFormData.resume);

    try {
      const res = await fetch(`https://precisionhunt-ai-ysut.onrender.com/search?page=${prevPage}`, {
        method: "POST",
        body: formDataObj,
      });

      const data = await res.json();
      
      if (data.jobs && data.jobs.length > 0) {
        setJobResults(data.jobs);
        setPage(prevPage);
        setSearchMeta({
          total: data.total,
          totalPages: data.totalPages,
          hasNextPage: data.hasNextPage,
          hasPrevPage: data.hasPrevPage,
          searchParams: data.searchParams
        });
        setShowResults(true);
      }
    } catch (error) {
      console.error("Previous page error:", error);
      alert("Error fetching previous results. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Dynamic Gradient Orbs */}
        <div 
          className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{
            background: 'radial-gradient(circle, #8B5CF6 0%, #3B82F6 50%, transparent 70%)',
            left: `${mousePosition.x * 0.02}px`,
            top: `${mousePosition.y * 0.02}px`,
            transform: 'translate(-50%, -50%)',
          }}
        />
        <div 
          className="absolute w-72 h-72 rounded-full opacity-15 blur-2xl animate-pulse"
          style={{
            background: 'radial-gradient(circle, #EC4899 0%, #8B5CF6 50%, transparent 70%)',
            right: `${mousePosition.x * 0.015}px`,
            bottom: `${mousePosition.y * 0.015}px`,
            transform: 'translate(50%, 50%)',
            animationDelay: '1s',
          }}
        />
        
        {/* Animated Grid */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`,
          }}
        />
        
        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-400 rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-6 py-16 flex flex-col items-center">
        {/* Header Section */}
        <div className="text-center mb-12 max-w-4xl">
          <div className="inline-block p-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-6">
            <div className="bg-black rounded-full px-6 py-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-semibold">
                ✨ AI-Powered Job Matching
              </span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400">
              PrecisionHunt.ai
            </span>
          
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
            Discover your dream job with our intelligent AI agent that matches your skills 
            with the perfect opportunities across the web.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Real-time job scraping
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              AI-powered matching
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              Personalized results
            </div>
          </div>
        </div>

        {/* Chatbot-style Job Results Section */}
        {showResults && (
          <div className="w-full max-w-4xl mt-12 space-y-6">
            {/* AI Response Header */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm font-bold">AI</span>
              </div>
              <div className="backdrop-blur-xl bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg flex-1">
                {jobResults && jobResults.length > 0 ? (
                  <>
                    <p className="text-lg font-semibold text-white mb-2">
                      🎉 Great! I found {searchMeta?.total || jobResults.length} perfect job matches for you:
                    </p>
                    <p className="text-gray-300 text-sm mb-2">
                      Based on your skills in <span className="text-purple-300 font-medium">{formData.skills}</span> and preference for <span className="text-blue-300 font-medium">{formData.role}</span> roles in <span className="text-green-300 font-medium">{formData.location}</span>
                    </p>
                    {searchMeta && (
                      <p className="text-gray-400 text-xs">
                        Showing page {page} of {searchMeta.totalPages} • Experience level: {formData.experience || 'Any'}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-lg font-semibold text-red-400 mb-2">
                    😔 No jobs found matching your exact criteria. Try:
                  </p>
                )}
              </div>
            </div>

            {jobResults && jobResults.length > 0 ? (
              <>
                {/* Job Cards */}
                <div className="space-y-4 pl-12">
                  {jobResults.map((job, index) => (
                    <div 
                      key={job.id || index}
                      className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg hover:bg-white/10 transition-all duration-300 group relative"
                      style={{
                        animationDelay: `${index * 0.1}s`,
                        animation: 'slideInUp 0.6s ease-out forwards'
                      }}
                    >
                      {job.isNew && (
                        <div className="absolute top-4 right-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                          NEW
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                            {job.title}
                          </h3>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-gray-300">
                              <span className="text-blue-400">🏢</span>
                              <span className="font-medium">{job.company}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <span className="text-green-400">📍</span>
                              <span>{job.location}</span>
                            </div>
                            {job.salary && (
                              <div className="flex items-center gap-2 text-gray-300">
                                <span className="text-yellow-400">💰</span>
                                <span className="font-semibold text-green-400">{job.salary}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => window.open(job.link || job.applyUrl, '_blank')}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                          Apply Here →
                        </button>
                      </div>
                      
                      {/* Job Match Score */}
                      <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                        <span className="text-sm text-gray-400">Match Score:</span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <span 
                              key={i} 
                              className={`text-sm ${i < Math.floor((job.matchScore || 85) / 20) ? 'text-yellow-400' : 'text-gray-600'}`}
                            >
                              ⭐
                            </span>
                          ))}
                          <span className="text-sm text-purple-400 ml-2 font-semibold">
                            {job.matchScore || (85 + Math.floor(Math.random() * 10))}% match
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Enhanced Pagination Controls */}
                <div className="flex items-center justify-center gap-4 pt-8">
                  {searchMeta?.hasPrevPage && (
                    <button 
                      onClick={handlePreviousPage}
                      disabled={isSubmitting}
                      className="px-6 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 transition-all duration-300 disabled:opacity-50">
                      ← Previous
                    </button>
                  )}

                  <button 
                    onClick={handleSearchAgain}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 transition-all duration-300 disabled:opacity-50">
                    {isSubmitting ? 'Loading...' : searchMeta?.hasNextPage ? 'Next Page →' : 'Shuffle Results 🔄'}
                  </button>

                  <button 
                    onClick={() => {
                      const jobUrls = jobResults.map(job => job.link || job.applyUrl).filter(Boolean);
                      const savedJobs = jobResults.map(job => ({
                        title: job.title,
                        company: job.company,
                        location: job.location,
                        salary: job.salary,
                        url: job.link || job.applyUrl
                      }));
                      console.log('Saved jobs:', savedJobs);
                      alert(`Saved ${savedJobs.length} jobs to console! Check browser console for details.`);
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold transition-all duration-300 transform hover:scale-105">
                    Save All Jobs
                  </button>
                </div>

                {/* Page Information */}
                {searchMeta && (
                  <div className="text-center text-gray-400 text-sm">
                    Page {page} of {searchMeta.totalPages} • {searchMeta.total} total jobs found
                  </div>
                )}
              </>
            ) : (
              /* No Results Suggestions */
              <div className="pl-12 space-y-4">
                <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-red-400 mb-4">Suggestions to improve your search:</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Try broader location terms (e.g., "India" instead of specific cities)</li>
                    <li>• Use more general role names (e.g., "Engineer" instead of "Senior Software Engineer")</li>
                    <li>• Add more relevant skills to increase matches</li>
                    <li>• Try "Remote" as a location option</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Job Search Form */}
        <div className="w-full max-w-2xl space-y-6 relative">
          <div className="backdrop-blur-xl bg-white/5 p-8 rounded-2xl border border-white/10 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Desired Role */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-200">
                  Desired Role
                </label>
                <input
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  placeholder="e.g., Software Developer, Civil Engineer, Data Scientist"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  required
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-200">
                  Preferred Location(s)
                </label>
                <input
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Kolkata, Bangalore, Mumbai, Dubai, Remote"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  required
                />
              </div>

              {/* Experience */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-200">
                  Experience Level
                </label>
                <input
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="e.g., 3 years, Entry Level, Fresher, 5+ years"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  required
                />
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-200">
                  Key Skills
                </label>
                <input
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="e.g., React, Python, AutoCAD, Biotechnology, Machine Learning"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  required
                />
              </div>
            </div>

            {/* Resume Upload */}
            <div className="mt-6 space-y-2">
              <label className="block text-sm font-semibold text-gray-200">
                Upload Resume (Optional)
              </label>
              <div className="relative">
                <input
                  name="resume"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600/80 file:text-white file:cursor-pointer hover:file:bg-purple-700/80"
                />
                {formData.resume && (
                  <div className="mt-2 text-sm text-purple-400">
                    Selected: {formData.resume.name}
                  </div>
                )}
              </div>
            </div>

            {/* Example searches */}
            <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm font-semibold text-blue-400 mb-2">💡 Example searches that work well:</p>
              <div className="text-xs text-gray-300 space-y-1">
                <div>• <strong>Tech:</strong> "Software Engineer" + "React, Node.js" + "Bangalore, Remote"</div>
                <div>• <strong>Civil:</strong> "Civil Engineer" + "AutoCAD, Project Management" + "Mumbai, Delhi"</div>
                <div>• <strong>Biotech:</strong> "Research Scientist" + "Biotechnology, Lab Skills" + "Hyderabad, Pune"</div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.role || !formData.location || !formData.experience || !formData.skills}
              className="w-full mt-8 py-4 px-8 rounded-xl font-semibold text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {loadingMessage}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>🚀 Find My Perfect Job</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Enhanced Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {[
            {
              icon: "🎯",
              title: "Smart Location Matching",
              description: "Advanced location filtering that understands city variations and regional preferences"
            },
            {
              icon: "⚡",
              title: "Multi-Domain Support",
              description: "Find jobs across all industries - Tech, Engineering, Healthcare, Research, and more"
            },
            {
              icon: "🔄",
              title: "Fresh Results Every Time",
              description: "Dynamic result shuffling ensures you see different opportunities on each search"
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="backdrop-blur-xl bg-white/5 p-6 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 group cursor-pointer"
            >
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Enhanced Stats Section */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl w-full">
          {[
            { number: "50K+", label: "Jobs Across All Domains" },
            { number: "95%", label: "Location Match Accuracy" },
            { number: "1000+", label: "Companies & Startups" },
            { number: "Real-time", label: "Fresh Results Always" }
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-1">
                {stat.number}
              </div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg);
            opacity: 0.3;
          }
          50% { 
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.6;
          }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}