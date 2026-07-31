import { NextResponse } from "next/server";

// Deliberately does not touch the database — this exists for uptime
// monitors (e.g. UptimeRobot) to ping to prevent the host from spinning
// the instance down on idle, without adding load to the DB connection
// pool on every check.
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
