// ▶️ 월드컵 게시물 생성 페이지:
// - 제목 + 설명(생략가능) + 최소 32장 이미지 업로드
// - 프론트에서는 단순 Form + 로컬 검증
// - 실제 생성은 백엔드 /admin/tournaments에 FormData로 전송
// - 백엔드가 Supabase Storage & DB에 저장 (service_role 사용)
// - gif같은 움짤 지원하는 방향 확대 예정

"use client";

import { FormEvent, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, Label } from "@/components/ui/index";
import { supabase } from "@/lib/supabaseClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const SUPABASE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "images";

// GIF / 움짤 여부 간단 체크
const isGif = (file: File) =>
    file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");

// webp 변환 (브라우저가 안 되면 원본 반환)
async function convertImageToWebP(file: File): Promise<File> {
    if (file.type === "image/webp") return file;

    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext("2d");
            // Safari 등 일부 환경에서 toBlob 미지원 -> 원본 유지
            if (!ctx || !canvas.toBlob) {
                URL.revokeObjectURL(url);
                resolve(file);
                return;
            }

            ctx.drawImage(img, 0, 0);

            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(url);

                    // webp 인코딩 실패 시 원본 유지
                    if (!blob) {
                        resolve(file);
                        return;
                    }

                    const converted = new File(
                        [blob],
                        file.name.replace(/\.[^.]+$/, ".webp"),
                        { type: "image/webp" },
                    );
                    resolve(converted);
                },
                "image/webp",
                0.9,
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file); // 로딩 실패 시도 원본 유지
        };

        img.src = url;
    });
}

// 여러 장을 한 번에 변환
async function convertImagesToWebP(files: File[]): Promise<File[]> {
    const tasks = files.map((file) => convertImageToWebP(file));
    return Promise.all(tasks);
}

type UploadedImageInfo = {
    path: string; // Supabase public URL (또는 storage path)
    name: string;
};

async function uploadImagesToSupabase(
    files: File[],
): Promise<UploadedImageInfo[]> {
    const results: UploadedImageInfo[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const originalName = file.name;

        // 확장자 분리 (없으면 webp로)
        const extMatch = originalName.match(/\.([^.]+)$/);
        const ext = extMatch ? extMatch[1] : "webp";

        // 확장자 뺀 이름
        const baseName = originalName.replace(/\.[^.]+$/, "");

        // ✅ 표시용 이름: 너무 길면 잘라주기 (ex. 30글자)
        const DISPLAY_NAME_MAX = 30;
        const displayName =
            baseName.length > DISPLAY_NAME_MAX
                ? baseName.slice(0, DISPLAY_NAME_MAX) + "…"
                : baseName;

        // 업로드용 파일 경로 슬러그 (영문/숫자만)
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

        const publicUrl = publicUrlData.publicUrl;


        results.push({
            path: publicUrl,
            name: displayName
        });
    }

    return results;
}

