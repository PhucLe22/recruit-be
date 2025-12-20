const fs = require('fs');
const path = require('path');
const Business = require('../../../app/models/Business');
const Job = require('../../../app/models/Job');

class ProfileController {
  // Show profile page
  async showProfile(req, res) {
    try {
      if (!req.user) {
        return res.redirect('/business/login');
      }

      const businessId = req.user.id || req.user._id;
      const errors = req.session.errors || [];
      const success = req.session.success || '';
      
      req.session.errors = null;
      req.session.success = null;

      const business = await Business.findById(businessId);
      
      if (!business) {
        req.session.errors = ['Không tìm thấy thông tin công ty'];
        return res.redirect('/business/dashboard');
      }

      // Get job statistics
      const [totalJobs, activeJobs] = await Promise.all([
        Job.countDocuments({ businessId }),
        Job.countDocuments({ businessId, isActive: true, expiryTime: { $gte: new Date() } })
      ]);

      res.render('business/profile', {
        layout: 'business',
        business,
        stats: { totalJobs, activeJobs },
        errors,
        success,
        title: 'Hồ sơ công ty',
        description: 'Quản lý thông tin công ty'
      });
    } catch (error) {
      console.error('Show profile error:', error);
      res.status(500).render('error', {
        message: 'Lỗi khi tải trang hồ sơ',
        error
      });
    }
  }

  // Update profile
  async updateProfile(req, res) {
    try {
      if (!req.user) {
        return res.redirect('/business/login');
      }

      const businessId = req.user.id || req.user._id;
      const {
        companyName,
        phone,
        address,
        website,
        description,
        industry,
        companySize,
        foundedYear
      } = req.body;

      const errors = [];

      // Validation
      if (!companyName || companyName.trim().length < 2) {
        errors.push('Tên công ty phải có ít nhất 2 ký tự');
      }

      if (website && !ProfileController.isValidUrl(website)) {
        errors.push('Website không hợp lệ');
      }

      if (foundedYear && (foundedYear < 1900 || foundedYear > new Date().getFullYear())) {
        errors.push('Năm thành lập không hợp lệ');
      }

      if (errors.length > 0) {
        req.session.errors = errors;
        return res.redirect('/business/profile');
      }

      const business = await Business.findById(businessId);
      
      if (!business) {
        req.session.errors = ['Không tìm thấy thông tin công ty'];
        return res.redirect('/business/profile');
      }

      // Update business info
      business.companyName = companyName.trim();
      business.phone = phone ? phone.trim() : null;
      business.address = {
        street: address?.street?.trim() || null,
        city: address?.city?.trim() || null,
        state: address?.state?.trim() || null,
        country: address?.country?.trim() || 'Vietnam',
        zipCode: address?.zipCode?.trim() || null
      };
      business.website = website ? website.trim() : null;
      business.description = description ? description.trim() : null;
      business.industry = industry ? industry.trim() : null;
      business.companySize = companySize || null;
      business.foundedYear = foundedYear ? parseInt(foundedYear) : null;

      await business.save();

      // Update session if using session-based auth
      if (req.session.business) {
        req.session.business.companyName = business.companyName;
      }

      req.session.success = 'Cập nhật hồ sơ thành công!';
      res.redirect('/business/profile');
    } catch (error) {
      console.error('Update profile error:', error);
      req.session.errors = ['Đã xảy ra lỗi trong quá trình cập nhật'];
      res.redirect('/business/profile');
    }
  }

  // Show change password page
  showChangePasswordPage(req, res) {
    try {
      if (!req.user) {
        return res.redirect('/business/login');
      }

      const errors = req.session.errors || [];
      const success = req.session.success || [];
      
      req.session.errors = null;
      req.session.success = null;

      res.render('business/change-password', {
        layout: 'business/main',
        errors,
        success,
        title: 'Đổi mật khẩu',
        description: 'Thay đổi mật khẩu đăng nhập'
      });
    } catch (error) {
      console.error('Show change password error:', error);
      res.status(500).render('error', {
        message: 'Lỗi khi tải trang đổi mật khẩu',
        error
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      if (!req.user) {
        return res.redirect('/business/login');
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;

      const errors = [];

      // Validation
      if (!currentPassword) {
        errors.push('Mật khẩu hiện tại là bắt buộc');
      }

      if (!newPassword || newPassword.length < 6) {
        errors.push('Mật khẩu mới phải có ít nhất 6 ký tự');
      }

      if (newPassword !== confirmPassword) {
        errors.push('Mật khẩu xác nhận không khớp');
      }

      if (errors.length > 0) {
        req.session.errors = errors;
        return res.redirect('/business/change-password');
      }

      const business = await Business.findById(req.user.id || req.user._id);
      
      if (!business) {
        req.session.errors = ['Không tìm thấy thông tin công ty'];
        return res.redirect('/business/change-password');
      }

      // Check current password
      const isCurrentPasswordValid = await business.comparePassword(currentPassword);
      
      if (!isCurrentPasswordValid) {
        req.session.errors = ['Mật khẩu hiện tại không đúng'];
        return res.redirect('/business/change-password');
      }

      // Update password
      business.password = newPassword;
      await business.save();

      req.session.success = 'Đổi mật khẩu thành công!';
      res.redirect('/business/change-password');
    } catch (error) {
      console.error('Change password error:', error);
      req.session.errors = ['Đã xảy ra lỗi trong quá trình đổi mật khẩu'];
      res.redirect('/business/change-password');
    }
  }

  // Upload logo
  async uploadLogo(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please select a logo file'
        });
      }

      // Additional file validation
      const file = req.file;
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      
      if (!allowedMimes.includes(file.mimetype)) {
        // Delete the uploaded file if it's not a valid image
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        
        return res.status(400).json({
          success: false,
          message: 'Only image files (jpeg, jpg, png, gif, webp) are allowed'
        });
      }

      // Check file size (additional validation)
      const maxSize = 2 * 1024 * 1024; // 2MB for logos
      if (file.size > maxSize) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        
        return res.status(400).json({
          success: false,
          message: 'Logo file size cannot exceed 2MB'
        });
      }

