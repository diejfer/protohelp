import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Protohelp",
  description: "Diseñador visual de montajes sobre protoboard",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
