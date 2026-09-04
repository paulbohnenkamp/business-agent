import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Business Agent",
  description: "Configurable, auditable agents for enterprise workflows",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
