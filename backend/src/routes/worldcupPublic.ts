// 1. 공개 라우트 (토너먼트 결과 + 댓글)
// 2. Rate limit으로 악의적인 순회 공격 사전 예방.
//    프록시 공격 예방 차원에서 추후 cloudflare 연결 예정.
// 3. 서버 확장 시, new Map()으로 구현한 Rate limit 소용 없음.🔥
//    ㄴ> Redis 사용해서 "중앙 집중 분산 관리" 해야 함.🔥

import { Router } from "express";
import { supabaseAdmin } from "../supabaseClient";

const router = Router();


// Rate limit 속도 제한 설정
const RATE_WINDOW_MINUTE = 60 * 1000;           // 1분
const RATE_WINDOW_HOUR = 60 * 60 * 1000;        // 60분
const RATE_WINDOW_DAY = 24 * 60 * 60 * 1000;    // 24시간

// 결과 저장 제한 (동일IP + 전체게임)
const RESULT_LIMIT_PER_MINUTE = 4;
const RESULT_LIMIT_PER_HOUR = 60;
const RESULT_LIMIT_PER_DAY = 300;               // -> 서비스 확장 시 부족할 수도 있음! 염두하기!🔥

// 댓글 작성 제한 (동일IP + 전체게임)
const COMMENT_LIMIT_PER_MINUTE = 4;             // 1분 당 댓글 4개
const COMMENT_LIMIT_PER_HOUR = 100;             // 시간 당 댓글 100개
const COMMENT_LIMIT_PER_DAY = 300;              // 하루종일 댓글 300개개

// 댓글 길이 제한
const COMMENT_NICKNAME_MAX_LENGTH = 10;
const COMMENT_CONTENT_MAX_LENGTH = 150;

// 인메모리 rate limit 저장소
type RateEntry = { count: number; windowStart: number };

const resultMinuteMap = new Map<string, RateEntry>();
const resultHourMap = new Map<string, RateEntry>();
const resultDayMap = new Map<string, RateEntry>();

const commentMinuteMap = new Map<string, RateEntry>();
const commentHourMap = new Map<string, RateEntry>();
const commentDayMap = new Map<string, RateEntry>();

function isRateLimited(
    store: Map<string, RateEntry>,
    key: string,
    limit: number,
    windowMs: number
): boolean {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
        store.set(key, { count: 1, windowStart: now });
        return false;
    }

    if (entry.count >= limit) return true;

    entry.count += 1;
    return false;
}

// 동일 IP 기준, 전체 게임 대상 결과 저장 rate limit
function isResultRateLimited(ip: string | undefined): boolean {
    const key = ip ?? "unknown";
    if (isRateLimited(resultMinuteMap, key, RESULT_LIMIT_PER_MINUTE, RATE_WINDOW_MINUTE))
        return true;
    if (isRateLimited(resultHourMap, key, RESULT_LIMIT_PER_HOUR, RATE_WINDOW_HOUR)) return true;
    if (isRateLimited(resultDayMap, key, RESULT_LIMIT_PER_DAY, RATE_WINDOW_DAY)) return true;
    return false;
}

