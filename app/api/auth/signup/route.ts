// app/api/auth/signup/route.ts

import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import saltAndHashPassword from '@/utils/password';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        await connectToDatabase();

        const { name, email, password, role, phone, domain, lang, location } = await req.json();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const hashedPassword = saltAndHashPassword(password);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role,
            phone,
            domain,
            lang,
            location
        });

        await newUser.save();

        return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
    }
}
