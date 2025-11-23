// 결과 + 댓글 페이지:
// - results 테이블에서 -> 우승 결과 읽기
// - 댓글 목록/ 댓글 작성은 백엔드 /public/worldcup/:id/comments 사용 ( write는 서버 경유 )
// - 추후 카카오톡 공유 버튼 추가하기

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/apiClient";

type Result = {
    winner_image_id: string;
    winner_name: string;
    winner_image_url: string;
};

type Comment = {
    id: string;
    nickname: string | null;
    content: string;
    created_at: string;
};

export default function ResultPage() {
    const params = useParams<{ id: string }>();
    const tournamentId = params.id;

    const [result, setResult] = useState<Result | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [nickname, setNickname] = useState("");
    const [content, setContent] = useState("");
    const [pending, setPending] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [resultData, commentsData] = await Promise.all([
                    apiGet<Result>(`/public/worldcup/${tournamentId}/result`),
                    apiGet<Comment[]>(`/public/worldcup/${tournamentId}/comments`),
                ]);
                setResult(resultData);
                setComments(commentsData);
            } catch (err) {
                console.error(err);
            }
        };
        loadData();
    }, [tournamentId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setPending(true);
        try {
            const newComment = await apiPost<Comment, { nickname?: string; content: string }>(
                `/public/worldcup/${tournamentId}/comments`,
                {
                    nickname: nickname.trim() || undefined,
                    content,
                }
            );
            setComments((prev) => [newComment, ...prev]);
            setContent("");
        } catch (err) {
            console.error(err);
            alert("댓글 작성 중 오류가 발생했습니다.");
        } finally {
            setPending(false);
        }
    };

    if (!result) return <div className="p-4">결과를 불러오는 중...</div>;

    return (
        <main className="max-w-[1400px] mx-auto py-10">
            {/* 모바일: 세로, md 이상: 좌우 2컬럼 */}
            <div className="flex flex-col md:flex-row md:gap-8">
                {/* 왼쪽: 우승 이미지 크게 */}
                <section className="md:w-1/2 space-y-4 mb-8 md:mb-0">
                    <h1 className="text-2xl font-bold">최종 우승자 🎉</h1>
                    <div className="flex flex-col items-center md:items-start gap-4">
                        <img
                            src={result.winner_image_url}
                            alt={result.winner_name}
                            className="
                                h-90 w-90           // 스마트폰
                                sm:h-100 sm:w-100   // 폴드 스마트폰
                                md:h-100 md:w-100   // 태블릿
                                lg:h-160 lg:w-160   // 데스크탑
                                object-cover rounded-md"
                        />
                        <div>
                            <p className="text-xl font-semibold text-center md:text-left">
                                {result.winner_name}
                            </p>
                            {/* TODO: 카카오톡 공유 버튼 자리 */}
                        </div>
                    </div>
                </section>

                {/* 오른쪽: 댓글 폼 + 리스트 */}
                <section className="md:w-1/2 space-y-3">
                    <h2 className="text-xl font-semibold">댓글</h2>

                    <form onSubmit={handleSubmit} className="space-y-2">
                        <div className="flex gap-2">
                            <input
                                className="flex-1 border px-3 py-2 rounded-md"
                                placeholder="닉네임 (선택)"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                            />
                        </div>
                        <textarea
                            className="w-full border px-3 py-2 rounded-md"
                            placeholder="댓글을 입력해주세요."
                            rows={3}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={pending || !content.trim()}
                            className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
                        >
                            {pending ? "작성 중..." : "댓글 작성"}
                        </button>
                    </form>

                    {/* 댓글 리스트 */}
                    <ul className="space-y-2 mt-4">
                        {comments.map((c) => (
                            <li key={c.id} className="border rounded-md p-3 flex gap-3">
                                {/* 왼쪽: 우승 이미지 */}
                                <img
                                    src={result.winner_image_url}
                                    alt={result.winner_name}
                                    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                                />

                                {/* 오른쪽: 상단(닉네임/우승자/시간) + 하단(댓글 내용) */}
                                <div className="flex-1 flex flex-col justify-center">
                                    {/* 오른쪽 상단 */}
                                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                                        <span>{c.nickname || "익명"}</span>
                                        <span className="text-xs text-gray-400">
                                            · {result.winner_name}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(c.created_at).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* 오른쪽 하단 */}
                                    <p className="mt-1 text-sm whitespace-pre-line">
                                        {c.content}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </main>
    );
}