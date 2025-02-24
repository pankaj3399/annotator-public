import mongoose from 'mongoose';

const bankDetailSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plaid_access_token: { type: String, required: true },
    plaid_account_id: { type: String, required: true },
});

export const bankDetail = mongoose.models?.Bank || mongoose.model('Bank', bankDetailSchema);
