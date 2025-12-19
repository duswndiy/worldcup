"use client";

import { FormEvent, ChangeEvent } from "react";
import { Button, Input, Textarea, Label } from "@/components/ui";
import { ImageUpload } from "./ImageUpload";

type Props = {
    title: string;
    description: string;
    filesCount: number;
    previewUrls: string[];
    pending: boolean;
    converting: boolean;
    error: string | null;
    onTitleChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onSubmit: (e: FormEvent) => void;
    onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onClearImages: () => void;
    onRemoveImage: (index: number) => void;
};

export function WorldcupCreateForm(props: Props) {
    const {
        title,
        description,
        filesCount,
        previewUrls,
        pending,
        converting,
        error,
        onTitleChange,
        onDescriptionChange,
        onSubmit,
        onFileChange,
        onClearImages,
        onRemoveImage,
    } = props;

    return (
        <form onSubmit={onSubmit} className="space-y-10">
            <div>
                <Label htmlFor="title" className="block text-sm mb-2">
                    제목
                </Label>
                <Input
                    id="title"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="예시 : 레전드 치킨 월드컵"
                    required
                />
            </div>

            <div>
                <Label htmlFor="description" className="block text-sm mb-2">
                    설명 (선택)
                </Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="월드컵에 대한 간단한 설명을 적어주세요."
                    rows={2}
                />
            </div>

            <ImageUpload
                filesCount={filesCount}
                previewUrls={previewUrls}
                converting={converting}
                onFileChange={onFileChange}
                onClearImages={onClearImages}
                onRemoveImage={onRemoveImage}
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
                type="submit"
                disabled={pending || converting}
                className="w-full cursor-pointer bg-lime-500 hover:bg-lime-400 text-black mt-4"
            >
                {pending ? "생성 중..." : "월드컵 생성하기"}
            </Button>
        </form>
    );
}