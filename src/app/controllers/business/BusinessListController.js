const Business = require('../../models/Business');
const Job = require('../../models/Job');

class BusinessListController {
    // Show list of all businesses
    async showBusinessList(req, res, next) {
        try {
            const businesses = await Business.find({});

            const jobs = (await Job.find({})).filter(job => job.businessId);

            const transformedBusinesses = businesses.map(business => ({
                _id: business._id,
                id: business._id, // Add id field for template compatibility
                name: business.name || 'Chưa có tên công ty',
                description: business.description || 'Chưa có mô tả',
                location: (business.address?.city || business.address?.state) || 'Chưa cập nhật địa chỉ',
                logoUrl: business.logo || '/images/default-company.png',
                verified: business.isVerified || false,
                jobCount: jobs.filter(job => job.businessId && job.businessId.equals(business._id)).length,
                employeeCount: business.employeeCount || Math.floor(Math.random() * 500) + 50 // Mock data for now
            }));

            // Render the view with the transformed data
            res.render('business/list', {
                list: transformedBusinesses,
                layout: 'main', // Use main layout
                title: 'Danh sách doanh nghiệp',
                user: req.session.user || null
            });
        } catch (error) {
            console.error('Error in business list:', error);
            next(error);
        }
    }

    // API endpoint to get businesses as JSON
    async getBusinessesAPI(req, res, next) {
        try {
            const businesses = await Business.find({});

            const jobs = (await Job.find({})).filter(job => job.businessId);

            const transformedBusinesses = businesses.map(business => ({
                _id: business._id,
                id: business._id,
                name: business.name || 'Chưa có tên công ty',
                description: business.description || 'Chưa có mô tả',
                location: (business.address?.city || business.address?.state) || 'Chưa cập nhật địa chỉ',
                logoUrl: business.logo || '/images/default-company.png',
                verified: business.isVerified || false,
                jobCount: jobs.filter(job => job.businessId && job.businessId.equals(business._id)).length,
                employeeCount: business.employeeCount || Math.floor(Math.random() * 500) + 50
            }));

            res.json({
                success: true,
                data: transformedBusinesses
            });
        } catch (error) {
            console.error('Error in business list API:', error);
            next(error);
        }
    }
}

module.exports = new BusinessListController();
