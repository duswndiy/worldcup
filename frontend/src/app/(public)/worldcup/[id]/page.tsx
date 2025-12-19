import Game from "@/features/game/Game";
import { callExpress } from "@/lib/expressClient";
import type { GameData } from "@/features/game/types";

export const revalidate = 60;

async function loadGameData(id: string): Promise<GameData> {
    return await callExpress<GameData>({
        path: `/public/worldcup/${id}`,
        method: "GET",
        next: {
            tags: [`worldcup-${id}-game`],
        },
    });
}

type PageProps = {
    params: { id: string };
};

export default async function WorldcupGamePage({ params }: PageProps) {
    const id = params.id;

    let data: GameData | null = null;

    try {
        data = await loadGameData(id);
    } catch (error) {
        console.error("[WorldcupGamePage] failed to load", error);
        return (
            <main className="p-4">
                월드컵 정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
            </main>
        );
    }

    if (!data || !data.images || data.images.length < 2) {
        return (
            <main className="p-4">
                진행할 수 있는 후보가 없습니다.
            </main>
        );
    }

    return (
        <main className="flex flex-col items-center justify-center">
            <Game id={id} info={data.info} initialImages={data.images} />
        </main>
    );
}