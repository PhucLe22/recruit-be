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
    async createUser(req, res) {
        try {
            const response = await this._makeRequest('POST', '/create_user', req.body);
            if (response.success) {
                return res.json(response.data);
            } else {
                return res.status(response.status || 500).json({ error: response.error });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getUsers(req, res) {
        try {
            const response = await this._makeRequest('GET', '/users');
            if (response.success) {
                return res.json(response.data);
            } else {
                return res.status(response.status || 500).json({ error: response.error });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Resume Operations
    async uploadResume(req, res) {
        try {
            const { username } = req.body;
            const file = req.file;

            if (!username || !file) {
                return res.status(400).json({
                    error: 'Username and file are required'
                });
            }

            const formData = new FormData();
            formData.append('username', username);
            formData.append('file', file.buffer, file.originalname);

            const response = await axios.post(`${this.AI_SERVICE_URL}/upload_resume`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 60000 // 60 seconds for file upload
            });

            return res.json(response.data);
        } catch (error) {
            console.error('Upload resume error:', error.message);
            return res.status(500).json({
                error: 'Failed to upload resume',
                details: error.response?.data?.error || error.message
            });
        }
    }

    async getResume(req, res) {
        try {
            const { username } = req.params;
            const response = await this._makeRequest('GET', `/resume/${username}`);
            if (response.success) {
                return res.json(response.data);
            } else {
                return res.status(response.status || 500).json({ error: response.error });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async deleteResume(req, res) {
        try {
            const { username } = req.params;
            const response = await this._makeRequest('DELETE', `/resume/${username}`);
            if (response.success) {
                return res.json(response.data);
            } else {
                return res.status(response.status || 500).json({ error: response.error });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async suggestResumeImprovements(req, res) {
        try {
            const { username } = req.params;
            const response = await this._makeRequest('POST', `/resume/${username}/suggest_improvements`);
            if (response.success) {
                return res.json(response.data);
            } else {
                return res.status(response.status || 500).json({ error: response.error });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Job Operations
    async getUserJobs(req, res) {
        try {
            const { username } = req.params;
            const response = await this._makeRequest('GET', `/users/${username}/jobs`);
            if (response.success) {
                return res.json(response.data);
            } else {
                return res.status(response.status || 500).json({ error: response.error });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getJobSuggestions(req, res) {
        try {
            const { username } = req.params;
            const response = await this._makeRequest('GET', `/api/jobs-suggestion/${username}`);
            if (response.success) {
                return res.json(response.data);
            } else {
                return res.status(response.status || 500).json({ error: response.error });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Google Meet Integration
    async createGoogleMeet(req, res) {
        try {
            const response = await this._makeRequest('POST', '/api/create-meet', req.body);
            if (response.success) {
                return res.json(response.data);
            } else {
                return res.status(response.status || 500).json({ error: response.error });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Health Check
    async checkHealth(req, res) {
        try {
            const response = await this._makeRequest('GET', '/health');
            if (response.success) {
                return res.json(response.data);
            } else {
                return res.status(response.status || 500).json({ error: response.error });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Google Auth
    async getGoogleAuthUrl(req, res) {
        try {
            const authUrl = `${this.AI_SERVICE_URL}/api/auth/google`;
            return res.json({ url: authUrl });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async handleGoogleAuthCallback(req, res) {
        try {
            const { code } = req.query;
            const response = await this._makeRequest('GET', '/auth/google/callback', null, { code });
            if (response.success) {
                return res.json(response.data);
            } else {
                return res.status(response.status || 500).json({ error: response.error });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AIServiceController();