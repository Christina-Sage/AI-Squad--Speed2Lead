import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PRODUCT_COOKIE, PRODUCTS } from "@/lib/products";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const product = typeof body?.product === "string" ? body.product : "";

  if (!PRODUCTS.some((p) => p.id === product)) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(PRODUCT_COOKIE, product, { path: "/" });
  return NextResponse.json({ success: true });
}
