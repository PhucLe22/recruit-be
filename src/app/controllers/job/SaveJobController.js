const SavedJob = require('../../models/SavedJobs');
const Job = require('../../models/Job');
const { multipleMongooseToObject } = require('../../../util/mongoose');

class SaveJobController {
    // [POST] /jobs/save/:jobId
    async saveJob(req, res, next) {
        try {
            // Use session-based authentication like ApplyController
            if (!req.session || !req.session.user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const userId = req.session.user._id;
            const { jobId } = req.params;

            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // Fetch the job to get businessId
            const job = await Job.findById(jobId);
            if (!job) {
                return res.status(404).json({ message: 'Job not found' });
            }

            // Kiểm tra xem job đã được lưu chưa
            const existingSavedJob = await SavedJob.findOne({ user_id: userId, job_id: jobId });
            console.log("Checking if job is saved:", jobId, "for user:", userId);
            if (existingSavedJob) {
                return res.status(400).json({ message: 'Job already saved' });
            }

            const newSavedJob = new SavedJob({ 
                user_id: userId, 
                job_id: jobId, 
                business_id: job.businessId 
            });
            await newSavedJob.save();

            res.status(200).json({
                message: 'Job saved successfully',
                saved: true
            });
        } catch (error) {
            next(error);
        }
    }

    // [DELETE] /jobs/save/:jobId
    async unsaveJob(req, res, next) {
        try {
            // Use session-based authentication like ApplyController
            if (!req.session || !req.session.user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const userId = req.session.user._id;
            const { jobId } = req.params;

            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // Tìm và xóa job đã lưu
            const result = await SavedJob.findOneAndDelete({ user_id: userId, job_id: jobId });

            if (!result) {
                return res.status(404).json({ message: 'Job not found in saved jobs' });
            }

            res.status(200).json({
                message: 'Job unsaved successfully',
                saved: false
            });
        } catch (error) {
            next(error);
        }
    }

    // [GET] /jobs/saved/:jobId - Check if job is saved
    async checkJobSaved(req, res, next) {
        try {
            // Use session-based authentication like ApplyController
            if (!req.session || !req.session.user) {
                return res.status(401).json({ saved: false });
            }

            const userId = req.session.user._id;
            const { jobId } = req.params;

            if (!userId) {
                return res.status(401).json({ saved: false });
            }

            const savedJob = await SavedJob.findOne({ user_id: userId, job_id: jobId });

            res.status(200).json({
                saved: !!savedJob,
                savedJobId: savedJob ? savedJob._id : null
            });
        } catch (error) {
            next(error);
        }
    }
    // [GET] /jobs/saved
    async getSavedJobs(req, res, next) {
        try {
            // Use session-based authentication like ApplyController
            if (!req.session || !req.session.user) {
                return res.status(401).send('Unauthorized');
            }

            const userId = req.session.user._id;

            if (!userId) {
                return res.status(401).send('Unauthorized');
            }

            const savedJobs = await SavedJob.find({ user_id: userId }).populate('job_id');
            if (savedJobs.length === 0) {
                return res.status(404).json({ message: 'No saved jobs found' });
            }

            const jobs = savedJobs.map((saved) => saved.job_id);

            res.render('jobs/savedJobs', {
                jobs: multipleMongooseToObject(jobs),
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SaveJobController();
