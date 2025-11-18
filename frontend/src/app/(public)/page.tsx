// 루트 페이지:
// - 월드컵 게시물 목록을 최신순으로 Supabase에서 읽기 (anon key 사용)
// - 클릭 시 /worldcup/[id]의 상세 페이지 이동 (게임 시작)
// - 추후 "인기순/최신순" 토글 확장 예정

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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

export default async function Page() {
    const tournaments = await getTournaments();

    return (
        <main className="max-w-3xl mx-auto py-8 space-y-4">
            <h1 className="text-2xl font-bold mb-4">이상형 월드컵</h1>

            {/* TODO: 인기순/최신순 토글, 페이지네이션 */}
            <ul className="space-y-3">
                {tournaments.map((t: any) => (
                    <li
                        key={t.id}
                        className="border rounded-md p-4 hover:bg-gray-50 transition"
                    >
                        <Link href={`/worldcup/${t.id}`}>
                            <div>
                                <h2 className="font-semibold">{t.title}</h2>
                                {t.description && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        {t.description}
                                    </p>
                                )}
                                <p className="mt-2 text-xs text-gray-400">
                                    {new Date(t.created_at).toLocaleString()}
                                </p>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </main>
    );
}