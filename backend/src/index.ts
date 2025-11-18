import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
        credentials: true,
    })
);
app.use(cookieParser());
app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
});