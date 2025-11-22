// 공개 라우트 (토너먼트 결과 + 댓글)

import { Router } from "express";
import { supabaseAdmin } from "../supabaseClient";

const router = Router();

/*
 * URL 의 :id 는 tournaments.short_id (숫자) 이고,
 * 실제 FK 로 쓰이는 값은 tournaments.id (uuid) 이다.
 * 각 라우트 공통으로 short_id -> uuid 변환을 먼저 수행한다.
 */
type TournamentLookupResult = {
    error: "invalid" | "not_found" | null;
    tournamentId: string | null;
};

async function getTournamentUuidByShortId(
    shortIdParam: string
): Promise<TournamentLookupResult> {
    const shortId = Number(shortIdParam);
    if (!Number.isInteger(shortId)) {
        return { error: "invalid", tournamentId: null };
    }

    const { data, error } = await supabaseAdmin
        .from("tournaments")
        .select("id")
        .eq("short_id", shortId)
        .maybeSingle();

    if (error || !data) {
        console.error(error);
        return { error: "not_found", tournamentId: null };
    }

    return { error: null, tournamentId: data.id as string };
}

/*
 * 우승 결과 저장
 * POST /public/worldcup/:id/result
 * body: { winnerImageId: string, winnerName: string }
 */
router.post("/worldcup/:id/result", async (req, res) => {
    const { error, tournamentId } = await getTournamentUuidByShortId(req.params.id);
    if (error === "invalid") {
        return res.status(400).json({ error: "invalid id" });
    }
    if (error === "not_found" || !tournamentId) {
        return res.status(404).json({ error: "tournament not found" });
    }

    const { winnerImageId, winnerName } = req.body as {
        winnerImageId?: string;
        winnerName?: string;
    };

    if (!winnerImageId || !winnerName) {
        return res.status(400).json({ error: "winnerImageId, winnerName 필요" });
    }

    const { data: result, error: insertError } = await supabaseAdmin
        .from("results")
        .insert({
            tournament_id: tournamentId, // uuid 로 저장
            winner_image_id: winnerImageId,
            winner_name: winnerName,
        })
        .select()
        .single();

    if (insertError || !result) {
        console.error(insertError);
        return res.status(500).json({ error: "result 저장 실패" });
    }

    return res.json(result);
});

/*
 * 우승 결과 조회 + 우승 이미지 경로 포함
 * GET /public/worldcup/:id/result
 */
router.get("/worldcup/:id/result", async (req, res) => {
    const { error, tournamentId } = await getTournamentUuidByShortId(req.params.id);
    if (error === "invalid") {
        return res.status(400).json({ error: "invalid id" });
    }
    if (error === "not_found" || !tournamentId) {
        return res.status(404).json({ error: "tournament not found" });
    }

    // 1) 가장 최신 result 한 개
    const { data: result, error: rError } = await supabaseAdmin
        .from("results")
        .select("id, winner_image_id, winner_name, created_at")
        .eq("tournament_id", tournamentId) // uuid 기준 조회
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (rError || !result) {
        console.error(rError);
        return res.status(404).json({ error: "result not found" });
    }

    // 2) 해당 이미지 정보 가져오기
    const { data: image, error: iError } = await supabaseAdmin
        .from("images")
        .select("image_url")
        .eq("id", result.winner_image_id)
        .maybeSingle();

    if (iError || !image) {
        console.error(iError);
        return res.status(500).json({ error: "winner image 조회 실패" });
    }

    return res.json({
        winner_image_id: result.winner_image_id,
        winner_name: result.winner_name,
        winner_image_url: image.image_url, // 프론트에서 그대로 <img src=...>
    });
});

/*
 * 댓글 조회
 * GET /public/tournaments/:id/comments
 */
router.get("/tournaments/:id/comments", async (req, res) => {
    const { error, tournamentId } = await getTournamentUuidByShortId(req.params.id);
    if (error === "invalid") {
        return res.status(400).json({ error: "invalid id" });
    }
    if (error === "not_found" || !tournamentId) {
        return res.status(404).json({ error: "tournament not found" });
    }

    const { data, error: cError } = await supabaseAdmin
        .from("comments")
        .select("id, nickname, content, created_at")
        .eq("tournament_id", tournamentId) // uuid 기준 조회
        .order("created_at", { ascending: false });

    if (cError) {
        console.error(cError);
        return res.status(500).json({ error: "comments fetch 실패" });
    }

    return res.json(data ?? []);
});

/*
 * 댓글 작성 (익명)
 * POST /public/tournaments/:id/comments
 * body: { nickname?: string, content: string }
 */
router.post("/tournaments/:id/comments", async (req, res) => {
    const { error, tournamentId } = await getTournamentUuidByShortId(req.params.id);
    if (error === "invalid") {
        return res.status(400).json({ error: "invalid id" });
    }
    if (error === "not_found" || !tournamentId) {
        return res.status(404).json({ error: "tournament not found" });
    }

    const { nickname, content } = req.body as {
        nickname?: string;
        content?: string;
    };

    if (!content || !content.trim()) {
        return res.status(400).json({ error: "content is required" });
    }

    // TODO: rate limit, 욕설 필터링 등 추가 가능
    const { data, error: iError } = await supabaseAdmin
        .from("comments")
        .insert({
            tournament_id: tournamentId, // uuid 로 저장
            nickname: nickname ?? null,
            content,
        })
        .select()
        .single();

    if (iError || !data) {
        console.error(iError);
        return res.status(500).json({ error: "comment 저장 실패" });
    }

    return res.json(data);
});

export default router;