"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import axios from 'axios'
import { ArrowRightLeft, PlusCircle, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { usePlaidLink } from "react-plaid-link"
import { Input } from "./ui/input"
import { Label } from "./ui/label"


export default function BankDashboard() {
    const [linkToken, setLinkToken] = useState<string | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [bankData, setBankData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [ledger, setLedger] = useState<any>(null)
    const [amount, setamount] = useState<Number>()
    const [account_id, setAccount_id] = useState<string | null>(null);

    const getPlaidLinkToken = async () => {
        try {
            const response = await axios.post('/api/plaid/create-link-token');
            console.log(response.data)
            setLinkToken(response.data.link_token);
        } catch (error) {
            console.error('Error generating link token:', error);
        }
    };

    const onSuccess = async (public_token: string) => {
        try {
            const response = await axios.post('/api/plaid/exchange-token', {
                public_token,
            });
            console.log('Access Token:', response.data.access_token);
            const res = await axios.post('/api/plaid/get-back-account', {
                accessToken: response.data.access_token
            })
            setAccessToken(response.data.access_token);
            setBankData(res.data)
            setLedger(res.data.ledger)
        } catch (error) {

            console.error('Error exchanging public token:', error);
        }
    };

    const { open, ready } = usePlaidLink({
        token: linkToken!,
        onSuccess,
    });

    useEffect(() => {
        if (!accessToken) {
            getPlaidLinkToken()
        } 
        fetchBankData()
    }, [accessToken])

    const fetchBankData = async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/plaid/get-back-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessToken }),
            })
            const data = await response.json()
            if(data.error) {
                console.error(data.error)
                setLoading(false)
                return
            }
            console.log(data)
            setBankData(data)
            setLedger(data.ledger)
            console.log(data)
        } catch (error) {
            console.error("Error fetching bank data:", error)
        }
        setLoading(false)
    }

    const handleRefresh = () => {
        fetchBankData()
    }



    const handleDeposit = async () => {
        try {
            const res = await axios.post('/api/plaid/deposit-ledger', {
                amount: amount,
                funding_account_id: account_id
            })
            console.log(res.data)
        } catch (error) {
            console.error('Error deposit money:', error);
        }
    }

    return (
        < >
            <Card>
                <CardHeader >
                    <CardTitle className="w-full flex justify-between">Bank Dashboard
                        <Button className="ml-auto" variant={"outline"} onClick={handleRefresh}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                        </Button>
                <Button onClick={() => open()} disabled={!ready}>
                    {bankData?.accountData[0]? "Change your bank Account":"Connect Your Bank Account"}
                </Button>
                    </CardTitle>

                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div>Loading bank data...</div>
                    ) : bankData ? (
                        <div>
                            <h2 className="text-xl font-bold mb-2">Account Information</h2>
                            {bankData.accountData.map((account: any) => (
                                <div key={account.account_id} className="mb-4">
                                    <p>Account id: {account.account_id}</p>
                                    <p>Name: {account.name}</p>
                                    <p>Balance: ${account.balances.current}</p>
                                    <p>Account Type: {account.subtype}</p>
                                    <p>Account Mask: {account.mask}</p>
                                </div>
                            ))}
                            <CardTitle className="mt-3 mb-2">Ledger</CardTitle>
                            <p className="mb-2">Ledger ID: {ledger.ledger_id}</p>
                            <p className="mb-2">Ledger name: {ledger.name}</p>
                            <p className="mb-2">Available balance: ${ledger.balance.available}</p>
                            <p className="mb-2">Pending balance: ${ledger.balance.pending}</p>

                            <div className="mt-4 space-x-2">
                                <Transfer />
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Deposit
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Deposit money to ledger</DialogTitle>
                                            <DialogDescription>
                                                This action cannot be undone. This will permanently delete your account
                                                and remove your data from our servers.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="account_id" className="text-right">
                                                    Funding Account ID
                                                </Label>
                                                <Input
                                                    id="account_id"
                                                    className="col-span-3"
                                                    type="text"
                                                    placeholder="Enter account ID"
                                                    onChange={(e) => setAccount_id(e.target.value)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="amount" className="text-right">
                                                    Amount to deposit in ledger
                                                </Label>
                                                <Input
                                                    id="amount"
                                                    className="col-span-3"
                                                    type="number"
                                                    placeholder="Enter amount to deposit"
                                                    onChange={(e) => setamount(Number(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleDeposit} type="submit">Deposit</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    ) : (
                        <div>No bank data available</div>
                    )}
                </CardContent>
            </Card >
        </>
    )
}

export function Transfer() {
    const [linkToken, setLinkToken] = useState<string | null>(null);
    const [amount, setamount] = useState<Number>()
    const [name, setName] = useState<string | null>(null);
    const [account_id, setAccount_id] = useState<string | null>(null);

    const handleTransfer = async () => {
        try {
            const res = await axios.post('/api/plaid/transfer', {
                access_token: accessToken,
                amount: amount,
                account_id: account_id,
                name: name
            })
            console.log(res.data)

            setLinkToken(res.data.token)
            // open()
        } catch (error) {
            console.error('Error :', error);
        }
    }

    const { open, ready } = usePlaidLink({
        token: linkToken!,
        onSuccess: async (public_token: string) => {
            console.log("succes")
            try {
                const response = await axios.post('/api/plaid/exchange-token', {
                    public_token,
                });
                console.log('Access Token:', response.data.access_token);
                const res = await axios.post('/api/plaid/get-back-account', {
                    accessToken: response.data.access_token
                })
            } catch (error) {

                console.error('Error exchanging public token:', error);
            }
        }
    });


    useEffect(() => {
        if (ready && linkToken) {
          open();
        }
      }, [linkToken, ready, open]);

    return <>
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Transfer money from ledger</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently transfer the specified amount from your ledger.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* <div className="flex flex-col gap-4">
                                                <Label htmlFor="funding_account_id" className="text-left">
                                                    Funding Account ID
                                                </Label>
                                                <Input
                                                    id="funding_account_id"
                                                    type="text"
                                                    placeholder="Enter funding account ID"
                                                    onChange={(e) => setAccount_id(e.target.value)}
                                                />
                                            </div> */}
                    <div className="flex flex-col gap-4"></div>
                    <Label htmlFor="account_id" className="text-left">
                        Recipient Account ID
                    </Label>
                    <Input
                        id="account_id"
                        type="text"
                        placeholder="Enter recipient account ID"
                        onChange={(e) => setAccount_id(e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-4">
                    <Label htmlFor="amount" className="text-left">
                        Amount to transfer
                    </Label>
                    <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount to transfer"
                        onChange={(e) => setamount(Number(e.target.value))}
                    />
                </div>
                <div className="flex flex-col gap-4">
                    <Label htmlFor="name" className="text-left">
                        Recipient Name
                    </Label>
                    <Input
                        id="name"
                        type="text"
                        placeholder="Enter recipient name"
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button  onClick={handleTransfer} type="submit">Transfer</Button>
                    {/* <Button onClick={open} type="submit">open</Button> */}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
}