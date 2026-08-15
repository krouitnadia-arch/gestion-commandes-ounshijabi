import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";

export const metadata: Metadata = {
  title: "Gestion des commandes — Ounshijabi",
  description: "Interface de gestion des commandes, expédition et stock",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr">
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
