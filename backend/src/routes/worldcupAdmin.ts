// 관리자용 월드컵 관련 라우트

import { Router } from "express";
import { requireAdmin } from "../auth";
import { supabaseAdmin } from "../supabaseClient";

const router = Router();

// 월드컵(토너먼트) 생성 API
router.post("/tournaments", requireAdmin, async (req, res) => {
    const { title, description, images } = req.body as {
        title?: string;
        description?: string;
        images?: { path: string; name: string }[];
    };

    if (!title || !images || !Array.isArray(images) || images.length < 32) {
        return res.status(400).json({
            error: "title과 최소 32개 이상의 images(path, name)가 필요합니다.",
        });
    }

    // 1) tournaments 테이블에 insert
    const { data: tournament, error: tError } = await supabaseAdmin
        .from("tournaments")
        .insert({
            title,
            description,
        })
        .select()
        .single();

    if (tError || !tournament) {
        console.error(tError);
        return res.status(500).json({ error: "tournament 생성 실패" });
    }

    const tournamentId = tournament.id as string;

    // 2) images 테이블에 insert (Storage에 이미 올라간 경로 활용)
    const imageRows = images.map((img) => ({
        tournament_id: tournamentId,
        image_url: img.path, // Storage 경로 또는 public URL
        name: img.name,
    }));

    const { error: iError } = await supabaseAdmin.from("images").insert(imageRows);

    if (iError) {
        console.error(iError);
        return res.status(500).json({ error: "images insert 실패" });
    }

    return res.json({ id: tournamentId });
});

export default router;