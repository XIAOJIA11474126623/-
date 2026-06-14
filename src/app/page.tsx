"use client";

import type { CSSProperties, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import { ImageIcon, LogOut, MessageCircle, Sparkles, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { characters, type Character } from "@/lib/characters";

interface CurrentUser {
  id: string;
  email: string;
  nickname: string;
  pointsBalance: number;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.58,
      ease: [0.6, 0.05, 0.01, 0.9],
    },
  },
};

function CharacterCard({ character }: { character: Character }) {
  const [isHovered, setIsHovered] = useState(false);
  const [activeDemo, setActiveDemo] = useState<"photo" | "voice" | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "loading" | "playing" | "error">(
    "idle",
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const shouldReduceMotion = useReducedMotion();

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);

    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const handlePhotoDemo = () => {
    setPhotoIndex((current) =>
      activeDemo === "photo" ? (current + 1) % character.lifePhotos.length : 0,
    );
    setActiveDemo("photo");
  };

  const handleVoiceDemo = async () => {
    setActiveDemo("voice");

    if (voiceStatus === "playing") {
      audioRef.current?.pause();
      audioRef.current = null;
      setVoiceStatus("idle");
      return;
    }

    setVoiceStatus("loading");

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: character.greetings[0],
          speaker: character.ttsSpeaker,
          speechRate: character.speechRate,
        }),
      });

      if (!response.ok) {
        throw new Error("语音生成失败");
      }

      const data = (await response.json()) as { audioUri?: string };

      if (!data.audioUri) {
        throw new Error("没有返回音频地址");
      }

      audioRef.current?.pause();
      const audio = new Audio(data.audioUri);
      audioRef.current = audio;
      audio.onended = () => setVoiceStatus("idle");
      audio.onerror = () => setVoiceStatus("error");
      await audio.play();
      setVoiceStatus("playing");
    } catch (error) {
      console.error(error);
      setVoiceStatus("error");
    }
  };

  const previewPhoto = character.lifePhotos[photoIndex];
  const voiceStatusText = {
    idle: "点一下听问候",
    loading: "语音生成中",
    playing: "正在播放",
    error: "语音暂不可用",
  }[voiceStatus];

  return (
    <motion.div variants={itemVariants} className="[perspective:1000px]">
      <motion.div
        style={{
          rotateX: shouldReduceMotion ? 0 : rotateX,
          rotateY: shouldReduceMotion ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className="group relative h-full"
      >
        <Card
          className="character-ribbon-card relative h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b0b12]/82 py-0 shadow-[0_24px_90px_-48px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-shadow duration-500 hover:shadow-[0_30px_100px_-52px_rgba(0,0,0,0.95)]"
          style={
            {
              "--character-accent": character.accentColor,
            } as CSSProperties
          }
        >
          <motion.div
            className="absolute inset-0 opacity-0 transition-opacity duration-500"
            style={{
              background: `linear-gradient(135deg, ${character.accentColor}2e, rgba(255,255,255,0.04) 42%, transparent 75%)`,
            }}
            animate={
              isHovered
                ? { opacity: 1 }
                : { opacity: shouldReduceMotion ? 0.08 : 0 }
            }
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={
              isHovered
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: shouldReduceMotion ? 1 : 0.7 }
            }
            className="absolute right-4 top-4 z-10"
          >
            <Sparkles className="h-5 w-5 text-[var(--character-accent)]" aria-hidden />
          </motion.div>

          <div className="relative z-10 flex h-full flex-col p-3 sm:p-4 xl:p-5">
            <div className="mb-3 flex justify-center xl:mb-4">
              <motion.div
                className="relative"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <motion.div
                  className="absolute -inset-3 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(135deg, ${character.accentColor}8c, transparent)`,
                  }}
                  animate={
                    isHovered
                      ? {
                          rotate: shouldReduceMotion ? 0 : 360,
                          scale: shouldReduceMotion ? 1 : [1, 1.08, 1],
                        }
                      : { rotate: 0, scale: 1 }
                  }
                  transition={{
                    duration: shouldReduceMotion ? 0.4 : 3,
                    repeat: shouldReduceMotion ? 0 : Infinity,
                    ease: "linear",
                  }}
                />
                <div
                  className="relative h-16 w-16 overflow-hidden rounded-full border bg-[#14141f] p-1 sm:h-20 sm:w-20 md:h-24 md:w-24 xl:h-28 xl:w-28"
                  style={{
                    borderColor: `${character.accentColor}99`,
                    boxShadow: `0 0 0 6px #0b0b12, 0 0 34px ${character.accentColor}33`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <motion.img
                    src={character.avatar}
                    alt={character.name}
                    className="h-full w-full rounded-full object-cover"
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.08 }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            </div>

            <div className="flex flex-1 flex-col items-center text-center">
              <motion.h2
                className="mb-1.5 text-2xl font-bold leading-none tracking-normal sm:text-3xl xl:text-4xl"
                style={{ color: character.accentColor }}
                animate={isHovered ? { scale: 1.04 } : { scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {character.name}
              </motion.h2>

              <Badge
                variant="secondary"
                className="mb-2 border border-white/10 bg-white/10 px-2.5 py-0.5 text-xs text-[#f0e6d3] backdrop-blur xl:mb-3 xl:text-sm"
              >
                {character.title}
              </Badge>

              <p className="mb-3 hidden line-clamp-2 max-w-sm text-sm leading-relaxed text-[#a8a0b8] sm:block sm:min-h-10 xl:mb-4 xl:text-base">
                {character.description}
              </p>

              <motion.div
                className="mb-4 hidden flex-wrap justify-center gap-2 sm:flex xl:mb-5"
                initial={{ opacity: 0, y: 10 }}
                animate={
                  isHovered ? { opacity: 1, y: 0 } : { opacity: 0.76, y: 0 }
                }
                transition={{ duration: 0.3 }}
              >
                {character.lifePhotos.slice(0, 3).map((photo, index) => (
                  <motion.div
                    key={photo.scene}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.08 * index,
                      type: "spring",
                      stiffness: 260,
                      damping: 18,
                    }}
                  >
                    <Badge
                      variant="outline"
                      className="border-white/10 bg-white/5 text-xs text-[#a8a0b8] hover:bg-white/10"
                    >
                      {photo.scene}
                    </Badge>
                  </motion.div>
                ))}
              </motion.div>

              <div className="mt-auto hidden w-full grid-cols-3 gap-1.5 text-[#a8a0b8] sm:grid sm:gap-2">
                <Link
                  href={`/chat/${character.id}`}
                  aria-label={`和${character.name}文字聊天`}
                  className="flex h-8 items-center justify-center rounded-md border border-white/10 bg-white/5 transition-colors hover:border-[var(--character-accent)]/60 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--character-accent)] xl:h-9"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                </Link>
                <button
                  type="button"
                  aria-label={`查看${character.name}的生活照片`}
                  onClick={handlePhotoDemo}
                  className="flex h-8 items-center justify-center rounded-md border border-white/10 bg-white/5 transition-colors hover:border-[var(--character-accent)]/60 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--character-accent)] xl:h-9"
                >
                  <ImageIcon className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`${voiceStatus === "playing" ? "停止" : "试听"}${character.name}的语音`}
                  onClick={handleVoiceDemo}
                  className="flex h-8 items-center justify-center rounded-md border border-white/10 bg-white/5 transition-colors hover:border-[var(--character-accent)]/60 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--character-accent)] xl:h-9"
                >
                  <Volume2
                    className={`h-4 w-4 ${voiceStatus === "playing" ? "text-[var(--character-accent)]" : ""}`}
                    aria-hidden
                  />
                </button>
              </div>

              {activeDemo ? (
                <motion.div
                  className="mt-2 hidden w-full overflow-hidden rounded-md border border-white/10 bg-black/20 text-left sm:block"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeDemo === "photo" ? (
                    <div className="grid grid-cols-[4.5rem_1fr] items-center gap-3 p-2">
                      <div className="aspect-square overflow-hidden rounded-md bg-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewPhoto.url}
                          alt={`${character.name}${previewPhoto.scene}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#f0e6d3]">
                          {previewPhoto.scene}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#a8a0b8]">
                          再点照片图标切换下一张
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-[var(--character-accent)]">
                        <Volume2 className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#f0e6d3]">
                          {voiceStatusText}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs text-[#a8a0b8]">
                          {character.greetings[0]}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : null}

              <Button
                asChild
                className="group/button mt-3 h-9 w-full overflow-hidden rounded-md bg-[var(--character-accent)] text-[#11111a] shadow-lg transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[var(--character-accent)] sm:h-10 xl:mt-4"
              >
                <Link href={`/chat/${character.id}`}>
                  <span className="font-semibold">开始聊天</span>
                  <motion.span
                    className="ml-2"
                    animate={shouldReduceMotion ? undefined : { x: [0, 5, 0] }}
                    transition={
                      shouldReduceMotion
                        ? undefined
                        : { repeat: Infinity, duration: 1.5 }
                    }
                  >
                    →
                  </motion.span>
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default function HomePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setUser(data.user || null))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <main className="relative min-h-dvh overflow-hidden px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#1a1a2e_0%,#151526_48%,#10101a_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,107,157,0.18),transparent_42%)]" />

      <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:gap-5">
        <div className="flex min-h-10 items-center justify-end gap-3">
          {user ? (
            <>
              <span className="max-w-[160px] truncate text-sm text-[#a8a0b8]">
                {user.nickname}
              </span>
              <span className="rounded-md border border-[#ffd166]/25 bg-[#ffd166]/10 px-2.5 py-1 text-sm text-[#ffd166]">
                {user.pointsBalance} 积分
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="rounded-md border border-white/10 text-[#f0e6d3] hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                退出
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="rounded-md border border-white/10 text-[#f0e6d3] hover:bg-white/10 hover:text-white"
              >
                <Link href="/login">登录</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-md bg-[#ff6b9d] text-[#1a1a2e] hover:bg-[#ff82ad]"
              >
                <Link href="/register">注册</Link>
              </Button>
            </>
          )}
        </div>

        <motion.section
          aria-labelledby="home-heading"
          className="text-center"
          initial={{ opacity: 0, y: -26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.6, 0.05, 0.01, 0.9] }}
        >
          <Badge
            className="mb-3 gap-2 border border-white/10 bg-white/10 px-3 py-1 text-[#a8a0b8] backdrop-blur sm:mb-4"
            variant="secondary"
          >
            <Sparkles className="h-3 w-3 text-[#ff6b9d]" aria-hidden />
            四位专属 AI 伙伴
          </Badge>

          <motion.h1
            id="home-heading"
            className="mx-auto mb-2 max-w-4xl bg-gradient-to-r from-[#f0e6d3] via-white to-[#f0e6d3]/60 bg-clip-text text-4xl font-bold tracking-normal text-transparent sm:text-5xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.6 }}
          >
            纸片人女友
          </motion.h1>

          <motion.p
            className="mx-auto hidden max-w-2xl text-sm leading-relaxed text-[#a8a0b8] sm:block sm:text-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.32, duration: 0.6 }}
          >
            选择你的专属伙伴，开启文字、图片与语音交织的温暖对话。
          </motion.p>
        </motion.section>

        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:gap-5"
        >
          {characters.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </motion.section>

        <motion.p
          className="hidden pb-1 text-center text-xs text-[#8b8ba3]/60 sm:block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: shouldReduceMotion ? 0 : 0.8, duration: 0.4 }}
        >
          每段对话都值得被温柔以待
        </motion.p>
      </div>
    </main>
  );
}
