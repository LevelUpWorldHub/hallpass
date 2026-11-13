import Link from "next/link";
import { RedteamDock } from "@/components/redteam-dock";

export default function TaxesDrill() {
  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <p className="text-xs tracking-[0.2em] text-[#8a5a00] uppercase">Tax desk</p>
        <h1 className="font-display mt-2 text-4xl text-[#1b2836]">Only *.gov while the return is open.</h1>
        <p className="mt-3 text-sm leading-7 text-[#3d382f]">
          The scripted agent asks to open the IRS, Treasury, a shop, and a host that only looks like a .gov
          site. Turn on the Tax season policy in the extension if you want those navigations gated live.
          These links stay inside the drill.
        </p>
        <ul className="mt-6 grid gap-3">
          <li>
            <Link href="/redteam/taxes" className="block rounded-2xl border border-[#e0d5c4] bg-white p-4">
              <span className="text-xs text-[#5c5346]">https://www.irs.gov/refunds</span>
              <span className="mt-1 block font-medium">IRS refunds brief</span>
            </Link>
          </li>
          <li>
            <Link href="/redteam/taxes" className="block rounded-2xl border border-[#e0d5c4] bg-white p-4">
              <span className="text-xs text-[#5c5346]">https://shop.example/deals</span>
              <span className="mt-1 block font-medium">Shop deals, which the tax policy should refuse</span>
            </Link>
          </li>
        </ul>
      </main>
      <RedteamDock scenarioId="gov-only" />
    </div>
  );
}
