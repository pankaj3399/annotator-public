import { NextRequest, NextResponse } from 'next/server';
import { PlaidApi, TransferACHNetwork } from 'plaid';
import { config } from '../create-link-token/route';

const client = new PlaidApi(config);

export async function POST(req: NextRequest) {
  const { amount, funding_account_id }: { amount: number, funding_account_id:string } = await req.json();
  try {
    const response = await client.transferLedgerDeposit({
      client_id: process.env.PLAID_CLIENT_ID || '',
      secret: process.env.PLAID_SECRET || '',
      amount: amount.toFixed(2).toString(), // Ensure the amount is a decimal string with two digits of precision
      network: TransferACHNetwork.Ach,
      idempotency_key: `deposit_${Date.now()}`,
      description: 'deposit',
      funding_account_id
    });
    const sweep = response.data.sweep;
    console.log(sweep)
    const response1 = await client.transferLedgerGet({});
    const available_balance = response1.data
    console.log(available_balance)
    return NextResponse.json({ sweep });
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Error exchanging public token' }, { status: 500 });
  }
}