      const businessId = req.user.id || req.user._id;
      const logoPath = `/uploads/logos/${file.filename}`;

      try {
        // Get old logo to delete it later
        const oldBusiness = await Business.findById(businessId).select('logoPath');
        
        // Update business's logo in database
        const business = await Business.findByIdAndUpdate(
          businessId,
          { $set: { logoPath } },
          { new: true, runValidators: true }
        );

        if (!business) {
          return res.status(404).json({
            success: false,
            message: 'Business not found'
          });
        }

        // Delete old logo file if it exists and is not default
        if (oldBusiness && oldBusiness.logoPath && 
            fs.existsSync(path.join(__dirname, '../../../public', oldBusiness.logoPath))) {
          fs.unlinkSync(path.join(__dirname, '../../../public', oldBusiness.logoPath));
        }

        // Update session if using session-based auth
        if (req.session.business) {
          req.session.business.logoPath = logoPath;
        }

        res.json({
          success: true,
          message: 'Logo uploaded successfully',
          logoPath: logoPath
        });

      } catch (dbError) {
        // If database update fails, delete the uploaded file
        console.error('Database error during logo upload:', dbError);
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        
        throw dbError;
      }

    } catch (error) {
      console.error('Upload logo error:', error);
      
      // Handle multer errors specifically
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Logo file size cannot exceed 2MB'
        });
      }
      
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Only one logo file can be uploaded'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error uploading logo. Please try again.',
        error: error.message
      });
    }
  }

  // Delete logo
  async deleteLogo(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const business = await Business.findById(req.user.id || req.user._id);
      
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      // TODO: Delete actual file from filesystem
      if (business.logoPath) {
        const logoPath = path.join(__dirname, '../../../public', business.logoPath);
        
        try {
          if (fs.existsSync(logoPath)) {
            fs.unlinkSync(logoPath);
          }
        } catch (fileError) {
          console.error('Error deleting logo file:', fileError);
        }
      }

      // Remove logo from database
      business.logoPath = null;
      await business.save();

      // Update session if using session-based auth
      if (req.session.business) {
        req.session.business.logoPath = null;
      }

      res.json({
        success: true,
        message: 'Logo deleted successfully'
      });
    } catch (error) {
      console.error('Delete logo error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting logo',
        error: error.message
      });
    }
  }

  async deleteCV(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const businessId = req.user.id || req.user._id;

      try {
        // Get business to find CV path
        const business = await Business.findById(businessId);
        
        if (!business) {
          return res.status(404).json({
            success: false,
            message: 'Business not found'
          });
        }

        // Delete CV file if it exists
        if (business.cvPath) {
          const cvFilePath = path.join(__dirname, '../../../public', business.cvPath);
          
          try {
            if (fs.existsSync(cvFilePath)) {
              fs.unlinkSync(cvFilePath);
            }
          } catch (fileError) {
            console.error('Error deleting CV file:', fileError);
          }
        }

        // Update business to remove CV information
        await Business.findByIdAndUpdate(
          businessId,
          { 
            $unset: { 
              cvPath: 1, 
              cvFilename: 1, 
              cvUploadedAt: 1 
            } 
          },
          { new: true, runValidators: true }
        );

        res.json({
          success: true,
          message: 'CV deleted successfully'
        });

      } catch (dbError) {
        console.error('Database error during CV deletion:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Error deleting CV. Please try again.',
          error: dbError.message
        });
      }

    } catch (error) {
      console.error('Delete CV error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting CV. Please try again.',
        error: error.message
      });
    }
  }

  static isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

module.exports = new ProfileController();
