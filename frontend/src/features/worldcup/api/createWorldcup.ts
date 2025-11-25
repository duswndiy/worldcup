// Express 서버 호출
import { UploadedImageInfo } from "./uploadImagesToSupabase";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function createTournament(payload: {
    title: string;
    description: string;
    images: UploadedImageInfo[];
}) {
    const res = await fetch(`${API_BASE_URL}/admin/worldcup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw new Error(`생성 실패: ${res.status}`);
    }
}