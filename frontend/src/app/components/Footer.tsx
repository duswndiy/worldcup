export default function Footer() {
    return (
        <footer className="border-t border-slate-800">
        <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-slate-400">
            © {new Date().getFullYear()} Worldcup
        </div>
        </footer>
    );
}