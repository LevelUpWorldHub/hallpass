import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { HallpassProvider } from "@/components/hallpass-provider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "HallPass",
    template: "%s · HallPass",
  },
  description:
    "A hall monitor for browser agents. Write guardrails in plain English, fail them on a red team, and enforce them on-device.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <HallpassProvider>{children}</HallpassProvider>
      </body>
    </html>
  );
}
