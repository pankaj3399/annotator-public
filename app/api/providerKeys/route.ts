import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { User } from "@/models/User";
import { authOptions } from "@/auth";
import { ProviderKeys } from "@/models/ProviderKeysSchema";
import { connectToDatabase } from "@/lib/db";
import { isProjectManager } from "@/lib/userRoles";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const providerId = url.searchParams.get("providerId");
        const providerType = url.searchParams.get("providerType");

        console.log('GET request params:', { providerId, providerType });

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        // Get the user
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch provider keys for this user
        let providerKeys = await ProviderKeys.findOne({ user_id: user._id });

        // If we're checking for a specific provider key
        if (providerId && providerType) {
            // IMPORTANT: Don't restrict this part to project managers only
            if (!providerKeys) {
                return NextResponse.json({ exists: false, apiKey: null });
            }

            const providersField = providerType === "transcription" ? "transcriptionProviders" : "translationProviders";
            let apiKey = null;
            let exists = false;

            if (providerKeys[providersField]) {
                if (providerKeys[providersField] instanceof Map) {
                    exists = providerKeys[providersField].has(providerId);
                    apiKey = exists ? providerKeys[providersField].get(providerId)?.apiKey : null;
                } else {
                    exists = !!providerKeys[providersField][providerId];
                    apiKey = exists ? providerKeys[providersField][providerId]?.apiKey : null;
                }
            }

            console.log('Provider key check result:', { exists, apiKey: apiKey ? 'found' : 'not found' });
            return NextResponse.json({ exists, apiKey });
        }

        // For listing all keys - only project managers
        if (!isProjectManager(user.role)) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        // Rest of your existing GET code for listing all keys...
        if (!providerKeys) {
            providerKeys = {
                user_id: user._id,
                transcriptionProviders: {},
                translationProviders: {}
            };
        }

        const response = {
            transcriptionProviders: Object.fromEntries(
                providerKeys.transcriptionProviders instanceof Map
                    ? providerKeys.transcriptionProviders.entries()
                    : Object.entries(providerKeys.transcriptionProviders || {})
            ),
            translationProviders: Object.fromEntries(
                providerKeys.translationProviders instanceof Map
                    ? providerKeys.translationProviders.entries()
                    : Object.entries(providerKeys.translationProviders || {})
            )
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Error fetching provider keys:", error);
        return NextResponse.json({ error: "Failed to fetch provider keys" }, { status: 500 });
    }
}
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        // Get the user to check their role
        const user = await User.findOne({ email: session.user.email });
        if (!user || !isProjectManager(user.role)) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const { providerId, providerType, apiKey } = await req.json();

        if (!providerId || !providerType || !apiKey) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!["transcription", "translation"].includes(providerType)) {
            return NextResponse.json({ error: "Invalid provider type" }, { status: 400 });
        }

        // Find or create provider keys document
        let providerKeys = await ProviderKeys.findOne({ user_id: user._id });

        if (!providerKeys) {
            providerKeys = new ProviderKeys({
                user_id: user._id,
                transcriptionProviders: {},
                translationProviders: {}
            });
        }

        // Update the appropriate provider key
        const providersField = providerType === "transcription" ? "transcriptionProviders" : "translationProviders";

        // Handle if the field is a Map or plain object
        if (providerKeys[providersField] instanceof Map) {
            providerKeys[providersField].set(providerId, {
                apiKey,
                lastUsed: new Date(),
                isActive: true
            });
        } else {
            // Initialize as object if needed
            if (!providerKeys[providersField]) {
                providerKeys[providersField] = {};
            }
            providerKeys[providersField][providerId] = {
                apiKey,
                lastUsed: new Date(),
                isActive: true
            };
        }

        await providerKeys.save();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error saving provider key:", error);
        return NextResponse.json({ error: "Failed to save provider key" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const providerId = url.searchParams.get("providerId");
        const providerType = url.searchParams.get("providerType");

        if (!providerId || !providerType) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        await connectToDatabase();

        // Get the user to check their role
        const user = await User.findOne({ email: session.user.email });
        if (!user || !isProjectManager(user.role)) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        // Find provider keys document
        const providerKeys = await ProviderKeys.findOne({ user_id: user._id });

        if (!providerKeys) {
            return NextResponse.json({ error: "Provider keys not found" }, { status: 404 });
        }

        // Remove the specified provider key
        const providersField = providerType === "transcription" ? "transcriptionProviders" : "translationProviders";

        if (providerKeys[providersField] instanceof Map) {
            providerKeys[providersField].delete(providerId);
        } else if (providerKeys[providersField]) {
            delete providerKeys[providersField][providerId];
        }

        await providerKeys.save();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting provider key:", error);
        return NextResponse.json({ error: "Failed to delete provider key" }, { status: 500 });
    }
}