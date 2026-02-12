// Global state
let currentFilters = {
  q: '',
  cities: [],
  types: [],
  fields: [],
  experienceLevel: '',
  salaryMin: null,
  salaryMax: null,
  sortBy: 'relevance',
  sortOrder: 'desc'
};

// DOM Elements
const toggleFiltersBtn = document.getElementById('toggleFilters');
const filterSection = document.getElementById('filterSection');
const applyFiltersBtn = document.getElementById('applyFilters');
const clearFiltersBtn = document.getElementById('clearFilters');
const clearAllFiltersBtn = document.getElementById('clearAllFilters');
const loadingSpinner = document.getElementById('loadingSpinner');
const jobResults = document.getElementById('jobResults');
const activeFiltersSection = document.getElementById('activeFiltersSection');
const activeFiltersList = document.getElementById('activeFiltersList');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize from server-rendered data
  const dataEl = document.getElementById('search-data');
  if (dataEl) {
    currentFilters.q = dataEl.dataset.keyword || '';
    currentFilters.sortBy = dataEl.dataset.sortBy || 'relevance';
    currentFilters.sortOrder = dataEl.dataset.sortOrder || 'desc';

    if (dataEl.dataset.cities) {
      try { currentFilters.cities = JSON.parse(dataEl.dataset.cities); } catch(e) {}
    }
    if (dataEl.dataset.types) {
      try { currentFilters.types = JSON.parse(dataEl.dataset.types); } catch(e) {}
    }
    if (dataEl.dataset.fields) {
      try { currentFilters.fields = JSON.parse(dataEl.dataset.fields); } catch(e) {}
    }
    if (dataEl.dataset.experienceLevel) {
      currentFilters.experienceLevel = dataEl.dataset.experienceLevel;
    }
  }

  initializeFilters();
  restoreFiltersFromURL();
  updateActiveFiltersDisplay();
  focusSearchInput();
  preserveSearchKeyword();
});

toggleFiltersBtn.addEventListener('click', function() {
  filterSection.classList.toggle('show');
  const icon = this.querySelector('i');
  if (filterSection.classList.contains('show')) {
    icon.className = 'fas fa-times';
  } else {
    icon.className = 'fas fa-filter';
  }
});

// Filter chip clicks
document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', function() {
    const filterType = this.dataset.filterType;
    const value = this.dataset.value;

    this.classList.toggle('active');

    if (filterType === 'experienceLevel') {
      // Single selection for experience
      document.querySelectorAll(`[data-filter-type="${filterType}"]`).forEach(c => {
        if (c !== this) c.classList.remove('active');
      });
      currentFilters[filterType] = this.classList.contains('active') ? value : '';
    } else {
      // Multiple selection for others
      const index = currentFilters[filterType].indexOf(value);
      if (index > -1) {
        currentFilters[filterType].splice(index, 1);
      } else {
        currentFilters[filterType].push(value);
      }
    }
  });
});

// Apply filters
applyFiltersBtn.addEventListener('click', applyFilters);
clearFiltersBtn.addEventListener('click', clearAllFilters);
clearAllFiltersBtn.addEventListener('click', clearAllFilters);

// Live search as user types (debounced)
let searchDebounceTimer = null;
document.getElementById('searchInput').addEventListener('input', function() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    updateCurrentFilters();
    performSearch();
  }, 400);
});

// Sort change
document.getElementById('sortBy').addEventListener('change', applyFilters);
document.getElementById('sortOrder').addEventListener('change', applyFilters);

// Salary filter
document.getElementById('applySalaryFilter').addEventListener('click', function() {
  const minVal = document.getElementById('salaryMin').value;
  const maxVal = document.getElementById('salaryMax').value;
  currentFilters.salaryMin = minVal ? parseInt(minVal) : null;
  currentFilters.salaryMax = maxVal ? parseInt(maxVal) : null;
  applyFilters();
});

function initializeFilters() {
  // Set initial filter states
  Object.keys(currentFilters).forEach(filterType => {
    if (Array.isArray(currentFilters[filterType])) {
      currentFilters[filterType].forEach(value => {
        const chip = document.querySelector(`[data-filter-type="${filterType}"][data-value="${value}"]`);
        if (chip) chip.classList.add('active');
      });
    } else if (currentFilters[filterType]) {
      const chip = document.querySelector(`[data-filter-type="${filterType}"][data-value="${currentFilters[filterType]}"]`);
      if (chip) chip.classList.add('active');
    }
  });

  // Set initial form values
  document.getElementById('sortBy').value = currentFilters.sortBy;
  document.getElementById('sortOrder').value = currentFilters.sortOrder;
}

function applyFilters() {
  updateCurrentFilters();
  performSearch();
}

function updateCurrentFilters() {
  currentFilters.q = document.getElementById('searchInput').value;
  currentFilters.sortBy = document.getElementById('sortBy').value;
  currentFilters.sortOrder = document.getElementById('sortOrder').value;
}

