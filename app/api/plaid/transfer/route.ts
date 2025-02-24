import { NextRequest, NextResponse } from 'next/server';
import { ACHClass, PlaidApi, TransferNetwork, TransferType } from 'plaid';
import { config } from '../create-link-token/route';
import { connectToDatabase } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { bankDetail } from '@/models/bank';
import { User } from '@/models/User';

const client = new PlaidApi(config);
export async function POST(req: NextRequest) {
  const { client_id, amount } = await req.json();
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const bankDetails = await bankDetail.findOne({ user: client_id }, { plaid_access_token: 1, plaid_account_id: 1, _id: 0 });
    const name = await User.findOne({ _id: client_id }, { name: 1, _id: 0 });

    if(bankDetails == null){
      return NextResponse.json({ error: 'No bank details found' });
    }

    const response = await client.transferAuthorizationCreate({
      access_token: bankDetails.plaid_access_token,
      account_id: bankDetails.plaid_account_id,
      type: TransferType.Credit,
      network: TransferNetwork.Ach,
      amount: amount.toFixed(2).toString(),
      idempotency_key: `deposit_${Date.now()}`,
      // funding_account_id: adminAccountId,
      ach_class: ACHClass.Ppd,
      user: {
        legal_name: name.name,
      },
    });
    const authorizationId = response.data.authorization.id;

    console.log("i came here")
    console.log(response.data)


    const res = await client.transferCreate({
      access_token: bankDetails.plaid_access_token,
      account_id: bankDetails.plaid_account_id,
      description: 'payment',
      authorization_id: authorizationId,
    });
    const transfer = res.data.transfer;

    return NextResponse.json({ transfer });
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Error processing transfer' }, { status: 500 });
  }
}