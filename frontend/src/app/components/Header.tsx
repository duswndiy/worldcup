"use client";

import { useEffect, useState } from "react";
import { DarkToggle } from "./dark-toggle";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTheme } from "next-themes";

export default function Header() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);    // 1. "로그인 했나?"를 기억하는 상자, 초기값은 "아니(false)"
    const [mounted, setMounted] = useState(false);          // 2. 헤더(클라이언트)가 완전히 살아났는지 여부(테마/로고용)
    const router = useRouter();                             // 2-1. "로그아웃" 할 때, 페이지 이동을 위한 router 준비
                                                            //      Link 안 쓴 이유: "뒤로가기" 흔적이 남지 않게 하기 위해서
    const { resolvedTheme } = useTheme();                   // 2-2. next-themes에서 현재 테마("light" | "dark") 가져오기

    const handleLogout = async () => {                      // 7. "로그아웃" 버튼 누르면 실행될 함수
        await supabase.auth.signOut();                      // 8. supabase에 로그아웃 알려서 세션 끊기
        setIsLoggedIn(false);                               // 9. 화면 상태 "로그인 안 함(false)"로 변경
        router.replace("/");
    };

    useEffect(() => {
        let alive = true;                                   // 3. 헤더 살아있다는 표시 (이 effect 내부 전용)
        
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);                                   // 3-1. 이제부터는 클라이언트에서 테마 정보(resolvedTheme)를 믿어도 됨

        // 첫 렌더링 시 세션 확인
        supabase.auth.getSession().then(({ data }) => {     // 4. supabase에게 "지금 로그인한 사람 있어?" 하고 세션 정보 물어봄
                                                            //    (답변 돌아올 때까지 시간이 소요되는 비동기 작업)
            if (!alive) return;                             // 5. (답변 왔을 때) 헤더가 사라졌다면, 아무것도 하지마라
            setIsLoggedIn(!!data.session);                  // 6. 세션 있으면 true, 아니면 false로 바꿔서 isLoggedIn에 넣어라
        });

        // 로그인/로그아웃 시 상태 바꿔주는 부분
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {  // 7. 앞으로 로그인/로그아웃 바뀔 때마다 알려달라고 supabase 구독
            if (!alive) return;                                     // 8. 헤더 사라졌다면, 아무것도 하지 않고 끝낸다
            setIsLoggedIn(!!session);                               // 9. 로그인 했으면 true, 로그아웃 했으면 false
        });

        return () => {                                      // 10. 헤더 언마운트 될 때, 실행되는 정리정돈 코드
            alive = false;                                  // 11. 이제 이 effect 입장에서는 헤더 없다
            subscription.unsubscribe();                     // 12. supabase한테 이제 변화 알려줄 필요 없다고 -> 구독 해지
        };
    }, []);                                                 // 3. []: 헤더 마운트 될 때, 딱 한 번만 실행

    // 라이트모드면 lightlogo, 다크모드면 darklogo
    // 단, SSR + 초기 hydration 단계에서는 mounted === false 이라서 항상 lightlogo로 고정해서
    // 서버와 클라이언트 첫 렌더 결과가 일치하도록 만든다. (Hydration mismatch 방지)
    const logoSrc =
        !mounted
            ? "/lightlogo.png"
            : resolvedTheme === "dark"
            ? "/darklogo.png"
            : "/lightlogo.png";

    return (
        <header>
            <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 pt-10 pb-6">
                <Link href="/" className="inline-flex items-center">
                    <Image
                        src={logoSrc}
                        alt="이상형 월드컵 서비스 픽클 로고 이미지"
                        width={220}
                        height={70}
                        unoptimized
                        className="h-10 w-auto"
                    />
                </Link>
                <div className="flex items-center gap-6">
                    {isLoggedIn && (
                        <>
                            <Button asChild>
                                <Link href="/worldcup/create">게시물 생성하기</Link>
                            </Button>
                            <Button variant="outline" onClick={handleLogout}>
                                로그아웃
                            </Button>
                        </>
                    )}
                    <DarkToggle />
                </div>
            </div>
        </header>
    );
}