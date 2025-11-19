// ▶️ 관리자 로그인 페이지:
// - Supabase Auth에서 생성한 계정으로 로그인
// - access_token을 백엔드 /admin/login에 전달
// - 성공 시 쿠키 세션 생성, 루트 페이지로 리다이렉트

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { apiPost } from "@/lib/apiClient";

function HiddenAdminPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setPending(true);
        setError(null);

        try {
            // 1) Supabase Auth 로그인
            const { data, error: supaError } =
                await supabase.auth.signInWithPassword({ email, password, });

            if (supaError || !data.session) {
                throw supaError ?? new Error("로그인에 실패했습니다.");
            }

            const accessToken = data.session.access_token;
            // 2) 백엔드에 토큰 전달 → 관리자 검증 + HttpOnly 쿠키 발급
            await apiPost<{ ok: true }>("/admin/login", { accessToken });

            // 3) 루트 페이지로 리다이렉트
            router.replace("/");
        }   catch (err) {
            setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
        }   finally {
            setPending(false);
        }
    };

    return (
        <main className="flex flex-col min-h-screen items-center mt-70 bg-background text-foreground">

            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card/80 p-9 shadow-sm"
            >
                <div className="text-2xl font-bold text-center mb-9">운영자 로그인</div>

                {/* 로그인폼 내부 UI */}
                <div>
                    <label className="mb-1 block text-sm text-foreground">이메일</label>
                    <input
                        type="email"
                        required
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm
                        transition-colors
                        focus-visible:outline-none
                        focus-visible:bg-[#39ff14]/10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm text-foreground">비밀번호</label>
                    <input
                        type="password"
                        required
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm
                        transition-colors
                        focus-visible:outline-none
                        focus-visible:bg-[#39ff14]/10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                {error && ( <p className="text-center text-xs text-destructive">아이디 또는 비밀번호가 일치하지 않습니다.</p> )}

                <button
                    type="submit"
                    disabled={pending}
                    className="w-full rounded-md bg-primary mt-4 px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {pending ? "로그인 중..." : "로그인"}
                </button>
            </form>

            <p className="mt-8 text-xs text-muted-foreground">* 관리자용 페이지입니다</p>
        </main>
    );
}

export default HiddenAdminPage;