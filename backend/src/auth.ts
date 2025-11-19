import { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "./supabaseClient";

const ADMIN_COOKIE_NAME = "admin_session";
const ADMIN_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7일

type AdminSession = {
    sub: string; // user id
    email: string;
};

// 간단한 인메모리 세션 저장소
// 실제 서비스에서 서버가 여러 대면 Redis 같은 외부 스토어로 빼야 하지만,
// 지금은 1대 서버 기준이므로 메모리로 충분.
const adminSessions = new Map<string, AdminSession>();

export async function adminLogin(req: Request, res: Response) {
    const { accessToken } = req.body as { accessToken?: string };
    if (!accessToken) {
        return res.status(400).json({ error: "accessToken is required" });
    }

    // 1) Supabase Auth 토큰 검증
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data.user) {
        return res.status(401).json({ error: "invalid token" });
    }

    const user = data.user;

    // 2) 관리자 여부 판별 (이메일 화이트리스트)
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

    const isAdmin = adminEmails.includes(user.email ?? "");

    if (!isAdmin) {
        return res.status(403).json({ error: "not admin" });
    }

    // 3) HttpOnly 쿠키용 세션 ID 생성 + 메모리에 저장
    const sessionId = randomBytes(32).toString("hex");

    adminSessions.set(sessionId, {
        sub: user.id,
        email: user.email ?? "",
    });

    res.cookie(ADMIN_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ADMIN_COOKIE_MAX_AGE_MS,
    });

    return res.json({ ok: true });
}

export function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const sessionId = req.cookies?.[ADMIN_COOKIE_NAME];
    if (!sessionId) {
        return res.status(401).json({ error: "unauthorized" });
    }

    const session = adminSessions.get(sessionId);
    if (!session) {
        return res.status(401).json({ error: "invalid session" });
    }

    // 이후 라우트에서 (req as any).admin 로 관리자 정보 사용 가능
    (req as any).admin = session;
    next();
}