function performSearch() {
  showLoading();

  const params = new URLSearchParams();

  // Add search query
  if (currentFilters.q) params.append('q', currentFilters.q);

  // Add array filters
  currentFilters.cities.forEach(city => params.append('cities', city));
  currentFilters.types.forEach(type => params.append('types', type));
  currentFilters.fields.forEach(field => params.append('fields', field));

  // Add other filters
  if (currentFilters.experienceLevel) params.append('experienceLevel', currentFilters.experienceLevel);
  if (currentFilters.salaryMin) params.append('salaryMin', currentFilters.salaryMin);
  if (currentFilters.salaryMax) params.append('salaryMax', currentFilters.salaryMax);

  // Add sorting
  params.append('sortBy', currentFilters.sortBy);
  params.append('sortOrder', currentFilters.sortOrder);

  // Update URL without full page reload
  const newUrl = '/jobs/search-results?' + params.toString();
  window.history.pushState({filters: currentFilters}, '', newUrl);

  // Perform AJAX search instead of full navigation
  performAjaxSearch(params);
}

function performAjaxSearch(params) {
  fetch(`/jobs/api/search?${params.toString()}`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateJobResults(data);
        hideLoading();
      } else {
        // Fallback to full page reload if AJAX fails
        window.location.href = '/jobs/search-results?' + params.toString();
      }
    })
    .catch(error => {
      console.error('Search error:', error);
      // Fallback to full page reload if AJAX fails
      window.location.href = '/jobs/search-results?' + params.toString();
    });
}

