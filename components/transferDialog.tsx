import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import axios from "axios";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function Transfer({onOpen,setOnOpen,id}: {onOpen: boolean, setOnOpen: (v: boolean) => void, id: string}) {
    const [amount, setamount] = useState<Number>()

    const handleTransfer = async () => {
        try {
            const res = await axios.post('/api/plaid/transfer', {
                client_id:id,
                amount: amount,
            })
            console.log(res.data)

            // setLinkToken(res.data.token)
            // open()
        } catch (error) {
            console.error('Error :', error);
        }
    }

    // const { open, ready } = usePlaidLink({
    //     token: linkToken!,
    //     onSuccess: async (public_token: string) => {
    //         console.log("succes")
    //         try {
    //             const response = await axios.post('/api/plaid/exchange-token', {
    //                 public_token,
    //             });
    //             console.log('Access Token:', response.data.access_token);
    //             const res = await axios.post('/api/plaid/get-back-account', {
    //                 accessToken: response.data.access_token
    //             })
    //         } catch (error) {

    //             console.error('Error exchanging public token:', error);
    //         }
    //     }
    // });


    // useEffect(() => {
    //     if (ready && linkToken) {
    //       open();
    //     }
    //   }, [linkToken, ready, open]);

    return <>
        <Dialog open={onOpen} onOpenChange={(v) => setOnOpen(v)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Transfer money from ledger</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently transfer the specified amount from your ledger.
                    </DialogDescription>
                </DialogHeader>
                {/* <div className="grid gap-4 py-4">
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
                </div> */}
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
                {/* <div className="flex flex-col gap-4">
                    <Label htmlFor="name" className="text-left">
                        Recipient Name
                    </Label>
                    <Input
                        id="name"
                        type="text"
                        placeholder="Enter recipient name"
                        onChange={(e) => setName(e.target.value)}
                    />
                </div> */}
                <DialogFooter>
                    <Button  onClick={handleTransfer} type="submit">Transfer</Button>
                    {/* <Button onClick={open} type="submit">open</Button> */}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
}