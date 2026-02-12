// Show notification function
function showNotification(type, title, message, duration = 5000) {
    const notificationCart = document.getElementById('notificationCart');
    const notification = document.createElement('div');
    notification.className = `notification-item ${type}`;

    const icon = type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'exclamation-circle';

    notification.innerHTML = `
        <div class="notification-icon ${type}">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <p class="notification-message">${message}</p>
        </div>
        <button class="notification-close" aria-label="Đóng thông báo">&times;</button>
    `;

    notificationCart.appendChild(notification);

    // Trigger reflow to enable animation
    void notification.offsetWidth;
    notification.classList.add('show');

    // Close button handler
    const closeBtn = notification.querySelector('.notification-close');
    const closeNotification = () => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    };

    closeBtn.addEventListener('click', closeNotification);

    // Auto-remove after duration
    setTimeout(closeNotification, duration);

    return notification;
}

// Function to show messages
function showMessage(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;

    document.body.appendChild(alertDiv);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 3000);
}

document.addEventListener('DOMContentLoaded', function () {
    // Handle contact field display (email vs phone)
    const contactDisplay = document.getElementById('contact-display');
    if (contactDisplay) {
        const phone = contactDisplay.dataset.contact;
        const email = contactDisplay.dataset.email;

        if (phone && phone.trim()) {
            // Use business phone number
            contactDisplay.innerHTML = `<a href="tel:${phone}">${phone}</a>`;
        } else if (email && email.trim()) {
            // Fallback to job email if no phone
            contactDisplay.innerHTML = `<a href="mailto:${email}">${email}</a>`;
        } else {
            contactDisplay.innerHTML = '<span>Chưa cập nhật</span>';
        }
    }

    // Save job functionality
    const saveJobBtn = document.getElementById('saveJobBtn');
    if (saveJobBtn) {
        saveJobBtn.addEventListener('click', async function (e) {
            e.preventDefault();

            const jobId = this.dataset.jobId;
            const isSaved = this.classList.contains('saved');
            const originalContent = this.innerHTML;

            // Show loading state
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

            try {
                const url = isSaved ? `/jobs/save/${jobId}` : `/jobs/save/${jobId}`;
                const method = isSaved ? 'DELETE' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    credentials: 'same-origin' // Include cookies for session auth
                });

                const result = await response.json();

                if (response.ok) {
                    // Toggle button state
                    if (isSaved) {
                        // Job was saved, now unsaving
                        this.classList.remove('saved');
                        this.innerHTML = '<i class="fas fa-bookmark"></i> Lưu tin tuyển dụng';
                    } else {
                        // Job was not saved, now saving
                        this.classList.add('saved');
                        this.innerHTML = '<i class="fas fa-check-circle"></i> Đã lưu';
                    }

                    // Show success message
                    showMessage(result.message || result.message, 'success');
                } else {
                    // Show error message
                    showMessage(result.message || 'Đã có lỗi xảy ra', 'error');
                    // Restore original button state
                    this.innerHTML = originalContent;
                }
            } catch (error) {
                console.error('Error saving/unsaving job:', error);
                showMessage('Đã có lỗi xảy ra. Vui lòng thử lại.', 'error');
                // Restore original button state
                this.innerHTML = originalContent;
            } finally {
                this.disabled = false;
            }
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.job-info-section, .job-description-section, .sidebar-card').forEach(el => {
        observer.observe(el);
    });

    // Print functionality
    const printBtn = document.querySelector('.print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // Share functionality
    const shareBtn = document.querySelector('.share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: document.title,
                    text: document.querySelector('.job-title-main')?.textContent || '',
                    url: window.location.href
                });
            } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(window.location.href);

                // Show feedback
                const originalText = shareBtn.innerHTML;
                shareBtn.innerHTML = '<i class="fas fa-check"></i> Đã sao chép!';
                setTimeout(() => {
                    shareBtn.innerHTML = originalText;
                }, 2000);
            }
        });
    }

    // CV file input display handler
    const cvFileInput = document.getElementById('cv-file-input');
    const cvFileNameSpan = document.getElementById('cv-file-name');
    const cvFileLabel = document.querySelector('.cv-file-label');

    if (cvFileInput) {
        cvFileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                const maxSize = 5 * 1024 * 1024; // 5MB

                if (file.size > maxSize) {
                    showNotification('error', 'File quá lớn', 'Kích thước file tối đa là 5MB.');
                    this.value = '';
                    cvFileNameSpan.textContent = 'Chọn file CV (PDF, DOCX - tối đa 5MB)';
                    if (cvFileLabel) cvFileLabel.classList.remove('has-file');
                    return;
                }

                cvFileNameSpan.textContent = file.name;
                if (cvFileLabel) cvFileLabel.classList.add('has-file');
            } else {
                cvFileNameSpan.textContent = 'Chọn file CV (PDF, DOCX - tối đa 5MB)';
                if (cvFileLabel) cvFileLabel.classList.remove('has-file');
            }
        });
    }

    // Handle form submission with loading state and notifications
    const applyForm = document.querySelector('form[action*="/jobs/apply/"]');
    if (applyForm) {
        applyForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Client-side validation: check if user has existing CV or uploaded a new one
            const hasExistingCV = document.querySelector('.cv-status-info') !== null;
            const fileInput = document.getElementById('cv-file-input');
            const hasNewFile = fileInput && fileInput.files && fileInput.files.length > 0;

            if (!hasExistingCV && !hasNewFile) {
                showNotification('error', 'Thiếu CV', 'Vui lòng tải lên CV để ứng tuyển.');
                return;
            }

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalContent = submitBtn.innerHTML;
            const formAction = this.action;
            const formData = new FormData(this);
            let applySuccess = false;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

            try {
                const response = await fetch(formAction, {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    applySuccess = true;
                    showNotification(
                        'success',
                        'Thành công!',
                        result.message || 'Đơn ứng tuyển của bạn đã được gửi thành công.'
                    );

                    // Update UI to show applied state
                    const applySection = document.querySelector('.apply-section');
                    if (applySection) {
                        applySection.querySelector('form').remove();
                        const appliedBtn = document.createElement('button');
                        appliedBtn.className = 'apply-btn applied';
                        appliedBtn.disabled = true;
                        appliedBtn.innerHTML = '<i class="fas fa-check-circle"></i> Đã ứng tuyển';
                        applySection.appendChild(appliedBtn);
                    }
                } else {
                    // Check if it's an "already applied" message
                    if (result.message && result.message.includes('already applied')) {
                        showNotification(
                            'warning',
                            'Đã ứng tuyển!',
                            'Bạn đã ứng tuyển cho công việc này rồi. Hãy kiểm tra các công việc khác!'
                        );
                    } else {
                        showNotification(
                            'error',
                            'Có lỗi xảy ra',
                            result.message || 'Đã xảy ra lỗi khi gửi đơn ứng tuyển. Vui lòng thử lại.'
                        );
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification(
                    'error',
                    'Lỗi kết nối',
                    'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.'
                );
            } finally {
                // Only restore button if apply was NOT successful
                if (!applySuccess) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalContent;
                }
            }
        });
    }

    // Enhance accessibility
    document.addEventListener('keydown', function (e) {
        // Press '/' to focus on job search
        if (e.key === '/' && !e.target.matches('input, textarea, button')) {
            e.preventDefault();
            const searchInput = document.querySelector('input[type="search"]');
            if (searchInput) {
                searchInput.focus();
            }
        }
    });
});
