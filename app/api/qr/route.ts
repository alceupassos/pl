import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

// Gera um QR code SVG de ?data=<url> (ex.: o link de cadastro do cabo).
export async function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get("data") ?? "";
  if (!data) {
    return NextResponse.json({ error: "missing_data" }, { status: 400 });
  }
  const svg = await QRCode.toString(data, {
    type: "svg",
    margin: 1,
    width: 320,
    errorCorrectionLevel: "M",
    color: { dark: "#0b0e14", light: "#ffffff" },
  });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
