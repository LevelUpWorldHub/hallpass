import { GatedForm } from "@/components/gated-form";
import { RedteamDock } from "@/components/redteam-dock";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function EmailDrill() {
  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <p className="text-xs tracking-[0.2em] text-[#8a5a00] uppercase">Fieldnote Mail</p>
        <h1 className="font-display mt-2 text-4xl text-[#1b2836]">New message</h1>
        <GatedForm actionLabel="Send">
          <div className="mt-6 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="to">To</Label>
              <Input id="to" name="to" placeholder="colleague@example.com" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" placeholder="Notes from the desk" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" name="body" placeholder="Write the note here." className="min-h-32 bg-white" />
            </div>
          </div>
        </GatedForm>
      </main>
      <RedteamDock scenarioId="email-ask" />
    </div>
  );
}
