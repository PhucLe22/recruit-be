const Business = require('../../models/Business');
const Job = require('../../models/Job');

class BusinessListController {
    // Show list of all businesses
    async showBusinessList(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 3;
            const skip = (page - 1) * limit;

            // Get total count and paginated businesses in parallel
            const [total, businesses, jobs] = await Promise.all([
                Business.countDocuments({}),
                Business.find({}).skip(skip).limit(limit).lean(),
                Job.find({ businessId: { $exists: true, $ne: null } }).select('businessId').lean()
            ]);

            const totalPages = Math.ceil(total / limit);

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

            // Build page numbers array for template
            const pages = [];
            for (let i = 1; i <= totalPages; i++) {
                pages.push({ number: i, active: i === page });
            }

            res.render('business/list', {
                list: transformedBusinesses,
                layout: 'main',
                title: 'Danh sách doanh nghiệp',
                user: req.session.user || null,
                totalBusinesses: total,
                currentPage: page,
                totalPages,
                pages,
                hasPrevPage: page > 1,
                hasNextPage: page < totalPages,
                prevPage: page - 1,
                nextPage: page + 1,
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
