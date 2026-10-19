import { NextResponse } from "next/server";

export async function GET() {
  const origine = process.env.API_URL ?? "http://localhost:8000";
  try {
    const response = await fetch(`${origine}/health`, { cache: "no-store" });
    const corps = await response.json();
    return NextResponse.json({ application: "ok", api: corps }, { status: response.ok ? 200 : 503 });
  } catch {
    return NextResponse.json({ application: "ok", api: "injoignable" }, { status: 503 });
  }
}
