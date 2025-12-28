const AppliedJobs = require('../../models/AppliedJobs');
const Job = require('../../models/Job');
const User = require('../../models/User');
const CV = require('../../models/CV');
const fs = require('fs');
const path = require('path');

class SchelduleController {
    async show(req, res, next) {
        try {
            if (!req.account || !req.account.id) {
                return res.redirect('/login');
            }

            // Find all scheduled applications for this business
            const scheduledApps = await AppliedJobs.find({
                businessId: req.account.id,
                status: 'scheduled'
            })
            .populate({
                path: 'jobId',
                select: 'title'
            })
            .populate({
                path: 'userId',
                select: 'name email avatar'
            });

            // Format the data for the view
            const formattedData = scheduledApps.map(app => ({
                _id: app._id,
                username: app.userId?.name || 'N/A',
                email: app.userId?.email || 'N/A',
                status: app.status,
                jobName: app.jobId?.title || 'Job đã bị xóa',
                cvPath: app.cvPath,
                avatar: app.userId?.avatar,
                interviewTime: app.interviewTime,
                meetingLink: app.meetingLink,
                hasCV: !!app.cvPath
            }));

            res.render('business/scheduleList', {
                scheduleList: formattedData,
                user: req.user || null,
                isAuthenticated: req.isAuthenticated()
            });
        } catch (error) {
            console.error('Error in SchelduleController:', error);
            next(error);
        }
    }

    // Show applicants scheduled list with layout override
    async showApplicantsScheduledList(req, res, next) {
        // Override layout for this specific route
        const originalRender = res.render;
        res.render = function(view, options, callback) {
            options = options || {};
            options.layout = false;
            originalRender.call(this, view, options, callback);
        };
        next();
    }

