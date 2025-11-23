// 루트 페이지:
// - 월드컵 게시물 목록을 최신순으로 Supabase에서 읽기 (anon key 사용)
// - 클릭 시 /worldcup/[id]의 상세 페이지 이동 (게임 시작)
// - 추후 "인기순/최신순" 토글 확장 예정

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type TournamentWithThumbnails = {
    id: string;
    short_id: number;
    title: string;
    description: string | null;
    created_at: string;
    thumbnails: string[]; // 해당 월드컵 이미지 중 최대 2장
};

async function getTournaments(): Promise<TournamentWithThumbnails[]> {
    // 1) 토너먼트 목록 (uuid 포함) 조회
    const { data: tournaments, error } = await supabase
        .from("tournaments")
        .select("id, short_id, title, description, created_at")
        .order("created_at", { ascending: false });

    if (error || !tournaments) {
        console.error(error);
        return [];
    }

    // 2) 각 토너먼트별로 이미지 최대 2장씩 가져오기
    const result: TournamentWithThumbnails[] = [];

    for (const t of tournaments) {
        const { data: images, error: imgError } = await supabase
            .from("images")
            .select("image_url")
            .eq("tournament_id", t.id)
            .order("created_at", { ascending: true })
            .limit(2);

        if (imgError) {
            console.error(imgError);
        }

        result.push({
            ...t,
            thumbnails: (images ?? []).map((img) => img.image_url),
        });
    }

    return result;
}

export default async function Page() {
    const tournaments = await getTournaments();

    return (
        <section className="space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">이상형 월드컵</h1>
                <p className="text-sm text-muted-foreground">
                    다양한 월드컵을 플레이하고, 당신의 원픽을 골라보세요.
                </p>
            </header>

            {/* 게시물 카드 부분 */}
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {tournaments.map((t) => (
                    <li
                        key={t.short_id}
                        className="rounded-xl border border-border/60 bg-card/60 px-4 py-3 transition hover:border-primary/60 hover:bg-accent/60 "
                    >
                        <Link href={`/worldcup/${t.short_id}`}>
                            <div className="flex flex-col gap-3">
                                {/* 위쪽: 썸네일 두 장 */}
                                <div className="flex gap-2 justify-center">
                                    {(t.thumbnails ?? []).slice(0, 2).map((src, idx) => (
                                        <div
                                            key={idx}
                                            className="
                                            h-50 w-50           // 스마트폰
                                            sm:h-70 sm:w-70     // 태블릿
                                            lg:h-80 lg:w-90     // 데스크탑
                                            overflow-hidden rounded-md border border-border/60 bg-muted"
                                        >
                                            <img
                                                src={src}
                                                alt="월드컵 썸네일"
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* 아래쪽: 텍스트 영역 */}
                                <div>
                                    <h2 className="text-lg font-bold text-foreground p-1">{t.title}</h2>
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