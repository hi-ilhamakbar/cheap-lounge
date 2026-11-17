import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getDict } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap", weight: ["500", "600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return {
    title: { default: t.meta.title, template: `%s | JASA TIKET MURAH` },
    description: t.meta.description,
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    openGraph: { title: t.meta.title, description: t.meta.description, type: "website" },
  };
}

export const viewport: Viewport = { themeColor: "#0f1b3d", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang } = await getDict();
  return (
    <html lang={lang} className={`${inter.variable} ${playfair.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
