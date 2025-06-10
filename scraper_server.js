const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const APIJobScraper = require('./api_job_scraper');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Multer for handling resume file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 🟢 POST /search route
app.post('/search', upload.single('resume'), async (req, res) => {
  try {
    console.log('📥 Received /search request');

     
    const skills = req.body.skills;
    const preferences = req.body.preferences || {};
    const roles = preferences.roles;
    const locations = preferences.locations;
    const experience = preferences.experience;


    // Log extracted values
    console.log('✅ Extracted:');
    console.log('skills:', skills);
    console.log('roles:', roles);
    console.log('locations:', locations);
    console.log('experience:', experience);

    // Validate input
    if (!skills || !roles || !locations) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: roles, locations, skills' });
    }

    // Parse comma-separated values
    const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
    const roleList = roles.split(',').map(r => r.trim()).filter(Boolean);
    const locationList = locations.split(',').map(l => l.trim()).filter(Boolean);

    // Setup scraper
    const scraper = new APIJobScraper();
    scraper.setUserProfile(skillList, {
      roles: roleList,
      locations: locationList,
      experience: experience || ''
    });

    // Call scraper
    const results = await scraper.searchAllJobs();
    const totalFound = Array.isArray(results) ? results.length : 0;

    console.log('🔎 Sample job from results:', results[0]);


    // Respond
    res.status(200).json({
      message: '✅ Job search completed!',
      total: totalFound,
      jobs: results.slice(0, 20)
    });

  } catch (err) {
    console.error('❌ Backend Error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🌐 Server running at http://localhost:${port}`);
});
