/* =============================================
   HOME PAGE JAVASCRIPT
   ============================================= */

// =============================================
// Recommendations Rendering
// =============================================
function renderRecommendations() {
    if (typeof window.__recommendations === 'undefined') return;
    const recommendations = window.__recommendations;
    const recommendationsGrid = document.getElementById("recommendationsGrid");
    if (!recommendationsGrid || !recommendations || recommendations.length === 0) return;

    recommendationsGrid.innerHTML = '';

    recommendations.forEach((rec, index) => {
        const job = rec.job;
        const matchScore = rec.matchScore;

        const card = document.createElement("div");
        card.className = "recommendation-card";
        card.style.animationDelay = `${index * 0.1}s`;
        card.style.animation = 'fadeInUp 0.6s ease both';

        if (matchScore >= 95) {
            card.classList.add('high-match');
        } else if (matchScore >= 80) {
            card.classList.add('medium-match');
        } else {
            card.classList.add('good-match');
        }

        const companyIcons = ['fa-building', 'fa-laptop', 'fa-chart-line', 'fa-code', 'fa-paint-brush'];
        const gradients = [
            'linear-gradient(135deg, #48bb78, #38a169)',
            'linear-gradient(135deg, #4299e1, #3182ce)',
            'linear-gradient(135deg, #ed8936, #dd6b20)'
        ];

        const companyName = job.companyName || 'Công ty';
        const iconIndex = companyName.toLowerCase().charCodeAt(0) % companyIcons.length;
        const gradientIndex = Math.floor((matchScore - 70) / 10) % gradients.length;
        const selectedIcon = companyIcons[iconIndex];
        const selectedGradient = gradients[gradientIndex];

        let reasonText = '';
        if (rec.reasons && rec.reasons.length > 0) {
            reasonText = rec.reasons[0];
        } else {
            if (matchScore >= 95) {
                reasonText = 'Công việc này hoàn toàn phù hợp với kinh nghiệm và kỹ năng của bạn';
            } else if (matchScore >= 80) {
                reasonText = 'Phù hợp tốt với hồ sơ và sở thích của bạn';
            } else {
                reasonText = 'Có thể phù hợp với định hướng phát triển của bạn';
            }
        }

        card.innerHTML = `
            <div class="recommendation-score">${Math.round(matchScore)}%</div>
            <div class="job-header">
                <div class="job-title-row">
                    <div class="company-logo" style="background: ${selectedGradient};">
                        <i class="fas ${selectedIcon}"></i>
                    </div>
                    <div class="job-title-container">
                        <h3 class="recommendation-title" title="${job.title}">${job.title}</h3>
                        <p class="company-name">${companyName}</p>
                    </div>
                </div>
                <div class="job-meta">
                    <span class="job-tag salary">${job.salary || 'Thỏa thuận'}</span>
                    <span class="job-tag">${job.city || 'Hà Nội'}</span>
                    <span class="job-tag">${job.type || 'Full-time'}</span>
                </div>
            </div>

            <div class="recommendation-reason">
                <i class="fas fa-lightbulb"></i>
                ${reasonText}
            </div>

            <div class="job-details">
                <div class="job-detail-item">
                    <i class="fas fa-briefcase"></i>
                    <span>${job.type || 'Full-time'}</span>
                </div>
                <div class="job-detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${job.createdAt}</span>
                </div>
            </div>
            <a href="/jobs/${job.slug || job._id}" class="apply-btn">
                <i class="fas fa-paper-plane"></i>
                Ứng tuyển ngay
            </a>
        `;

        recommendationsGrid.appendChild(card);
    });
}

// =============================================
// Jobs Rendering (basic)
// =============================================
var allJobs = window.__validJobs || [];
var jobsToShow = 6;
var currentIndex = 0;

