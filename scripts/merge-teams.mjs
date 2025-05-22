// scripts/merge-teams.mjs
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from parent directory
dotenv.config();

// Ensure MONGODB_URI is loaded
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not defined in the environment variables');
  process.exit(1);
}

// User Schema definition in-house
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  team_id: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  // Add other user fields as needed
});

const User = mongoose.models?.User || mongoose.model('User', userSchema);

// Team Schema definition in-house
const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: null,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

teamSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

const Team = mongoose.models?.Team || mongoose.model("Team", teamSchema);

async function mergeTeams(sourceTeamId, targetTeamId) {
    try {
        console.log('🔍 Fetching teams and actual users...');
        
        // Get teams first
        const [sourceTeam, targetTeam] = await Promise.all([
            Team.findById(sourceTeamId),
            Team.findById(targetTeamId)
        ]);

        if (!sourceTeam) {
            return {
                success: false,
                message: `❌ Source team with ID ${sourceTeamId} not found`,
                mergedUsersCount: 0
            };
        }

        if (!targetTeam) {
            return {
                success: false,
                message: `❌ Target team with ID ${targetTeamId} not found`,
                mergedUsersCount: 0
            };
        }

        // Find users based on their actual team_id field (not team members array)
        const [sourceUsers, targetUsers] = await Promise.all([
            User.find({ team_id: sourceTeamId }, 'name email team_id'),
            User.find({ team_id: targetTeamId }, 'name email team_id')
        ]);

        console.log(`📋 Source Team: "${sourceTeam.name}"`);
        console.log(`   - Members array: ${sourceTeam.members.length} users`);
        console.log(`   - Actual users with team_id: ${sourceUsers.length} users`);
        
        console.log(`📋 Target Team: "${targetTeam.name}"`);
        console.log(`   - Members array: ${targetTeam.members.length} users`);
        console.log(`   - Actual users with team_id: ${targetUsers.length} users`);

        if (sourceUsers.length === 0) {
            return {
                success: true,
                message: '✅ Source team has no users to move (based on user team_id field)',
                mergedUsersCount: 0,
                sourceTeam: sourceTeam,
                targetTeam: targetTeam
            };
        }

        console.log(`👥 Users to move from source team: ${sourceUsers.length}`);
        sourceUsers.forEach((user) => {
            console.log(`  - ${user.name} (${user.email}) - Current team_id: ${user.team_id}`);
        });

        console.log(`🔄 Updating users' team_id from ${sourceTeamId} to ${targetTeamId}...`);
        
        // Update all users' team_id to point to target team
        const memberIds = sourceUsers.map(user => user._id);
        const userUpdateResult = await User.updateMany(
            { _id: { $in: memberIds } },
            { $set: { team_id: targetTeamId } }
        );
        
        console.log(`📝 User update result: Modified ${userUpdateResult.modifiedCount} users`);
        
        // Verify the update worked
        const verifyUsers = await User.find({ _id: { $in: memberIds } }, 'name email team_id');
        console.log('🔍 Verification - Users after update:');
        verifyUsers.forEach(user => {
            console.log(`  - ${user.name}: team_id = ${user.team_id}`);
        });
        
        // Update team members arrays to match the new reality
        console.log('🔄 Syncing team members arrays...');
        
        // Get all users for each team and update the members arrays
        const [allSourceUsers, allTargetUsers] = await Promise.all([
            User.find({ team_id: sourceTeamId }, '_id'),
            User.find({ team_id: targetTeamId }, '_id')
        ]);
        
        // Update both team members arrays
        await Promise.all([
            Team.findByIdAndUpdate(sourceTeamId, { 
                $set: { members: allSourceUsers.map(u => u._id) } 
            }),
            Team.findByIdAndUpdate(targetTeamId, { 
                $set: { members: allTargetUsers.map(u => u._id) } 
            })
        ]);

        // Get final counts
        const finalSourceCount = await User.countDocuments({ team_id: sourceTeamId });
        const finalTargetCount = await User.countDocuments({ team_id: targetTeamId });

        console.log('✅ Merge completed successfully!');

        return {
            success: true,
            message: `✅ Successfully moved ${sourceUsers.length} users from "${sourceTeam.name}" to "${targetTeam.name}"`,
            mergedUsersCount: sourceUsers.length,
            sourceTeam: { ...sourceTeam.toObject(), finalUserCount: finalSourceCount },
            targetTeam: { ...targetTeam.toObject(), finalUserCount: finalTargetCount }
        };

    } catch (error) {
        console.error("❌ Error merging teams:", error);
        return {
            success: false,
            message: `❌ Error merging teams: ${error instanceof Error ? error.message : 'Unknown error'}`,
            mergedUsersCount: 0
        };
    }
}

// Helper function to find team by name if you prefer using names instead of IDs
async function findTeamByName(name) {
    try {
        const team = await Team.findOne({ name });
        return team;
    } catch (error) {
        console.error(`Error finding team "${name}":`, error);
        return null;
    }
}

async function runTeamMerge() {
    try {
        console.log('🚀 Starting team merge script...');
        console.log('🔄 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Database connected successfully\n');

        // // Option 1: Use team IDs directly
        // const SOURCE_TEAM_ID = '67c193a3730abebad9665efc';  // test team
        // const TARGET_TEAM_ID = '67c1980030e066da1b99915a';  // test2 team

        // Option 2: Use team names
        
        const SOURCE_TEAM_NAME = "Ana's Annotation Team";
        const TARGET_TEAM_NAME = "test";
        
        console.log('🔍 Finding teams by name...');
        const [sourceTeam, targetTeam] = await Promise.all([
            findTeamByName(SOURCE_TEAM_NAME),
            findTeamByName(TARGET_TEAM_NAME)
        ]);
        
        if (!sourceTeam || !targetTeam) {
            console.error('❌ One or both teams not found by name');
            process.exit(1);
        }
        
        const SOURCE_TEAM_ID = sourceTeam._id.toString();
        const TARGET_TEAM_ID = targetTeam._id.toString();
        

        const result = await mergeTeams(SOURCE_TEAM_ID, TARGET_TEAM_ID);

        console.log('\n📊 MERGE RESULTS:');
        console.log('================');
        console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`Message: ${result.message}`);
        console.log(`Users Moved: ${result.mergedUsersCount}`);

        if (result.success) {
            console.log('\n📈 Final User Counts:');
            console.log(`Source Team "${result.sourceTeam?.name}": ${result.sourceTeam?.finalUserCount || 0} users`);
            console.log(`Target Team "${result.targetTeam?.name}": ${result.targetTeam?.finalUserCount || 0} users`);
        }

        console.log('\n🎉 Script completed successfully');
        await mongoose.disconnect();
        console.log('✨ All done!');

    } catch (error) {
        console.error('💥 Error during team merge:', error);
        process.exit(1);
    }
}

// Handle uncaught promise rejections
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
});

// Run the team merge
runTeamMerge();