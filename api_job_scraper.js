const axios = require('axios');
const fs = require('fs').promises;

class APIJobScraper {
    constructor() {
        this.userProfile = {
            skills: [],
            experience: '',
            preferences: {
                roles: [],
                locations: [],
                minSalary: 0,
                jobType: 'full-time'
            }
        };
        this.jobResults = [];
        this.processedJobs = new Set(); // Track processed jobs to avoid duplicates
        
        // API Keys and configurations
        this.apiKeys = {
            rapidApi: process.env.RAPID_API_KEY,
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setUserProfile(skills, preferences) {
        this.userProfile.skills = skills;
        this.userProfile.preferences = preferences;
        console.log('👤 User profile set');
    }

    // RemoteOK API (Most reliable) - Fixed location filtering
    async fetchRemoteOKJobs(role, limit = 10) {
        console.log('🌐 Fetching from RemoteOK API...');
        const jobs = [];
        
        try {
            const response = await axios.get('https://remoteok.io/api', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const data = response.data;
            if (!Array.isArray(data)) {
                console.log('❌ RemoteOK API returned invalid data');
                return jobs;
            }

            // Skip the first item (metadata)
            const jobData = data.slice(1);
            
            // Improved filtering - broader search terms
            const filteredJobs = jobData
                .filter(job => {
                    if (!job || !job.position) return false;
                    const position = job.position.toLowerCase();
                    const description = (job.description || '').toLowerCase();
                    const tags = (job.tags || []).join(' ').toLowerCase();
                    
                    const searchText = `${position} ${description} ${tags}`;
                    const roleKeywords = role.toLowerCase().split(' ');
                    
                    // More flexible matching
                    return roleKeywords.some(keyword => 
                        searchText.includes(keyword) || 
                        position.includes(keyword) ||
                        tags.includes(keyword)
                    );
                })
                .slice(0, limit);

            console.log(`📋 Found ${filteredJobs.length} matching jobs from RemoteOK`);

            for (const job of filteredJobs) {
                const jobId = `remoteok_${job.id || job.slug}`;
                if (!this.processedJobs.has(jobId)) {
                    this.processedJobs.add(jobId);
                    jobs.push({
                        id: jobId,
                        title: job.position,
                        company: job.company,
                        location: job.location || 'Remote',
                        salary: this.formatSalary(job.salary_min, job.salary_max),
                        link: `https://remoteok.io/remote-jobs/${job.slug || job.id}`,
                        description: job.description || job.tags?.join(', ') || 'Visit link for details',
                        tags: job.tags || [],
                        source: 'RemoteOK',
                        matchScore: 0,
                        postedDate: job.date || new Date().toISOString(),
                        featured: job.featured || false,
                        isRemote: true
                    });
                }
            }

            console.log(`✅ Successfully fetched ${jobs.length} jobs from RemoteOK`);
        } catch (error) {
            console.error('❌ Error fetching RemoteOK jobs:', error.message);
        }

        return jobs;
    }

    // LinkedIn Jobs API via RapidAPI - Fixed location handling
    async fetchLinkedInJobs(role, location, limit = 10) {
        console.log(`🔗 Fetching from LinkedIn API for ${role} in ${location}...`);
        const jobs = [];

        try {
            const options = {
                method: 'POST',
                url: 'https://linkedin-jobs-search.p.rapidapi.com/',
                headers: {
                    'x-rapidapi-key': this.apiKeys.rapidApi,
                    'x-rapidapi-host': 'linkedin-jobs-search.p.rapidapi.com',
                    'Content-Type': 'application/json'
                },
                data: {
                    search_terms: role,
                    location: location,
                    page: '1'
                }
            };

            const response = await axios.request(options);
            const data = response.data;

            let linkedinJobs = [];

            if (Array.isArray(data)) {
                linkedinJobs = data.slice(0, limit);
            } else if (Array.isArray(data.jobs)) {
                linkedinJobs = data.jobs.slice(0, limit);
            } else {
                console.log('⚠️ LinkedIn API returned no jobs or unknown format');
                return jobs;
            }

            for (const job of linkedinJobs) {
                const jobId = `linkedin_${job.id || job.job_id || Math.random().toString(36)}`;
                if (!this.processedJobs.has(jobId)) {
                    this.processedJobs.add(jobId);
                    jobs.push({
                        id: jobId,
                        title: job.title || job.job_title || 'Job Title Not Available',
                        company: job.company || job.company_name || 'Company Not Available',
                        location: job.location || location,
                        salary: job.salary || 'Not specified',
                        link: job.job_url || job.url || 'https://linkedin.com/jobs',
                        description: job.description || job.snippet || 'LinkedIn job posting',
                        source: 'LinkedIn',
                        matchScore: 0,
                        postedDate: job.posted_date || job.date || new Date().toISOString(),
                        jobType: job.job_type || 'Not specified',
                        isRemote: this.isRemoteJob(job.location || location)
                    });
                }
            }

            console.log(`✅ Successfully fetched ${jobs.length} jobs from LinkedIn API`);
        } catch (error) {
            console.error('❌ Error fetching LinkedIn jobs:', error.message);
        }

        return jobs;
    }

    // JSearch API via RapidAPI - Enhanced for multiple job types
    async fetchJSearchJobs(role, location, limit = 10) {
        console.log(`🔍 Fetching from JSearch API for ${role} in ${location}...`);
        const jobs = [];
        
        try {
            const options = {
                method: 'GET',
                url: 'https://jsearch.p.rapidapi.com/search',
                params: {
                    query: `${role} ${location}`,
                    page: '1',
                    num_pages: '1',
                    date_posted: 'month', // Extended to month for more results
                    employment_types: 'FULLTIME,PARTTIME,CONTRACTOR'
                },
                headers: {
                    'x-rapidapi-key': this.apiKeys.rapidApi,
                    'x-rapidapi-host': 'jsearch.p.rapidapi.com'
                }
            };

            const response = await axios.request(options);
            const data = response.data;

            if (data && data.data && Array.isArray(data.data)) {
                const searchJobs = data.data.slice(0, limit);
                
                for (const job of searchJobs) {
                    const jobId = `jsearch_${job.job_id || Math.random().toString(36)}`;
                    if (!this.processedJobs.has(jobId)) {
                        this.processedJobs.add(jobId);
                        jobs.push({
                            id: jobId,
                            title: job.job_title || 'Job Title Not Available',
                            company: job.employer_name || 'Company Not Available',
                            location: job.job_city && job.job_state ? 
                                     `${job.job_city}, ${job.job_state}` : 
                                     job.job_country || location,
                            salary: this.formatJSearchSalary(job),
                            link: job.job_apply_link || job.job_offer_expiration_datetime_utc || '#',
                            description: job.job_description || job.job_highlights?.Responsibilities?.[0] || 'Job description not available',
                            source: job.job_publisher || 'JSearch',
                            matchScore: 0,
                            postedDate: job.job_posted_at_datetime_utc || new Date().toISOString(),
                            jobType: job.job_employment_type || 'Not specified',
                            isRemote: job.job_is_remote || this.isRemoteJob(job.job_city)
                        });
                    }
                }
                
                console.log(`✅ Successfully fetched ${jobs.length} jobs from JSearch API`);
            } else {
                console.log('⚠️ JSearch API returned no jobs or invalid format');
            }
        } catch (error) {
            console.error('❌ Error fetching JSearch jobs:', error.message);
        }

        return jobs;
    }

    // Adzuna API - Enhanced with better location handling
    async fetchAdzunaJobs(role, location, limit = 10) {
        console.log(`📊 Fetching from Adzuna API for ${role} in ${location}...`);
        const jobs = [];
        
        try {
            const appId = 'ca69d0f7';
            const appKey = '333414418474ec6637c5c2848c3c70dc';
            
            // Map locations to countries for Adzuna API
            const countryMap = {
                'kolkata': 'in',
                'bangalore': 'in',
                'mumbai': 'in',
                'delhi': 'in',
                'hyderabad': 'in',
                'pune': 'in',
                'india': 'in',
                'dubai': 'ae',
                'uae': 'ae',
                'singapore': 'sg',
                'london': 'gb',
                'uk': 'gb',
                'toronto': 'ca',
                'canada': 'ca',
                'default': 'us'
            };

            const country = countryMap[location.toLowerCase()] || countryMap['default'];
            const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1`;
            
            const params = {
                app_id: appId,
                app_key: appKey,
                what: role,
                where: location,
                results_per_page: limit,
                sort_by: 'date'
            };

            const response = await axios.get(url, { params });
            const data = response.data;

            if (data && data.results && Array.isArray(data.results)) {
                for (const job of data.results) {
                    const jobId = `adzuna_${job.id || Math.random().toString(36)}`;
                    if (!this.processedJobs.has(jobId)) {
                        this.processedJobs.add(jobId);
                        jobs.push({
                            id: jobId,
                            title: job.title || 'Job Title Not Available',
                            company: job.company?.display_name || 'Company Not Available',
                            location: job.location?.display_name || location,
                            salary: job.salary_min && job.salary_max ? 
                                   `$${Math.round(job.salary_min)} - $${Math.round(job.salary_max)}` : 
                                   'Not specified',
                            link: job.redirect_url || '#',
                            description: job.description || 'Job description not available',
                            source: 'Adzuna',
                            matchScore: 0,
                            postedDate: job.created || new Date().toISOString(),
                            category: job.category?.label || 'Not specified',
                            isRemote: this.isRemoteJob(job.location?.display_name || location)
                        });
                    }
                }
                
                console.log(`✅ Successfully fetched ${jobs.length} jobs from Adzuna API`);
            }
        } catch (error) {
            console.error('❌ Error fetching Adzuna jobs:', error.message);
        }

        return jobs;
    }

    // Helper function to determine if job is remote
    isRemoteJob(location) {
        if (!location) return false;
        const loc = location.toLowerCase();
        return loc.includes('remote') || loc.includes('work from home') || loc.includes('anywhere');
    }

    // Fixed location matching logic
    isLocationMatch(jobLocation = '', userLocations = [], allowRemote = false) {
        const jobLoc = jobLocation.toLowerCase();
        const userLocs = userLocations.map(loc => loc.toLowerCase());
        
        // Check if job is remote and user wants remote
        if (this.isRemoteJob(jobLocation) && (allowRemote || userLocs.includes('remote'))) {
            return true;
        }
        
        // Check if job location matches user preferred locations
        return userLocs.some(userLoc => {
            if (userLoc === 'remote') return false; // Already handled above
            return jobLoc.includes(userLoc) || userLoc.includes(jobLoc);
        });
    }

    formatSalary(min, max) {
        if (min && max) {
            return `$${min}k - $${max}k`;
        } else if (min) {
            return `$${min}k+`;
        } else if (max) {
            return `Up to $${max}k`;
        }
        return 'Not specified';
    }

    formatJSearchSalary(job) {
        if (job.job_min_salary && job.job_max_salary) {
            return `$${Math.round(job.job_min_salary/1000)}k - $${Math.round(job.job_max_salary/1000)}k`;
        } else if (job.job_salary_currency && job.job_salary_period) {
            return `${job.job_salary_currency} (${job.job_salary_period})`;
        }
        return 'Not specified';
    }

    calculateMatchScore(job) {
        let score = 0;
        const jobText = `${job.title} ${job.description}`.toLowerCase();
        const userSkills = this.userProfile.skills;

        // Skill matching (60% weight)
        const skillMatches = userSkills.filter(skill => 
            jobText.includes(skill.toLowerCase()) || 
            (job.tags && job.tags.some(tag => tag.toLowerCase().includes(skill.toLowerCase())))
        );
        const skillScore = (skillMatches.length / Math.max(userSkills.length, 1)) * 60;
        score += skillScore;

        // Role matching (25% weight)
        const preferredRoles = this.userProfile.preferences.roles;
        if (preferredRoles.length > 0) {
            const roleMatch = preferredRoles.some(role => 
                job.title.toLowerCase().includes(role.toLowerCase())
            );
            if (roleMatch) score += 25;
        }

        // Location preference (10% weight)
        const preferredLocations = this.userProfile.preferences.locations;
        if (this.isLocationMatch(job.location, preferredLocations, preferredLocations.includes('remote'))) {
            score += 10;
        }

        // Recency bonus (5% weight)
        const postedDate = new Date(job.postedDate);
        const daysSincePosted = (new Date() - postedDate) / (1000 * 60 * 60 * 24);
        if (daysSincePosted <= 7) score += 5;

        return Math.round(score);
    }

    // Completely rewritten search function with better logic
    async searchAllJobs(offset = 0) {
        const { roles, locations } = this.userProfile.preferences;
        console.log('🧠 Starting job search with offset:', offset);
        console.log('🎯 Roles:', roles);
        console.log('📍 Locations:', locations);
        
        const allJobs = [];
        const allowRemote = locations.some(loc => loc.toLowerCase().includes('remote'));

        console.log('🚀 Starting comprehensive API-based job search...');

        for (const role of roles) {
            console.log(`\n🔍 Searching for: ${role}`);

            try {
                // For each location, search specifically
                for (const location of locations) {
                    console.log(`📍 Searching in: ${location}`);
                    
                    // Skip remote from location-specific searches
                    if (location.toLowerCase().includes('remote')) continue;

                    // LinkedIn API for specific location
                    const linkedinJobs = await this.fetchLinkedInJobs(role, location, 5);
                    allJobs.push(...linkedinJobs);
                    await this.sleep(1500);

                    // JSearch API for specific location
                    const jsearchJobs = await this.fetchJSearchJobs(role, location, 8);
                    allJobs.push(...jsearchJobs);
                    await this.sleep(1500);

                    // Adzuna API for specific location
                    const adzunaJobs = await this.fetchAdzunaJobs(role, location, 5);
                    allJobs.push(...adzunaJobs);
                    await this.sleep(1000);
                }

                // RemoteOK for remote jobs (only if user wants remote)
                if (allowRemote) {
                    const remoteOKJobs = await this.fetchRemoteOKJobs(role, 10);
                    allJobs.push(...remoteOKJobs);
                    await this.sleep(1000);
                }

            } catch (error) {
                console.error(`❌ Error searching for ${role}:`, error.message);
            }
        }

        // Remove exact duplicates based on title and company
        const uniqueJobs = allJobs.filter((job, index, self) =>
            index === self.findIndex(j =>
                j.title.toLowerCase().trim() === job.title.toLowerCase().trim() &&
                j.company.toLowerCase().trim() === job.company.toLowerCase().trim()
            )
        );

        // Filter by location preferences
        const locationFilteredJobs = uniqueJobs.filter(job => 
            this.isLocationMatch(job.location, locations, allowRemote)
        );

        // Calculate match scores
        const scoredJobs = locationFilteredJobs.map(job => ({
            ...job,
            matchScore: this.calculateMatchScore(job)
        }));

        // Sort by match score and recency
        scoredJobs.sort((a, b) => {
            if (b.matchScore !== a.matchScore) {
                return b.matchScore - a.matchScore;
            }
            return new Date(b.postedDate) - new Date(a.postedDate);
        });

        // Apply offset for pagination
        const paginatedJobs = scoredJobs.slice(offset);

        this.jobResults = paginatedJobs;

        console.log(`\n✅ Job search completed! Found ${this.jobResults.length} jobs after filtering`);
        console.log(`🔍 Total raw results: ${allJobs.length}`);
        console.log(`🎯 After deduplication: ${uniqueJobs.length}`);
        console.log(`📍 After location filtering: ${locationFilteredJobs.length}`);

        // Show source breakdown
        const sourceBreakdown = this.jobResults.reduce((acc, job) => {
            acc[job.source] = (acc[job.source] || 0) + 1;
            return acc;
        }, {});
        console.log('📊 Jobs by source:', sourceBreakdown);

        return this.jobResults;
    }

    generateDetailedReport() {
        const highMatch = this.jobResults.filter(job => job.matchScore >= 60);
        const mediumMatch = this.jobResults.filter(job => job.matchScore >= 40 && job.matchScore < 60);
        const lowMatch = this.jobResults.filter(job => job.matchScore < 40);

        const sourceBreakdown = this.jobResults.reduce((acc, job) => {
            acc[job.source] = (acc[job.source] || 0) + 1;
            return acc;
        }, {});

        console.log('\n📊 === COMPREHENSIVE JOB SEARCH REPORT ===');
        console.log(`📈 Total jobs found: ${this.jobResults.length}`);
        console.log(`🎯 High match (60%+): ${highMatch.length}`);
        console.log(`📊 Medium match (40-59%): ${mediumMatch.length}`);
        console.log(`📉 Low match (<40%): ${lowMatch.length}`);
        console.log(`\n📡 Sources: ${Object.entries(sourceBreakdown).map(([source, count]) => `${source} (${count})`).join(', ')}`);
        
        console.log('\n🌟 TOP 15 MATCHES:');
        this.jobResults.slice(0, 15).forEach((job, index) => {
            console.log(`\n${index + 1}. ${job.title} at ${job.company}`);
            console.log(`   📍 ${job.location}`);
            console.log(`   💰 ${job.salary}`);
            console.log(`   💯 Match Score: ${job.matchScore}%`);
            console.log(`   🔗 ${job.link}`);
            console.log(`   📰 Source: ${job.source}`);
            console.log(`   📅 Posted: ${new Date(job.postedDate).toLocaleDateString()}`);
        });

        return {
            total: this.jobResults.length,
            highMatch: highMatch.length,
            mediumMatch: mediumMatch.length,
            lowMatch: lowMatch.length,
            sourceBreakdown,
            topJobs: this.jobResults.slice(0, 15)
        };
    }

    async exportResults(filename = 'comprehensive_job_results.json') {
        const report = this.generateDetailedReport();
        
        const results = {
            searchMetadata: {
                userProfile: this.userProfile,
                generatedAt: new Date().toISOString(),
                totalJobs: this.jobResults.length,
                sources: [...new Set(this.jobResults.map(job => job.source))],
                searchTerms: this.userProfile.preferences.roles,
                locations: this.userProfile.preferences.locations
            },
            summary: {
                total: report.total,
                highMatch: report.highMatch,
                mediumMatch: report.mediumMatch,
                lowMatch: report.lowMatch,
                sourceBreakdown: report.sourceBreakdown
            },
            jobs: this.jobResults
        };

        await fs.writeFile(filename, JSON.stringify(results, null, 2));
        console.log(`💾 Comprehensive results exported to ${filename}`);
        
        // Also create a simplified CSV for easy viewing
        const csvContent = [
            'Title,Company,Location,Salary,Match Score,Source,Link',
            ...this.jobResults.slice(0, 50).map(job => 
                `"${job.title}","${job.company}","${job.location}","${job.salary}",${job.matchScore},"${job.source}","${job.link}"`
            )
        ].join('\n');
        
        const csvFilename = filename.replace('.json', '.csv');
        await fs.writeFile(csvFilename, csvContent);
        console.log(`📊 Top 50 jobs exported to ${csvFilename}`);
    }
}

// Test function
async function testAPIJobScraper() {
    const scraper = new APIJobScraper();
    
    try {
        // Set your profile
        scraper.setUserProfile(
            ['javascript', 'react', 'node.js', 'python', 'sql', 'git', 'html', 'css', 'typescript', 'mongodb'],
            {
                roles: ['Frontend Developer', 'Full Stack Developer', 'Software Engineer', 'React Developer'],
                locations: ['Remote', 'India', 'Kolkata', 'Bangalore', 'Mumbai'],
                minSalary: 60000,
                jobType: 'full-time'
            }
        );
        
        // Search jobs using APIs
        const jobs = await scraper.searchAllJobs();
        
        // Generate detailed report
        const report = scraper.generateDetailedReport();
        
        // Export results
        await scraper.exportResults();
        
        console.log('\n🎉 API-based job search completed successfully!');
        console.log(`📊 Total jobs found: ${jobs.length}`);
        console.log(`📈 High match jobs: ${report.highMatch}`);
        console.log(`📈 Sources used: ${Object.keys(report.sourceBreakdown).join(', ')}`);
        
    } catch (error) {
        console.error('❌ Error in API job search:', error);
    }
}

// Run the test
if (require.main === module) {
    testAPIJobScraper().catch(console.error);
}

module.exports = APIJobScraper;