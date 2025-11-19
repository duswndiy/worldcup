// 루트 페이지:
// - 월드컵 게시물 목록을 최신순으로 Supabase에서 읽기 (anon key 사용)
// - 클릭 시 /worldcup/[id]의 상세 페이지 이동 (게임 시작)
// - 추후 "인기순/최신순" 토글 확장 예정

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui";

async function getTournaments() {
    const { data, error } = await supabase
        .from("tournaments")
        .select("id, title, description, created_at")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return [];
    }
    return data ?? [];
}



// ✅ 스켈레톤 리스트 (게시물 카드 모양만 미리 보기용)
function TournamentListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <ul className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <li
                    key={i}
                    className="rounded-xl border border-border/60 bg-card/60 px-4 py-3"
                >
                    <div className="space-y-2">
                        {/* 제목 자리 */}
                        <Skeleton className="h-5 w-40" />
                        {/* 설명 자리 */}
                        <Skeleton className="h-4 w-full" />
                        {/* 날짜 자리 */}
                        <Skeleton className="h-3 w-24" />
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default async function Page() {
    const tournaments = await getTournaments();
    const hasData = tournaments.length > 0;

    return (
        <section className="space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">
                    이상형 월드컵
                </h1>
                <p className="text-sm text-muted-foreground">
                    다양한 월드컵을 플레이하고, 당신의 이상형을 골라보세요.
                </p>
            </header>

            {/* 데이터 있으면 게시물 보이고, 없으면 스켈레톤 */}
            {hasData ? (
                <ul className="space-y-3">
                    {tournaments.map((t: any) => (
                        <li
                            key={t.id}
                            className="rounded-xl border border-border/60 bg-card/60 px-4 py-3 transition hover:border-primary/60 hover:bg-accent/60"
                        >
                            <Link href={`/worldcup/${t.id}`}>
                                <div className="space-y-1">
                                    <h2 className="text-base font-medium text-foreground">
                                        {t.title}
                                    </h2>
                                    {t.description && (
                                        <p className="text-sm text-muted-foreground">
                                            {t.description}
                                        </p>
                                    )}
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {new Date(t.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                <TournamentListSkeleton count={5} />
            )}
        </section>
    );
}