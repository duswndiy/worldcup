// 게임 페이지:
// - URL 의 [id] 는 tournaments.short_id (숫자)
// - 실제 DB 조인에는 tournaments.id (uuid)를 사용
// - images 테이블 -> 해당 tournament_id(uuid)의 후보 읽어서 -> 32강 토너먼트 진행
// - 각 라운드마다 랜덤 1:1 매치 -> 승자만 다음 라운드로
// - 최종 우승자 결정 후 백엔드 /public/tournaments/:id/result 로 POST (여기서 :id 는 short_id)

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { apiPost } from "@/lib/apiClient";

// 이미지 테이블에서 이미지 + 이름 + url 정보 가져오기
type ImageCandidate = {
    id: string;
    name: string;
    image_url: string;
};
// 토너먼트 테이블에서 해당 [id] 게시물의 제목 + 설명 가져오기
type TournamentInfo = {
    title: string;
    description: string | null;
};

function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
}

export default function WorldcupGamePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const tournamentShortId = params.id; // URL 에 보이는 숫자 ID

    const [currentRound, setCurrentRound] = useState(32);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentRoundCandidates, setCurrentRoundCandidates] = useState<ImageCandidate[]>([]);
    const [nextRoundCandidates, setNextRoundCandidates] = useState<ImageCandidate[]>([]);
    const [winner, setWinner] = useState<ImageCandidate | null>(null);
    const [loading, setLoading] = useState(true);
    const [tournamentInfo, setTournamentInfo] = useState<TournamentInfo | null>(null);

    // 초기 데이터 로드
    useEffect(() => {
        const fetchImages = async () => {
            setLoading(true);

            // 1) short_id(숫자) → tournaments.id(uuid) 변환
            const numericId = Number(tournamentShortId);
            if (!Number.isInteger(numericId)) {
                console.error("잘못된 월드컵 ID:", tournamentShortId);
                alert("잘못된 월드컵 주소입니다.");
                setLoading(false);
                return;
            }

            const { data: tournament, error: tError } = await supabase
                .from("tournaments")
                .select("id, title, description")
                .eq("short_id", numericId)
                .maybeSingle();

            if (tError || !tournament) {
                console.error(tError);
                alert("해당 월드컵을 찾을 수 없습니다.");
                setLoading(false);
                return;
            }

            const tournamentUuid = tournament.id as string;
            setTournamentInfo({
                title: tournament.title,
                description: tournament.description,
            });

            // 2) uuid 기준으로 images 조회
            const { data, error } = await supabase
                .from("images")
                .select("id, name, image_url")
                .eq("tournament_id", tournamentUuid)
                .order("created_at", { ascending: true });

            if (error) {
                console.error(error);
                setLoading(false);
                return;
            }

            const list = (data ?? []) as ImageCandidate[];

            if (list.length < 32) {
                // 32개 미만인 경우 UX는 자유롭게 처리
                alert("이 월드컵은 아직 32개 이상의 이미지가 준비되지 않았습니다.");
                setLoading(false);
                return;
            }

            const initial = shuffle(list).slice(0, 32);
            setCurrentRoundCandidates(initial);
            setCurrentRound(32);
            setCurrentIndex(0);
            setNextRoundCandidates([]);
            setWinner(null);
            setLoading(false);
        };

        fetchImages();
    }, [tournamentShortId]);

    const currentPair = useMemo(() => {
        const left = currentRoundCandidates[currentIndex * 2];
        const right = currentRoundCandidates[currentIndex * 2 + 1];
        if (!left || !right) return null;
        return { left, right };
    }, [currentRoundCandidates, currentIndex]);

    const handlePick = async (picked: ImageCandidate) => {
        const newNextRound = [...nextRoundCandidates, picked];
        const pairsInRound = currentRound / 2;
        const isLastPair = currentIndex + 1 >= pairsInRound;

        if (!isLastPair) {
            setNextRoundCandidates(newNextRound);
            setCurrentIndex((prev) => prev + 1);
            return;
        }

        // 마지막 페어 처리
        if (currentRound === 2) {
            // ✅ 게임 종료 -> 결과 저장 요청 후 결과 페이지로 리다이렉트
            try {
                await apiPost(`/public/worldcup/${tournamentShortId}/result`, {
                    winnerImageId: picked.id,
                    winnerName: picked.name,
                });
            } catch (err) {
                console.error(err);
                alert("결과 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            } finally {
                // 결과 저장 성공/실패와 관계없이 결과 페이지로 이동
                router.push(`/worldcup/${tournamentShortId}/result`);
            }

            return;
        }

        // 다음 라운드 준비
        const nextRoundSize = currentRound / 2;
        setCurrentRound(nextRoundSize);
        setCurrentRoundCandidates(newNextRound);
        setNextRoundCandidates([]);
        setCurrentIndex(0);
    };

    if (loading) return <div className="p-4">로딩 중...</div>;
    if (!currentPair) return <div className="p-4">후보를 불러올 수 없습니다.</div>;

    // 진행중 UI
    return (
        <main className="flex flex-col items-center justify-center">
            <h1 className="
                    mb-12
                    w-full max-w-[1500px] mx-auto
                    flex flex-col items-center text-center gap-3
                    rounded-xl border border-border bg-muted/70 py-10
                ">
                {tournamentInfo && (
                    <>
                        {/* 제목 */}
                        <span className="text-3xl font-bold">
                            {tournamentInfo.title}
                        </span>

                        {/* 설명 */}
                        {tournamentInfo.description && (
                            <span className="max-w-xl text-sm text-gray-600 dark:text-gray-300">
                                {tournamentInfo.description}
                            </span>
                        )}
                    </>
                )}

                {/* 라운드 정보 배지 */}
                <span
                    className="
                        mt-4 inline-flex items-center
                        rounded-full
                        bg-neutral-200 px-6 py-2 text-sm font-semibold text-gray-800
                        dark:bg-neutral-600 dark:text-gray-200
                    "
                >
                    {currentRound}강
                    <span className="ml-4 text-lime-600 dark:text-lime-300">
                        {currentIndex + 1} / {currentRound / 2}
                    </span>
                </span>
            </h1>

            {/* 이미지 영역 */}
            {currentPair && (
                <div className="flex gap-6">
                    {[currentPair.left, currentPair.right].map((item) => (
                        <button
                            key={item.id}
                            className="flex flex-col items-center border-2 rounded-md p-4 hover:border-lime-500"
                            onClick={() => handlePick(item)}
                        >
                            <img
                                src={item.image_url}
                                alt={item.name}
                                className="
                                h-50 w-50
                                sm:h-70 sm:w-70
                                md:h-100 md:w-100
                                lg:h-170 lg:w-170
                                object-cover rounded-md
                                "
                            />
                            <span className="mt-2 font-medium">{item.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </main>
    );
}