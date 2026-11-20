import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function RegistrationPolicy({ label = 'Terms and Privacy Policy' }: { label?: string }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button type="button" className="text-primary min-h-6 text-left text-sm font-medium underline underline-offset-4">
                    {label}
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Terms and Privacy Policy</DialogTitle>
                    <DialogDescription>Read these platform terms before creating your LubosMart account.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 text-sm leading-relaxed">
                    <section className="space-y-2">
                        <h2 className="text-base font-semibold">Your account</h2>
                        <p>
                            Provide accurate information, use an email and mobile number you control, and keep your password private. Complete email
                            verification and the requirements for your selected role. Buyer, Seller and Logistics applications require administrator
                            review. Rider applications require approval from the selected Logistics company.
                        </p>
                    </section>
                    <section className="space-y-2">
                        <h2 className="text-base font-semibold">Marketplace orders</h2>
                        <p>
                            Check product details, quantities, delivery address, shipping fee and the cash-on-delivery total before placing an order.
                            Sellers are responsible for accurate listings, available stock and preparing parcels. Riders and Logistics must record
                            parcel updates and handle delivery proof and collected cash accurately.
                        </p>
                    </section>
                    <section className="space-y-2">
                        <h2 className="text-base font-semibold">Responsible use</h2>
                        <p>
                            Do not submit false documents, misuse another person's account, list prohibited products, or use messages to harass
                            others. Accounts and listings may be reviewed or restricted for violations. Use the support page to report an order or
                            account issue.
                        </p>
                    </section>
                    <section className="space-y-2">
                        <h2 className="text-base font-semibold">Information used by LubosMart</h2>
                        <p>
                            Account information, contact details, addresses, uploaded requirements and order records are used to verify accounts,
                            process orders, coordinate deliveries and provide support. Required registration documents are available to authorized
                            reviewers. Delivery information is shared with the parties responsible for fulfilling the order.
                        </p>
                    </section>
                    <section className="space-y-2">
                        <h2 className="text-base font-semibold">Account settings and support</h2>
                        <p>
                            You can review available profile and security settings after your account is approved. Sensitive changes may require
                            verification or another review. Contact LubosMart support through the platform if you need help with your information or
                            access.
                        </p>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}
