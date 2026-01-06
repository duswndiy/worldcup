// 루트 페이지:
// - Express BFF(GET /public/worldcup)를 통해 월드컵 목록 조회
// - 각 카드 클릭 시 /worldcup/[short_id] 게임 페이지로 이동
// - 추후 "인기순/최신순" 토글 확장 예정

import Link from "next/link";
import Image from "next/image";
import { callExpress } from "@/lib/expressClient";

// 60초마다 목록 ISR
export const revalidate = 60;

type TournamentItem = {
    short_id: number;
    title: string;
    description: string | null;
    thumbnails: string[];
};

async function loadTournaments(): Promise<TournamentItem[]> {
    try {
        const list = await callExpress<TournamentItem[]>({
            path: "/public/worldcup",
            method: "GET",
            next: {
                tags: ["worldcup-list"],
            },
        });

        return Array.isArray(list) ? list : [];
    } catch (error) {
        console.error("[loadTournaments] failed", error);
        return [];
    }
}

export default async function Page() {
    const tournaments = await loadTournaments();

    return (
        <section className="space-y-5">
            {/* 상단: 사이트 소개 + 게임 시작 영역 */}
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <div className="mx-auto max-w-2xl space-y-3 text-center">
                    <p className="inline-flex items-center justify-center rounded-full border border-lime-500 bg-lime-100 px-4 py-2 text-[11px] font-bold tracking-[0.25em] text-lime-600 uppercase">
                        PICCKLE
                    </p>
                    <h1 className="text-lg text-muted-foreground">
                        치열한 <b>밸런스 게임</b>에 참여해 보세요.<br />
                        아이돌, 음식, 캐릭터 등 랜덤 주제를 골라<br />
                        끝까지 살아남는 나만의 원픽을 뽑고,<br />
                        <b>취향 랭킹</b>을 친구에게 공유하세요!
                    </h1>
                </div>
            </div>

            {/* 게시물 카드 목록 */}
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {tournaments.map((t) => (
                    <li
                        key={t.short_id}
                        className="rounded-xl border border-border bg-card/60 p-2.5 transition hover:border-primary/60 hover:bg-accent/60 "
                    >
                        <Link href={`/worldcup/${t.short_id}`}>
                            <div className="flex flex-col gap-3">
                                {/* 위쪽: 썸네일 두 장 */}
                                <div className="flex gap-2 justify-center">
                                    {(t.thumbnails ?? []).slice(0, 2).map((src, idx) => (
                                        <div
                                            key={idx}
                                            className="
                                                h-55 w-60           // 스마트폰
                                                sm:h-60 sm:w-75     // 태블릿
                                                lg:h-75 lg:w-90     // 데스크탑
                                                overflow-hidden rounded-md border border-border/60 bg-muted
                                            "
                                        >
                                            <Image
                                                src={src}
                                                alt="월드컵 썸네일"
                                                width={240}
                                                height={220}
                                                unoptimized
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* 아래쪽: 텍스트 영역 */}
                                <div>
                                    <h2 className="text-lg font-bold text-foreground p-1">
                                        {t.title}
                                    </h2>
                                    {t.description && (
                                        <p className="text-sm text-muted-foreground pl-1 pb-1">
                                            {t.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}