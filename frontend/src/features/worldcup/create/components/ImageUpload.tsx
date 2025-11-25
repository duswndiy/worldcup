// 게시물 생성하는 페이지에서(create/page.tsx),
// 파일 첨부 + 미리보기 영역 담당.

"use client";

import { ChangeEvent } from "react";
import { Button, Input, Label } from "@/components/ui";

type Props = {
    filesCount: number;
    previewUrls: string[];
    converting: boolean;
    onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onRemoveImage: (index: number) => void;
    onClearImages: () => void;
};

export function ImageUpload({
    filesCount,
    previewUrls,
    converting,
    onFileChange,
    onRemoveImage,
    onClearImages,
}: Props) {
    return (
        <div>
            <Label htmlFor="images" className="block text-sm mb-2">
                이미지
            </Label>

            <div className="mt-4 space-y-4 rounded-lg border border-dashed border-border bg-muted/30 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Input
                            id="images"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={onFileChange}
                            className="hidden"
                        />

                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() =>
                                document.getElementById("images")?.click()
                            }
                        >
                            파일 첨부하기
                        </Button>

                        <p className="text-xs text-muted-foreground ml-2">
                            {filesCount > 0
                                ? `${filesCount}장 선택됨`
                                : "최소 32장의 이미지를 첨부해 주세요."}
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClearImages}
                        disabled={filesCount === 0}
                        className="text-xs text-muted-foreground hover:text-destructive"
                    >
                        전체 삭제
                    </Button>
                </div>

                {previewUrls.length > 0 && (
                    <div className="mt-6 grid grid-cols-8 gap-3">
                        {previewUrls.map((url, idx) => (
                            <div
                                key={idx}
                                className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
                            >
                                <img
                                    src={url}
                                    alt={`preview-${idx}`}
                                    className="h-full w-full object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() => onRemoveImage(idx)}
                                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white hover:bg-black"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {converting && (
                    <p className="mt-1 text-xs text-blue-500">
                        이미지 변환 중입니다...
                    </p>
                )}
            </div>
        </div>
    );
}