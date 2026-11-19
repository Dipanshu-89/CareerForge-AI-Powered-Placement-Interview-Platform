/**
 * ATS Scorer Service for CareerForge Resume Builder
 * Analyzes structure, keyword density, completeness, and quantifiable metrics
 */

function calculateATSScore(resumeData) {
  let score = 0;
  const feedback = [];

  const { personalInfo, education, experience, projects, skills } = resumeData || {};

  // 1. Personal & Contact Info (Max 20 pts)
  let contactScore = 0;
  if (personalInfo?.fullName) contactScore += 4;
  if (personalInfo?.email) contactScore += 4;
  if (personalInfo?.phone) contactScore += 4;
  if (personalInfo?.linkedin) contactScore += 4;
  if (personalInfo?.github || personalInfo?.website) contactScore += 4;

  score += contactScore;
  if (contactScore < 16) {
    feedback.push('Add all primary contact links (LinkedIn, GitHub, and Portfolio) to optimize recruiter reach.');
  }

  // 2. Professional Summary (Max 15 pts)
  if (personalInfo?.summary && personalInfo.summary.length > 50) {
    score += 15;
  } else if (personalInfo?.summary) {
    score += 8;
    feedback.push('Expand your professional summary to 2-3 sentences highlighting your specialization and career objectives.');
  } else {
    feedback.push('Include a compelling executive summary at the top of your resume.');
  }

  // 3. Education (Max 15 pts)
  if (education && education.length > 0) {
    const hasDegree = education.some(e => e.degree && e.institution);
    if (hasDegree) score += 15;
    else score += 8;
  } else {
    feedback.push('Add your college education, degree, and graduation timeline.');
  }

  // 4. Experience & Internships (Max 20 pts)
  if (experience && experience.length > 0) {
    const hasMetrics = experience.some(e =>
      /\d+%|\$\d+|\d+\s*(users|clients|requests|ms|times)/i.test(e.description || '')
    );
    if (hasMetrics) {
      score += 20;
    } else {
      score += 14;
      feedback.push('Incorporate quantifiable metrics into experience bullet points (e.g., "improved latency by 35%", "scaled to 10k users").');
    }
  } else {
    score += 5;
    feedback.push('Add prior internships, open-source contributions, or campus leadership roles.');
  }

  // 5. Technical Projects (Max 15 pts)
  if (projects && projects.length >= 2) {
    const hasLinks = projects.some(p => p.liveLink || p.githubLink);
    if (hasLinks) score += 15;
    else {
      score += 10;
      feedback.push('Add direct GitHub or live deployment URLs for your key technical projects.');
    }
  } else if (projects && projects.length === 1) {
    score += 8;
    feedback.push('Highlight at least 2-3 substantial technical projects showcasing diverse skills.');
  } else {
    feedback.push('Showcase your technical capability with full-stack or specialized projects.');
  }

  // 6. Skills Classification (Max 15 pts)
  let skillCount = 0;
  if (skills?.technical) skillCount += skills.technical.length;
  if (skills?.frameworks) skillCount += skills.frameworks.length;
  if (skills?.tools) skillCount += skills.tools.length;

  if (skillCount >= 8) {
    score += 15;
  } else if (skillCount >= 4) {
    score += 9;
    feedback.push('Enrich your technical skills section with core languages, frameworks, and modern developer tools.');
  } else {
    feedback.push('List relevant technologies, libraries, and cloud platforms to match recruiter keyword queries.');
  }

  const finalScore = Math.min(100, Math.max(0, score));

  return {
    score: finalScore,
    feedback: feedback.length > 0 ? feedback : ['Your resume is well-structured and fully ATS compliant!']
  };
}

/**
 * ATS Scorer for raw plain-text resume content (from uploaded PDF/DOCX/TXT)
 * Uses simple string matching — no regex on user-controlled keyword strings.
 */
function calculateATSScoreFromText(text) {
  let score = 0;
  const feedback = [];
  const lowerText = (text || '').toLowerCase();

  // 1. Contact Info (Max 20 pts)
  let contactScore = 0;
  if (/@[\w.]+\.\w{2,}/.test(lowerText)) contactScore += 5;           // email
  if (/(\+?\d[\d\s\-().]{7,}\d)/.test(lowerText)) contactScore += 5;  // phone
  if (lowerText.includes('linkedin')) contactScore += 5;               // LinkedIn
  if (lowerText.includes('github') || lowerText.includes('portfolio')) contactScore += 5; // GitHub/portfolio
  score += contactScore;
  if (contactScore < 15) {
    feedback.push('Ensure your resume includes email, phone, LinkedIn, and GitHub/portfolio links.');
  }

  // 2. Professional Summary / Objective (Max 15 pts)
  if (/summary|objective|profile|about me/i.test(lowerText)) {
    score += 15;
  } else {
    score += 5;
    feedback.push('Add a professional summary or objective section to improve ATS ranking.');
  }

  // 3. Education Section (Max 15 pts)
  if (/education|university|college|bachelor|master|b\.tech|m\.tech|b\.e\b|m\.e\b|b\.sc|degree/i.test(lowerText)) {
    score += 15;
  } else {
    feedback.push('Add an Education section with degree, institution, and graduation year.');
  }

  // 4. Experience / Work History (Max 20 pts)
  if (/experience|internship|work history|employment|worked at|position/i.test(lowerText)) {
    const hasMetrics = /\d+%|\$\d+|\d+\s*(users|clients|requests|ms|times|projects)/i.test(lowerText);
    if (hasMetrics) {
      score += 20;
    } else {
      score += 12;
      feedback.push('Strengthen your experience section with quantifiable metrics (e.g., "reduced latency by 35%", "scaled to 10k users").');
    }
  } else {
    score += 5;
    feedback.push('Add an Experience section with internships, jobs, or open-source contributions.');
  }

  // 5. Projects (Max 15 pts)
  if (/projects?|github\.com|live demo|deployed/i.test(lowerText)) {
    score += 15;
  } else {
    score += 5;
    feedback.push('Include at least 2-3 technical projects with links and tech stacks to boost ATS score.');
  }

  // 6. Skills Section (Max 15 pts)
  // Use plain .includes() — avoids regex special-character errors (e.g. c++)
  const techKeywords = [
    'javascript', 'python', 'java', 'c++', 'typescript', 'react', 'node', 'express', 'mongodb',
    'postgresql', 'mysql', 'sql', 'docker', 'kubernetes', 'aws', 'git', 'html', 'css', 'rest',
    'api', 'machine learning', 'tensorflow', 'flask', 'django', 'spring', 'kotlin', 'swift',
    'angular', 'vue', 'next', 'redux', 'graphql', 'firebase', 'linux', 'bash'
  ];
  const matchedSkills = techKeywords.filter(kw => lowerText.includes(kw));

  if (matchedSkills.length >= 8) {
    score += 15;
  } else if (matchedSkills.length >= 4) {
    score += 9;
    feedback.push('Expand your skills section with more technologies, tools, and cloud platforms.');
  } else {
    score += 3;
    feedback.push('List relevant programming languages, frameworks, and developer tools in a dedicated Skills section.');
  }

  const finalScore = Math.min(100, Math.max(0, score));
  return {
    score: finalScore,
    feedback: feedback.length > 0 ? feedback : ['Your uploaded resume is well-structured and ATS-friendly!']
  };
}

module.exports = { calculateATSScore, calculateATSScoreFromText };
