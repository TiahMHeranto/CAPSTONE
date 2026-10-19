import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { Coquille } from "@/components/coquille";
import { COOKIE_THEME } from "@/lib/cookies";
import { lireSession } from "@/lib/session";
import "./globals.css";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-plex" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-plex-mono" });

export const metadata: Metadata = { title: "PrediCare TPA" };
export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await lireSession();
  const theme = (await cookies()).get(COOKIE_THEME)?.value === "dark" ? "dark" : "light";
  return (
    <html lang="fr" data-theme={theme} className={`${plex.variable} ${mono.variable}`}>
      <body>
        {session ? (
          <Coquille session={session} theme={theme}>
            {children}
          </Coquille>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
