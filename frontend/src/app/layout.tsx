import './globals.css';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
    <html lang="ko">
        <body className="min-h-screen bg-slate-950 text-slate-100">
        <Header />
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        <Footer />
        </body>
    </html>
    );
}