    // View CV for an applicant with logging
    async viewApplicantCV(req, res, next) {
        console.log('CV route hit for ID:', req.params.id);
        return this.viewCV(req, res, next);
    }
    async viewCV(req, res, next) {
        try {
            if (!req.account || !req.account.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { id } = req.params;
            
            // Find the application
            const application = await AppliedJobs.findOne({
                _id: id,
                businessId: req.account.id
            })
            .populate('userId', 'name email')
            .populate('jobId', 'title');

            if (!application) {
                return res.status(404).json({ error: 'Application not found' });
            }

            // If CV path exists in the application
            if (application.cvPath) {
                const filePath = path.join(__dirname, '../../../public/uploads', application.cvPath);
                
                if (fs.existsSync(filePath)) {
                    const fileData = fs.readFileSync(filePath, 'utf-8');
                    return res.json({
                        success: true,
                        cvData: {
                            type: 'file',
                            fileName: path.basename(application.cvPath),
                            content: fileData,
                            mimeType: 'application/pdf' // Adjust based on actual file type
                        },
                        applicant: {
                            name: application.userId?.name,
                            email: application.userId?.email,
                            jobTitle: application.jobId?.title || 'N/A',
                            applicationId: application._id
                        }
                    });
                }
                return res.status(404).json({ 
                    success: false,
                    error: 'CV file not found',
                    applicant: {
                        name: application.userId?.name,
                        email: application.userId?.email,
                        jobTitle: application.jobId?.title || 'N/A',
                        applicationId: application._id
                    }
                });
            }

            // If no CV path, try to find in CV collection
            const cv = await CV.findOne({ userId: application.userId._id });
            if (!cv) {
                return res.status(404).json({ 
                    success: false,
                    error: 'CV not found in database',
                    applicant: {
                        name: application.userId?.name,
                        email: application.userId?.email,
                        jobTitle: application.jobId?.title || 'N/A',
                        applicationId: application._id
                    }
                });
            }

            // If CV data is stored directly in the document
            if (cv.cvData) {
                return res.json({
                    success: true,
                    cvData: {
                        type: 'data',
                        ...cv.cvData
                    },
                    applicant: {
                        name: application.userId?.name,
                        email: application.userId?.email,
                        jobTitle: application.jobId?.title || 'N/A',
                        applicationId: application._id
                    }
                });
            }

            // If CV is stored as a file
            if (cv.filePath) {
                const filePath = path.join(__dirname, '../../../public', cv.filePath);
                if (fs.existsSync(filePath)) {
                    const fileData = fs.readFileSync(filePath, 'utf-8');
                    return res.json({
                        success: true,
                        cvData: {
                            type: 'file',
                            fileName: path.basename(cv.filePath),
                            content: fileData,
                            mimeType: 'application/pdf' // Adjust based on actual file type
                        },
                        applicant: {
                            name: application.userId?.name,
                            email: application.userId?.email,
                            jobTitle: application.jobId?.title || 'N/A',
                            applicationId: application._id
                        }
                    });
                }
                return res.status(404).json({ 
                    success: false,
                    error: 'CV file not found',
                    cvData: cv.cvData ? {
                        type: 'data',
                        ...cv.cvData
                    } : null,
                    applicant: {
                        name: application.userId?.name,
                        email: application.userId?.email,
                        jobTitle: application.jobId?.title || 'N/A',
                        applicationId: application._id
                    }
                });
            }

            res.status(404).json({ 
                success: false,
                error: 'No CV data available',
                applicant: {
                    name: application.userId?.name,
                    email: application.userId?.email,
                    jobTitle: application.jobId?.title || 'N/A',
                    applicationId: application._id
                }
            });
            
        } catch (error) {
            console.error('Error viewing CV:', error);
            next(error);
        }
    }

    // Handle Server-Sent Events for real-time application updates
    handleApplicationStream(req, res) {
        const businessId = req.user?.id || req.user?._id || req.account?.id || req.account?._id;
        
        if (!businessId) {
            return res.status(401).end();
        }

        // Set headers for Server-Sent Events
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        // Send initial connection message
        res.write('data: {"type": "connected", "message": "Connected to applications stream"}\n\n');

        // Store the response to send updates later
        req.app.locals.applicationStreams = req.app.locals.applicationStreams || new Map();
        req.app.locals.applicationStreams.set(businessId, res);

        // Handle client disconnect
        req.on('close', () => {
            console.log(`Client disconnected from business ${businessId}`);
            if (req.app.locals.applicationStreams) {
                req.app.locals.applicationStreams.delete(businessId);
            }
        });

        req.on('aborted', () => {
            console.log(`Client aborted connection for business ${businessId}`);
            if (req.app.locals.applicationStreams) {
                req.app.locals.applicationStreams.delete(businessId);
            }
        });
    }

    // Helper method to send updates to connected clients
    static sendApplicationUpdate(app, businessId, application) {
        if (!app.locals.applicationStreams) {
            return;
        }
        
        const clientStream = app.locals.applicationStreams.get(businessId);
        
        if (clientStream && !clientStream.destroyed) {
            const message = {
                type: 'new_application',
                application: {
                    _id: application._id,
                    user_id: {
                        fullName: application.user_id?.fullName || 'Unknown User'
                    },
                    job_id: {
                        title: application.job_id?.title || 'Unknown Position'
                    },
                    applied_at: application.applied_at,
                    status: application.status
                }
            };
            
            clientStream.write(`data: ${JSON.stringify(message)}\n\n`);
            console.log(`Sent real-time update to business ${businessId}: New application for ${application.job_id?.title}`);
        }
    }

    // Static helper method to send updates to connected clients
    static sendApplicationUpdate(app, businessId, application) {
        if (!app.locals.applicationStreams) {
            return;
        }
        
        const clientStream = app.locals.applicationStreams.get(businessId);
        
        if (clientStream && !clientStream.destroyed) {
            const message = {
                type: 'new_application',
                application: {
                    _id: application._id,
                    user_id: {
                        fullName: application.user_id?.fullName || 'Unknown User'
                    },
                    job_id: {
                        title: application.job_id?.title || 'Unknown Position'
                    },
                    applied_at: application.applied_at,
                    status: application.status
                }
            };
            
            clientStream.write(`data: ${JSON.stringify(message)}\n\n`);
            console.log(`Sent real-time update to business ${businessId}: New application for ${application.job_id?.title}`);
        }
    }
}

module.exports = new SchelduleController();
