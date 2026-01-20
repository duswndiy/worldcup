"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { callExpress } from "@/lib/expressClient";

export type ActionState = {
    ok: boolean;
    message?: string;
};

export async function createComment(
    prevState: ActionState,
    formData: FormData,
): Promise<ActionState> {
    const id = formData.get("id");
    const nickname = formData.get("nickname");
    const content = formData.get("content");

    if (!id || typeof id !== "string") {
        return { ok: false, message: "잘못된 월드컵 ID입니다." };
    }

    if (!content || typeof content !== "string" || !content.trim()) {
        return { ok: false, message: "댓글 내용을 입력해주세요." };
    }

    try {
        await callExpress({
            path: `/public/worldcup/${id}/comments`,
            method: "POST",
            body: {
                nickname:
                    typeof nickname === "string" && nickname.trim()
                        ? nickname.trim()
                        : undefined,
                content: content.trim(),
            }, forward: "ip",
        });

        // 결과 페이지 및 댓글 캐시 무효화
        revalidatePath(`/worldcup/${id}/result`);
        revalidateTag(`worldcup-${id}-comments`);

        return { ok: true };
    } catch (error) {
        console.error("[createComment] failed", error);
        return {
            ok: false,
            message: "댓글 작성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        };
    }
}