// File: app/api/storage/connections/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the connection ID from the URL parameters
    const connectionId = params.id;

    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = new ObjectId(session.user.id);
    
    // Validate connection ID format
    if (!connectionId || !ObjectId.isValid(connectionId)) {
      return NextResponse.json(
        { message: 'Invalid connection ID format' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();
    
    // Check if the database connection is established
    if (!mongoose.connection || !mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    
    // Use Mongoose's native collection access
    const db = mongoose.connection.db;
    
    // Find the connection and make sure it belongs to the current user
    const connection = await db.collection('storagecredentials').findOne({
      _id: new ObjectId(connectionId),
      user_id: userId
    });

    // If connection not found or doesn't belong to user
    if (!connection) {
      return NextResponse.json(
        { message: 'Storage connection not found' },
        { status: 404 }
      );
    }

    // Delete the connection
    const result = await db.collection('storagecredentials').deleteOne({
      _id: new ObjectId(connectionId),
      user_id: userId
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: 'Failed to delete storage connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Storage connection deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error deleting storage connection:', error);
    
    return NextResponse.json({
      message: 'Failed to delete storage connection',
      error: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}