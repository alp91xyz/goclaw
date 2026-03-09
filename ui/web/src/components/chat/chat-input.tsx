import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  onAbort: () => void;
  isRunning: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onAbort, isRunning, disabled }: ChatInputProps) {
  const { t } = useTranslation("common");
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, onSend, disabled]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (isRunning) return;
        handleSend();
      }
    },
    [handleSend, isRunning],
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  return (
    <div className="flex items-end gap-2 border-t bg-background p-4">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={t("sendMessage")}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      />
      {isRunning ? (
        <Button
          variant="destructive"
          size="icon-lg"
          onClick={onAbort}
          title={t("stopGeneration")}
        >
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          size="icon-lg"
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          title={t("sendMessageTitle")}
        >
          <Send className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
