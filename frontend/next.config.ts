import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
    // reactCompiler: true,
    images: supabaseHostname
        ? {
            remotePatterns: [
                {
                    protocol: "https",
                    hostname: supabaseHostname,
                    port: "",
                    pathname: "/storage/v1/object/public/images/**",
                },
            ],
        }
        : undefined,
};

export default nextConfig;