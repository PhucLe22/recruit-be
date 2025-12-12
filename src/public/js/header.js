// Simple Header Dropdown Functionality with Scroll Effects
document.addEventListener('DOMContentLoaded', function() {
  console.log('Header script loaded');

  // Get ALL dropdown types including mega-dropdown and user-dropdown
  const dropdowns = document.querySelectorAll('.header .dropdown, .header .mega-dropdown, .header .user-dropdown');
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const header = document.querySelector('.header');

  console.log('Found dropdowns:', dropdowns.length);
  console.log('Found mobile toggle:', !!mobileMenuToggle);
  console.log('Found nav menu:', !!navMenu);
  console.log('Found header:', !!header);

  // Disable Bootstrap dropdown functionality to prevent conflicts
  if (typeof bootstrap !== 'undefined' && bootstrap.Dropdown) {
    dropdowns.forEach(function(dropdown) {
      const bsDropdown = bootstrap.Dropdown.getInstance(dropdown);
      if (bsDropdown) {
        bsDropdown.dispose();
      }
    });
  }

  // Remove Bootstrap data attributes and event listeners
  dropdowns.forEach(function(dropdown) {
    dropdown.removeAttribute('data-toggle');
    dropdown.removeAttribute('data-bs-toggle');
    const dropdownToggle = dropdown.querySelector('[data-toggle="dropdown"], [data-bs-toggle="dropdown"]');
    if (dropdownToggle) {
      dropdownToggle.removeAttribute('data-toggle');
      dropdownToggle.removeAttribute('data-bs-toggle');
      dropdownToggle.removeAttribute('aria-haspopup');
      dropdownToggle.removeAttribute('aria-expanded');
    }
  });

  // Setup dropdowns
  dropdowns.forEach(function(dropdown) {
    const toggle = dropdown.querySelector('.dropdown-toggle');
    let dropdownTimeout;

    if (toggle) {
      console.log('Setting up dropdown toggle');

      // Click event
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        console.log('Dropdown clicked');

        // Close all other dropdowns first
        dropdowns.forEach(function(d) {
          if (d !== dropdown) {
            d.classList.remove('active');
          }
        });

        // Toggle current dropdown
        dropdown.classList.toggle('active');
      });

      // Hover events - Show on hover, hide on mouse leave with delay
      dropdown.addEventListener('mouseenter', function() {
        clearTimeout(dropdownTimeout);
        
        // Close all other dropdowns first
        dropdowns.forEach(function(d) {
          if (d !== dropdown) {
            d.classList.remove('active');
          }
        });

        // Show current dropdown
        dropdown.classList.add('active');
      });

      dropdown.addEventListener('mouseleave', function() {
        // Add delay before closing to allow clicking on items
        dropdownTimeout = setTimeout(function() {
          dropdown.classList.remove('active');
        }, 300); // 300ms delay
      });

      // Keep dropdown open when hovering over the dropdown menu itself
      const dropdownMenu = dropdown.querySelector('.dropdown-menu, .mega-menu, .user-menu');
      if (dropdownMenu) {
        dropdownMenu.addEventListener('mouseenter', function() {
          clearTimeout(dropdownTimeout);
        });

        dropdownMenu.addEventListener('mouseleave', function() {
          dropdownTimeout = setTimeout(function() {
            dropdown.classList.remove('active');
          }, 300);
        });
      }
    }
  });

  // Mobile menu toggle
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener('click', function() {
      navMenu.classList.toggle('active');
      mobileMenuToggle.classList.toggle('active');
    });
  }

  // Click outside to close
  document.addEventListener('click', function(e) {
    dropdowns.forEach(function(dropdown) {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });

    if (navMenu && mobileMenuToggle) {
      if (!navMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
      }
    }
  });

  // ESC key to close all
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      dropdowns.forEach(function(dropdown) {
        dropdown.classList.remove('active');
      });

      if (navMenu && mobileMenuToggle) {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
      }
    }
  });

  // Enhanced Scroll-based header transparency effect
  if (header) {
    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateHeader() {
      const scrollY = window.scrollY;

      // Add/remove scrolled class based on scroll position
      if (scrollY > 30) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }

      // Calculate transparency based on scroll position (0.8 to 0.98)
      const opacity = Math.min(0.8 + (scrollY / 300), 0.98);
      const blur = Math.min(20 + (scrollY / 20), 30);

      header.style.background = `rgba(255, 255, 255, ${opacity})`;
      header.style.backdropFilter = `blur(${blur}px)`;
      header.style.webkitBackdropFilter = `blur(${blur}px)`;

      lastScrollY = scrollY;
      ticking = false;
    }

    function requestTick() {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }

    // Listen for scroll events with performance optimization
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      // Throttle the scroll events
      if (!scrollTimeout) {
        scrollTimeout = setTimeout(() => {
          scrollTimeout = null;
        }, 16); // ~60fps
      }
      requestTick();
    }, { passive: true });

    // Initial check in case page is already scrolled
    updateHeader();

    // Handle window resize
    window.addEventListener('resize', requestTick);
  }

  console.log('Header script initialized');
});