function updateJobResults(data) {
  const jobResultsContainer = document.getElementById('jobResults');

  if (data.data && data.data.length > 0) {
    const jobsHTML = data.data.map(job => `
      <div class="job-card">
        <div class="status-badge status-${job.status || 'active'}">
          ${job.status === 'urgent' ? 'Gấp' : job.status === 'active' ? 'Đang tuyển' : job.status === 'closed' ? 'Đã đóng' : ''}
        </div>
        <div class="job-header">
          <img src="${job.logoPath || '/images/default-company.png'}" alt="${job.companyName}" class="company-logo" onerror="this.src='/images/default-company.png'">
          <div class="job-title">
            <h3>${job.title}</h3>
            <div class="company-name">${job.companyName}</div>
          </div>
        </div>
        <div class="job-details">
          <div class="detail-item">
            <i class="fas fa-briefcase"></i>
            <span>${job.type || 'Full-time'}</span>
          </div>
          <div class="detail-item">
            <i class="fas fa-clock"></i>
            <span>${job.workTime || 'Full-time'}</span>
          </div>
          <div class="detail-item">
            <i class="fas fa-map-marker-alt"></i>
            <span>${job.city || 'Địa điểm'}</span>
          </div>
          <div class="detail-item">
            <i class="fas fa-tags"></i>
            <span>${job.field || 'Ngành nghề'}</span>
          </div>
        </div>
        <div class="salary">
          <i class="fas fa-dollar-sign"></i>
          ${job.salary || 'Thỏa thuận'}
        </div>
        <div class="job-footer">
          <div class="posted-date">
            <i class="fas fa-calendar-alt"></i>
            ${job.formattedDate || 'Vừa mới'}
          </div>
          <a href="/jobs/${job.slug}" class="job-apply-btn">
            <i class="fas fa-eye"></i>
            Xem chi tiết
          </a>
        </div>
      </div>
    `).join('');

    jobResultsContainer.innerHTML = `<div class="job-grid">${jobsHTML}</div>`;
  } else {
    jobResultsContainer.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h2>Không tìm thấy công việc nào</h2>
        <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc của bạn</p>
        <button type="button" class="btn-primary-custom mt-3" onclick="clearAllFiltersAndSearch()">
          <i class="fas fa-redo"></i>
          Tìm lại từ đầu
        </button>
      </div>
    `;
  }
}

function hideLoading() {
  loadingSpinner.classList.remove('show');
  jobResults.style.display = 'block';
}

function clearAllFilters() {
  // Reset filter state
  currentFilters = {
    q: document.getElementById('searchInput').value,
    cities: [],
    types: [],
    fields: [],
    experienceLevel: '',
    salaryMin: null,
    salaryMax: null,
    sortBy: 'relevance',
    sortOrder: 'desc'
  };

  // Clear UI
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.remove('active');
  });

  document.getElementById('salaryMin').value = '';
  document.getElementById('salaryMax').value = '';
  document.getElementById('sortBy').value = 'relevance';
  document.getElementById('sortOrder').value = 'desc';

  updateActiveFiltersDisplay();

  // Perform search with cleared filters
  performSearch();
}

function clearAllFiltersAndSearch() {
  document.getElementById('searchInput').value = '';
  clearAllFilters();
}

function updateActiveFiltersDisplay() {
  const activeFilters = [];

  // Count active filters
  let filterCount = 0;

  if (currentFilters.cities.length > 0) {
    filterCount += currentFilters.cities.length;
    currentFilters.cities.forEach(city => activeFilters.push({type: 'cities', value: city, label: city}));
  }

  if (currentFilters.types.length > 0) {
    filterCount += currentFilters.types.length;
    currentFilters.types.forEach(type => activeFilters.push({type: 'types', value: type, label: type}));
  }

  if (currentFilters.fields.length > 0) {
    filterCount += currentFilters.fields.length;
    currentFilters.fields.forEach(field => activeFilters.push({type: 'fields', value: field, label: field}));
  }

  if (currentFilters.experienceLevel) {
    filterCount++;
    activeFilters.push({type: 'experienceLevel', value: currentFilters.experienceLevel, label: currentFilters.experienceLevel});
  }

  if (currentFilters.salaryMin || currentFilters.salaryMax) {
    filterCount++;
    const salaryLabel = `${currentFilters.salaryMin || ''}-${currentFilters.salaryMax || ''} $`;
    activeFilters.push({type: 'salary', value: 'salary', label: `Lương: ${salaryLabel}`});
  }

  // Update filter count in header
  document.getElementById('activeFilterCount').textContent = `${filterCount} bộ lọc`;

  // Show/hide active filters section
  if (activeFilters.length > 0) {
    activeFiltersSection.style.display = 'block';
    activeFiltersList.innerHTML = activeFilters.map(filter =>
      `<span class="active-filter-tag">
        ${filter.label}
        <span class="remove-filter" onclick="removeFilter('${filter.type}', '${filter.value}')">&times;</span>
      </span>`
    ).join('');
  } else {
    activeFiltersSection.style.display = 'none';
  }
}

function removeFilter(filterType, value) {
  if (filterType === 'experienceLevel') {
    currentFilters.experienceLevel = '';
    const chip = document.querySelector(`[data-filter-type="${filterType}"][data-value="${value}"]`);
    if (chip) chip.classList.remove('active');
  } else if (filterType === 'salary') {
    currentFilters.salaryMin = null;
    currentFilters.salaryMax = null;
    document.getElementById('salaryMin').value = '';
    document.getElementById('salaryMax').value = '';
  } else if (Array.isArray(currentFilters[filterType])) {
    const index = currentFilters[filterType].indexOf(value);
    if (index > -1) {
      currentFilters[filterType].splice(index, 1);
    }
    const chip = document.querySelector(`[data-filter-type="${filterType}"][data-value="${value}"]`);
    if (chip) chip.classList.remove('active');
  }

  updateActiveFiltersDisplay();
  performSearch();
}

function showLoading() {
  loadingSpinner.classList.add('show');
  jobResults.style.display = 'none';
}

function focusSearchInput() {
  if (!document.getElementById('searchInput').value) {
    document.getElementById('searchInput').focus();
  }
}

// Handle back/forward browser navigation
window.addEventListener('popstate', function(event) {
  if (event.state) {
    // Restore filters from URL instead of reloading
    restoreFiltersFromURL();
    updateActiveFiltersDisplay();
    // Perform search without adding to history again
    const params = new URLSearchParams(window.location.search);
    performAjaxSearch(params);
  }
});

// Enhanced search keyword preservation
function preserveSearchKeyword() {
  const searchInput = document.getElementById('searchInput');
  const urlParams = new URLSearchParams(window.location.search);
  const keywordFromUrl = urlParams.get('q');

  // Ensure the search input always has the current keyword value
  if (keywordFromUrl && searchInput.value !== keywordFromUrl) {
    searchInput.value = keywordFromUrl;
  }
}

function restoreFiltersFromURL() {
  const urlParams = new URLSearchParams(window.location.search);

  // Restore search query
  if (urlParams.get('q')) {
    currentFilters.q = urlParams.get('q');
    document.getElementById('searchInput').value = currentFilters.q;
  }

  // Restore array filters
  ['cities', 'types', 'fields'].forEach(param => {
    if (urlParams.getAll(param)) {
      currentFilters[param] = urlParams.getAll(param);
    }
  });

  // Restore single value filters
  ['experienceLevel', 'salaryMin', 'salaryMax', 'sortBy', 'sortOrder'].forEach(param => {
    if (urlParams.get(param)) {
      currentFilters[param] = param === 'salaryMin' || param === 'salaryMax'
        ? parseInt(urlParams.get(param))
        : urlParams.get(param);
    }
  });

  // Update UI elements
  document.getElementById('sortBy').value = currentFilters.sortBy;
  document.getElementById('sortOrder').value = currentFilters.sortOrder;

  if (currentFilters.salaryMin) document.getElementById('salaryMin').value = currentFilters.salaryMin;
  if (currentFilters.salaryMax) document.getElementById('salaryMax').value = currentFilters.salaryMax;
}

// Utility functions
function sub(a, b) { return a - b; }
function add(a, b) { return a + b; }
function gt(a, b) { return a > b; }
function lt(a, b) { return a < b; }
function eq(a, b) { return a === b; }
