const SavedJob = require('../../models/SavedJobs');
const { multipleMongooseToObject } = require('../../../util/mongoose');

class SaveJobController {
    // [POST] /jobs/save/:jobId
    async saveJob(req, res, next) {
        try {
            if (!req.account || !req.account.id) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const userId = req.account.id;
            const jobId = req.params.jobId;

            // Kiểm tra xem job đã được lưu chưa
            const existingSavedJob = await SavedJob.findOne({ userId, jobId });
            console.log(jobId);
            if (existingSavedJob) {
                return res.status(400).json({ message: 'Job already saved' });
            }

            const newSavedJob = new SavedJob({ userId, jobId });
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
            if (!req.account || !req.account.id) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const userId = req.account.id;
            const jobId = req.params.jobId;

            // Tìm và xóa job đã lưu
            const result = await SavedJob.findOneAndDelete({ userId, jobId });

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
            if (!req.account || !req.account.id) {
                return res.status(401).json({ saved: false });
            }

            const userId = req.account.id;
            const jobId = req.params.jobId;

            const savedJob = await SavedJob.findOne({ userId, jobId });

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
            if (!req.account || !req.account.id) {
                return res.status(401).send('Unauthorized');
            }

            const userId = req.account.id;

            const savedJobs = await SavedJob.find({ userId }).populate('jobId');
            if (savedJobs.length === 0) {
                return res.status(404).json({ message: 'No saved jobs found' });
            }

            const jobs = savedJobs.map((saved) => saved.jobId);

            res.render('jobs/savedJobs', {
                jobs: multipleMongooseToObject(jobs),
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SaveJobController();
