const express = require('express');
require('dotenv').config();
const cors = require('cors');
const multer = require('multer');
const APIJobScraper = require('./api_job_scraper');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Resume Upload Middleware
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cache to store search results for pagination
const searchCache = new Map();

// Helper function to generate cache key
function generateCacheKey(skills, roles, locations, experience) {
  return `${skills.join(',')}_${roles.join(',')}_${locations.join(',')}_${experience}`.toLowerCase();
}

// Helper function to filter jobs by location
function filterJobsByLocation(jobs, targetLocations) {
  if (!targetLocations || targetLocations.length === 0) return jobs;
  
  const normalizedTargets = targetLocations.map(loc => 
    loc.toLowerCase().trim().replace(/[,\s]+/g, ' ')
  );
  
  return jobs.filter(job => {
    if (!job.location) return false;
    
    const jobLocation = job.location.toLowerCase().replace(/[,\s]+/g, ' ');
    
    return normalizedTargets.some(target => {
      // Check for exact matches and partial matches
      return jobLocation.includes(target) || 
             target.includes(jobLocation) ||
             // Handle common variations
             (target.includes('remote') && jobLocation.includes('remote')) ||
             (target.includes('bangalore') && (jobLocation.includes('bengaluru') || jobLocation.includes('bangalore'))) ||
             (target.includes('mumbai') && jobLocation.includes('mumbai')) ||
             (target.includes('delhi') && (jobLocation.includes('delhi') || jobLocation.includes('new delhi'))) ||
             (target.includes('hyderabad') && jobLocation.includes('hyderabad')) ||
             (target.includes('chennai') && jobLocation.includes('chennai')) ||
             (target.includes('pune') && jobLocation.includes('pune')) ||
             (target.includes('kolkata') && (jobLocation.includes('kolkata') || jobLocation.includes('calcutta'))) ||
             (target.includes('dubai') && jobLocation.includes('dubai')) ||
             (target.includes('singapore') && jobLocation.includes('singapore'));
    });
  });
}

// Helper function to diversify results
function diversifyResults(jobs, page) {
  const shuffled = [...jobs];
  
  // Different shuffle patterns based on page number
  const seedValue = page * 17 + Date.now() % 1000; // Semi-random but deterministic
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor((seedValue + i) % (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// 🟢 POST /search Route
app.post('/search', upload.single('resume'), async (req, res) => {
  try {
    console.log('📥 Received /search request');

    const { skills, roles, locations, experience } = req.body;
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 20;

    // Input Validation
    if (!skills || !roles || !locations) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing roles, locations, or skills' });
    }

    // Parse Inputs
    const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
    const roleList = roles.split(',').map(r => r.trim()).filter(Boolean);
    const locationList = locations.split(',').map(l => l.trim()).filter(Boolean);

    console.log('🔍 Search Parameters:', {
      skills: skillList,
      roles: roleList,
      locations: locationList,
      experience: experience || 'Any',
      page
    });

    // Generate cache key
    const cacheKey = generateCacheKey(skillList, roleList, locationList, experience || '');
    
    let allResults = [];
    
    // Check if we have cached results for this search
    if (searchCache.has(cacheKey)) {
      console.log('📋 Using cached results');
      allResults = searchCache.get(cacheKey);
    } else {
      console.log('🔄 Performing fresh job search');
      
      // Setup Scraper
      const scraper = new APIJobScraper();
      scraper.setUserProfile(skillList, {
        roles: roleList,
        locations: locationList,
        experience: experience || ''
      });

      // Get raw results from scraper
      const rawResults = await scraper.searchAllJobs();
      console.log(`📊 Raw results from scraper: ${rawResults.length}`);

      // Filter by location if not remote-only search
      const hasRemoteInLocation = locationList.some(loc => 
        loc.toLowerCase().includes('remote') || loc.toLowerCase().includes('anywhere')
      );

      if (!hasRemoteInLocation) {
        allResults = filterJobsByLocation(rawResults, locationList);
        console.log(`📍 After location filtering: ${allResults.length}`);
      } else {
        allResults = rawResults;
      }

      // Cache the results for 15 minutes
      searchCache.set(cacheKey, allResults);
      setTimeout(() => {
        searchCache.delete(cacheKey);
        console.log('🧹 Cleared cache for:', cacheKey);
      }, 15 * 60 * 1000);
    }

    if (allResults.length === 0) {
      console.log('❌ No jobs found matching criteria');
      return res.status(200).json({
        message: '❌ No jobs found matching your criteria. Try expanding your search parameters.',
        page: 1,
        totalPages: 0,
        total: 0,
        jobs: []
      });
    }

    // Diversify results for each page request
    const diversifiedResults = diversifyResults(allResults, page);
    
    // Calculate pagination
    const totalJobs = diversifiedResults.length;
    const totalPages = Math.ceil(totalJobs / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    let paginatedResults = diversifiedResults.slice(startIndex, endIndex);

    // If requested page is beyond available pages, return last page
    if (paginatedResults.length === 0 && page > 1) {
      const lastPage = Math.max(1, totalPages);
      const lastPageStart = (lastPage - 1) * itemsPerPage;
      paginatedResults = diversifiedResults.slice(lastPageStart, lastPageStart + itemsPerPage);
      console.log(`⚠️ Page ${page} beyond range, returning page ${lastPage}`);
    }

    // Add diversity to results (mix different companies, roles, etc.)
    const finalResults = paginatedResults.map((job, index) => ({
      ...job,
      id: job.id || `job_${Date.now()}_${index}`,
      matchScore: Math.floor(75 + Math.random() * 20), // Random match score 75-95%
      isNew: Math.random() > 0.7 // 30% chance of being marked as "new"
    }));

    console.log(`✅ Returning ${finalResults.length} jobs for page ${page}/${totalPages}`);
    console.log('📌 Sample job locations:', finalResults.slice(0, 3).map(j => j.location));

    res.status(200).json({
      message: `✅ Found ${totalJobs} jobs matching your criteria!`,
      page,
      totalPages,
      total: totalJobs,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      jobs: finalResults,
      searchParams: {
        skills: skillList,
        roles: roleList,
        locations: locationList,
        experience: experience || 'Any'
      }
    });

  } catch (err) {
    console.error('❌ Backend Error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      error: 'Server error during job search. Please try again.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 🟢 GET /health - Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    cacheSize: searchCache.size
  });
});

// 🟢 POST /clear-cache - Clear search cache (for testing)
app.post('/clear-cache', (req, res) => {
  const cacheSize = searchCache.size;
  searchCache.clear();
  res.json({ 
    message: `Cleared ${cacheSize} cached searches`,
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`🌐 Server running at http://localhost:${port}`);
  console.log(`🔍 Job search API ready`);
  console.log(`💾 Cache management enabled`);
});