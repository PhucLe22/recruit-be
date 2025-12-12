// Token Refresh Manager
class TokenRefreshManager {
  constructor() {
    this.refreshInterval = null;
    this.isRefreshing = false;
    this.refreshEndpoint = '/auth/refresh-token';
  }

  // Start automatic token refresh
  startRefresh() {
    // Check every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.checkAndRefreshToken();
    }, 5 * 60 * 1000);

    // Also check on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkAndRefreshToken();
      }
    });
  }

  // Stop token refresh
  stopRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // Check if token needs refresh and refresh it
  async checkAndRefreshToken() {
    if (this.isRefreshing) return;

    try {
      this.isRefreshing = true;
      
      const response = await fetch(this.refreshEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Token refreshed successfully');
        
        // Trigger a custom event for other components to handle
        window.dispatchEvent(new CustomEvent('tokenRefreshed', { 
          detail: data 
        }));
      } else if (response.status === 401) {
        // Token refresh failed, redirect to login
        console.log('Token refresh failed, redirecting to login');
        window.location.href = '/auth/login';
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  // Initialize the token refresh manager
  init() {
    // Only start if user appears to be logged in
    if (document.cookie.includes('accessToken') || document.cookie.includes('refreshToken')) {
      this.startRefresh();
    }
  }
}

// Initialize on page load
const tokenManager = new TokenRefreshManager();
document.addEventListener('DOMContentLoaded', () => {
  tokenManager.init();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  tokenManager.stopRefresh();
});
