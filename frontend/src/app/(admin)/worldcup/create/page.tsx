// ▶️ 월드컵 게시물 생성 페이지:
// - 제목 + 설명(생략가능) + 최소 32장 이미지 업로드
// - 프론트에서는 단순 Form + 로컬 검증
// - 실제 생성은 백엔드 /admin/tournaments에 FormData로 전송
// - 백엔드가 Supabase Storage & DB에 저장 (service_role 사용)
// - gif같은 움짤 지원하는 방향 확대 예정

"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { isGif, convertImagesToWebP } from "@/lib/image";
import { WorldcupCreateForm } from "@/features/worldcup/create/components/CreateForm";
import { uploadImagesToSupabase } from "@/features/worldcup/api/uploadImagesToSupabase";
import { createTournament } from "@/features/worldcup/api/createWorldcup";

function CreateWorldcupPage() {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [pending, setPending] = useState(false);
    const [converting, setConverting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const selectedFiles = Array.from(e.target.files);
        setError(null);

        // GIF 차단
        if (selectedFiles.some(isGif)) {
            setError("움짤(gif)은 아직 지원하지 않습니다. 정적인 이미지 파일만 업로드해 주세요.");
            e.target.value = "";
            return;
        }

        setConverting(true);
        try {
            // webp 변환
            const converted = await convertImagesToWebP(selectedFiles);

            // 기존 + 새 파일 누적
            setFiles((prev) => [...prev, ...converted]);

            // 미리보기 URL 누적
            const newUrls = converted.map((file) => URL.createObjectURL(file));
            setPreviewUrls((prev) => [...prev, ...newUrls]);

            // 같은 파일 다시 선택 가능하게 초기화
            e.target.value = "";
        } finally {
            setConverting(false);
        }
    };

    const handleRemoveImage = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviewUrls((prev) => {
            const urlToRevoke = prev[index];
            if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
            return prev.filter((_, i) => i !== index);
        });
    };

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
            // 1) Supabase Storage 업로드
            const imagesPayload = await uploadImagesToSupabase(files);

            // 2) 백엔드로 생성 요청
            await createTournament({
                title,
                description,
                images: imagesPayload,
            });

            router.push("/");
        } catch (err: unknown) {
            console.error(err);
            const message =
                err instanceof Error ? err.message : "월드컵 생성 중 오류가 발생했습니다.";
            setError(message);
        } finally {
            setPending(false);
        }
    };

    return (
        <main className="max-w-[1200px] mx-auto rounded-xl border border-border p-14 my-40">
            <h1 className="text-2xl font-bold mb-18 text-center">
                새로운 월드컵 생성하기
            </h1>

            <WorldcupCreateForm
                title={title}
                description={description}
                filesCount={files.length}
                previewUrls={previewUrls}
                pending={pending}
                converting={converting}
                error={error}
                onTitleChange={setTitle}
                onDescriptionChange={setDescription}
                onSubmit={handleSubmit}
                onFileChange={handleFileChange}
                onClearImages={handleClearImages}
                onRemoveImage={handleRemoveImage}
            />
        </main>
    );
}

export default CreateWorldcupPage;