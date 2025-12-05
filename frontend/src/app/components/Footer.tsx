export default function Footer() {
    return (
        <footer className="my-10">
            <div className="mx-auto max-w-[1500px] px-4 py-8 flex justify-center">
                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-5">
                        <span className="font-medium text-foreground">
                            © 2025 PICCKLE
                        </span>
                        <span className="rounded-full border px-3 py-1 text-xs bg-background text-muted-foreground">
                            Beta
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}