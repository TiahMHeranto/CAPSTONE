import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ACTIVITE, COOKIE_SESSION } from "@/lib/cookies";
import { lireCharge } from "@/lib/jeton";
import { autorise, bureau } from "@/lib/rbac";

const PUBLICS = ["/login", "/accessibilite", "/api/health"];
const HORS_CAHIER = ["/garanties", "/lecture", "/decisions", "/ordonnances", "/audit"];
const QUINZE_MIN = 15 * 60 * 1000;

export function middleware(requete: NextRequest) {
  const chemin = requete.nextUrl.pathname;
  if (chemin.startsWith("/_next") || chemin.startsWith("/api/health") || chemin.includes(".")) {
    return NextResponse.next();
  }
  const token = requete.cookies.get(COOKIE_SESSION)?.value;
  const charge = token ? lireCharge(token) : null;
  if (chemin === "/") return passer(requete, false);
  const publicPath = PUBLICS.some((item) => chemin === item || chemin.startsWith(`${item}/`));
  if (!charge && !publicPath) {
    return NextResponse.redirect(new URL("/login", requete.url));
  }
  if (charge && bureau(charge.role)) {
    const vu = Number(requete.cookies.get(COOKIE_ACTIVITE)?.value ?? "0");
    if (vu && Date.now() - vu > QUINZE_MIN) {
      const sortie = NextResponse.redirect(new URL("/login", requete.url));
      sortie.cookies.delete(COOKIE_SESSION);
      sortie.cookies.delete(COOKIE_ACTIVITE);
      return sortie;
    }
  }
  if (charge && chemin === "/login") {
    return NextResponse.redirect(new URL("/tableau", requete.url));
  }
  if (charge && HORS_CAHIER.some((item) => chemin === item || chemin.startsWith(`${item}/`))) {
    return NextResponse.redirect(new URL("/tableau", requete.url));
  }
  if (charge && !publicPath && !autorise(chemin, charge.role)) {
    return NextResponse.redirect(new URL("/interdit", requete.url));
  }
  const reponse = passer(requete, Boolean(charge && bureau(charge.role)));
  return reponse;
}

function passer(requete: NextRequest, activite: boolean) {
  const entetes = new Headers(requete.headers);
  entetes.set("x-vitrine", requete.nextUrl.pathname === "/" ? "1" : "0");
  const reponse = NextResponse.next({ request: { headers: entetes } });
  reponse.headers.set("Cache-Control", "no-store");
  reponse.headers.set("Referrer-Policy", "no-referrer");
  reponse.headers.set("X-Content-Type-Options", "nosniff");
  reponse.headers.set("X-Frame-Options", "DENY");
  if (activite) {
    reponse.cookies.set(COOKIE_ACTIVITE, String(Date.now()), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return reponse;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