// Debug function to test dropdown functionality
window.testDropdown = function() {
  console.log('Testing dropdown functionality');
  const dropdowns = document.querySelectorAll('.header .dropdown, .header .mega-dropdown, .header .user-dropdown');
  console.log('Dropdowns found:', dropdowns.length);

  if (dropdowns.length > 0) {
    const firstDropdown = dropdowns[0];
    firstDropdown.classList.add('active');
    console.log('First dropdown activated - check if visible');

    // Force show menu if needed (handle both dropdown-menu and mega-menu)
    const menu = firstDropdown.querySelector('.dropdown-menu, .mega-menu, .user-menu');
    if (menu) {
      console.log('Found dropdown menu, forcing visibility');
      menu.style.opacity = '1';
      menu.style.visibility = 'visible';
      menu.style.transform = 'translateY(0)';
      menu.style.pointerEvents = 'auto';
    }

    setTimeout(function() {
      firstDropdown.classList.remove('active');
      if (menu) {
        menu.style.opacity = '';
        menu.style.visibility = '';
        menu.style.transform = '';
        menu.style.pointerEvents = '';
      }
      console.log('First dropdown deactivated');
    }, 3000);
  }
};

// Auto-test dropdown on page load
setTimeout(function() {
  console.log('Auto-testing dropdown functionality...');
  const dropdowns = document.querySelectorAll('.header .dropdown, .header .mega-dropdown, .header .user-dropdown');
  if (dropdowns.length > 0) {
    console.log('Found', dropdowns.length, 'dropdowns on page load');
    // Test first dropdown briefly with inline styles
    const firstDropdown = dropdowns[0];
    const menu = firstDropdown.querySelector('.dropdown-menu, .mega-menu, .user-menu');
    if (menu) {
      menu.style.cssText = `
        position: absolute !important;
        top: 100% !important;
        left: 0 !important;
        background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 12px !important;
        min-width: 280px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
        opacity: 1 !important;
        visibility: visible !important;
        transform: translateY(0) !important;
        transition: all 0.3s ease !important;
        z-index: 999999999 !important;
        margin-top: 0.5rem !important;
        padding: 0.75rem !important;
        pointer-events: auto !important;
        max-height: 80vh !important;
        overflow-y: auto !important;
        display: block !important;
        float: none !important;
      `;
      firstDropdown.classList.add('active');
    }
    setTimeout(() => {
      const menu = firstDropdown.querySelector('.dropdown-menu, .mega-menu, .user-menu');
      if (menu) {
        menu.style.cssText = `
          position: absolute !important;
          top: 100% !important;
          left: 0 !important;
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          border-radius: 12px !important;
          min-width: 280px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
          opacity: 0 !important;
          visibility: hidden !important;
          transform: translateY(-10px) !important;
          transition: all 0.3s ease !important;
          z-index: 999999999 !important;
          margin-top: 0.5rem !important;
          padding: 0.75rem !important;
          pointer-events: none !important;
          max-height: 80vh !important;
          overflow-y: auto !important;
          display: block !important;
          float: none !important;
        `;
      }
      firstDropdown.classList.remove('active');
    }, 2000);
  } else {
    console.warn('No dropdowns found on page load');
  }
}, 3000);

// Force visible dropdown for debugging
window.forceDropdown = function(index = 0) {
  const dropdowns = document.querySelectorAll('.header .dropdown, .header .mega-dropdown, .header .user-dropdown');
  if (dropdowns[index]) {
    dropdowns[index].classList.add('active');
    const menu = dropdowns[index].querySelector('.dropdown-menu, .mega-menu, .user-menu');
    if (menu) {
      menu.style.cssText = `
        position: absolute !important;
        top: 100% !important;
        left: 0 !important;
        background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 12px !important;
        min-width: 280px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
        opacity: 1 !important;
        visibility: visible !important;
        transform: translateY(0) !important;
        transition: all 0.3s ease !important;
        z-index: 999999999 !important;
        margin-top: 0.5rem !important;
        padding: 0.75rem !important;
        pointer-events: auto !important;
        max-height: 80vh !important;
        overflow-y: auto !important;
        display: block !important;
        float: none !important;
      `;
      console.log(`Forced dropdown ${index} visible`);
    }
  }
};