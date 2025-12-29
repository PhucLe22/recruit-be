const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const MBTIAssessment = require('./src/app/models/MBTIAssessment');
const BigFiveAssessment = require('./src/app/models/BigFiveAssessment');
const DISCAssessment = require('./src/app/models/DISCAssessment');

async function testAssessmentRetrieval() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/joblife_career');
        console.log('✅ Connected to MongoDB');

        // Test user ID (actual user ID from database)
        const testUserId = '688f612e29bf43153df62360';
        
        console.log('\n🔍 Testing assessment data retrieval...');
        
        // Test MBTI retrieval
        const mbtiResults = await MBTIAssessment.find({ userId: testUserId })
            .sort({ completedAt: -1 })
            .lean();
        console.log(`📊 MBTI Results: Found ${mbtiResults.length} records`);
        if (mbtiResults.length > 0) {
            console.log('   Latest MBTI:', mbtiResults[0].type, 'at', mbtiResults[0].completedAt);
        }

        // Test Big Five retrieval
        const bigFiveResults = await BigFiveAssessment.find({ userId: testUserId })
            .sort({ completedAt: -1 })
            .lean();
        console.log(`📊 Big Five Results: Found ${bigFiveResults.length} records`);
        if (bigFiveResults.length > 0) {
            console.log('   Latest Big Five scores:', bigFiveResults[0].scores, 'at', bigFiveResults[0].completedAt);
        }

        // Test DISC retrieval
        const discResults = await DISCAssessment.find({ userId: testUserId })
            .sort({ completedAt: -1 })
            .lean();
        console.log(`📊 DISC Results: Found ${discResults.length} records`);
        if (discResults.length > 0) {
            console.log('   Latest DISC:', discResults[0].primaryTrait, 'at', discResults[0].completedAt);
        }

        // Check all assessments in database (for debugging)
        console.log('\n🔍 All assessments in database:');
        const allMBTI = await MBTIAssessment.countDocuments();
        const allBigFive = await BigFiveAssessment.countDocuments();
        const allDISC = await DISCAssessment.countDocuments();
        console.log(`   Total MBTI assessments: ${allMBTI}`);
        console.log(`   Total Big Five assessments: ${allBigFive}`);
        console.log(`   Total DISC assessments: ${allDISC}`);

        // Get a sample of actual user IDs from assessments
        if (allMBTI > 0 || allBigFive > 0 || allDISC > 0) {
            console.log('\n👤 Sample user IDs from assessments:');
            
            const sampleMBTI = await MBTIAssessment.findOne().select('userId').lean();
            if (sampleMBTI) console.log('   MBTI User ID:', sampleMBTI.userId);
            
            const sampleBigFive = await BigFiveAssessment.findOne().select('userId').lean();
            if (sampleBigFive) console.log('   Big Five User ID:', sampleBigFive.userId);
            
            const sampleDISC = await DISCAssessment.findOne().select('userId').lean();
            if (sampleDISC) console.log('   DISC User ID:', sampleDISC.userId);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

testAssessmentRetrieval();
