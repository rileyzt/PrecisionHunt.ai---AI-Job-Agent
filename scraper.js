const APIJobScraper = require('./api_job_scraper');

const runScraper = async () => {
  const scraper = new APIJobScraper();

  // Example input from frontend or manual test
  const skills = ['HTML, CSS, JavaScript, Java, Node, React'];
  const preferences = {
    roles: ['Software Developer'],
    locations: ['Remote'],
    experience: '3 years',
    minSalary: 50000,
    jobType: 'full-time'
  };

  // Set the dynamic user profile
  scraper.setUserProfile(skills, preferences);

  // Run the scraper
  await scraper.searchAllJobs();

  // Export the results to JSON
  await scraper.exportResults();
};

runScraper();
