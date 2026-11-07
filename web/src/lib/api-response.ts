import { NextResponse } from "next/server";

/** Uniform error shape for every API route: { error: { code, message } }. */
export function apiError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