function renderJobs() {
    var jobsGrid = document.getElementById("jobsGrid3");
    if (!jobsGrid) {
        console.warn('jobsGrid3 not found, skipping renderJobs');
        return;
    }
    var jobsToLoad = allJobs.slice(currentIndex, currentIndex + jobsToShow);

    if (currentIndex === 0) {
        jobsGrid.innerHTML = '';
    }

    jobsToLoad.forEach(function (job, index) {
        var jobCard = document.createElement("div");
        jobCard.className = "job-card";
        jobCard.setAttribute('data-job-id', job._id || job.id);
        jobCard.style.animationDelay = index * 0.1 + 's';
        jobCard.style.animation = 'fadeInUp 0.6s ease both';

        var companyIcons = ['fa-building', 'fa-laptop', 'fa-chart-line', 'fa-code', 'fa-paint-brush', 'fa-heartbeat', 'fa-graduation-cap', 'fa-shopping-bag', 'fa-rocket', 'fa-globe', 'fa-coins', 'fa-microscope'];
        var gradients = [
            'linear-gradient(135deg, #2563eb, #1d4ed8)',
            'linear-gradient(135deg, #f093fb, #f5576c)',
            'linear-gradient(135deg, #4facfe, #00f2fe)',
            'linear-gradient(135deg, #43e97b, #38f9d7)',
            'linear-gradient(135deg, #fa709a, #fee140)',
            'linear-gradient(135deg, #30cfd0, #330867)',
            'linear-gradient(135deg, #a8edea, #fed6e3)',
            'linear-gradient(135deg, #ff9a9e, #fecfef)'
        ];

        var companyName = job.companyName || 'Công ty';
        var iconIndex = companyName.toLowerCase().charCodeAt(0) % companyIcons.length;
        var gradientIndex = companyName.toLowerCase().charCodeAt(1) % gradients.length;
        var selectedIcon = companyIcons[iconIndex];
        var selectedGradient = gradients[gradientIndex];

        jobCard.innerHTML = `
            <div class="job-header">
                <div class="job-title-row">
                    <div class="company-logo" style="background: ${selectedGradient};">
                        ${job.companyLogo ?
                `<img src="${job.companyLogo}" alt="${companyName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                 <i class="fas ${selectedIcon}" style="display:none;"></i>` :
                `<i class="fas ${selectedIcon}"></i>`
            }
                    </div>
                    <div class="job-title-container">
                        <h3 class="job-title" title="${job.title}">${job.title}</h3>
                        <p class="company-name">${companyName}</p>
                    </div>
                </div>
                <div class="job-meta">
                    <span class="job-tag salary">${job.salary || 'Thỏa thuận'}</span>
                    <span class="job-tag">${job.city || 'Hà Nội'}</span>
                    <span class="job-tag">${job.type || 'Full-time'}</span>
                </div>
            </div>
            <div class="job-details">
                <div class="job-detail-item">
                    <i class="fas fa-briefcase"></i>
                    <span>${job.type || 'Full-time'}</span>
                </div>
                <div class="job-detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${job.createdAt || 'Gần đây'}</span>
                </div>
            </div>
            <a href="/jobs/${job.slug || job._id}" class="apply-btn">
                <i class="fas fa-paper-plane"></i>
                Ứng tuyển ngay
            </a>
        `;

        jobsGrid.appendChild(jobCard);
    });

    currentIndex += jobsToShow;

    var loadMoreBtn = document.getElementById('loadMoreBtn');
    if (currentIndex >= allJobs.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'inline-flex';
    }
}

// Variable to track loading state for basic load more
var isBasicLoading = false;

function loadMoreJobsBasic() {
    if (isBasicLoading) return;

    var loadMoreBtn = document.getElementById('loadMoreBtn');
    var jobsGrid = document.getElementById('jobsGrid');

    isBasicLoading = true;
    loadMoreBtn.disabled = true;
    loadMoreBtn.classList.add('loading');
    loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';

    setTimeout(function () {
        var jobsToLoad = allJobs.slice(currentIndex, currentIndex + jobsToShow);

        jobsToLoad.forEach(function (job, index) {
            var jobCard = document.createElement("div");
            jobCard.className = "job-card";
            jobCard.setAttribute('data-job-id', job._id || job.id);
            jobCard.style.animationDelay = index * 0.1 + 's';
            jobCard.style.animation = 'fadeInUp 0.6s ease both';

            var companyIcons = ['fa-building', 'fa-laptop', 'fa-chart-line', 'fa-code', 'fa-paint-brush', 'fa-heartbeat', 'fa-graduation-cap', 'fa-shopping-bag', 'fa-rocket', 'fa-globe', 'fa-coins', 'fa-microscope'];
            var gradients = [
                'linear-gradient(135deg, #2563eb, #1d4ed8)',
                'linear-gradient(135deg, #f093fb, #f5576c)',
                'linear-gradient(135deg, #4facfe, #00f2fe)',
                'linear-gradient(135deg, #43e97b, #38f9d7)',
                'linear-gradient(135deg, #fa709a, #fee140)',
                'linear-gradient(135deg, #30cfd0, #330867)',
                'linear-gradient(135deg, #a8edea, #fed6e3)',
                'linear-gradient(135deg, #ff9a9e, #fecfef)'
            ];

            var companyName = job.companyName || 'Công ty';
            var iconIndex = companyName.toLowerCase().charCodeAt(0) % companyIcons.length;
            var gradientIndex = companyName.toLowerCase().charCodeAt(1) % gradients.length;
            var selectedIcon = companyIcons[iconIndex];
            var selectedGradient = gradients[gradientIndex];

            jobCard.innerHTML = `
                <div class="job-header">
                    <div class="job-title-row">
                        <div class="company-logo" style="background: ${selectedGradient};">
                            ${job.companyLogo ?
                    `<img src="${job.companyLogo}" alt="${companyName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                <i class="fas ${selectedIcon}" style="display: none;"></i>` :
                    `<i class="fas ${selectedIcon}"></i>`
                }
                        </div>
                        <div class="job-info">
                            <h3 class="job-title">${job.title}</h3>
                            <p class="company-name">${companyName}</p>
                        </div>
                    </div>
                    <div class="job-meta">
                        <span class="job-salary">${job.salary || 'Thương lượng thỏa thuận'}</span>
                        <span class="job-location">${job.location || 'Địa điểm'}</span>
                    </div>
                </div>
                <div class="job-description">
                    <p>${job.description ? job.description.substring(0, 150) + '...' : 'Mô tả công việc sẽ được cập nhật'}</p>
                </div>
                <div class="job-footer">
                    <span class="job-type">${job.type || 'Full-time'}</span>
                    <span class="job-posted">${job.createdAt ? new Date(job.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}</span>
                    <a href="/jobs/${job._id}/apply" class="apply-btn">
                        <i class="fas fa-paper-plane"></i>
                        Ứng tuyển ngay
                    </a>
                </div>
            `;

            if (jobsGrid) jobsGrid.appendChild(jobCard);
        });

        currentIndex += jobsToShow;

        if (currentIndex >= allJobs.length) {
            loadMoreBtn.style.display = 'none';
        }

        isBasicLoading = false;
        loadMoreBtn.disabled = false;
        loadMoreBtn.classList.remove('loading');
        loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i> Tải thêm công việc';
    }, 300);
}

function scrollToJobs() {
    document.getElementById('jobsSection').scrollIntoView({
        behavior: 'smooth'
    });
}

// Auto-scroll for horizontal jobs grid
(function () {
    var jobsGrid = document.getElementById('jobsGrid');
    if (jobsGrid) {
        var scrollAmount = 0;
        var scrollDirection = 1;
        var isAutoScrolling = true;

        function autoScroll() {
            if (!isAutoScrolling) return;

            var maxScroll = jobsGrid.scrollWidth - jobsGrid.clientWidth;
            if (maxScroll <= 0) return;

            scrollAmount += scrollDirection * 1;

            if (scrollAmount >= maxScroll) {
                scrollAmount = maxScroll;
                scrollDirection = -1;
                setTimeout(function () { isAutoScrolling = true; }, 2000);
            } else if (scrollAmount <= 0) {
                scrollAmount = 0;
                scrollDirection = 1;
                setTimeout(function () { isAutoScrolling = true; }, 2000);
            }

            jobsGrid.scrollLeft = scrollAmount;
            requestAnimationFrame(autoScroll);
        }

        setTimeout(function () { autoScroll(); }, 3000);

        jobsGrid.addEventListener('mouseenter', function () { isAutoScrolling = false; });
        jobsGrid.addEventListener('mouseleave', function () {
            isAutoScrolling = true;
            setTimeout(function () { autoScroll(); }, 1000);
        });
        jobsGrid.addEventListener('touchstart', function () { isAutoScrolling = false; });
        jobsGrid.addEventListener('touchend', function () {
            isAutoScrolling = true;
            setTimeout(function () { autoScroll(); }, 2000);
        });
    }
})();

// =============================================
// Enhanced Infinite Scroll for Jobs Section
// =============================================
document.addEventListener('DOMContentLoaded', function () {
    var jobsGrid3 = document.getElementById('jobsGrid3');
    var loadingSpinner = document.getElementById('loadingSpinner');
    var loadingSkeleton = document.getElementById('loadingSkeleton');
    var endMessage = document.getElementById('endMessage');
    var loadMoreBtn = document.getElementById('loadMoreBtn');
    var filterTabs = document.querySelectorAll('.filter-tab');
    var scrollToTop = document.getElementById('scrollToTop');
    var fabRefresh = document.getElementById('fabRefresh');
    var currentPage = 1;
    var isLoading = false;
    var hasMoreJobs = true;
    var currentFilter = 'all';
    var jobsPerPage = 6;

    // Real job data from database (passed from server via window.__validJobs)
    var databaseJobs = window.__validJobs || [];
    console.log('Loaded jobs from database:', databaseJobs.length, 'jobs');

    // Initialize jobs grid
    loadInitialJobs();

    // Filter tab functionality
    filterTabs.forEach(function (tab) {
        tab.addEventListener('click', async function () {
            filterTabs.forEach(function (t) { t.classList.remove('active'); });
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            await resetAndLoadJobs();
        });
    });

    // Scroll to top functionality
    if (scrollToTop) {
        scrollToTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Debounce function
    function debounce(func, wait) {
        var timeout;
        return function () {
            var args = arguments;
            var context = this;
            clearTimeout(timeout);
            timeout = setTimeout(function () { func.apply(context, args); }, wait);
        };
    }

    var debouncedResetAndLoadJobs = debounce(async function () {
        await resetAndLoadJobs();
    }, 300);

    // Refresh functionality
    if (fabRefresh) {
        fabRefresh.addEventListener('click', async function () {
            this.classList.add('spinning');
            await debouncedResetAndLoadJobs();
            var self = this;
            setTimeout(function () { self.classList.remove('spinning'); }, 1000);
        });
    }

    // Infinite scroll with Intersection Observer
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting && !isLoading && hasMoreJobs &&
                loadMoreBtn && loadMoreBtn.style.display !== 'none') {
                loadMoreJobs();
            }
        });
    }, { rootMargin: '100px' });

    // Show/hide scroll to top button
    window.addEventListener('scroll', function () {
        if (scrollToTop) {
            if (window.scrollY > 500) {
                scrollToTop.style.opacity = '1';
                scrollToTop.style.pointerEvents = 'auto';
            } else {
                scrollToTop.style.opacity = '0';
                scrollToTop.style.pointerEvents = 'none';
            }
        }
    });

    function loadInitialJobs() {
        if (!jobsGrid3) return;
        jobsGrid3.innerHTML = '';
        currentPage = 1;
        hasMoreJobs = true;
        if (endMessage) endMessage.style.display = 'none';

        if (loadingSkeleton) loadingSkeleton.style.display = 'grid';

        loadInitialJobsFromServer();
    }

    // Make loadMoreJobs globally accessible
    window.loadMoreJobs = async function () {
        if (isLoading || !hasMoreJobs) return;

        isLoading = true;
        if (loadingSpinner) loadingSpinner.style.display = 'flex';

        if (loadMoreBtn) loadMoreBtn.style.display = 'none';

        try {
            var response = await fetch('/jobs/api/load-more?page=' + currentPage + '&limit=' + jobsPerPage + '&filter=' + currentFilter);
            var data = await response.json();

            if (data.jobs && data.jobs.length > 0) {
                data.jobs.forEach(function (job, index) {
                    var processedJob = Object.assign({}, job, {
                        logo: getCompanyIcon(job.company)
                    });
                    var jobCard = createJobCard(processedJob, index);
                    jobsGrid3.appendChild(jobCard);
                });

                currentPage++;
                var hasMore = data.hasMore;

                if (!hasMore) {
                    if (endMessage) endMessage.style.display = 'flex';
                    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                    observer.disconnect();
                } else {
                    if (loadMoreBtn) loadMoreBtn.style.display = 'inline-flex';
                }
            } else {
                if (endMessage) endMessage.style.display = 'flex';
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                observer.disconnect();
            }
        } catch (error) {
            console.error('Error loading more jobs:', error);
            if (loadMoreBtn) loadMoreBtn.style.display = 'inline-flex';
            loadJobs();
        } finally {
            isLoading = false;
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }
    };

    function loadJobs() {
        var jobsToLoad = getFilteredJobs().slice((currentPage - 1) * jobsPerPage, currentPage * jobsPerPage);

        jobsToLoad.forEach(function (job, index) {
            var jobCard = createJobCard(job, index);
            jobsGrid3.appendChild(jobCard);
        });

        var jobCards = jobsGrid3.querySelectorAll('.job-card-modern');
        if (jobCards.length > 0) {
            observer.observe(jobCards[jobCards.length - 1]);
        }

        currentPage++;

        if (jobsToLoad.length < jobsPerPage || (currentPage - 1) * jobsPerPage >= getFilteredJobs().length) {
            hasMoreJobs = false;
            if (endMessage) endMessage.style.display = 'flex';
            observer.disconnect();
        }
    }

    function getFilteredJobs() {
        var filteredJobs = databaseJobs.map(function (job) {
            return Object.assign({}, job, {
                id: job._id,
                logo: getCompanyIcon(job.companyName),
                salary: job.salary || 'Thỏa thuận',
                location: job.city || 'Hà Nội',
                type: job.type || 'Full-time',
                description: job.description || 'Cơ hội việc làm tuyệt vời đang chờ bạn...',
                time: job.createdAt || 'Gần đây',
                featured: job.isRecommended || false,
                remote: job.type === 'Remote' || job.type === 'remote'
            });
        });

        switch (currentFilter) {
            case 'remote':
                return filteredJobs.filter(function (job) { return job.remote || job.type === 'Remote'; });
            case 'featured':
                return filteredJobs.filter(function (job) { return job.featured; });
            default:
                return filteredJobs;
        }
    }

    function getCompanyIcon(companyName) {
        if (!companyName) return 'fa-building';

        var name = companyName.toLowerCase();
        if (name.includes('tech') || name.includes('software')) return 'fa-laptop-code';
        if (name.includes('design') || name.includes('creative')) return 'fa-paint-brush';
        if (name.includes('marketing') || name.includes('digital')) return 'fa-chart-line';
        if (name.includes('finance') || name.includes('bank')) return 'fa-dollar-sign';
        if (name.includes('education') || name.includes('school')) return 'fa-graduation-cap';
        if (name.includes('health') || name.includes('medical')) return 'fa-heartbeat';
        if (name.includes('shop') || name.includes('retail')) return 'fa-shopping-cart';
        if (name.includes('food') || name.includes('restaurant')) return 'fa-utensils';
        if (name.includes('travel') || name.includes('hotel')) return 'fa-plane';

        return 'fa-building';
    }

    function createJobCard(job, index) {
        var card = document.createElement('div');
        card.className = 'job-card-modern';
        card.style.setProperty('--card-index', index);

        var title = job.title || 'Vị trí chưa xác định';
        var company = job.companyName || job.company || 'Công ty chưa xác định';
        var salary = job.salary || 'Thỏa thuận';
        var location = job.location || 'Chưa cập nhật';
        var type = job.type || 'Full-time';
        var experience = job.experience;
        var description = job.description || 'Chưa có mô tả công việc';
        var city = job.city || '';
        var workTime = job.workTime || '8 tiếng/ngày';
        var technique = job.technique || 'Kỹ năng cơ bản';

        var getTimeAgo = function (date) {
            if (!date) return 'Gần đây';
            var now = new Date();
            var jobDate = new Date(date);
            var diffTime = Math.abs(now - jobDate);
            var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) return '1 ngày trước';
            if (diffDays <= 7) return diffDays + ' ngày trước';
            if (diffDays <= 30) return Math.ceil(diffDays / 7) + ' tuần trước';
            return Math.ceil(diffDays / 30) + ' tháng trước';
        };

        var time = getTimeAgo(job.createdAt || job.postedDate);
        var isRemote = job.type === 'Remote' || job.remote;
        var isFeatured = job.featured || job.isFeatured;

        card.innerHTML = `
            <div class="job-card-header">
                <div class="job-company-logo">
                    ${job.logoPath ?
                `<img src="${job.logoPath}" alt="${company}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                         style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px;">
                         <i class="fas ${job.logoPath || 'fa-building'}" style="display: none;"></i>` :
                `<i class="fas ${job.logoPath || 'fa-building'}"></i>`
            }
                </div>
                <div class="job-card-body">
                    <h3 class="job-title" title="${title}">${title}</h3>
                    <p class="job-company">
                        <i class="fas fa-building"></i>
                        ${company}
                    </p>
                    <div class="job-meta">
                        <span class="job-tag salary">
                            <i class="fas fa-dollar-sign"></i>
                            ${salary}
                        </span>
                        <span class="job-tag location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${location}
                        </span>
                        <span class="job-tag ${isRemote ? 'remote' : 'type'}">
                            <i class="fas ${isRemote ? 'fa-home' : 'fa-clock'}"></i>
                            ${type}
                        </span>
                        ${isFeatured ? '<span class="job-tag featured"><i class="fas fa-star"></i> Nổi bật</span>' : ''}
                    </div>
                </div>
            </div>
            <div class="job-description">
                <div class="description-text">${description}</div>
                <div class="job-requirements">
                    <div class="requirement-item">
                        <i class="fas fa-clock"></i>
                        <span>${workTime}</span>
                    </div>
                    ${technique ? `
                    <div class="requirement-item">
                        <i class="fas fa-tools"></i>
                        <span>${technique}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="job-footer">
                <span class="job-time">
                    <i class="fas fa-clock"></i>
                    ${time}
                </span>
                <div class="job-actions">
                    </button>
                    <a href="/jobs/${job.slug || job._id}" class="btn-apply">
                        <i class="fas fa-paper-plane"></i>
                        Ứng tuyển
                    </a>
                </div>
            </div>
        `;

        return card;
    }

    async function resetAndLoadJobs() {
        currentPage = 1;
        hasMoreJobs = true;
        isLoading = false;
        if (endMessage) endMessage.style.display = 'none';
        if (jobsGrid3) jobsGrid3.innerHTML = '';
        observer.disconnect();

        if (loadMoreBtn) loadMoreBtn.style.display = 'none';

        currentFilter = 'all';

        filterTabs.forEach(function (tab) {
            tab.classList.remove('active');
            if (tab.dataset.filter === 'all') {
                tab.classList.add('active');
            }
        });

        await loadInitialJobsFromServer();
    }

    async function loadInitialJobsFromServer() {
        if (loadingSkeleton) loadingSkeleton.style.display = 'grid';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';

        try {
            var response = await fetch('/jobs/api/load-more?page=1&limit=' + jobsPerPage + '&filter=' + currentFilter);
            var data = await response.json();

            if (loadingSkeleton) loadingSkeleton.style.display = 'none';

            if (data.jobs && data.jobs.length > 0) {
                data.jobs.forEach(function (job, index) {
                    var processedJob = Object.assign({}, job, {
                        logo: getCompanyIcon(job.company)
                    });
                    var jobCard = createJobCard(processedJob, index);
                    jobsGrid3.appendChild(jobCard);
                });

                currentPage = 2;
                var hasMore = data.hasMore;

                if (loadMoreBtn) {
                    loadMoreBtn.style.display = hasMore ? 'inline-flex' : 'none';
                }

                var jobCards = jobsGrid3.querySelectorAll('.job-card-modern');
                if (jobCards.length > 0 && hasMore) {
                    observer.observe(jobCards[jobCards.length - 1]);
                }

                if (!hasMore && endMessage) {
                    endMessage.style.display = 'flex';
                }
            } else {
                if (endMessage) endMessage.style.display = 'flex';
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading initial jobs:', error);
            if (loadingSkeleton) loadingSkeleton.style.display = 'none';
            loadInitialJobs();
        }
    }

    // Show notification function
    function showNotification(type, title, message, duration) {
        duration = duration || 5000;
        var notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            notificationContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
            document.body.appendChild(notificationContainer);
        }

        var notification = document.createElement('div');
        notification.className = 'notification notification-' + type;
        var borderColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
        notification.style.cssText = 'background: white; border-radius: 8px; padding: 16px; margin-bottom: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-left: 4px solid ' + borderColor + '; animation: slideInRight 0.3s ease;';

        var icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
        var iconColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';

        notification.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <i class="fas fa-${icon}" style="color: ${iconColor}; font-size: 20px; margin-top: 2px;"></i>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${title}</div>
                    <div style="color: #6b7280; font-size: 14px;">${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 18px;">&times;</button>
            </div>
        `;

        notificationContainer.appendChild(notification);

        setTimeout(function () {
            if (notificationContainer.contains(notification)) {
                notificationContainer.removeChild(notification);
            }
        }, duration);
    }

    // Toggle save job functionality
    window.toggleSave = async function (button) {
        try {
            var jobCard = button.closest('.job-card');
            var jobId = jobCard.dataset.jobId || jobCard.querySelector('.btn-apply').getAttribute('href').split('/').pop();

            if (!jobId) {
                console.error('Job ID not found');
                showNotification('error', 'Lỗi', 'Không tìm thấy ID công việc');
                return;
            }

            var isSaved = button.classList.contains('saved');
            var originalContent = button.innerHTML;

            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            var url = '/jobs/save/' + jobId;
            var method = isSaved ? 'DELETE' : 'POST';

            console.log('Making API call:', { url: url, method: method, jobId: jobId, isSaved: isSaved });

            var response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });

            console.log('API response status:', response.status);

            var result = await response.json();
            console.log('API response data:', result);

            if (response.ok) {
                button.classList.toggle('saved');
                var iconEl = button.querySelector('i');
                if (button.classList.contains('saved')) {
                    iconEl.classList.remove('far');
                    iconEl.classList.add('fas');
                    showNotification('success', 'Đã lưu', 'Công việc đã được lưu thành công');
                } else {
                    iconEl.classList.remove('fas');
                    iconEl.classList.add('far');
                    showNotification('success', 'Đã xóa', 'Công việc đã được xóa khỏi danh sách lưu');
                }
            } else {
                showNotification('error', 'Có lỗi xảy ra', result.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
                button.innerHTML = originalContent;
            }
        } catch (error) {
            console.error('Error saving/unsaving job:', error);

            if (error.message.includes('Failed to fetch')) {
                showNotification('error', 'Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
            } else if (error.message.includes('Authentication required')) {
                showNotification('error', 'Cần đăng nhập', 'Bạn cần đăng nhập để lưu công việc.');
            } else {
                showNotification('error', 'Có lỗi xảy ra', 'Đã có lỗi xảy ra. Vui lòng thử lại sau.');
            }
        } finally {
            button.disabled = false;
            if (!button.classList.contains('saved')) {
                button.innerHTML = '<i class="far fa-heart"></i>';
            } else {
                button.innerHTML = '<i class="fas fa-heart"></i>';
            }
        }
    };
});