function CreateWorldcupPage() {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);   // 미리보기 url
    const [pending, setPending] = useState(false);                  // 생성 요청 중
    const [converting, setConverting] = useState(false);            // webp 변환 중
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const selectedFiles = Array.from(e.target.files);
        setError(null);

        // 1) 움짤(GIF) 차단 (기존 선택은 유지)
        if (selectedFiles.some(isGif)) {
            setError("움짤(gif)은 아직 지원하지 않습니다. 정적인 이미지 파일만 업로드해 주세요.");
            e.target.value = "";
            return;
        }

        // 2) webp 변환 시작
        setConverting(true);
        try {
            // 새로 고른 파일만 변환
            const converted = await convertImagesToWebP(selectedFiles);

            // ✅ 기존 선택 + 새 선택 누적
            setFiles((prev) => [...prev, ...converted]);

            // ✅ 새 미리보기 URL 생성 후 누적
            const newUrls = converted.map((file) => URL.createObjectURL(file));
            setPreviewUrls((prev) => [...prev, ...newUrls]);

            // 같은 파일을 다시 선택할 수 있도록 value 초기화
            e.target.value = "";
        } finally {
            setConverting(false);
        }
    };

    // ✅ 개별 이미지 삭제 핸들러
    const handleRemoveImage = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviewUrls((prev) => {
            const urlToRevoke = prev[index];
            if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
            return prev.filter((_, i) => i !== index);
        });
    };

    // ✅ 전체 이미지 일괄 삭제 핸들러
    const handleClearImages = () => {
        setFiles([]);
        setPreviewUrls((prev) => {
            prev.forEach((url) => URL.revokeObjectURL(url));
            return [];
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (files.length < 32) {
            setError("이미지는 최소 32장 이상 업로드해야 합니다.");
            return;
        }

        setPending(true);
        try {
            // 1) Supabase Storage에 이미지 업로드
            const imagesPayload = await uploadImagesToSupabase(files);

            // 2) 업로드된 이미지 경로만 서버(Express)로 전달
            const res = await fetch(`${API_BASE_URL}/admin/worldcup`, {
                method: "POST",
                credentials: "include", // 관리자 쿠키
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    description,
                    images: imagesPayload,
                }),
            });

            if (!res.ok) {
                throw new Error(`생성 실패: ${res.status}`);
            }

            // 게시물 생성 후 루트페이지로 이동
            router.push("/");
        } catch (err: any) {
            console.error(err);
            setError(err.message ?? "월드컵 생성 중 오류가 발생했습니다.");
        } finally {
            setPending(false);
        }
    };

    return (
        <main className="max-w-[1200px] mx-auto rounded-xl border border-border p-14 my-40">
            <h1 className="text-2xl font-bold mb-18 text-center">새로운 월드컵 생성하기</h1>

            <form onSubmit={handleSubmit} className="space-y-10">
                <div>
                    <Label htmlFor="title" className="block text-sm mb-2">제목</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="예시 : 레전드 치킨 월드컵"
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="description" className="block text-sm mb-2">설명 (선택)</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="월드컵에 대한 간단한 설명을 적어주세요."
                        rows={2}
                    />
                </div>

                <div>
                    <Label
                        htmlFor="images"
                        className="block text-sm mb-2"
                    >
                        이미지 (최소 32장)
                    </Label>

                    {/* 카드 형태로 감싼 첨부 영역 */}
                    <div className="mt-4 space-y-4 rounded-lg border border-dashed border-border bg-muted/30 p-6">
                        {/* 파일 첨부하기 버튼 + 선택 개수 + 전체 삭제 버튼 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Input
                                    id="images"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="cursor-pointer"
                                    onClick={() =>
                                        document.getElementById("images")?.click()
                                    }
                                >
                                    파일 첨부하기
                                </Button>

                                <p className="text-xs text-muted-foreground ml-2">
                                    {files.length > 0
                                        ? `${files.length}장 선택됨`
                                        : "최소 32장의 이미지를 첨부해 주세요."}
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleClearImages}
                                disabled={files.length === 0}
                                className="text-xs text-muted-foreground hover:text-destructive"
                            >
                                전체 삭제
                            </Button>
                        </div>


                        {/* 이미지 미리보기 영역 */}
                        {previewUrls.length > 0 && (
                            <div className="mt-6 grid grid-cols-8 gap-3">
                                {previewUrls.map((url, idx) => (
                                    <div
                                        key={idx}
                                        className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={url}
                                            alt={`preview-${idx}`}
                                            className="h-full w-full object-cover"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(idx)}
                                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white hover:bg-black"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}


                        {converting && (
                            <p className="mt-1 text-xs text-blue-500">
                                이미지 변환 중입니다...
                            </p>
                        )}
                    </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button
                    type="submit"
                    disabled={pending || converting}
                    className="w-full cursor-pointer bg-[#39ff14]/70 hover:bg-[#32e012] text-black mt-4"
                >
                    {pending ? "생성 중..." : "월드컵 생성하기"}
                </Button>
            </form>
        </main>
    );
}

export default CreateWorldcupPage;