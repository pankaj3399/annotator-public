import mongoose from "mongoose";
import dotenv, { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error(
    "Please define the MONGODB_URI environment variable inside .env"
  );
  process.exit(1);
}

// Define schemas for both Template and Project
const templateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  labels: { type: [String], default: [] }
});

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  project_Manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  labels: { type: [String], default: [] } // Add this field to store labels
});

const Template = mongoose.models?.Template || mongoose.model('Template', templateSchema);
const Project = mongoose.models?.Project || mongoose.model('Project', projectSchema);

async function migrate() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Database connected successfully");

    // Find all templates with non-empty labels
    const templatesWithLabels = await Template.find({
      labels: { $exists: true, $ne: [] }
    });
    
    console.log(`Found ${templatesWithLabels.length} templates with labels to migrate`);

    if (templatesWithLabels.length === 0) {
      console.log("No templates found with labels. Migration not needed.");
      return;
    }

    // Group templates by project and collect unique labels
    const projectLabels = new Map();

    for (const template of templatesWithLabels) {
      const projectId = template.project.toString();
      const currentLabels = projectLabels.get(projectId) || new Set();
      
      template.labels.forEach(label => currentLabels.add(label));
      projectLabels.set(projectId, currentLabels);
    }

    // Update projects with collected labels
    let updatedProjects = 0;
    for (const [projectId, labelSet] of projectLabels) {
      const labels = Array.from(labelSet);
      await Project.findByIdAndUpdate(
        projectId,
        { $addToSet: { labels: { $each: labels } } },
        { new: true }
      );
      updatedProjects++;
      console.log(`Updated project ${projectId} with ${labels.length} labels`);
    }

    // Optional: Clear labels from templates after migration
    const clearLabelsResult = await Template.updateMany(
      { labels: { $exists: true, $ne: [] } },
      { $set: { labels: [] } }
    );

    console.log(`
Migration completed successfully:
- Processed ${templatesWithLabels.length} templates
- Updated ${updatedProjects} projects
- Cleared labels from ${clearLabelsResult.modifiedCount} templates
    `);

    await mongoose.disconnect();
    console.log("Database disconnected");
  } catch (error) {
    console.error("Error during label migration:", error);
    process.exit(1);
  }
}

// Handle uncaught promise rejections
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

// Run the migration
migrate();