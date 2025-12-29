const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const BigFiveAssessment = require('./src/app/models/BigFiveAssessment');

async function testBigFiveSubmission() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/joblife_career');
        console.log('✅ Connected to MongoDB');

        // Test user ID
        const testUserId = '688f612e29bf43153df62360';
        
        console.log('\n🧪 Testing Big Five assessment submission...');
        
        // Sample Big Five assessment data (fixed format)
        const bigFiveData = {
            userId: testUserId,
            scores: {
                openness: 75,
                conscientiousness: 80,
                extraversion: 60,
                agreeableness: 65,
                neuroticism: 30
            },
            dominantTrait: 'conscientiousness',
            answers: [4, 3, 5, 4, 3, 2, 5, 4, 3, 4, 3, 4, 2, 3, 4], // Numeric answers
            description: 'You demonstrate balanced personality traits with high openness to experience and conscientiousness.',
            strengths: ['Organized', 'Creative', 'Reliable', 'Cooperative'],
            weaknesses: ['Sometimes too critical', 'Can be stubborn'],
            careers: ['Project Manager', 'Research Analyst', 'Product Designer'],
            quote: 'Organization is the key to success.',
            analysis: 'Your personality profile suggests you are creative yet organized.',
            completedAt: new Date()
        };

        // Save to database
        const savedAssessment = new BigFiveAssessment(bigFiveData);
        const result = await savedAssessment.save();
        
        console.log('✅ Big Five assessment saved successfully!');
        console.log('   ID:', result._id);
        console.log('   User ID:', result.userId);
        console.log('   Scores:', result.scores);
        console.log('   Dominant Trait:', result.dominantTrait);
        console.log('   Completed At:', result.completedAt);

        // Test retrieval
        console.log('\n🔍 Testing retrieval...');
        const retrieved = await BigFiveAssessment.find({ userId: testUserId })
            .sort({ completedAt: -1 })
            .lean();
        
        console.log(`📊 Retrieved ${retrieved.length} Big Five assessments`);
        if (retrieved.length > 0) {
            console.log('   Latest scores:', retrieved[0].scores);
            console.log('   Latest dominant trait:', retrieved[0].dominantTrait);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                console.error(`   ${key}: ${error.errors[key].message}`);
            });
        }
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

testBigFiveSubmission();
