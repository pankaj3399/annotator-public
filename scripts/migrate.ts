const connectToDatabase = require('../../lib/db').connectToDatabase;
const User = require('../../models/User').User;

async function migrateCustomFields() {
  try {
    await connectToDatabase();
    const result = await User.updateMany(
      { customFields: { $exists: false } },
      { $set: { customFields: {} } }
    );

    console.log(`Migration completed. Updated ${result.modifiedCount} users.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrateCustomFields();
