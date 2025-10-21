export const runtime = "nodejs";
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Allow PHIVOLCS TLS

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    let html;
    try {
      const res = await fetch("https://earthquake.phivolcs.dost.gov.ph/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Accept: "text/html",
        },
        cache: "no-store",
      });
      html = await res.text();
    } catch {
      console.warn("⚠️ Direct fetch failed, trying proxy…");
      const proxyRes = await fetch(
        "https://api.allorigins.win/raw?url=https://earthquake.phivolcs.dost.gov.ph/"
      );
      html = await proxyRes.text();
    }

    const $ = cheerio.load(html);
    const table = $("table")
      .filter((_, el) => {
        const text = $(el).text();
        return text.includes("Date - Time") && text.includes("Latitude");
      })
      .first();

    if (!table.length) throw new Error("No earthquake table found");

    const rows = table.find("tr").toArray().filter((r) => $(r).find("a").length > 0);
    if (rows.length === 0) throw new Error("No data rows found");

    const cols = $(rows[0]).find("td");
    const latestEarthquake = {
      dateTime: $(cols[0]).text().trim(),
      latitude: $(cols[1]).text().trim(),
      longitude: $(cols[2]).text().trim(),
      depth: $(cols[3]).text().trim(),
      magnitude: $(cols[4]).text().trim(),
      location: $(cols[5]).text().trim(),
    };

    return NextResponse.json({ latestEarthquake });
  } catch (error) {
    console.error("❌ Failed to scrape PHIVOLCS:", error);
    return NextResponse.json(
      { error: "Scrape failed", details: error.message },
      { status: 500 }
    );
  }
}
