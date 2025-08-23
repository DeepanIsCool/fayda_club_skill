// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import "./globals.css";
export const metadata: Metadata = {
  title: "Fayda Club",
  description: "Play skill-based games and earn rewards",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClerkProvider>
          <CurrencyProvider>{children}</CurrencyProvider>
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  );
}
