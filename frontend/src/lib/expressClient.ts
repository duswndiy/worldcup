import { headers, cookies } from "next/headers";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL ?? "http://localhost:4000";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type ForwardMode = "none" | "ip" | "cookies" | "cookies+ip";

type FetchOptions<TBody> = {
    path: string;               // 예: /public/worldcup/123/result
    method?: HttpMethod;
    body?: TBody;
    cache?: RequestCache;
    next?: {
        revalidate?: number;
        tags?: string[];
    };
    // ✅ 추가 : 정적/ISR 페이지에서 기본은 "none"
    forward?: ForwardMode;
};

async function buildCookieHeader(): Promise<string | undefined> {
    const store = await cookies();
    const all = store.getAll();
    if (all.length === 0) return undefined;

    return all.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function buildForwardedForHeader(): Promise<string | undefined> {
    const h = await headers();

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

export async function callExpress<TResponse = unknown, TBody = unknown>(
    opts: FetchOptions<TBody>,
): Promise<TResponse> {
    const { path, method = "GET", body, cache, next } = opts;

    // ✅ 기본값 : 정적/ISR 안전
    const forward: ForwardMode = opts.forward ?? "none";

    // ✅ forward 모드에 따라 필요한 것만 읽는다
    const [cookieHeader, xff] = await Promise.all([
        forward === "cookies" || forward === "cookies+ip"
            ? buildCookieHeader()
            : Promise.resolve(undefined),
        forward === "ip" || forward === "cookies+ip"
            ? buildForwardedForHeader()
            : Promise.resolve(undefined),
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

    if (res.status === 204) return undefined as TResponse;
    return (await res.json()) as TResponse;
}