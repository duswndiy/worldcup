// 공개 라우트 (토너먼트 결과 + 댓글)

import { Router } from "express";
import { supabaseAdmin } from "../supabaseClient";

const router = Router();

/*
 * 우승 결과 저장
 * POST /public/tournaments/:id/result
 * body: { winnerImageId: string, winnerName: string }
 */
router.post("/tournaments/:id/result", async (req, res) => {
    const tournamentId = req.params.id;
    const { winnerImageId, winnerName } = req.body as {
        winnerImageId?: string;
        winnerName?: string;
    };

    if (!winnerImageId || !winnerName) {
        return res.status(400).json({ error: "winnerImageId, winnerName 필요" });
    }

    const { data: result, error } = await supabaseAdmin
        .from("results")
        .insert({
            tournament_id: tournamentId,
            winner_image_id: winnerImageId,
            winner_name: winnerName,
        })
        .select()
        .single();

    if (error || !result) {
        console.error(error);
        return res.status(500).json({ error: "result 저장 실패" });
    }

    return res.json(result);
});

/*
 * 우승 결과 조회 + 우승 이미지 경로 포함
 * GET /public/tournaments/:id/result
 */
router.get("/tournaments/:id/result", async (req, res) => {
    const tournamentId = req.params.id;

    // 1) 가장 최신 result 한 개
    const { data: result, error: rError } = await supabaseAdmin
        .from("results")
        .select("id, winner_image_id, winner_name, created_at")
        .eq("tournament_id", tournamentId)
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
    const tournamentId = req.params.id;

    const { data, error } = await supabaseAdmin
        .from("comments")
        .select("id, nickname, content, created_at")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
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
    const tournamentId = req.params.id;
    const { nickname, content } = req.body as {
        nickname?: string;
        content?: string;
    };

    if (!content || !content.trim()) {
        return res.status(400).json({ error: "content is required" });
    }

    // TODO: rate limit, 욕설 필터링 등 추가 가능
    const { data, error } = await supabaseAdmin
        .from("comments")
        .insert({
            tournament_id: tournamentId,
            nickname: nickname ?? null,
            content,
        })
        .select()
        .single();

    if (error || !data) {
        console.error(error);
        return res.status(500).json({ error: "comment 저장 실패" });
    }

    return res.json(data);
});

export default router;