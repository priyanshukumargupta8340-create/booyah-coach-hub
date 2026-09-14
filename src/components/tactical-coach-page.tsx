import { useChat } from "@ai-sdk/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Crosshair,
  Flame,
  Menu,
  MessageSquarePlus,
  Radio,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import tacticalCoachMark from "@/assets/tactical-coach-mark.png";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type Thread = Database["public"]["Tables"]["ai_coach_threads"]["Row"];

const QUICK_PROMPTS = [
  "How to master one-tap headshots?",
  "Best character combos for CS Ranked",
  "How to drop fast Gloo Walls under fire?",
  "BR Zone rotation strategy for Bermuda",
] as const;

function toJson(parts: UIMessage["parts"]): Json {
  return JSON.parse(JSON.stringify(parts)) as Json;
}

function loadedMessage(row: Database["public"]["Tables"]["ai_coach_messages"]["Row"]): UIMessage {
  return {
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    parts: Array.isArray(row.parts) ? (row.parts as UIMessage["parts"]) : [],
  };
}

export function TacticalCoachPage({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("ai_coach_threads")
      .select("*")
      .order("updated_at", { ascending: false });
    if (loadError) setError(loadError.message);
    else setThreads(data ?? []);
  }, []);

  useEffect(() => {
    void loadThreads();
    supabase
      .from("ai_coach_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .then(({ data, error: loadError }) => {
        if (loadError) setError(loadError.message);
        else setInitialMessages((data ?? []).map(loadedMessage));
      });
  }, [loadThreads, threadId]);

  async function createThread() {
    const { data, error: createError } = await supabase
      .from("ai_coach_threads")
      .insert({ title: "New tactical briefing" })
      .select("id")
      .single();
    if (createError) return setError(createError.message);
    setSidebarOpen(false);
    navigate({ to: "/ai-coach/$threadId", params: { threadId: data.id } });
  }

  async function deleteThread(id: string) {
    const { error: deleteError } = await supabase.from("ai_coach_threads").delete().eq("id", id);
    if (deleteError) return setError(deleteError.message);
    const remaining = threads.filter((thread) => thread.id !== id);
    if (id === threadId) {
      if (remaining[0]) navigate({ to: "/ai-coach/$threadId", params: { threadId: remaining[0].id } });
      else void createThread();
    } else setThreads(remaining);
  }

  return (
    <main className="flex h-dvh min-h-[600px] flex-col overflow-hidden bg-background">
      <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label="Open conversations"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            size="icon"
            variant="ghost"
          >
            <Menu />
          </Button>
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary">
              <Flame className="text-primary-foreground" />
            </span>
            <span className="truncate font-display text-2xl tracking-wide">
              Booyah<span className="text-primary">Coach</span>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-gold">
          <Radio className="h-3.5 w-3.5" /> AI Tactical Coach
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {sidebarOpen ? (
          <button
            aria-label="Close conversations"
            className="fixed inset-0 z-30 bg-background/80 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            type="button"
          />
        ) : null}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-surface transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-4 lg:hidden">
            <span className="font-bold">Tactical briefings</span>
            <Button aria-label="Close conversations" onClick={() => setSidebarOpen(false)} size="icon" variant="ghost">
              <X />
            </Button>
          </div>
          <div className="p-3">
            <Button className="w-full justify-start" onClick={() => void createThread()}>
              <MessageSquarePlus /> New conversation
            </Button>
          </div>
          <nav aria-label="Tactical conversations" className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {threads.map((thread) => (
              <div
                className={`group mb-1 flex items-center rounded-md border ${thread.id === threadId ? "border-primary/50 bg-primary/10" : "border-transparent hover:bg-surface-2"}`}
                key={thread.id}
              >
                <Link
                  className="min-w-0 flex-1 truncate px-3 py-3 text-sm font-medium"
                  onClick={() => setSidebarOpen(false)}
                  params={{ threadId: thread.id }}
                  to="/ai-coach/$threadId"
                >
                  {thread.title}
                </Link>
                <Button
                  aria-label={`Delete ${thread.title}`}
                  className="mr-1 text-muted-foreground opacity-70 hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100"
                  onClick={() => void deleteThread(thread.id)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </nav>
          <div className="border-t border-border p-4 text-xs text-muted-foreground">
            <p className="font-bold uppercase text-foreground">Grandmaster protocol</p>
            <p className="mt-1">CS rushes · BR rotations · Gloo walls · Skills</p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-border bg-card px-4 py-3 sm:px-6">
            <div className="mx-auto flex max-w-4xl items-center gap-3">
              <img
                alt="AI Tactical Coach falcon emblem"
                className="h-11 w-11 rounded-md bg-foreground object-cover"
                height={512}
                src={tacticalCoachMark}
                width={512}
              />
              <div className="min-w-0">
                <h1 className="font-display text-2xl tracking-wide">AI Tactical Coach</h1>
                <p className="truncate text-xs text-muted-foreground">Grandmaster-level battlefield analysis, on demand</p>
              </div>
            </div>
          </div>

          {initialMessages === null ? (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Loading briefing…</div>
          ) : (
            <CoachChat
              initialMessages={initialMessages}
              onError={setError}
              onThreadChange={loadThreads}
              threadId={threadId}
            />
          )}
          {error ? (
            <div className="border-t border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
              {error}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function CoachChat({
  threadId,
  initialMessages,
  onError,
  onThreadChange,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onError: (message: string | null) => void;
  onThreadChange: () => Promise<void>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai-coach",
        body: { threadId },
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (chatError) => onError(chatError.message),
    onFinish: ({ message, isError }) => {
      if (isError) return;
      void supabase
        .from("ai_coach_messages")
        .insert({ thread_id: threadId, role: "assistant", parts: toJson(message.parts) })
        .then(({ error }) => {
          if (error) onError(error.message);
          void onThreadChange();
        });
    },
  });

  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status]);

  async function submit(text: string) {
    const prompt = text.trim();
    if (!prompt || status !== "ready") return;
    onError(null);
    const userParts: UIMessage["parts"] = [{ type: "text", text: prompt }];
    const { error } = await supabase
      .from("ai_coach_messages")
      .insert({ thread_id: threadId, role: "user", parts: toJson(userParts) });
    if (error) return onError(error.message);

    if (messages.length === 0) {
      const title = prompt.length > 42 ? `${prompt.slice(0, 42)}…` : prompt;
      await supabase.from("ai_coach_threads").update({ title }).eq("id", threadId);
      await onThreadChange();
    }
    await sendMessage({ text: prompt });
    textareaRef.current?.focus();
  }

  return (
    <>
      <Conversation className="min-h-0">
        <ConversationContent className="mx-auto w-full max-w-4xl gap-6 px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <ConversationEmptyState className="min-h-[44vh] py-10">
              <img
                alt="AI Tactical Coach falcon emblem"
                className="h-24 w-24 rounded-lg bg-foreground object-cover"
                height={512}
                src={tacticalCoachMark}
                width={512}
              />
              <div className="mt-3 max-w-md">
                <h2 className="font-display text-4xl tracking-wide">Plan your next Booyah</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Ask for a drill, a rotation call, a rush setup, or a character combo for your squad.
                </p>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                {message.role === "assistant" ? (
                  <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase text-gold">
                    <Crosshair className="h-3.5 w-3.5" /> Tactical Coach
                  </div>
                ) : null}
                <MessageContent className={message.role === "user" ? "bg-primary text-primary-foreground" : undefined}>
                  {message.parts.map((part, index) => {
                    if (part.type === "text") return <MessageResponse key={index}>{part.text}</MessageResponse>;
                    if (part.type === "reasoning") {
                      return (
                        <details className="text-xs text-muted-foreground" key={index}>
                          <summary className="cursor-pointer font-semibold">Tactical analysis</summary>
                          <div className="mt-2 border-l border-gold/40 pl-3">{part.text}</div>
                        </details>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-gold" /> <Shimmer>Reading the battlefield…</Shimmer>
            </div>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="shrink-0 border-t border-border bg-surface px-3 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {QUICK_PROMPTS.map((prompt) => (
              <Button
                className="h-auto shrink-0 whitespace-normal border-gold/30 px-3 py-2 text-left text-xs text-muted-foreground hover:border-gold/70 hover:text-foreground"
                disabled={status !== "ready"}
                key={prompt}
                onClick={() => void submit(prompt)}
                variant="outline"
              >
                {prompt}
              </Button>
            ))}
          </div>
          <PromptInput onSubmit={({ text }) => submit(text)}>
            <PromptInputTextarea
              autoFocus
              className="min-h-20"
              disabled={status !== "ready"}
              placeholder="Ask for tactics, drills, rotations, or character combos…"
              ref={textareaRef}
            />
            <PromptInputFooter className="justify-between">
              <span className="text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line</span>
              <PromptInputSubmit
                disabled={status === "error"}
                onStop={() => void stop()}
                status={status}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </>
  );
}