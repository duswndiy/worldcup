import { DarkToggle } from "./dark-toggle";
import Link from "next/link";

export default function Header() {
    return (
        <header className="border-b border-slate-800">
        <div className="mx-auto max-w-5xl px-6 py-4">
            <Link href="/">
                <h1 className="text-lg font-semibold">Worldcup</h1>
                <DarkToggle />
            </Link>
        </div>
        </header>
    );
}