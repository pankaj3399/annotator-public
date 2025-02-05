import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema({
    code: { 
        type: String, 
        required: true, 
        unique: true 
    },
    email: { 
        type: String,
        required: true
    },
    used: { 
        type: Boolean, 
        default: false 
    },
    usedAt: { 
        type: Date 
    },
    expiresAt: { 
        type: Date 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }
});

export const Invitation = mongoose.models.Invitation || mongoose.model('Invitation', invitationSchema);