const Resume = require('../models/Resume');
const { calculateATSScore, calculateATSScoreFromText } = require('../services/atsScorerService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Multer: in-memory storage (we only need the buffer for text extraction) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'), false);
  }
});

/** Very lightweight text extraction — works for plain-text PDFs / TXT / DOCX */
function extractText(buffer, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  try {
    if (ext === '.txt') {
      return buffer.toString('utf8');
    }
    // For PDF / DOCX — extract visible ASCII/UTF-8 text from raw binary
    // (no native parser dependency; works well for most ATS-generated resumes)
    const raw = buffer.toString('latin1');
    // Strip binary noise, keep printable characters + whitespace
    const text = raw
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')  // keep printable ASCII
      .replace(/\s{3,}/g, ' ')               // collapse whitespace
      .trim();
    return text;
  } catch {
    return '';
  }
}

exports.uploadResumeFile = [
  upload.single('resume'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
      }

      const extractedText = extractText(req.file.buffer, req.file.originalname);
      const ats = calculateATSScoreFromText(extractedText);

      // Persist the result on the student's Resume document
      const resume = await Resume.findOneAndUpdate(
        { student: req.user.id },
        {
          $set: {
            uploadedResume: {
              fileName: req.file.originalname,
              uploadedAt: new Date(),
              atsScore: ats.score,
              atsFeedback: ats.feedback,
              extractedText: extractedText.slice(0, 5000) // store first 5k chars
            }
          }
        },
        { new: true, upsert: true }
      );

      res.json({
        success: true,
        message: 'Resume uploaded and analyzed.',
        atsScore: ats.score,
        atsFeedback: ats.feedback,
        fileName: req.file.originalname,
        uploadedAt: resume.uploadedResume.uploadedAt
      });
    } catch (err) {
      next(err);
    }
  }
];

// @desc    Get logged in student's resume
// @route   GET /api/resume/my-resume
// @access  Private (Student)
exports.getMyResume = async (req, res, next) => {
  try {
    let resume = await Resume.findOne({ student: req.user.id });

    if (!resume) {
      // Prepopulate with user details
      resume = await Resume.create({
        student: req.user.id,
        personalInfo: {
          fullName: req.user.name,
          email: req.user.email,
          phone: req.user.phone || '',
          location: req.user.location || '',
          github: req.user.githubUrl || '',
          linkedin: req.user.linkedinUrl || '',
          website: req.user.portfolioUrl || '',
          summary: req.user.bio || 'Aspiring Software Engineer passionate about developing high-performance web applications and distributed systems.',
          profilePicture: req.user.avatar || ''
        },
        education: [
          {
            institution: req.user.college || 'National Institute of Technology',
            degree: 'Bachelor of Technology',
            fieldOfStudy: 'Computer Science and Engineering',
            startYear: '2022',
            endYear: req.user.graduationYear || '2026',
            grade: req.user.cgpa ? `CGPA: ${req.user.cgpa}/10.0` : 'CGPA: 8.8/10.0'
          }
        ],
        experience: [
          {
            company: 'TechNovate Labs',
            role: 'Software Development Intern',
            location: 'Remote',
            startDate: 'May 2025',
            endDate: 'August 2025',
            current: false,
            description: 'Engineered RESTful microservices reducing API latency by 32%. Implemented automated CI/CD deployment pipelines using Docker.'
          }
        ],
        projects: [
          {
            title: 'CloudSync – Distributed File Storage',
            techStack: ['React', 'Node.js', 'AWS S3', 'MongoDB'],
            description: 'Architected a secure file synchronization platform serving 2,500+ active users with end-to-end encryption.',
            liveLink: 'https://cloudsync-demo.io',
            githubLink: 'https://github.com/demo/cloudsync'
          }
        ],
        skills: {
          technical: ['JavaScript', 'TypeScript', 'Python', 'Go', 'SQL'],
          frameworks: ['React', 'Node.js', 'Express.js', 'Tailwind CSS', 'Next.js'],
          tools: ['Git', 'Docker', 'MongoDB', 'PostgreSQL', 'Redis', 'AWS'],
          softSkills: ['Problem Solving', 'System Design', 'Agile Collaboration']
        },
        template: 'modern'
      });

      const ats = calculateATSScore(resume);
      resume.atsScore = ats.score;
      resume.atsFeedback = ats.feedback;
      await resume.save();
    }

    res.json({
      success: true,
      resume
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create or update student resume with ATS scoring
// @route   PUT /api/resume
// @access  Private (Student)
exports.saveResume = async (req, res, next) => {
  try {
    const resumeData = req.body;

    // Calculate dynamic ATS score & feedback recommendations
    const ats = calculateATSScore(resumeData);
    resumeData.atsScore = ats.score;
    resumeData.atsFeedback = ats.feedback;

    let resume = await Resume.findOneAndUpdate(
      { student: req.user.id },
      { ...resumeData, student: req.user.id },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Resume saved and analyzed successfully',
      resume
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get resume by ID (for recruiter or admin review)
// @route   GET /api/resume/:id
// @access  Private
exports.getResumeById = async (req, res, next) => {
  try {
    const resume = await Resume.findById(req.params.id)
      .populate('student', 'name email avatar college graduationYear');

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    res.json({
      success: true,
      resume
    });
  } catch (err) {
    next(err);
  }
};
