// 게임 페이지:
// - images 테이블 -> 해당 tournament_id의 후보 읽어서 -> 32강 토너먼트 진행
// - 각 라운드마다 랜덤 1:1 매치 -> 승자만 다음 라운드로
// - 최종 우승자 결정 후 백엔드 /public/tournaments/:id/result로 POST

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { apiPost } from "@/lib/apiClient";

type ImageCandidate = {
    id: string;
    name: string;
    image_url: string;
};

function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
}

export default function WorldcupGamePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const tournamentId = params.id;

    const [candidates, setCandidates] = useState<ImageCandidate[]>([]);
    const [currentRound, setCurrentRound] = useState(32);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentRoundCandidates, setCurrentRoundCandidates] = useState<
        ImageCandidate[]
    >([]);
    const [nextRoundCandidates, setNextRoundCandidates] = useState<
        ImageCandidate[]
    >([]);
    const [winner, setWinner] = useState<ImageCandidate | null>(null);
    const [loading, setLoading] = useState(true);

    // 초기 데이터 로드
    useEffect(() => {
        const fetchImages = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("images")
                .select("id, name, image_url")
                .eq("tournament_id", tournamentId)
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
            setCandidates(initial);
            setCurrentRoundCandidates(initial);
            setCurrentRound(32);
            setCurrentIndex(0);
            setNextRoundCandidates([]);
            setWinner(null);
            setLoading(false);
        };

        fetchImages();
    }, [tournamentId]);

    const currentPair = useMemo(() => {
        const left = currentRoundCandidates[currentIndex * 2];
        const right = currentRoundCandidates[currentIndex * 2 + 1];
        if (!left || !right) return null;
        return { left, right };
    }, [currentRoundCandidates, currentIndex]);

    const handlePick = async (picked: ImageCandidate) => {
        // 우승자 확정 후
        if (winner) return;

        const newNextRound = [...nextRoundCandidates, picked];
        const pairsInRound = currentRound / 2;
        const isLastPair = currentIndex + 1 >= pairsInRound;

        if (!isLastPair) {
            setNextRoundCandidates(newNextRound);
            setCurrentIndex((prev) => prev + 1);
            return;
        }

        // 라운드 종료 -> 다음 라운드로 넘어가기
        if (currentRound === 2) {
            // 결승이 끝난 경우 -> 최종 우승자
            setWinner(picked);

            try {
                await apiPost(`/public/tournaments/${tournamentId}/result`, {
                    winnerImageId: picked.id,
                    winnerName: picked.name,
                });

                // 결과 페이지로 이동
                router.push(`/worldcup/${tournamentId}/result`);
            } catch (err) {
                console.error(err);
                // 실패해도 게임은 끝났으니 우승자만 보여줌
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
    if (!currentPair && !winner)
        return <div className="p-4">후보를 불러올 수 없습니다.</div>;

    // 우승자 UI
    if (winner) {
        return (
            <main className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold mb-4">우승자 🎉</h1>
                <img
                    src={winner.image_url}
                    alt={winner.name}
                    className="w-64 h-64 object-cover rounded-md mb-3"
                />
                <p className="text-lg font-semibold">{winner.name}</p>
                <button
                    className="mt-6 px-4 py-2 border rounded-md"
                    onClick={() => router.push(`/worldcup/${tournamentId}/result`)}
                >
                    결과 페이지로 이동
                </button>
            </main>
        );
    }

    // 진행중 UI
    return (
        <main className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-xl font-bold mb-4">
                {currentRound}강 {currentIndex + 1} / {currentRound / 2}
            </h1>
            {currentPair && (
                <div className="flex gap-6">
                    {[currentPair.left, currentPair.right].map((item) => (
                        <button
                            key={item.id}
                            className="flex flex-col items-center border rounded-md p-2 hover:bg-gray-50"
                            onClick={() => handlePick(item)}
                        >
                            <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-64 h-64 object-cover rounded-md"
                            />
                            <span className="mt-2 font-medium">{item.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </main>
    );
}