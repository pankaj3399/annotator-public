// app/actions/stats.ts
'use server';

import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { User as UserModel } from "@/models/User"; // Renamed import
import { getServerSession } from "next-auth";
import { Types } from 'mongoose'; // Import Types for ObjectId

// --- Interfaces (keep as before) ---
interface DailyStat { date: string; newExperts: number; cumulativeExperts: number; }
interface Filters { domain?: string[]; lang?: string[]; location?: string[]; }
type Granularity = 'daily' | 'weekly' | 'monthly';
interface StatError { error: string; }
interface LeanUser { _id: Types.ObjectId; email: string; team_id?: Types.ObjectId; }
interface ReadyWorkDataPoint {
    name: 'Active' | 'Not Active';
    value: number; // The count
}
// Fixed version of getUserStats that includes all annotators
export async function getUserStats(
    filters: Filters = {},
    granularity: Granularity = 'daily'
): Promise<string> {
    console.log(`[getUserStats] Starting for granularity: ${granularity}`);
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) { 
            return JSON.stringify({ error: 'You must be logged in' } as StatError); 
        }
        const userEmail = session.user.email;
        console.log(`[getUserStats] Session found for email: ${userEmail}`);

        await connectToDatabase();
        console.log("[getUserStats] Database connected.");

        const currentUser = await UserModel.findOne({ email: userEmail })
                                    .select('team_id email _id')
                                    .lean<LeanUser | null>();

        if (!currentUser) { return JSON.stringify([]); }
        if (!currentUser.team_id) { return JSON.stringify([]); }
        const teamId: Types.ObjectId = currentUser.team_id;
        console.log(`[getUserStats] User belongs to Team ID: ${teamId}`);

        // --- Build Match Stage ---
        const matchStage: any = {
            role: 'annotator',
            team_id: teamId,
            // REMOVED: created_at: { $exists: true } - Don't exclude users without dates
        };

        // Optional filters
        if (filters.domain && filters.domain.length > 0) { 
            matchStage.domain = { $in: filters.domain.map(d => new RegExp(`^${d}$`, 'i')) }; 
        }
        if (filters.lang && filters.lang.length > 0) { 
            matchStage.lang = { $in: filters.lang.map(l => new RegExp(`^${l}$`, 'i')) }; 
        }
        if (filters.location && filters.location.length > 0) { 
            matchStage.location = { $in: filters.location.map(loc => new RegExp(`^${loc}$`, 'i')) }; 
        }
        console.log('[getUserStats] Initial Match Stage:', JSON.stringify(matchStage));

        // First, get the total count of all matching annotators (for accurate cumulative)
        const totalAnnotators = await UserModel.countDocuments(matchStage);
        console.log(`[getUserStats] Total annotators matching filters: ${totalAnnotators}`);

        // --- Define Grouping/Formatting based on Granularity ---
        let groupStageId: any;
        let projectDateFormat: any;
        let sortFields: Record<string, 1 | -1> = { "_id": 1 };
        
        // Use a default date for users without created_at (e.g., January 1, 2020)
        const defaultDate = new Date('2020-01-01');

        switch (granularity) {
            case 'weekly':
                groupStageId = { 
                    year: { $isoWeekYear: "$created_at_date" }, 
                    week: { $isoWeek: "$created_at_date" } 
                };
                projectDateFormat = { 
                    $concat: [ 
                        { $toString: "$_id.year" }, 
                        "-W", 
                        { $toString: { 
                            $cond: { 
                                if: { $lt: ["$_id.week", 10] }, 
                                then: { $concat: ["0", { $toString: "$_id.week" }] }, 
                                else: { $toString: "$_id.week" } 
                            } 
                        }}
                    ]
                };
                sortFields = { "_id.year": 1, "_id.week": 1 };
                break;
            case 'monthly':
                groupStageId = { 
                    year: { $year: "$created_at_date" }, 
                    month: { $month: "$created_at_date" } 
                };
                projectDateFormat = { 
                    $dateToString: { 
                        format: "%Y-%m", 
                        date: { 
                            $dateFromParts: { 
                                'year': "$_id.year", 
                                'month': "$_id.month", 
                                'day': 1 
                            } 
                        } 
                    }
                };
                sortFields = { "_id.year": 1, "_id.month": 1 };
                break;
            default: // daily
                groupStageId = { 
                    $dateToString: { 
                        format: "%Y-%m-%d", 
                        date: "$created_at_date" 
                    } 
                };
                projectDateFormat = "$_id";
                sortFields = { "_id": 1 };
                break;
        }
        console.log(`[getUserStats] Granularity '${granularity}' stage setup complete.`);

        // --- Aggregation Pipeline ---
        console.log('[getUserStats] Running aggregation pipeline...');
        const aggregationResult = await UserModel.aggregate([
            { $match: matchStage },
            {
                $project: {
                    // Handle missing or invalid created_at dates
                    created_at_date: {
                        $cond: {
                            if: { 
                                $or: [
                                    { $not: ["$created_at"] }, // Field doesn't exist
                                    { $eq: ["$created_at", null] } // Field is null
                                ]
                            },
                            then: defaultDate, // Use default date
                            else: {
                                $cond: {
                                    if: { $eq: [{ $type: "$created_at" }, "date"] },
                                    then: "$created_at",
                                    else: { 
                                        $cond: {
                                            if: { $eq: [{ $type: "$created_at" }, "string"] },
                                            then: { $toDate: "$created_at" },
                                            else: defaultDate // Fallback for any other type
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            // REMOVED the second $match that filtered out null dates
            {
                $group: {
                    _id: groupStageId,
                    newExperts: { $sum: 1 }
                }
            },
            { $sort: sortFields },
            {
                $project: {
                    _id: 0,
                    date: projectDateFormat,
                    newExperts: 1
                }
            }
        ]);

        console.log('[getUserStats] Raw Aggregation Result Count:', aggregationResult.length);
        if (aggregationResult.length > 0) {
             console.log('[getUserStats] Raw Aggregation Result Sample (first 3):', 
                JSON.stringify(aggregationResult.slice(0, 3)));
        }

        // --- Calculate Cumulative Experts ---
        let cumulativeCount = 0;
        const statsWithCumulative = aggregationResult.map(stat => {
            cumulativeCount += stat.newExperts;
            return { 
                date: stat.date, 
                newExperts: stat.newExperts, 
                cumulativeExperts: cumulativeCount 
            };
        });

        // Log the final cumulative count vs total
        console.log(`[getUserStats] Final cumulative: ${cumulativeCount}, Total annotators: ${totalAnnotators}`);
        
        // Add a warning if there's a mismatch
        if (cumulativeCount !== totalAnnotators) {
            console.warn(`[getUserStats] MISMATCH: Cumulative (${cumulativeCount}) != Total (${totalAnnotators})`);
        }

        console.log("[getUserStats] Function finished successfully.");
        return JSON.stringify(statsWithCumulative);

    } catch (error) {
        console.error(`[getUserStats ERROR] Failed during stats calculation:`, error);
        let errorMessage = `Failed to fetch ${granularity} stats.`;
        if (error instanceof Error) { 
            errorMessage = error.message || errorMessage; 
        }
        return JSON.stringify({ error: errorMessage } as StatError);
    }
}

// *** NEW Function: getReadyToWorkStats ***
export async function getReadyToWorkStats(filters: Filters = {}): Promise<string> {
    console.log("[getReadyToWorkStats] Starting function...");
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            console.warn("[getReadyToWorkStats] Auth check failed.");
            return JSON.stringify({ error: 'You must be logged in' } as StatError);
        }
        const userEmail = session.user.email;
        console.log(`[getReadyToWorkStats] Session found for: ${userEmail}`);

        await connectToDatabase();
        console.log("[getReadyToWorkStats] DB connected.");

        const currentUser = await UserModel.findOne({ email: userEmail })
            .select('team_id email _id')
            .lean<LeanUser | null>();

        if (!currentUser) { /* ... */ return JSON.stringify([]); }
        if (!currentUser.team_id) { /* ... */ return JSON.stringify([]); }
        const teamId = currentUser.team_id;
        console.log(`[getReadyToWorkStats] User Team ID: ${teamId}`);

        // --- Build Base Match Stage (including filters) ---
        const matchStage: any = {
            role: 'annotator',
            team_id: teamId,
        };

        // Apply optional filters
        if (filters.domain && filters.domain.length > 0) { matchStage.domain = { $in: filters.domain.map(d => new RegExp(`^${d}$`, 'i')) }; }
        if (filters.lang && filters.lang.length > 0) { matchStage.lang = { $in: filters.lang.map(l => new RegExp(`^${l}$`, 'i')) }; }
        if (filters.location && filters.location.length > 0) { matchStage.location = { $in: filters.location.map(loc => new RegExp(`^${loc}$`, 'i')) }; }
        console.log('[getReadyToWorkStats] Match Stage:', JSON.stringify(matchStage));

        // --- Aggregation Pipeline to Group by isReadyToWork ---
        console.log('[getReadyToWorkStats] Running aggregation...');
        const aggregationResult = await UserModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    // Group by the boolean value of isReadyToWork (or false if missing/null)
                    _id: { $ifNull: ["$isReadyToWork", false] },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0, // Remove the default _id
                    status: "$_id", // Rename _id to status (true/false)
                    value: "$count" // Rename count to value for recharts
                }
            }
        ]);

        console.log('[getReadyToWorkStats] Aggregation Result:', JSON.stringify(aggregationResult));

        // --- Format the data for the Pie Chart ---
        let readyCount = 0;
        let notReadyCount = 0;

        aggregationResult.forEach(item => {
            if (item.status === true) {
                readyCount = item.value;
            } else {
                // This captures both false and null/missing (grouped as false by $ifNull)
                notReadyCount += item.value;
            }
        });

        const formattedData: ReadyWorkDataPoint[] = [];
        if (readyCount > 0) {
            formattedData.push({ name: 'Active', value: readyCount });
        }
        if (notReadyCount > 0) {
            formattedData.push({ name: 'Not Active', value: notReadyCount });
        }

        console.log('[getReadyToWorkStats] Formatted Data:', JSON.stringify(formattedData));
        console.log("[getReadyToWorkStats] Function finished successfully.");
        return JSON.stringify(formattedData);

    } catch (error) {
        console.error(`[getReadyToWorkStats ERROR] Failed during stats calculation:`, error);
        let errorMessage = `Failed to fetch readiness stats.`;
        if (error instanceof Error) { errorMessage = error.message || errorMessage; }
        return JSON.stringify({ error: errorMessage } as StatError);
    }}