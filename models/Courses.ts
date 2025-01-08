import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  instructor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  thumbnail: { 
    type: String, 
    required: false, 
    default: null 
  }, // URL to the course thumbnail image
  tags: { 
    type: [String], 
    required: false 
  }, // Tags for easier filtering
  videos: [
    {
      title: { 
        type: String, 
        required: true, 
        trim: true 
      },
      description: { 
        type: String, 
        required: false 
      },
      url: { 
        type: String, 
        required: true 
      }, // URL for the video
      duration:{
        type:String,
        required:false
      }
    }
  ],
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Use pre-save hook to update the `updated_at` field
CourseSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const Course = mongoose.models?.Course || mongoose.model('Course', CourseSchema);
export default Course;
