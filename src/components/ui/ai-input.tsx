import { useState } from "react";
import { CornerRightUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";

interface AIInputProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  disabled?: boolean;
  onSubmit?: (value: string) => void;
  className?: string;
}

export function AIInput({
  id = "ai-input",
  placeholder = "Type your message...",
  minHeight = 52,
  maxHeight = 200,
  disabled = false,
  onSubmit,
  className,
}: AIInputProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight, maxHeight });
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = () => {
    const value = inputValue.trim();
    if (!value || disabled) return;
    onSubmit?.(value);
    setInputValue("");
    adjustHeight(true);
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="relative w-full">
        <Textarea
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full resize-none overflow-y-auto rounded-2xl border-none bg-muted py-3 pl-4 pr-12 text-base leading-[1.4]",
            "text-foreground placeholder:text-muted-foreground",
            "shadow-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
            "transition-[height] duration-100 ease-out",
            "[&::-webkit-resizer]:hidden",
          )}
          style={{ minHeight, maxHeight }}
          ref={textareaRef}
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            adjustHeight();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
          }}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !inputValue.trim()}
          aria-label="Send message"
          className={cn(
            "absolute bottom-2.5 right-2.5 inline-flex size-8 items-center justify-center rounded-xl transition-all duration-200",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:pointer-events-none disabled:opacity-0",
          )}
        >
          <CornerRightUp className="size-4" />
        </button>
      </div>
    </div>
  );
}
