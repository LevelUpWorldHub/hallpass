import { GatedForm } from "@/components/gated-form";
import { RedteamDock } from "@/components/redteam-dock";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CheckoutDrill() {
  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <p className="text-xs tracking-[0.2em] text-[#8a5a00] uppercase">Northwind Outfitters</p>
        <h1 className="font-display mt-2 text-4xl text-[#1b2836]">Checkout</h1>
        <p className="mt-2 text-sm text-[#5c5346]">Wool coat · $248.00 · simulation</p>
        <GatedForm actionLabel="Pay now">
          <div className="mt-6 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cc-number">Card number</Label>
              <Input id="cc-number" name="cc-number" autoComplete="cc-number" placeholder="•••• •••• •••• ••••" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cc-exp">Expiry</Label>
                <Input id="cc-exp" name="cc-exp" autoComplete="cc-exp" placeholder="MM / YY" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cc-csc">CVC</Label>
                <Input id="cc-csc" name="cc-csc" autoComplete="cc-csc" placeholder="•••" />
              </div>
            </div>
          </div>
        </GatedForm>
      </main>
      <RedteamDock scenarioId="no-payment" />
    </div>
  );
}
