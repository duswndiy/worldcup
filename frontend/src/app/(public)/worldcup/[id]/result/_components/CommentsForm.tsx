"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input, Label, Textarea, Button } from "@/components/ui";
import { createComment, type ActionState } from "../actions";

type Props = {
    id: string;
};

const initialState: ActionState = {
    ok: true,
};

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            disabled={pending}
            className="w-full md:w-auto"
        >
            {pending ? "작성 중..." : "댓글 작성"}
        </Button>
    );
}

export default function CommentsForm({ id }: Props) {
    const [state, formAction] = useActionState(createComment, initialState);

    return (
        <form action={formAction} className="space-y-4">
            {/* Server Action에서 읽을 hidden 필드 */}
            <input type="hidden" name="id" value={id} />

            <div className="flex flex-col gap-3">
                <Label htmlFor="nickname">닉네임</Label>
                <Input
                    id="nickname"
                    name="nickname"
                    className="flex-1"
                    placeholder="닉네임을 입력해주세요."
                />
            </div>

            <div className="flex flex-col gap-3">
                <Label htmlFor="comment">댓글</Label>
                <Textarea
                    id="comment"
                    name="content"
                    placeholder="댓글을 입력해주세요."
                    rows={3}
                />
            </div>

            {state.message && !state.ok && (
                <p className="text-sm text-red-500">{state.message}</p>
            )}

            <SubmitButton />
        </form>
    );
}