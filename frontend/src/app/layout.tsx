import "./globals.css";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { ThemeProvider } from "@/app/components/theme-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
    <html lang="ko" suppressHydrationWarning>
        <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
            <Header />
            <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
            <Footer />
        </ThemeProvider>
        </body>
    </html>
    );
}