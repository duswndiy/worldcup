"use server";

import { revalidatePath } from "next/cache";
import { callExpress } from "@/lib/expressClient";

export async function saveResult(
    id: string,          // short_id
    imageId: string,     // winner image id
    name: string,        // winner name
) {
    try {
        await callExpress({
            path: `/public/worldcup/${id}/result`,
            method: "POST",
            body: {
                winnerImageId: imageId,
                winnerName: name,
            },
        });

        // 결과 페이지 캐시 무효화
        revalidatePath(`/worldcup/${id}/result`);
    } catch (error) {
        console.error("[saveResult] failed", error);
        throw new Error("결과 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
}