// ▶️ 월드컵 게시물 생성 페이지:
// - 제목 + 설명(생략가능) + 최소 32장 이미지 업로드
// - 프론트에서는 단순 Form + 로컬 검증
// - 실제 생성은 백엔드 /admin/tournaments에 FormData로 전송
// - 백엔드가 Supabase Storage & DB에 저장 (service_role 사용)
// - gif같은 움짤 지원하는 방향 확대 예정

"use client";

import { FormEvent, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Supabase Storage 버킷 이름 (예: "worldcup-images")
const SUPABASE_BUCKET =
    process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "images";

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

// Supabase Storage에 여러 장 업로드 후, 서버에 보낼 images payload 생성
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

        // 한글/특수문자 등을 ASCII 범위로 슬러그화
        // 1) 유니코드 분해
        // 2) 영문/숫자/언더스코어/대시만 남기고 나머지는 '_' 로 치환
        const slug = baseName
            .normalize("NFKD")
            .replace(/[^\w\-]+/g, "_"); // \w = [A-Za-z0-9_]

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

        // public URL 생성 (버킷이 public이어야 함)
        const { data: publicUrlData } = supabase.storage
            .from(SUPABASE_BUCKET)
            .getPublicUrl(data.path);

        const publicUrl = publicUrlData.publicUrl;

        results.push({
            path: publicUrl,   // 👉 이미지 경로 (영어/숫자만 들어가는 안전한 URL)
            name: originalName // 👉 여기에는 한글/영어/숫자 전부 허용 (DB용, UI 표출용)
        });
    }

    return results;
}

function CreateWorldcupPage() {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [pending, setPending] = useState(false); // 생성 요청 중
    const [converting, setConverting] = useState(false); // webp 변환 중
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const selectedFiles = Array.from(e.target.files);
        setError(null);

        // 1) 움짤(GIF) 차단
        if (selectedFiles.some(isGif)) {
            setFiles([]);
            setError(
                "움짤(GIF 등)은 아직 지원하지 않습니다. 정적인 이미지 파일만 업로드해 주세요.",
            );
            return;
        }

        // 2) webp 변환 시작
        setConverting(true);
        try {
            const converted = await convertImagesToWebP(selectedFiles);
            setFiles(converted);
        } finally {
            setConverting(false);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (files.length < 1) {
            setError("이미지는 최소 32장 이상 업로드해야 합니다.");
            return;
        }

        setPending(true);
        try {
            // 1) Supabase Storage에 이미지 업로드
            const imagesPayload = await uploadImagesToSupabase(files);

            // 2) 업로드된 이미지 경로만 서버(Express)로 전달
            const res = await fetch(`${API_BASE_URL}/admin/tournaments`, {
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

            const data = await res.json();
            const createdId = data.id as string;
            router.push(`/worldcup/${createdId}`);
        } catch (err: any) {
            console.error(err);
            setError(err.message ?? "월드컵 생성 중 오류가 발생했습니다.");
        } finally {
            setPending(false);
        }
    };

    return (
        <main className="max-w-2xl mx-auto py-10">
            <h1 className="text-2xl font-bold mb-6">새 월드컵 생성하기</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm mb-1">제목</label>
                    <input
                        className="w-full border px-3 py-2 rounded-md"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="예: 최애 라면 월드컵"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1">설명 (선택)</label>
                    <textarea
                        className="w-full border px-3 py-2 rounded-md"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="월드컵에 대한 간단한 설명을 적어주세요."
                        rows={3}
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1">
                        이미지 (최소 32장, 업로드 시 webp 자동 변환)
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="block w-full text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        현재 선택된 이미지 수: {files.length}장
                        <br />
                        정적인 이미지는 업로드 시 가능하면 자동으로 webp로 변환된 뒤
                        Supabase Storage에 저장됩니다.
                        <br />
                        움짤(GIF 등)은 아직 지원하지 않습니다.
                    </p>
                    {converting && (
                        <p className="mt-1 text-xs text-blue-500">
                            이미지 변환 중입니다...
                        </p>
                    )}
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button
                    type="submit"
                    disabled={pending || converting}
                    className="w-full"
                >
                    {pending ? "생성 중..." : "월드컵 생성하기"}
                </Button>
            </form>
        </main>
    );
}

export default CreateWorldcupPage;