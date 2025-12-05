// 결과 + 댓글 페이지:
// - results 테이블에서 -> 우승 결과 읽기
// - 댓글 목록/ 댓글 작성은 백엔드 /public/worldcup/:id/comments 사용 ( write는 서버 경유 )
// - 추후 카카오톡 공유 버튼 추가하기

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/apiClient";
import { Button, Input, Label, Textarea } from "@/components/ui";
import Image from "next/image";

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
    winner_name: string;
    winner_image_url: string;
};

export default function ResultPage() {
    const params = useParams<{ id: string }>();
    const tournamentId = params.id;
    const router = useRouter();

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
        <main className="max-w-[1500px] mx-auto mt-14">
            {/* 모바일: 세로, md 이상: 좌우 2컬럼 */}
            <div className="flex flex-col md:flex-row md:gap-8">
                {/* 왼쪽: 우승 이미지 크게 */}
                <section className="md:w-1/2 mb-20 md:mb-0">
                    <h1 className="text-3xl font-bold text-center mb-6">최종 우승</h1>
                    <div className="flex flex-col items-center">
                        <Image
                            src={result.winner_image_url}
                            alt={result.winner_name}
                            width={360}
                            height={360}
                            className="
                            h-90 w-90           // 스마트폰
                            sm:h-130 sm:w-130   // 폴드 스마트폰
                            md:h-150 md:w-150   // 태블릿
                            lg:h-180 lg:w-180   // 데스크탑
                            mb-6 object-cover rounded-md
                        "
                        />
                        <div className="flex flex-col gap-3 items-center">
                            <p className="text-xl font-bold text-center">
                                {result.winner_name}
                            </p>

                            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                <Button
                                    onClick={() => router.push(`/worldcup/${tournamentId}`)}
                                    className="cursor-pointer"
                                >
                                    다시하기
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push(`/`)}
                                    className="cursor-pointer"
                                >
                                    다른 월드컵 하기
                                </Button>
                            </div>

                            {/* TODO: 카카오톡 공유 버튼 자리 */}
                        </div>
                    </div>
                </section>

                {/* 오른쪽: 댓글 폼 + 리스트 */}
                <section className="md:w-1/2 p-4">
                    <h2 className="text-xl font-bold mt-14 mb-6">댓글</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex flex-col gap-3">
                            <Label htmlFor="nickname">닉네임</Label>
                            <Input
                                id="nickname"
                                className="flex-1"
                                placeholder="닉네임을 입력해주세요."
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <Label htmlFor="comment">댓글</Label>
                            <Textarea
                                id="comment"
                                placeholder="댓글을 입력해주세요."
                                rows={3}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={pending || !content.trim()}
                            className="w-full md:w-auto"
                        >
                            {pending ? "작성 중..." : "댓글 작성"}
                        </Button>
                    </form>

                    {/* 댓글 리스트 */}
                    <ul className="space-y-3 mt-16">
                        {comments.map((c) => {
                            const winnerName = c.winner_name ?? result.winner_name;
                            const winnerImageUrl = c.winner_image_url ?? result.winner_image_url;

                            return (
                                <li key={c.id} className="border rounded-md flex py-3 px-4 gap-5">
                                    {/* 왼쪽: 우승 이미지 (댓글 시점 스냅샷 기준) */}
                                    <Image
                                        src={winnerImageUrl}
                                        alt={winnerName}
                                        width={48}
                                        height={48}
                                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                    />

                                    {/* 오른쪽: 상단(닉네임/우승자/시간) + 하단(댓글 내용) */}
                                    <div className="flex-1 flex flex-col justify-center gap-1">
                                        <div className="flex flex-wrap items-center gap-4 text-sm font-base">
                                            <span>{c.nickname || "익명"}</span>
                                            <span className="text-xs text-gray-400">
                                                {winnerName}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(c.created_at).toLocaleString()}
                                            </span>
                                        </div>

                                        <p className="text-sm whitespace-pre-line">
                                            {c.content}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            </div>
        </main>
    );
}