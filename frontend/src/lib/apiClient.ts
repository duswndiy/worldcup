const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: "GET",
        credentials: "include", // HttpOnly 쿠키 전송
    });
    if (!res.ok) {
        throw new Error(`GET ${path} failed: ${res.status}`);
    }
    return res.json();
}

export async function apiPost<T, B = unknown>(
    path: string,
    body: B
): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        throw new Error(`POST ${path} failed: ${res.status}`);
    }
    return res.json();
}