document.getElementById('job-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const roles = document.getElementById('roles').value.trim();
  const locations = document.getElementById('locations').value.trim();
  const experience = document.getElementById('experience').value.trim();
  const skills = document.getElementById('skills').value.trim();
  const resume = document.getElementById('resume').files[0];

  // Clear existing results
  const chatBox = document.getElementById('chat-box');
  chatBox.innerHTML = `
    <div class="message user-msg">Searching for jobs...</div>
  `;

  const formData = new FormData();
  formData.append('skills', skills);
  const cleanedRoles = roles
  .split(',')
  .map(r => r.trim().replace(/^['"]|['"]$/g, '')) // Remove any surrounding quotes
  .filter(Boolean)
  .join(',');

  formData.append('preferences[roles]', cleanedRoles);

  const cleanedLocations = locations
  .split(',')
  .map(loc => loc.trim().replace(/^['"]|['"]$/g, ''))
  .filter(Boolean)
  .join(',');

 formData.append('preferences[locations]', cleanedLocations);

  formData.append('preferences[experience]', experience);
  if (resume) {
    formData.append('resume', resume);
  }

  try {
    const response = await fetch('/search', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    const totalJobs = Array.isArray(data.jobs) ? data.jobs.length : 0;

    chatBox.innerHTML += `
      <div class="message bot-msg">
        ${totalJobs === 0
          ? 'No jobs found. Try changing your preferences.'
          : `<strong>${totalJobs}</strong> jobs found. Showing top results below:`}
      </div>
    `;

    if (totalJobs > 0) {
        data.jobs?.slice(0, 10).forEach((job, index) => {
        const link = job.url || job.link || null;

        chatBox.innerHTML += `
          <div class="message bot-msg">
            <strong>${index + 1}. ${job.title || 'Unknown Role'}</strong><br>
            <small>📍 ${job.location || 'Unknown'} | 💼 ${job.company || 'N/A'}</small><br>
            <small>💰 ${job.salary || 'N/A'} | 📰 ${job.source || 'N/A'}</small><br>
            <small>🔗 ${link ? `<a href="${link}" target="_blank">${link}</a>` : 'No Link Available'}</small><br>
            <small>Match Score: ${job.matchScore || 0}%</small>
          </div>
        `;
      });

    }

  } catch (error) {
    console.error('Error fetching jobs:', error);
    chatBox.innerHTML += `<div class="message bot-msg">Something went wrong. Try again.</div>`;
  }
});
