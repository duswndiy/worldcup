export const isGif = (file: File) =>
    file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");

export async function convertImageToWebP(file: File): Promise<File> {
    if (file.type === "image/webp") return file;

    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext("2d");
            if (!ctx || !canvas.toBlob) {
                URL.revokeObjectURL(url);
                resolve(file);
                return;
            }

            ctx.drawImage(img, 0, 0);

            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(url);
                    if (!blob) {
                        resolve(file);
                        return;
                    }

                    const converted = new File(
                        [blob],
                        file.name.replace(/\.[^.]+$/, ".webp"),
                        { type: "image/webp" },
                    );
                    resolve(converted);
                },
                "image/webp",
                0.9,
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };

        img.src = url;
    });
}

export async function convertImagesToWebP(files: File[]): Promise<File[]> {
    return Promise.all(files.map((file) => convertImageToWebP(file)));
}