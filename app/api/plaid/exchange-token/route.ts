import { NextRequest, NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { config } from '../create-link-token/route';
import { connectToDatabase } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { bankDetail } from '@/models/bank';

const client = new PlaidApi(config);
export async function POST(req: NextRequest) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { public_token } = await req.json();
  try {
    const response = await client.itemPublicTokenExchange({ public_token });
    const { access_token } = response.data;
    await bankDetail.updateOne({ user: session.user.id }, { plaid_access_token: access_token }, { upsert: true });
    return NextResponse.json({ access_token });
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Error exchanging public token' }, { status: 500 });
  }
}