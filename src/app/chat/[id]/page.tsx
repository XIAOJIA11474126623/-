"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCharacterById } from "@/lib/characters";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  audioUrl?: string;
  isStreaming?: boolean;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = params.id as string;
  const character = getCharacterById(characterId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => {
        if (!data.user) {
          router.replace(`/login?next=/chat/${characterId}`);
          return;
        }
        setAuthChecked(true);
      })
      .catch(() => router.replace(`/login?next=/chat/${characterId}`));
  }, [characterId, router]);

  // Send greeting on first load
  useEffect(() => {
    if (authChecked && character && messages.length === 0) {
      const randomGreeting = character.greetings[Math.floor(Math.random() * character.greetings.length)];
      const greetingMsg: ChatMessage = {
        id: `greeting-${Date.now()}`,
        role: "assistant",
        content: randomGreeting,
      };
      setMessages([greetingMsg]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, character?.id]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !character) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Build conversation history for API
    const chatHistory = messages
      .filter((m) => !m.isStreaming)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));
    chatHistory.push({ role: "user", content: input.trim() });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          messages: chatHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let fullContent = "";
      let collectedImages: string[] = [];

      // Add streaming assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          isStreaming: true,
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "text" && parsed.content) {
                fullContent += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: fullContent, isStreaming: true }
                      : m
                  )
                );
              } else if (parsed.type === "image" && parsed.url) {
                collectedImages = [...collectedImages, parsed.url];
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, images: collectedImages }
                      : m
                  )
                );
              } else if (parsed.type === "error" && parsed.content) {
                fullContent = "啊...我这边连接有点问题，等一下再试试好吗？";
                console.error("Chat API error:", parsed.content);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: fullContent, isStreaming: false }
                      : m
                  )
                );
              }
            } catch {
              // Not JSON, might be raw text
              if (data && data !== "[DONE]") {
                fullContent += data;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: fullContent, isStreaming: true }
                      : m
                  )
                );
              }
            }
          }
        }
      }

      // Mark streaming as complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: fullContent,
                isStreaming: false,
                images: collectedImages.length > 0 ? collectedImages : undefined,
              }
            : m
        )
      );

      // Request TTS for the complete text
      if (fullContent && fullContent.length < 300) {
        try {
          const ttsResponse = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: fullContent,
              speaker: character.ttsSpeaker,
              speechRate: character.speechRate,
            }),
          });
          if (ttsResponse.ok) {
            const ttsData = await ttsResponse.json();
            if (ttsData.audioUri) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, audioUrl: ttsData.audioUri }
                    : m
                )
              );
            }
          }
        } catch {
          // TTS failure is non-critical, ignore
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "啊...好像出了点小问题，再说一次好吗？",
          isStreaming: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const playAudio = (audioUrl: string, messageId: string) => {
    if (playingAudioId === messageId) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audio.onended = () => setPlayingAudioId(null);
    audio.onerror = () => setPlayingAudioId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingAudioId(messageId);
  };

  if (!mounted || !authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e]" />
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
        <p className="text-[#8b8ba3]">角色不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{
          background: "rgba(26,26,46,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          onClick={() => router.push("/")}
          className="p-2 rounded-xl hover:bg-white/5 transition-colors text-[#8b8ba3] hover:text-[#f0e6d3]"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div
          className="w-10 h-10 rounded-full overflow-hidden border-2"
          style={{ borderColor: character.accentColor }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={character.avatar}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1">
          <h2
            className="font-bold text-base"
            style={{ color: character.accentColor }}
          >
            {character.name}
          </h2>
          <p className="text-xs text-[#8b8ba3] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            在线
          </p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-appear flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] ${
                msg.role === "user" ? "order-1" : ""
              }`}
            >
              {/* Avatar for assistant */}
              {msg.role === "assistant" && (
                <div className="flex items-end gap-2">
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border"
                    style={{ borderColor: character.accentColor }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={character.avatar}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {/* Text bubble */}
                    <div
                      className="rounded-2xl rounded-bl-md px-4 py-2.5"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        color: "#f0e6d3",
                      }}
                    >
                      <p
                        className="text-[15px] leading-relaxed whitespace-pre-wrap"
                        style={{ wordBreak: "break-word" }}
                      >
                        {msg.content}
                        {msg.isStreaming && (
                          <span className="typing-cursor" />
                        )}
                      </p>
                    </div>

                    {/* Images */}
                    {msg.images && msg.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 max-w-[280px]">
                        {msg.images.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                            style={{
                              width:
                                msg.images!.length === 1 ? "240px" : "calc(50% - 4px)",
                            }}
                            onClick={() => {
                              const w = window.open(imgUrl, "_blank");
                              if (w) w.focus();
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgUrl}
                              alt={`分享的图片 ${idx + 1}`}
                              className="w-full object-cover"
                              style={{
                                height: msg.images!.length === 1 ? "180px" : "120px",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Audio player */}
                    {msg.audioUrl && !msg.isStreaming && (
                      <button
                        onClick={() => playAudio(msg.audioUrl!, msg.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
                        style={{
                          background: `${character.accentColor}15`,
                        }}
                      >
                        <div className="flex items-center gap-0.5 h-4">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={`w-0.5 rounded-full ${
                                playingAudioId === msg.id
                                  ? "voice-bar"
                                  : ""
                              }`}
                              style={{
                                height: `${8 + Math.random() * 8}px`,
                                backgroundColor:
                                  playingAudioId === msg.id
                                    ? character.accentColor
                                    : `${character.accentColor}80`,
                              }}
                            />
                          ))}
                        </div>
                        <span
                          className="text-xs"
                          style={{ color: character.accentColor }}
                        >
                          {playingAudioId === msg.id ? "播放中..." : "播放语音"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* User message */}
              {msg.role === "user" && (
                <div
                  className="rounded-2xl rounded-br-md px-4 py-2.5"
                  style={{
                    background: `${character.accentColor}30`,
                    color: "#f0e6d3",
                  }}
                >
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="message-appear flex justify-start">
            <div className="flex items-end gap-2">
              <div
                className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border"
                style={{ borderColor: character.accentColor }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={character.avatar}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="rounded-2xl rounded-bl-md px-4 py-3"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{
                      background: character.accentColor,
                      animationDelay: "0ms",
                    }}
                  />
                  <div
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{
                      background: character.accentColor,
                      animationDelay: "150ms",
                    }}
                  />
                  <div
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{
                      background: character.accentColor,
                      animationDelay: "300ms",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="sticky bottom-0 px-4 py-3 backdrop-blur-xl"
        style={{
          background: "rgba(26,26,46,0.9)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`和${character.name}说点什么...`}
            rows={1}
            className="flex-1 bg-white/8 border border-white/10 rounded-2xl px-4 py-2.5 text-[15px] text-[#f0e6d3] placeholder-[#8b8ba3] resize-none focus:outline-none focus:border-white/20 transition-colors"
            style={{
              maxHeight: "120px",
              minHeight: "44px",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "44px";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-2xl transition-all duration-200 flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: input.trim() && !isLoading
                ? character.accentColor
                : "rgba(255,255,255,0.08)",
              color: input.trim() && !isLoading ? "#1a1a2e" : "#8b8ba3",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12 7-7 7 7" />
              <path d="M12 19V5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
