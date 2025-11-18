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
                await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

            if (supaError || !data.session) {
                throw new Error(supaError?.message ?? "로그인에 실패했습니다.");
            }

            const accessToken = data.session.access_token;

            // 2) 백엔드에 토큰 전달 → 관리자 검증 + HttpOnly 쿠키 발급
            await apiPost<{ ok: true }>("/admin/login", {
                accessToken,
            });

            // 3) 루트 페이지로 리다이렉트
            router.replace("/");
        } catch (err: any) {
            console.error(err);
            setError(err.message ?? "알 수 없는 오류가 발생했습니다.");
        } finally {
            setPending(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm space-y-4 border p-6 rounded-md"
            >
                <h1 className="text-xl font-bold text-center">운영자 로그인</h1>

                <div>
                    <label className="block text-sm mb-1">이메일</label>
                    <input
                        type="email"
                        required
                        className="w-full border px-3 py-2 rounded-md"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1">비밀번호</label>
                    <input
                        type="password"
                        required
                        className="w-full border px-3 py-2 rounded-md"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-500 whitespace-pre-line">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={pending}
                    className="w-full py-2 bg-black text-white rounded-md disabled:opacity-50"
                >
                    {pending ? "로그인 중..." : "로그인"}
                </button>

                <p className="text-xs text-gray-500 mt-2">
                    * 이 페이지는 관리자용입니다.
                </p>
            </form>
        </main>
    );
}

export default HiddenAdminPage;