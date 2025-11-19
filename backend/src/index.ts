import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import worldcupAdminRoutes from "./routes/worldcupAdmin";
import worldcupPublicRoutes from "./routes/worldcupPublic";
import { adminLogin } from "./auth";

const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
        credentials: true, // 쿠키 허용
    })
);
app.use(cookieParser());
app.use(express.json());

// 헬스 체크용용
app.get("/", (_req, res) => {
    res.json({ ok: true });
});

// 관리자 로그인
app.post("/admin/login", adminLogin);

// 관리자용 월드컵 관련 라우트
app.use("/admin", worldcupAdminRoutes);

// 공개 라우트 (결과, 댓글 등)
app.use("/public", worldcupPublicRoutes);

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
});