const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const DISCAssessment = require('./src/app/models/DISCAssessment');

async function testDISCSubmission() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/joblife_career');
        console.log('✅ Connected to MongoDB');

        // Test user ID
        const testUserId = '688f612e29bf43153df62360';
        
        console.log('\n🧪 Testing DISC assessment submission...');
        
        // Sample DISC assessment data
        const discData = {
            userId: testUserId,
            primaryTrait: 'D',
            scores: {
                D: 35,
                I: 25,
                S: 20,
                C: 20
            },
            answers: ['D', 'I', 'S', 'C', 'D', 'I', 'S', 'C', 'D', 'I', 'S', 'C'],
            description: 'You demonstrate strong leadership qualities with a focus on results and direct communication.',
            strengths: ['Decisive', 'Direct', 'Problem-solver', 'Leadership'],
            weaknesses: ['Impatient', 'Can be blunt', 'May overlook details'],
            careers: ['CEO', 'Project Manager', 'Business Owner', 'Sales Director'],
            quote: 'Leadership is action, not position.',
            workStyle: 'Direct and results-oriented',
            analysis: 'Your DISC profile indicates you are a natural leader who thrives on challenges.',
            completedAt: new Date()
        };

        // Save to database
        const savedAssessment = new DISCAssessment(discData);
        const result = await savedAssessment.save();
        
        console.log('✅ DISC assessment saved successfully!');
        console.log('   ID:', result._id);
        console.log('   User ID:', result.userId);
        console.log('   Primary Trait:', result.primaryTrait);
        console.log('   Scores:', result.scores);
        console.log('   Completed At:', result.completedAt);

        // Test retrieval
        console.log('\n🔍 Testing retrieval...');
        const retrieved = await DISCAssessment.find({ userId: testUserId })
            .sort({ completedAt: -1 })
            .lean();
        
        console.log(`📊 Retrieved ${retrieved.length} DISC assessments`);
        if (retrieved.length > 0) {
            console.log('   Latest primary trait:', retrieved[0].primaryTrait);
            console.log('   Latest scores:', retrieved[0].scores);
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

testDISCSubmission();
