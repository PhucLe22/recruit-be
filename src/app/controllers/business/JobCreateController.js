const Job = require('../../../app/models/Job');
const JobField = require('../../../app/models/JobField');
const Business = require('../../../app/models/Business');

class JobCreateController {
  // Show create job form
  showCreateJobForm(req, res) {
    try {
      if (!req.session.business) {
        return res.redirect('/business/login');
      }

      const errors = req.session.errors || [];
      const success = req.session.success || '';
      const formData = req.session.formData || {};
      
      req.session.errors = null;
      req.session.success = null;
      req.session.formData = null;

      res.render('business/create-job', {
        layout: 'business/main',
        errors,
        success,
        formData,
        title: 'Đăng tin tuyển dụng',
        description: 'Tạo tin tuyển dụng mới'
      });
    } catch (error) {
      console.error('Error showing create job form:', error);
      res.status(500).render('error', {
        message: 'Lỗi khi tải trang tạo tin',
        error
      });
    }
  }

  // Process job creation
  async createJob(req, res) {
    try {
      if (!req.session.business) {
        return res.redirect('/business/login');
      }

      const {
        title,
        type,
        field,
        city,
        address,
        salary,
        salaryMin,
        salaryMax,
        experienceLevel,
        description,
        requirements,
        benefits,
        expiryTime,
        skills
      } = req.body;

      const errors = [];

      // Validation
      if (!title || title.trim().length < 5) {
        errors.push('Tiêu đề công việc phải có ít nhất 5 ký tự');
      }

      if (!type) {
        errors.push('Loại hình công việc là bắt buộc');
      }

      if (!field) {
        errors.push('Lĩnh vực là bắt buộc');
      }

      if (!city) {
        errors.push('Địa điểm làm việc là bắt buộc');
      }

      if (!description || description.trim().length < 20) {
        errors.push('Mô tả công việc phải có ít nhất 20 ký tự');
      }

      if (!requirements || requirements.trim().length < 20) {
        errors.push('Yêu cầu công việc phải có ít nhất 20 ký tự');
      }

      // Salary validation
      let salaryValue = null;
      if (salary) {
        salaryValue = parseInt(salary);
        if (isNaN(salaryValue) || salaryValue <= 0) {
          errors.push('Mức lương phải là số dương');
        }
      } else if (salaryMin && salaryMax) {
        const min = parseInt(salaryMin);
        const max = parseInt(salaryMax);
        if (isNaN(min) || isNaN(max) || min <= 0 || max <= 0) {
          errors.push('Mức lương phải là số dương');
        } else if (min >= max) {
          errors.push('Lương tối thiểu phải nhỏ hơn lương tối đa');
        }
      }

      // Check business subscription limits
      const business = await Business.findById(req.session.business._id);
      if (!business.canPostJob()) {
        errors.push('Bạn đã đạt giới hạn đăng tin. Vui lòng nâng cấp gói đăng ký.');
      }

      if (errors.length > 0) {
        req.session.errors = errors;
        req.session.formData = req.body;
        return res.redirect('/business/create-job');
      }

      // Create job
      const jobData = {
        title: title.trim(),
        businessId: business._id,
        type,
        field,
        city,
        address: address ? address.trim() : null,
        description: description.trim(),
        requirements: requirements.trim(),
        benefits: benefits ? benefits.trim() : null,
        experienceLevel,
        skills: skills ? skills.split(',').map(s => s.trim()).filter(s => s) : [],
        expiryTime: new Date(expiryTime || Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        isActive: true,
        applicationCount: 0
      };

      // Set salary
      if (salaryValue) {
        jobData.salary = salaryValue;
      } else if (salaryMin && salaryMax) {
        jobData.salaryMin = parseInt(salaryMin);
        jobData.salaryMax = parseInt(salaryMax);
      }

      const job = new Job(jobData);
      await job.save();

      // Update business job stats
      await business.updateJobStats();

      req.session.success = 'Đăng tin tuyển dụng thành công!';
      res.redirect('/business/manage-jobs');
    } catch (error) {
      console.error('Create job error:', error);
      req.session.errors = ['Đã xảy ra lỗi trong quá trình đăng tin'];
      req.session.formData = req.body;
      res.redirect('/business/create-job');
    }
  }

  // Show edit job form
  async showEditJobForm(req, res) {
    try {
      if (!req.session.business) {
        return res.redirect('/business/login');
      }

      const { id } = req.params;
      const errors = req.session.errors || [];
      const success = req.session.success || '';
      
      req.session.errors = null;
      req.session.success = null;

      const job = await Job.findById(id);
      
      if (!job || job.businessId.toString() !== req.session.business._id) {
        req.session.errors = ['Tin tuyển dụng không tồn tại hoặc bạn không có quyền chỉnh sửa'];
        return res.redirect('/business/manage-jobs');
      }

      res.render('business/edit-job', {
        layout: 'business/main',
        errors,
        success,
        job,
        title: 'Chỉnh sửa tin tuyển dụng',
        description: 'Cập nhật thông tin tin tuyển dụng'
      });
    } catch (error) {
      console.error('Error showing edit job form:', error);
      res.status(500).render('error', {
        message: 'Lỗi khi tải trang chỉnh sửa tin',
        error
      });
    }
  }

  // Process job update
  async updateJob(req, res) {
    try {
      if (!req.session.business) {
        return res.redirect('/business/login');
      }

      const { id } = req.params;
      const {
        title,
        type,
        field,
        city,
        address,
        salary,
        salaryMin,
        salaryMax,
        experienceLevel,
        description,
        requirements,
        benefits,
        expiryTime,
        skills,
        isActive
      } = req.body;

      const errors = [];

      // Validation (similar to create)
      if (!title || title.trim().length < 5) {
        errors.push('Tiêu đề công việc phải có ít nhất 5 ký tự');
      }

      if (!type) {
        errors.push('Loại hình công việc là bắt buộc');
      }

      if (!city) {
        errors.push('Địa điểm làm việc là bắt buộc');
      }

      if (errors.length > 0) {
        req.session.errors = errors;
        return res.redirect(`/business/edit-job/${id}`);
      }

      const job = await Job.findById(id);
      
      if (!job || job.businessId.toString() !== req.session.business._id) {
        req.session.errors = ['Tin tuyển dụng không tồn tại hoặc bạn không có quyền chỉnh sửa'];
        return res.redirect('/business/manage-jobs');
      }

      // Update job
      job.title = title.trim();
      job.type = type;
      job.field = field;
      job.city = city;
      job.address = address ? address.trim() : null;
      job.description = description.trim();
      job.requirements = requirements.trim();
      job.benefits = benefits ? benefits.trim() : null;
      job.experienceLevel = experienceLevel;
      job.skills = skills ? skills.split(',').map(s => s.trim()).filter(s => s) : [];
      job.expiryTime = new Date(expiryTime || job.expiryTime);
      job.isActive = isActive === 'true';

      // Update salary
      if (salary) {
        job.salary = parseInt(salary);
        job.salaryMin = null;
        job.salaryMax = null;
      } else if (salaryMin && salaryMax) {
        job.salary = null;
        job.salaryMin = parseInt(salaryMin);
        job.salaryMax = parseInt(salaryMax);
      }

      await job.save();

      req.session.success = 'Cập nhật tin tuyển dụng thành công!';
      res.redirect('/business/manage-jobs');
    } catch (error) {
      console.error('Update job error:', error);
      req.session.errors = ['Đã xảy ra lỗi trong quá trình cập nhật'];
      res.redirect(`/business/edit-job/${req.params.id}`);
    }
  }

  // Delete job
  async deleteJob(req, res) {
    try {
      if (!req.session.business) {
        return res.redirect('/business/login');
      }

      const { id } = req.params;

      const job = await Job.findById(id);
      
      if (!job || job.businessId.toString() !== req.session.business._id) {
        req.session.errors = ['Tin tuyển dụng không tồn tại hoặc bạn không có quyền xóa'];
        return res.redirect('/business/manage-jobs');
      }

      await Job.findByIdAndDelete(id);

      // Update business job stats
      const business = await Business.findById(req.session.business._id);
      await business.updateJobStats();

      req.session.success = 'Xóa tin tuyển dụng thành công!';
      res.redirect('/business/manage-jobs');
    } catch (error) {
      console.error('Delete job error:', error);
      req.session.errors = ['Đã xảy ra lỗi trong quá trình xóa tin'];
      res.redirect('/business/manage-jobs');
    }
  }
}

module.exports = new JobCreateController();
