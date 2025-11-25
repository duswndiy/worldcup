// 월드컵 전용 로직이라서, features/worldcup 밑에 뒀음.

// Supabase에 이미지 업로드 + API 호출
import { supabase } from "@/lib/supabaseClient";

const SUPABASE_BUCKET =
    process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "images";

export type UploadedImageInfo = {
    path: string;
    name: string;
};

export async function uploadImagesToSupabase(
    files: File[],
): Promise<UploadedImageInfo[]> {
    const results: UploadedImageInfo[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const originalName = file.name;

        const extMatch = originalName.match(/\.([^.]+)$/);
        const ext = extMatch ? extMatch[1] : "webp";

        const baseName = originalName.replace(/\.[^.]+$/, "");
        const DISPLAY_NAME_MAX = 30;
        const displayName =
            baseName.length > DISPLAY_NAME_MAX
                ? baseName.slice(0, DISPLAY_NAME_MAX) + "…"
                : baseName;

        const slug = baseName
            .normalize("NFKD")
            .replace(/[^\w\-]+/g, "_");

        const safeBase = slug || "image";
        const filePath = `tournaments/${Date.now()}-${i}-${safeBase}.${ext}`;

        const { data, error } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
            });

        if (error || !data) {
            console.error(error);
            throw new Error("이미지 업로드에 실패했습니다. 다시 시도해 주세요.");
        }

        const { data: publicUrlData } = supabase.storage
            .from(SUPABASE_BUCKET)
            .getPublicUrl(data.path);

        results.push({
            path: publicUrlData.publicUrl,
            name: displayName,
        });
    }

    return results;
}