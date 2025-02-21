import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { PlaidApi } from 'plaid';
import { config } from '../create-link-token/route';
import { bankDetail } from '@/models/bank';

const client = new PlaidApi(config);
export async function POST(req: NextRequest) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const bankDetails = await bankDetail.findOne({ user: session.user.id }, { plaid_access_token: 1, _id: 0 });
    // console.log(bankDetails)
    // const { accessToken } = await req.json();
    const accessToken = bankDetails.plaid_access_token
    const response = await client.authGet({ access_token: accessToken });
    const accountData = response.data.accounts;
    await bankDetail.updateOne({ user: session.user.id }, { plaid_account_id: accountData[0].account_id }, { upsert: true });
    const numbers = response.data.numbers;
    const res = await client.transferLedgerGet({});

    // const resp = await client.transferEventList({ 
    //   account_id:"6G56BDqdBocerG9VpXv1iV7bAZvbnzuz9g5ob",
    //   transfer_id:"3617bdb8-a1ac-4a9d-6dc9-b153b5aa0ea8"

    // });
    // const events = resp.data.transfer_events

    // console.log(events)



    return NextResponse.json({ accountData, numbers, ledger: res.data });
  } catch (error) {
    return NextResponse.json({ error: 'Error bank details' }, { status: 500 });
  }
}