"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import React from "react";

export function DarkToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    const Icon = theme === "dark" ? Sun : Moon;
    const nextTheme = theme === "dark" ? "light" : "dark";

    return (
    <Button variant="ghost" size="icon" aria-label="테마 전환" onClick={() => setTheme(nextTheme)}>
        <Icon className="h-4 w-4" />
    </Button>
    );
}