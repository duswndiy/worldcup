// 1. 공개 라우트 (토너먼트 결과 + 댓글)
// 2. Rate limit으로 악의적인 순회 공격 사전 예방.
//    프록시 공격 예방 차원에서 추후 cloudflare 연결 예정.
// 3. 서버 확장 시, new Map()으로 구현한 Rate limit 소용 없음.🔥
//    ㄴ> Redis 사용해서 "중앙 집중 분산 관리" 해야 함.🔥

import { Router, Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../supabaseClient";

const router = Router();

// ---------------------------------------------------------------------------
// Rate limit / length limit 설정
// ---------------------------------------------------------------------------

// 속도 제한
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

/*
 * IP 기반 RateLimiter 생성기
 * - 분/시/일 단위 한 번에 관리
 */
function createIpRateLimiter(config: {
    perMinute: number;
    perHour: number;
    perDay: number;
}) {
    const minuteMap = new Map<string, RateEntry>();
    const hourMap = new Map<string, RateEntry>();
    const dayMap = new Map<string, RateEntry>();

    return (ip: string | undefined): boolean => {
        const key = ip ?? "unknown";

        if (isRateLimited(minuteMap, key, config.perMinute, RATE_WINDOW_MINUTE)) {
            return true;
        }
        if (isRateLimited(hourMap, key, config.perHour, RATE_WINDOW_HOUR)) {
            return true;
        }
        if (isRateLimited(dayMap, key, config.perDay, RATE_WINDOW_DAY)) {
            return true;
        }

        return false;
    };
}

// 결과 저장용 RateLimiter
const isResultRateLimited = createIpRateLimiter({
    perMinute: RESULT_LIMIT_PER_MINUTE,
    perHour: RESULT_LIMIT_PER_HOUR,
    perDay: RESULT_LIMIT_PER_DAY,
});

// 댓글 작성용 RateLimiter
const isCommentRateLimited = createIpRateLimiter({
    perMinute: COMMENT_LIMIT_PER_MINUTE,
    perHour: COMMENT_LIMIT_PER_HOUR,
    perDay: COMMENT_LIMIT_PER_DAY,
});

// ---------------------------------------------------------------------------
// 월드컵 목록 조회 (루트 페이지용)
// - GET /public/worldcup
// - 최신순으로 tournaments 조회
// - 각 토너먼트마다 최대 2개의 썸네일 이미지 포함
// ---------------------------------------------------------------------------
type ListItem = {
    short_id: number;
    title: string;
    description: string | null;
    thumbnails: string[];
};

router.get("/worldcup", async (req: Request, res: Response) => {
    // 1) 토너먼트 목록 조회 (uuid 포함)
    const { data: tournaments, error } = await supabaseAdmin
        .from("tournaments")
        .select("id, short_id, title, description")
        .order("created_at", { ascending: false });

    if (error || !tournaments) {
        console.error("tournaments 조회 실패", error);
        return res.status(500).json({ error: "월드컵 목록 조회에 실패했습니다." });
    }

    // 2) 각 토너먼트별로 썸네일(최대 2장) 조회
    const items: ListItem[] = await Promise.all(
        tournaments.map(async (t): Promise<ListItem> => {
            const { data: images, error: imgError } = await supabaseAdmin
                .from("images")
                .select("image_url")
                .eq("tournament_id", t.id)
                .order("created_at", { ascending: true })
                .limit(2);

            if (imgError) {
                console.error("images 조회 실패", imgError);
            }

            return {
                short_id: t.short_id,
                title: t.title,
                description: t.description,
                thumbnails: (images ?? []).map((img) => img.image_url),
            };
        })
    );

    return res.json(items);
});

// ---------------------------------------------------------------------------
// 토너먼트 조회 공통 처리
// ---------------------------------------------------------------------------

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

    // DB 에러: 로그 찍고 not_found 처리
    if (error) {
        console.error(error);
        return { error: "not_found", tournamentId: null };
    }

    // 데이터 없음: 조용히 not_found 처리 (로그는 안 찍음)
    if (!data) {
        return { error: "not_found", tournamentId: null };
    }

    return { error: null, tournamentId: data.id as string };
}

/*
 * 공통 미들웨어:
 * - :id 를 tournaments.short_id 로 받아서
 * - 실제 UUID 를 조회 후 (req as any).tournamentId 에 저장
 * - 잘못된 ID / 없는 토너먼트 → 400/404 로 즉시 응답
 */
async function resolveTournament(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const { error, tournamentId } = await getTournamentUuidByShortId(
        req.params.id
    );

    if (error === "invalid") {
        return res.status(400).json({ error: "잘못된 월드컵 ID 입니다." });
    }
    if (error === "not_found" || !tournamentId) {
        return res.status(404).json({ error: "해당 월드컵을 찾을 수 없습니다." });
    }

    (req as any).tournamentId = tournamentId;
    return next();
}

// ---------------------------------------------------------------------------
// 게임 페이지용 초기 데이터 조회 (제목/설명 + 이미지 목록)
// GET /public/worldcup/:id
// ---------------------------------------------------------------------------

