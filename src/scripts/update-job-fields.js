const mongoose = require('mongoose');
const Job = require('../app/models/Job');
const JobField = require('../app/models/JobField');
require('dotenv').config();

async function updateJobFields() {
    try {
        // Connect to MongoDB
        await mongoose.connect(
            'mongodb+srv://lenguyenthienphuc2004:76k8v9LqAXDg9tsu@cluster0.yeymzya.mongodb.net/CVProject',
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            },
        );

        console.log('🔗 Connected to MongoDB');

        // Get all jobs to extract unique fields
        const jobs = await Job.find({});
        
        // Count jobs by field
        const fieldCounts = {};
        jobs.forEach(job => {
            if (job.field) {
                fieldCounts[job.field] = (fieldCounts[job.field] || 0) + 1;
            }
        });

        console.log('📊 Found fields in jobs:', Object.keys(fieldCounts));

        // Get existing job fields
        const existingFields = await JobField.find({});
        const existingFieldNames = new Set(existingFields.map(f => f.name));

        // Create or update job fields
        const operations = [];
        
        for (const [fieldName, count] of Object.entries(fieldCounts)) {
            if (existingFieldNames.has(fieldName)) {
                // Update existing field count
                operations.push({
                    updateOne: {
                        filter: { name: fieldName },
                        update: { $set: { jobCount: count } }
                    }
                });
            } else {
                // Create new field
                operations.push({
                    insertOne: {
                        document: {
                            name: fieldName,
                            slug: fieldName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
                            icon: 'fa-briefcase', // Default icon
                            jobCount: count
                        }
                    }
                });
            }
        }

        if (operations.length > 0) {
            await JobField.bulkWrite(operations);
            console.log(`✅ Updated ${operations.length} job fields`);
        } else {
            console.log('ℹ️ No job fields to update');
        }

        // Close the connection
        await mongoose.connection.close();
        console.log('👋 Disconnected from MongoDB');
        
    } catch (error) {
        console.error('❌ Error updating job fields:', error);
        process.exit(1);
    }
}

// Run the update
updateJobFields();
