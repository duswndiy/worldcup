"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ImageItem, TournamentInfo } from "./types";
import { saveResult } from "../../app/(public)/worldcup/[id]/actions";

type Props = {
    id: string;                  // short_id
    info: TournamentInfo;
    initialImages: ImageItem[];
};

type Pair = {
    left: ImageItem;
    right: ImageItem;
};

function shuffle<T>(items: T[]): T[] {
    return [...items].sort(() => Math.random() - 0.5);
}

function preloadImages(items: ImageItem[]) {
    if (typeof window === "undefined") return;

    items.forEach((item) => {
        const img = new window.Image();
        img.src = item.image_url;
    });
}

export default function Game({ id, info, initialImages }: Props) {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [round, setRound] = useState(32);
    const [index, setIndex] = useState(0);
    const [current, setCurrent] = useState<ImageItem[]>([]);
    const [next, setNext] = useState<ImageItem[]>([]);

    // 초기 상태 세팅
    useEffect(() => {
        const list = shuffle(initialImages).slice(0, 32);

        setCurrent(list);
        setRound(32);
        setIndex(0);
        setNext([]);
        setLoading(false);

        preloadImages(list);
    }, [initialImages]);

    const pair: Pair | null = useMemo(() => {
        const left = current[index * 2];
        const right = current[index * 2 + 1];

        if (!left || !right) return null;
        return { left, right };
    }, [current, index]);

    const handlePick = async (picked: ImageItem) => {
        const updatedNext = [...next, picked];
        const pairsInRound = round / 2;
        const isLastPair = index + 1 >= pairsInRound;

        // 아직 라운드가 끝나지 않음
        if (!isLastPair) {
            setNext(updatedNext);
            setIndex((prev) => prev + 1);
            return;
        }

        // 마지막 페어 처리
        if (round === 2) {
            // 게임 종료 → 결과 저장 후 결과 페이지로 이동
            try {
                await saveResult(id, picked.id, picked.name);
            } catch (error) {
                console.error(error);
                alert("결과 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            } finally {
                router.push(`/worldcup/${id}/result`);
            }

            return;
        }

        // 다음 라운드 준비
        const nextRoundSize = round / 2;
        setRound(nextRoundSize);
        setCurrent(updatedNext);
        setNext([]);
        setIndex(0);
    };

    if (loading) {
        return <div className="p-4">로딩 중...</div>;
    }

    if (!pair) {
        return <div className="p-4">후보를 불러올 수 없습니다.</div>;
    }

    return (
        <>
            <h1
                className="
                    mb-2.5
                    w-full max-w-[1500px] mx-auto
                    flex flex-col items-center text-center gap-3
                    rounded-xl border border-border bg-muted/70 py-6
                "
            >
                {info && (
                    <>
                        {/* 제목 */}
                        <span className="text-3xl font-bold">
                            {info.title}
                        </span>

                        {/* 설명 */}
                        {info.description && (
                            <span className="max-w-xl text-sm text-gray-600 dark:text-gray-300">
                                {info.description}
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
                    {round}강
                    <span className="ml-4 text-lime-600 dark:text-lime-300">
                        {index + 1} / {round / 2}
                    </span>
                </span>
            </h1>

            {/* 이미지 영역 */}
            <div className="flex gap-2.5">
                {[pair.left, pair.right].map((item) => (
                    <button
                        key={item.id}
                        className="flex flex-col items-center border-2 rounded-md p-2 hover:border-lime-500"
                        onClick={() => handlePick(item)}
                    >
                        <Image
                            src={item.image_url}
                            alt={item.name}
                            width={300}
                            height={300}
                            unoptimized
                            className="
                                h-50 w-50
                                sm:h-70 sm:w-70
                                md:h-100 md:w-100
                                lg:h-180 lg:w-180
                                object-cover rounded-md
                            "
                        />
                        <span className="mt-4 text-large">
                            {item.name}
                        </span>
                    </button>
                ))}
            </div>
        </>
    );
}