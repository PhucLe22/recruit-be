/**
 * Utility functions for job analysis and skill extraction
 */

/**
 * Extract technical skills from job data
 * @param {Object} job - Job data object
 * @returns {string[]} Array of technical skills
 */
function extractTechnicalSkills(job) {
    const content =
        `${job.title} ${job.description} ${job.requirements}`.toLowerCase();

    const techSkills = [];
    const skillKeywords = {
        javascript: ['javascript', 'js', 'nodejs', 'react', 'vue', 'angular'],
        python: ['python', 'django', 'flask', 'fastapi'],
        java: ['java', 'spring', 'springboot'],
        sql: ['sql', 'mysql', 'postgresql', 'mongodb'],
        aws: ['aws', 'cloud', 'ec2', 's3'],
        docker: ['docker', 'kubernetes', 'container'],
    };

    Object.entries(skillKeywords).forEach(([skill, keywords]) => {
        if (keywords.some((keyword) => content.includes(keyword))) {
            techSkills.push(skill);
        }
    });

    return techSkills;
}

/**
 * Extract soft skills from job data
 * @param {Object} job - Job data object
 * @returns {string[]} Array of soft skills
 */
function extractSoftSkills(job) {
    const content = `${job.description} ${job.requirements}`.toLowerCase();

    const softSkills = [];
    const softSkillKeywords = {
        communication: ['communication', 'giao tiếp', 'presentation'],
        leadership: ['leadership', 'lãnh đạo', 'manager', 'team lead'],
        english: ['english', 'tiếng anh', 'english skills'],
        'problem-solving': [
            'problem solving',
            'analytical',
            'critical thinking',
        ],
    };

    Object.entries(softSkillKeywords).forEach(([skill, keywords]) => {
        if (keywords.some((keyword) => content.includes(keyword))) {
            softSkills.push(skill);
        }
    });

    return softSkills;
}

module.exports = {
    extractTechnicalSkills,
    extractSoftSkills,
};
