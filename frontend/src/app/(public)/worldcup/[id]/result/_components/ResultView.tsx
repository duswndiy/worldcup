import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui";
import CommentsForm from "./CommentsForm";

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

type Props = {
    id: string;
    result: Result;
    comments: Comment[];
};

export default function ResultView({ id, result, comments }: Props) {
    return (
        <>
            {/* FINAL WINNER 뱃지: 화면 폭 전체 기준 중앙 정렬 */}
            <div className="flex justify-center mb-2 md:mb-8">
                <span
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full
                    border border-lime-500 bg-lime-500/10 dark:bg-lime-400/10
                    text-base font-bold tracking-[0.25em] uppercase text-lime-900 dark:text-lime-300
                    my-10"
                >
                    FINAL WINNER
                </span>
            </div>

            {/* 모바일: 세로, md 이상: 좌우 2컬럼 */}
            <div className="flex flex-col md:flex-row md:gap-8">
                {/* 왼쪽: 우승 이미지 크게 */}
                <section className="md:w-1/2 mb-14 md:mb-0">
                    <div className="flex flex-col items-center">
                        <Image
                            src={result.winner_image_url}
                            alt={result.winner_name}
                            width={360}
                            height={360}
                            unoptimized
                            className="
                            h-90 w-90           // 스마트폰
                            sm:h-130 sm:w-130   // 폴드 스마트폰
                            md:h-150 md:w-150   // 태블릿
                            lg:h-180 lg:w-180   // 데스크탑
                            mb-5 object-cover rounded-md
                        "
                        />
                        <div className="flex flex-col gap-10 items-center">
                            <p className="text-xl font-bold text-center">
                                {result.winner_name}
                            </p>

                            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                <Button asChild className="cursor-pointer">
                                    <Link href={`/worldcup/${id}`}>다시하기</Link>
                                </Button>

                                <Button
                                    asChild
                                    variant="outline"
                                    className="cursor-pointer"
                                >
                                    <Link href="/">다른 월드컵 하기</Link>
                                </Button>
                            </div>

                            {/* TODO: 카카오톡 공유 버튼 자리 */}
                        </div>
                    </div>
                </section>

                {/* 오른쪽: 댓글 폼 + 리스트 */}
                <section className="md:w-1/2 p-8">
                    <h2 className="text-xl font-bold mb-8">댓글</h2>

                    {/* 댓글 작성 폼 (Client Component + Server Action) */}
                    <CommentsForm id={id} />

                    {/* 댓글 리스트 */}
                    <ul className="space-y-3 mt-10">
                        {comments.map((c) => {
                            const winnerName = c.winner_name ?? result.winner_name;
                            const winnerImageUrl =
                                c.winner_image_url ?? result.winner_image_url;

                            return (
                                <li
                                    key={c.id}
                                    className="border rounded-md flex py-3 px-4 gap-5"
                                >
                                    {/* 왼쪽: 우승 이미지 (댓글 시점 스냅샷 기준) */}
                                    <Image
                                        src={winnerImageUrl}
                                        alt={winnerName}
                                        width={48}
                                        height={48}
                                        unoptimized
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
        </>
    );
}