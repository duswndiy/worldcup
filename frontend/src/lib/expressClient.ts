import { headers, cookies } from "next/headers";

const EXPRESS_BASE_URL =
    process.env.EXPRESS_BASE_URL ?? "http://localhost:4000";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type FetchOptions<TBody> = {
    path: string;              // 예: /public/worldcup/123/result
    method?: HttpMethod;
    body?: TBody;
    cache?: RequestCache;
    next?: {
        revalidate?: number;
        tags?: string[];
    };
};

async function buildCookieHeader(): Promise<string | undefined> {
    const store = await cookies(); // ★ Promise를 await
    const all = store.getAll();
    if (all.length === 0) return undefined;

    return all
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");
}

async function buildForwardedForHeader(): Promise<string | undefined> {
    const h = await headers(); // ★ Promise를 await

    const existing = h.get("x-forwarded-for") ?? undefined;
    const candidateIp =
        h.get("x-real-ip") ??
        h.get("x-client-ip") ??
        h.get("cf-connecting-ip") ??
        undefined;

    if (existing && candidateIp && !existing.includes(candidateIp)) {
        return `${existing}, ${candidateIp}`;
    }

    return existing ?? candidateIp ?? undefined;
}

/*
 * Next 서버에서 Express로 요청을 보낼 때:
 * - X-Forwarded-For: 실제 클라이언트 IP 체인 유지
 * - Cookie: 브라우저 쿠키 그대로 전달 (HttpOnly 포함)
 */
export async function callExpress<TResponse = unknown, TBody = unknown>(
    opts: FetchOptions<TBody>,
): Promise<TResponse> {
    const { path, method = "GET", body, cache, next } = opts;

    // cookies() / headers() 둘 다 Promise라 병렬로 기다림
    const [cookieHeader, xff] = await Promise.all([
        buildCookieHeader(),
        buildForwardedForHeader(),
    ]);

    const res = await fetch(`${EXPRESS_BASE_URL}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            ...(xff ? { "X-Forwarded-For": xff } : {}),
            "X-From-App": "next-bff",
        },
        body: body ? JSON.stringify(body) : undefined,
        cache,
        next,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(
            `[callExpress] ${method} ${path} failed: ${res.status} ${res.statusText} ${text}`,
        );
        throw new Error(`Express error: ${res.status}`);
    }

    if (res.status === 204) {
        return undefined as TResponse;
    }

    return (await res.json()) as TResponse;
}