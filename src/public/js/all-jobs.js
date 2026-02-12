document.addEventListener('DOMContentLoaded', function() {
  // Search and Filter Functionality
  const clearFiltersBtn = document.getElementById('clearFilters');
  const searchFilterForm = document.getElementById('searchFilterForm');
  const filterSelects = document.querySelectorAll('.filter-select');

  // Clear all filters
  clearFiltersBtn?.addEventListener('click', function() {
    // Clear search input
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
      searchInput.value = '';
    }

    // Clear all select filters
    filterSelects.forEach(select => {
      select.value = '';
    });

    // Submit form to reload page without filters
    searchFilterForm.submit();
  });

  // Auto-submit form on filter change
  filterSelects.forEach(select => {
    select.addEventListener('change', function() {
      searchFilterForm.submit();
    });
  });

  // Add search on Enter key
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchFilterForm.submit();
      }
    });
  }

  // Highlight active filters
  const urlParams = new URLSearchParams(window.location.search);
  filterSelects.forEach(select => {
    if (urlParams.get(select.name)) {
      select.style.borderColor = '#667eea';
      select.style.backgroundColor = '#f0f4ff';
    }
  });

  // Add hover effects to job cards
  const jobCards = document.querySelectorAll('.job-card');
  jobCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-5px) scale(1.02)';
    });

    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });
});
