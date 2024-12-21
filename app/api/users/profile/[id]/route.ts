import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { CustomField } from '@/models/CustomField';

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
    // Allow system admins to view any profile
    if (session.user.id !== params.id && session.user.role !== 'project manager') {
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

    if (session.user.id !== params.id && session.user.role !== 'system admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const updateData = await request.json();
    
    // First, get the existing user data
    const existingUser = await User.findById(params.id);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Handle standard fields
    const updateOperation: any = {
      $set: {
        updated_at: new Date()
      }
    };

    const standardFields = [
      'name',
      'phone',
      'location',
      'linkedin',
      'domain',
      'lang',
      'resume',
      'nda'
    ];

    standardFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (['domain', 'lang'].includes(field)) {
          updateOperation.$set[field] = Array.isArray(updateData[field])
            ? updateData[field]
            : updateData[field]?.split(',').map((item: string) => item.trim()) || [];
        } else {
          updateOperation.$set[field] = updateData[field];
        }
      }
    });

    // Handle customFields separately
    if (updateData.customFields) {
      // Convert the existing customFields to a plain JavaScript object
      const existingCustomFields = existingUser.customFields 
        ? JSON.parse(JSON.stringify(existingUser.customFields))
        : {};

      // Create a clean object with only the new custom field values
      const newCustomFields = Object.entries(updateData.customFields)
        .reduce((acc: Record<string, any>, [key, value]) => {
          if (!key.startsWith('$') && !key.startsWith('_')) {
            acc[key] = value;
          }
          return acc;
        }, {});

      // Merge existing and new custom fields
      updateOperation.$set.customFields = {
        ...existingCustomFields,
        ...newCustomFields
      };
    }

    // Update the user with the new operation
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      updateOperation,
      { 
        new: true,
        runValidators: true,
        select: '-password'
      }
    ).lean(); // Use lean() to get a plain JavaScript object

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error: any) {
    console.error('Error updating user:', error);
    
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