// ▶️ 월드컵 게시물 생성 페이지:
// - 제목 + 설명(생략가능) + 최소 32장 이미지 업로드
// - 프론트에서는 단순 Form + 로컬 검증
// - 실제 생성은 백엔드 /admin/tournaments에 FormData로 전송
// - 백엔드가 Supabase Storage & DB에 저장 (service_role 사용)

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function CreateWorldcupPage() {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        setFiles(Array.from(e.target.files));
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
            const formData = new FormData();
            formData.append("title", title);
            formData.append("description", description);

            files.forEach((file, idx) => {
                formData.append("images", file, file.name || `image-${idx}.webp`);
            });

            const res = await fetch(`${API_BASE_URL}/admin/tournaments`, {
                method: "POST",
                credentials: "include", // 관리자 쿠키
                body: formData,
            });

            if (!res.ok) {
                throw new Error(`생성 실패: ${res.status}`);
            }

            const data = await res.json();
            const createdId = data.id as string;

            // 생성 후 해당 월드컵 상세 페이지로 이동
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
                        이미지 (최소 32장, webp 권장)
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
                    </p>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                    type="submit"
                    disabled={pending}
                    className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
                >
                    {pending ? "생성 중..." : "월드컵 생성하기"}
                </button>
            </form>
        </main>
    );
}

export default CreateWorldcupPage;