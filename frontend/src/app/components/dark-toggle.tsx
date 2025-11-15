"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function DarkToggle() {
    const { theme, setTheme } = useTheme();

    const nextTheme = theme === "dark" ? "light" : "dark";
    const Icon = theme === "dark" ? Sun : Moon;

    return (
    <Button
        variant="ghost"
        size="icon"
        aria-label="테마 전환"
        onClick={() => setTheme(nextTheme)}
    >
        <Icon className="h-[1.2rem] w-[1.2rem]" />
    </Button>
    );
}