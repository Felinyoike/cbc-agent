"use client";

import { useState } from "react";
import { Bot, ChevronDown, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeachingContext } from "@/context/TeachingContext";
import { assistantSuggestedPrompts, type EvidenceItem } from "@/data/mockData";
import { askAssistant, describeApiError } from "@/lib/api";

interface Message {
  role: "teacher" | "assistant" | "pending" | "error";
  text: string;
}

/**
 * Secondary, collapsible assistant. It never writes into the plan itself —
 * suggestions stay in this panel so the structured form remains the source of
 * truth for what the teacher is committing to.
 */
export function AssistantPanel({
  open,
  onOpenChange,
  title = "Planning assistant",
  context,
  evidence = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  context?: string;
  /** The curriculum evidence on this screen, sent as the assistant's grounding. */
  evidence?: EvidenceItem[];
}) {
  const { grade, subject } = useTeachingContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);

  const ask = async (question: string) => {
    if (!question.trim() || asking) return;
    setMessages((prev) => [...prev, { role: "teacher", text: question }, { role: "pending", text: "…" }]);
    setInput("");
    setAsking(true);

    let reply: Message;
    try {
      const { answer } = await askAssistant(question, grade, subject, evidence);
      reply = { role: "assistant", text: answer };
    } catch (error) {
      reply = { role: "error", text: `The assistant could not answer. ${describeApiError(error)}` };
    }
    // Replace only the placeholder; the reply is shown here and nowhere else.
    setMessages((prev) => prev.map((message) => (message.role === "pending" ? reply : message)));
    setAsking(false);
  };

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => onOpenChange(true)} className="w-full gap-2">
        <Sparkles className="size-4" />
        Ask assistant about this evidence
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ai-border bg-ai-softer/50 p-4">
      <div className="flex items-center gap-2">
        <Bot className="size-4 text-ai" />
        <span className="text-sm font-medium text-neutral-950">{title}</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-ai-border bg-white px-2 py-0.5 text-xs font-medium text-ai">
          <Sparkles className="size-3" />
          AI-assisted
        </span>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Collapse assistant"
          className="text-muted-foreground hover:text-neutral-900"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      {context && <p className="text-xs text-muted-foreground">Working from: {context}</p>}

      {messages.length > 0 && (
        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              role={message.role === "error" ? "alert" : undefined}
              aria-busy={message.role === "pending" || undefined}
              className={
                message.role === "teacher"
                  ? "self-end rounded-lg rounded-br-sm bg-neutral-900 px-3 py-2 text-xs text-white"
                  : message.role === "error"
                    ? "rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive"
                    : message.role === "pending"
                      ? "rounded-lg border border-ai-border bg-white px-3 py-2 text-xs text-muted-foreground"
                      : "whitespace-pre-wrap rounded-lg border border-ai-border bg-white px-3 py-2 text-xs leading-relaxed text-neutral-800"
              }
            >
              {message.text}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {assistantSuggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => ask(prompt)}
            disabled={asking}
            className="rounded-full border border-border bg-white px-2.5 py-1 text-left text-xs text-neutral-700 transition-colors hover:border-ai-border hover:text-ai"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about this evidence…"
          aria-label="Ask the planning assistant"
          className="h-9 bg-white text-sm"
        />
        <Button type="submit" size="icon" className="size-9 shrink-0" aria-label="Send" disabled={asking}>
          <Send className="size-4" />
        </Button>
      </form>

      <p className="text-[11px] leading-snug text-muted-foreground">
        Suggestions are AI-assisted and are not added to your draft automatically. Check them against the cited
        curriculum evidence.
      </p>
    </div>
  );
}

/** Compact dismiss control used where the assistant sits in a side rail. */
export function AssistantCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="Close assistant">
      <X className="size-4 text-muted-foreground" />
    </button>
  );
}
