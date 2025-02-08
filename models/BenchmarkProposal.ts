import { Schema, model, models, Document } from 'mongoose';

interface Comment {
  _id: string;
  content: string;
  createdAt: Date;
  likes: number;
  author: {
    _id: Schema.Types.ObjectId;
    name: string;
  };
  replies?: Comment[];
}

interface Vote{
  userId:string,
  vote:number
}


interface IBenchmarkProposal extends Document {
  project: Schema.Types.ObjectId;
  user: Schema.Types.ObjectId;
  name: string;
  description: string;
  domain: 'Math' | 'Healthcare' | 'Language' | 'Multimodal' | 'Other';
  customDomain?: string;
  datasetUrl?: string;
  datasetFile?: {
    fileName: string;
    fileSize: number;
    fileType: 'csv' | 'json' | 'zip';
    uploadedAt: Date;
  };
  evaluationMethodology: string;
  intendedPurpose: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  reviewNotes?: string;
  reviewedBy?: Schema.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
  submitted_at?: Date;
  reviewed_at?: Date;
  votes: Vote;
  comments: Comment[];
}

const benchmarkProposalSchema = new Schema<IBenchmarkProposal>({
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
  },
  description: {
    type: String,
    required: true,
    minlength: 50,
    maxlength: 2500,
  },
  domain: {
    type: String,
    required: true,
    enum: ['Math', 'Healthcare', 'Language', 'Multimodal', 'Other']
  },
  customDomain: {
    type: String,
    required: function (this: IBenchmarkProposal) {
      return this.domain === 'Other';
    }
  },
  datasetUrl: {
    type: String,
    validate: {
      validator: function (v: string | undefined): boolean {
        return !v || v.startsWith('http://') || v.startsWith('https://');
      },
      message: 'Dataset URL must be a valid URL'
    }
  },
  datasetFile: {
    fileName: String,
    fileSize: Number,
    fileType: {
      type: String,
      enum: ['csv', 'json', 'zip']
    },
    uploadedAt: Date
  },
  evaluationMethodology: {
    type: String,
    required: true,
    minlength: 50,
    maxlength: 1500,
  },
  intendedPurpose: {
    type: String,
    required: true,
    minlength: 50,
    maxlength: 750,
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected'],
    default: 'draft'
  },
  reviewNotes: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  submitted_at: Date,
  reviewed_at: Date,
  votes: [
    {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      vote: { type: Number, enum: [-1, 0, 1], required: true }, // -1 (downvote), 0 (neutral), 1 (upvote)
    },
  ],
  comments: {
    type: [
      {
        _id: { type: String, required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, required: true, default: Date.now },
        author: {
          _id: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
          name: { type: String, required: true }
        },
        replies: { type: Array, default: [] }
      }
    ],
    default: []
  }
});

benchmarkProposalSchema.pre('save', function (this: IBenchmarkProposal, next) {
  this.updated_at = new Date();
  if (this.status === 'submitted' && !this.submitted_at) {
    this.submitted_at = new Date();
  }
  if ((this.status === 'approved' || this.status === 'rejected') && !this.reviewed_at) {
    this.reviewed_at = new Date();
  }
  next();
});

benchmarkProposalSchema.path('datasetFile.fileSize').validate(function (value: number | undefined) {
  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  return !value || value <= MAX_FILE_SIZE;
}, 'File size must not exceed 100MB');

export const BenchmarkProposal = models?.BenchmarkProposal || model<IBenchmarkProposal>('BenchmarkProposal', benchmarkProposalSchema);



