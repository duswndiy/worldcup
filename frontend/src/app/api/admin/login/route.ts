// ▶️ 관리자 로그인 BFF API:
// - 클라이언트에서 Supabase access_token을 받아
// - Express /admin/login 으로 전달해 관리자 인증 + HttpOnly 세션 쿠키 발급
// - Express가 내려준 Set-Cookie를 그대로 브라우저에 전달

import { NextRequest, NextResponse } from "next/server";

const EXPRESS_BASE_URL =
    process.env.EXPRESS_BASE_URL ?? "http://localhost:4000";

function buildForwardedForHeader(req: NextRequest): string | undefined {
    const existing = req.headers.get("x-forwarded-for") ?? undefined;
    const ip =
        req.headers.get("x-real-ip") ??
        req.headers.get("x-client-ip") ??
        req.headers.get("cf-connecting-ip") ??
        undefined;

    if (existing && ip && !existing.includes(ip)) {
        return `${existing}, ${ip}`;
    }

    return existing ?? ip ?? undefined;
}

export async function POST(req: NextRequest) {
    let accessToken: unknown;

    try {
        const body = await req.json();
        accessToken = body?.accessToken;
    } catch {
        return NextResponse.json(
            { error: "잘못된 요청입니다." },
            { status: 400 },
        );
    }

    if (!accessToken || typeof accessToken !== "string") {
        return NextResponse.json(
            { error: "accessToken 값이 필요합니다." },
            { status: 400 },
        );
    }

    const xff = buildForwardedForHeader(req);

    const res = await fetch(`${EXPRESS_BASE_URL}/admin/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(xff ? { "X-Forwarded-For": xff } : {}),
            "X-From-App": "next-bff",
        },
        body: JSON.stringify({ accessToken }),
    });

    const text = await res.text().catch(() => "");

    if (!res.ok) {
        let message = "로그인에 실패했습니다.";

        try {
            const data = JSON.parse(text);
            if (data && typeof data.error === "string") {
                message = data.error;
            }
        } catch {
            // JSON 파싱 실패 시 기본 메시지 유지
        }

        return NextResponse.json(
            { error: message },
            { status: res.status },
        );
    }

    // Express 응답은 대부분 JSON { ok: true } 형태라고 가정
    let json: unknown = null;
    try {
        json = text ? JSON.parse(text) : { ok: true };
    } catch {
        json = { ok: true };
    }

    const nextRes = NextResponse.json(json);

    // Express 가 내려준 세션 쿠키를 그대로 브라우저에 전달
    const setCookieHeader = res.headers.get("set-cookie");
    if (setCookieHeader) {
        nextRes.headers.set("Set-Cookie", setCookieHeader);
    }

    return nextRes;
}