import { DarkToggle } from "./dark-toggle";
import Link from "next/link";

export default function Header() {
    return (
        <header>
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-8 py-6">
            <Link href="/">
                <h1 className="text-lg font-semibold">Worldcup</h1>
            </Link>
            <DarkToggle />
        </div>
        </header>
    );
}