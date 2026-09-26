import { forwardRef, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AutoGrowingTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const AutoGrowingTextarea = forwardRef<HTMLTextAreaElement, AutoGrowingTextareaProps>(
  ({ className, onInput, rows = 1, value, ...props }, forwardedRef) => {
    const localRef = useRef<HTMLTextAreaElement | null>(null);

    const resize = () => {
      const textarea = localRef.current;
      if (!textarea) return;
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    useLayoutEffect(resize, [value]);

    return (
      <textarea
        {...props}
        ref={(node) => {
          localRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        rows={rows}
        value={value}
        onInput={(event) => {
          resize();
          onInput?.(event);
        }}
        className={cn("resize-none overflow-y-auto", className)}
      />
    );
  },
);

AutoGrowingTextarea.displayName = "AutoGrowingTextarea";

export default AutoGrowingTextarea;