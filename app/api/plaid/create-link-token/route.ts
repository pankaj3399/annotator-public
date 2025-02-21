import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode, SandboxPublicTokenCreateRequest } from 'plaid';

export const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox' as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': process.env.PLAID_SECRET || '',
      'Plaid-Version': '2020-09-14',
    },
  },
});

const client = new PlaidApi(config);

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    console.log(session.user.id)
    const response = await client.linkTokenCreate({
      user: { client_user_id: session?.user.id },
      client_name: 'Annotator',
      products: [
        Products.Auth,
        Products.Transfer,
      ],
      country_codes: [CountryCode.Us],
      language: 'en',
    });
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Error generating link token' }, { status: 500 });
  }
}