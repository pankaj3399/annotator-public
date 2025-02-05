import { Schema, model, models, Document } from 'mongoose';

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
    created_at: Date;
    updated_at: Date;
    submitted_at?: Date;
    reviewed_at?: Date;
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
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    submitted_at: Date,
    reviewed_at: Date
});

benchmarkProposalSchema.pre('save', function (this: IBenchmarkProposal, next) {
    this.updated_at = new Date();
    if (this.status === 'submitted' && !this.submitted_at) {
        this.submitted_at = new Date();
    }
    next();
});

benchmarkProposalSchema.path('datasetFile.fileSize').validate(function (value: number | undefined) {
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    return !value || value <= MAX_FILE_SIZE;
}, 'File size must not exceed 100MB');

export const BenchmarkProposal = models?.BenchmarkProposal || model<IBenchmarkProposal>('BenchmarkProposal', benchmarkProposalSchema);
