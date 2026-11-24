import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AI Business Rescue — Run your business smarter",
  description: "One calm workspace for leads, customers, follow-ups and business growth."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
