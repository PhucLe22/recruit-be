// File: /src/app/controllers/AIServiceController.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class AIServiceController {
    constructor() {
        this.AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        this.axiosInstance = axios.create({
            baseURL: this.AI_SERVICE_URL,
            timeout: 30000, // 30 seconds
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
    }

    // Helper method to handle API responses
    async _makeRequest(method, endpoint, data = null, params = {}) {
        try {
            const response = await this.axiosInstance({
                method,
                url: endpoint,
                data,
                params
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error(`AI Service Error (${endpoint}):`, error.message);
            return {
                success: false,
                error: error.response?.data?.error || 'Đã xảy ra lỗi khi kết nối đến dịch vụ AI',
                status: error.response?.status || 500
            };
        }
    }

    // User Management
    async createUser(userData) {
        return this._makeRequest('POST', '/create_user', userData);
    }

    async getUsers() {
        return this._makeRequest('GET', '/users');
    }

    // Resume Operations
    async uploadResume(file, username) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('username', username);

        return this._makeRequest('POST', '/upload_resume', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }

    async getResume(username) {
        return this._makeRequest('GET', `/resume/${username}`);
    }

    async deleteResume(username) {
        return this._makeRequest('DELETE', `/resume/${username}`);
    }

    async suggestResumeImprovements(username, feedback = '') {
        return this._makeRequest('POST', `/resume/${username}/suggest_improvements`, { feedback });
    }

    // Job Operations
    async getUserJobs(username) {
        return this._makeRequest('GET', `/users/${username}/jobs`);
    }

    async getJobSuggestions(username) {
        return this._makeRequest('GET', `/api/jobs-suggestion/${username}`);
    }

    // Google Meet Integration
    async createGoogleMeet(meetData) {
        return this._makeRequest('POST', '/api/create-meet', meetData);
    }

    // Health Check
    async checkHealth() {
        return this._makeRequest('GET', '/health');
    }

    // Google Auth
    async getGoogleAuthUrl() {
        return `${this.AI_SERVICE_URL}/api/auth/google`;
    }

    async handleGoogleAuthCallback(code) {
        return this._makeRequest('GET', '/auth/google/callback', null, { code });
    }
}

module.exports = new AIServiceController();