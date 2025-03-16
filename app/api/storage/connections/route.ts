// File: app/api/storage/connections/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';

// Define an interface for the storage connection document
interface StorageConnection {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  storageType: string;
  isActive: boolean;
  lastUsed: Date | null;
  created_at: Date;
  s3Config?: {
    bucketName: string;
    region: string;
    folderPrefix?: string;
  };
  googleDriveConfig?: {
    displayName: string;
    email: string;
  };
  credentials?: any;
}

// Define GET handler for the route
export async function GET() {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = new ObjectId(session.user.id);
    
    // Connect to database
    await connectToDatabase();
    
    // Check if the database connection is established
    if (!mongoose.connection || !mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    
    // Use Mongoose's native collection access
    const db = mongoose.connection.db;
    
    // Fetch all storage connections for the user
    const connections = await db.collection('storagecredentials')
      .find({ user_id: userId })
      .sort({ created_at: -1 }) // Most recent first
      .toArray() as StorageConnection[];
    
    // Remove sensitive credential information before sending to client
    const safeConnections = connections.map((conn: StorageConnection) => {
      const { credentials, ...safeConn } = conn;
      return safeConn;
    });
    
    return NextResponse.json({
      success: true,
      connections: safeConnections
    });
    
  } catch (error: any) {
    console.error('Error fetching storage connections:', error);
    
    return NextResponse.json({
      message: 'Failed to fetch storage connections',
      error: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}