type GamePayload = {
    info: {
        title: string;
        description: string | null;
    };
    images: {
        id: string;
        name: string;
        image_url: string;
    }[];
};

async function getGamePayloadByTournamentId(
    tournamentId: string
): Promise<GamePayload | null> {
    // 1) 토너먼트 정보 (제목 + 설명)
    const { data: tournament, error: tError } = await supabaseAdmin
        .from("tournaments")
        .select("title, description")
        .eq("id", tournamentId)
        .maybeSingle();

    if (tError) {
        console.error(tError);
        return null;
    }

    if (!tournament) {
        return null;
    }

    // 2) 이미지 목록
    const { data: images, error: iError } = await supabaseAdmin
        .from("images")
        .select("id, name, image_url")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true });

    if (iError) {
        console.error(iError);
        return null;
    }

    return {
        info: {
            title: tournament.title,
            description: tournament.description,
        },
        images: images ?? [],
    };
}

router.get("/worldcup/:id", resolveTournament, async (req, res) => {
    const tournamentId = (req as any).tournamentId as string;

    const payload = await getGamePayloadByTournamentId(tournamentId);
    if (!payload) {
        return res.status(404).json({ error: "해당 월드컵을 찾을 수 없습니다." });
    }

    return res.json(payload);
});

// ---------------------------------------------------------------------------
// 우승 결과 저장
// POST /public/worldcup/:id/result
// ---------------------------------------------------------------------------

router.post("/worldcup/:id/result", resolveTournament, async (req, res) => {
    const tournamentId = (req as any).tournamentId as string;

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
            error:
                "결과 저장 요청이 너무 자주 발생하고 있습니다. 잠시 후 다시 시도해주세요.",
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

// ---------------------------------------------------------------------------
// 최신 우승 결과 조회 (+ 이미지 URL)
// GET /public/worldcup/:id/result
// ---------------------------------------------------------------------------

router.get("/public/worldcup/:id/result", resolveTournament, async (req, res) => {
    const tournamentId = (req as any).tournamentId as string;

    // 1) 가장 최신 result 한 개
    const { data: result, error: rError } = await supabaseAdmin
        .from("results")
        .select("id, winner_image_id, winner_name, created_at")
        .eq("tournament_id", tournamentId) // uuid 기준 조회
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (rError || !result) {
        if (rError) console.error(rError);
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

// ---------------------------------------------------------------------------
// 댓글 조회
// GET /public/worldcup/:id/comments
// ---------------------------------------------------------------------------

router.get("/worldcup/:id/comments", resolveTournament, async (req, res) => {
    const tournamentId = (req as any).tournamentId as string;

    const { data, error: cError } = await supabaseAdmin
        .from("comments")
        .select("id, nickname, content, created_at, winner_name, winner_image_url")
        .eq("tournament_id", tournamentId) // uuid 기준 조회
        .order("created_at", { ascending: false });

    if (cError) {
        console.error(cError);
        return res.status(500).json({ error: "댓글 조회에 실패했습니다." });
    }

    return res.json(data ?? []);
});

// ---------------------------------------------------------------------------
// 최신 우승자 스냅샷 조회 (댓글용)
// ---------------------------------------------------------------------------

type WinnerSnapshot = {
    winner_name: string | null;
    winner_image_url: string | null;
};

async function getLatestWinnerSnapshot(
    tournamentId: string
): Promise<WinnerSnapshot> {
    const { data: latestResult, error: rError } = await supabaseAdmin
        .from("results")
        .select("winner_image_id, winner_name, created_at")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (rError || !latestResult) {
        if (rError) console.error(rError);
        return { winner_name: null, winner_image_url: null };
    }

    const { data: image, error: iError } = await supabaseAdmin
        .from("images")
        .select("image_url")
        .eq("id", latestResult.winner_image_id)
        .maybeSingle();

    if (iError || !image) {
        if (iError) console.error(iError);
        return {
            winner_name: latestResult.winner_name ?? null,
            winner_image_url: null,
        };
    }

    return {
        winner_name: latestResult.winner_name ?? null,
        winner_image_url: image.image_url ?? null,
    };
}

// ---------------------------------------------------------------------------
// 댓글 작성 (익명)
// POST /public/worldcup/:id/comments
// ---------------------------------------------------------------------------

router.post("/worldcup/:id/comments", resolveTournament, async (req, res) => {
    const tournamentId = (req as any).tournamentId as string;

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

    // 현재 토너먼트의 최신 우승자 스냅샷 조회
    const { winner_name, winner_image_url } =
        await getLatestWinnerSnapshot(tournamentId);

    const { data, error: iError } = await supabaseAdmin
        .from("comments")
        .insert({
            tournament_id: tournamentId,
            nickname: safeNickname,
            content: trimmedContent,
            winner_name,
            winner_image_url,
        })
        .select("id, nickname, content, created_at, winner_name, winner_image_url")
        .single();

    if (iError || !data) {
        console.error(iError);
        return res.status(500).json({ error: "댓글 저장에 실패했습니다." });
    }

    return res.json(data);
});

export default router;