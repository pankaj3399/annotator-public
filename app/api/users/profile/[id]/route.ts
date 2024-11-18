// app/api/users/profile/[id]/route.ts
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.id !== params.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const user = await User.findById(params.id).select('-password');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.id !== params.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const updateData = await request.json();

    // Extended allowed fields to include resume and nda
    const allowedFields = [
      'name',
      'phone',
      'location',
      'linkedin',
      'domain',
      'lang',
      'role',
      'permission',
      'resume',
      'nda'
    ];

    // Create sanitized data object
    const sanitizedData = Object.keys(updateData).reduce((acc, key) => {
      if (allowedFields.includes(key)) {
        // Handle arrays
        if (['domain', 'lang', 'permission'].includes(key)) {
          acc[key] = Array.isArray(updateData[key]) 
            ? updateData[key] 
            : updateData[key]?.split(',').map((item: string) => item.trim()) || [];
        } 
        // Handle URLs for resume and nda
        else if (['resume', 'nda'].includes(key)) {
          acc[key] = updateData[key] || null;
        }
        // Handle other fields
        else {
          acc[key] = updateData[key];
        }
      }
      return acc;
    }, {} as Record<string, any>);

    // Validate array fields
    const arrayFields = ['domain', 'lang', 'permission'];
    for (const field of arrayFields) {
      if (sanitizedData[field] && !Array.isArray(sanitizedData[field])) {
        return NextResponse.json(
          { error: `${field} must be an array` },
          { status: 400 }
        );
      }
    }

    // Add timestamp
    sanitizedData.updated_at = new Date();

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      { $set: sanitizedData },
      { 
        new: true,
        runValidators: true,
        select: '-password'
      }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return structured response
    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error: any) {
    console.error('Error updating user:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { 
          error: 'Validation Error',
          message: 'Invalid data provided',
          details: Object.values(error.errors).map((err: any) => err.message)
        },
        { status: 400 }
      );
    }

    // Handle unique constraint violations
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          error: 'Duplicate Error',
          message: 'A unique constraint was violated',
          field: Object.keys(error.keyPattern)[0]
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}