import type { Metadata } from "next";
import "./globals.css";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { ThemeProvider } from "@/app/components/theme-provider";

export const metadata: Metadata = {
    title: {
        default: "픽클 | 나만의 이상형 원픽을 고르자",
        template: "%s | 이상형 월드컵",
    },
    description:
        "가장 재미있는 이상형 월드컵(토너먼트 게임)을 지금 바로 플레이해 보세요! 다양한 주제의 밸런스 게임에 참여하고 익명 사용자들의 투표 결과를 확인해 보세요.",
    keywords: [
        "이상형 월드컵",
        "월드컵 만들기",
        "이상형 월드컵 사이트",
        "이상형 월드컵 게임",
        "심리테스트",
        "밸런스게임",
        "mbti",
        "커플게임",
        "토너먼트 게임",
        "이상형 테스트",
        "인생 선택",
        "최애 월드컵",
        "익명 투표",
        "친구랑 같이하는 게임",
    ],
    // 도메인/배포 URL 아직 미정! metadataBase, alternates.canonical, openGraph.url 생략!
    openGraph: {
        title: "세상 모든 밸런스 게임, 이상형 월드컵에서 투표하세요!",
        description:
            "최신 유행하는 이상형 월드컵에 참여하여 당신의 선택을 공유하고, 익명의 참여자들과 결과를 비교해 보세요. 재미있는 토너먼트 게임 사이트!",
        siteName: "이상형 월드컵",
        locale: "ko_KR",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "이상형 월드컵 - 직접 만들고 플레이하는 월드컵 서비스",
        description:
            "다양한 주제로 이상형 월드컵을 만들고 친구들과 결과를 공유해 보세요.",
    },
    robots: {
        index: true,
        follow: true,
    },
};



export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
                <ThemeProvider>
                    <Header />
                    <main className="w-full mx-auto max-w-[1500px] flex-1 p-3">{children}</main>
                    <Footer />
                </ThemeProvider>
            </body>
        </html>
    );
}