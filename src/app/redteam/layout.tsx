import Link from "next/link";

export default function RedteamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-[#efe8da]">
      <div className="bg-[#9d1c1c] px-4 py-2 text-center text-sm text-white">
        HallPass red-team simulation. This page is a drill. It does not take money, send mail, or leave this
        app.{" "}
        <Link href="/" className="underline">
          Back to the desk
        </Link>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
