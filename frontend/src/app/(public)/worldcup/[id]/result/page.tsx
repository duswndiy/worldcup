import ResultView from "./_components/ResultView";
import { callExpress } from "@/lib/expressClient";

export const revalidate = 60;

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

async function loadResultAndComments(id: string) {
    const [result, comments] = await Promise.all([
        callExpress<Result>({
            path: `/public/worldcup/${id}/result`,
            method: "GET",
            next: {
                tags: [`worldcup-${id}-result`],
            },
        }),
        callExpress<Comment[]>({
            path: `/public/worldcup/${id}/comments`,
            method: "GET",
            next: {
                tags: [`worldcup-${id}-comments`],
            },
        }),
    ]);

    return { result, comments };
}

type PageProps = {
    params: { id: string };
};

export default async function ResultPage({ params }: PageProps) {
    const id = params.id;

    let resultData: { result: Result; comments: Comment[] } | null = null;

    try {
        resultData = await loadResultAndComments(id);
    } catch (error) {
        console.error("[ResultPage] failed to load", error);
        return (
            <main className="p-4">
                결과를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
            </main>
        );
    }

    const { result, comments } = resultData;

    return (
        <main className="max-w-[1500px] mx-auto">
            <ResultView id={id} result={result} comments={comments} />
        </main>
    );
}