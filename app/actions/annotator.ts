'use server'

import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

export async function getAllAnnotators() {
    await connectToDatabase();
    const data = await User.find({ role: 'annotator' }).select('-password');
    return JSON.stringify(data);
}