// 동일 IP 기준, 전체 게임 대상 댓글 작성 rate limit
function isCommentRateLimited(ip: string | undefined): boolean {
    const key = ip ?? "unknown";
    if (isRateLimited(commentMinuteMap, key, COMMENT_LIMIT_PER_MINUTE, RATE_WINDOW_MINUTE))
        return true;
    if (isRateLimited(commentHourMap, key, COMMENT_LIMIT_PER_HOUR, RATE_WINDOW_HOUR)) return true;
    if (isRateLimited(commentDayMap, key, COMMENT_LIMIT_PER_DAY, RATE_WINDOW_DAY)) return true;
    return false;
}

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
        return res.status(400).json({ error: "잘못된 월드컵 ID 입니다." });
    }
    if (error === "not_found" || !tournamentId) {
        return res.status(404).json({ error: "해당 월드컵을 찾을 수 없습니다." });
    }

    const { winnerImageId, winnerName } = req.body as {
        winnerImageId?: string;
        winnerName?: string;
    };

    if (!winnerImageId || !winnerName) {
        return res
            .status(400)
            .json({ error: "winnerImageId와 winnerName 값이 필요합니다." });
    }

    // 동일 IP 기준, 전체 게임 대상 레이트리밋
    if (isResultRateLimited(req.ip)) {
        return res.status(429).json({
            error: "결과 저장 요청이 너무 자주 발생하고 있습니다. 잠시 후 다시 시도해주세요.",
        });
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
        return res.status(500).json({ error: "결과 저장에 실패했습니다." });
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
        return res.status(400).json({ error: "잘못된 월드컵 ID 입니다." });
    }
    if (error === "not_found" || !tournamentId) {
        return res.status(404).json({ error: "해당 월드컵을 찾을 수 없습니다." });
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
 * GET /public/worldcup/:id/comments
 */
router.get("/worldcup/:id/comments", async (req, res) => {
    const { error, tournamentId } = await getTournamentUuidByShortId(req.params.id);
    if (error === "invalid") {
        return res.status(400).json({ error: "잘못된 월드컵 ID 입니다." });
    }
    if (error === "not_found" || !tournamentId) {
        return res.status(404).json({ error: "해당 월드컵을 찾을 수 없습니다." });
    }

    const { data, error: cError } = await supabaseAdmin
        .from("comments")
        .select("id, nickname, content, created_at")
        .eq("tournament_id", tournamentId) // uuid 기준 조회
        .order("created_at", { ascending: false });

    if (cError) {
        console.error(cError);
        return res.status(500).json({ error: "댓글 조회에 실패했습니다." });
    }

    return res.json(data ?? []);
});

/*
 * 댓글 작성 (익명)
 * POST /public/worldcup/:id/comments
 * body: { nickname?: string, content: string }
 */
router.post("/worldcup/:id/comments", async (req, res) => {
    const { error, tournamentId } = await getTournamentUuidByShortId(req.params.id);
    if (error === "invalid") {
        return res.status(400).json({ error: "잘못된 월드컵 ID 입니다." });
    }
    if (error === "not_found" || !tournamentId) {
        return res.status(404).json({ error: "해당 월드컵을 찾을 수 없습니다." });
    }

    const { nickname, content } = req.body as {
        nickname?: string;
        content?: string;
    };

    const trimmedContent = (content ?? "").trim();
    const rawNickname = typeof nickname === "string" ? nickname.trim() : "";

    // 내용/닉네임 길이 검증
    if (!trimmedContent) {
        return res.status(400).json({ error: "댓글 내용은 필수입니다." });
    }
    if (trimmedContent.length > COMMENT_CONTENT_MAX_LENGTH) {
        return res.status(400).json({ error: "댓글 내용이 너무 깁니다." });
    }
    if (rawNickname.length > COMMENT_NICKNAME_MAX_LENGTH) {
        return res.status(400).json({ error: "닉네임이 너무 깁니다." });
    }

    const safeNickname = rawNickname.length > 0 ? rawNickname : "익명";

    // 동일 IP 기준, 전체 게임 대상 레이트리밋
    if (isCommentRateLimited(req.ip)) {
        return res.status(429).json({
            error: "댓글이 너무 자주 작성되고 있습니다. 잠시 후 다시 시도해주세요.",
        });
    }

    const { data, error: iError } = await supabaseAdmin
        .from("comments")
        .insert({
            tournament_id: tournamentId, // uuid 로 저장
            nickname: safeNickname,
            content: trimmedContent,
        })
        .select()
        .single();

    if (iError || !data) {
        console.error(iError);
        return res.status(500).json({ error: "댓글 저장에 실패했습니다." });
    }

    return res.json(data);
});

export default router;