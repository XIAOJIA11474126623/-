"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TurnstileStatus = "loading" | "ready" | "script-error";

export default function RegisterPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileStatus, setTurnstileStatus] =
    useState<TurnstileStatus>("loading");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!turnstileSiteKey) {
      setError("人机验证暂未配置，请稍后再试");
      return;
    }

    if (!turnstileToken) {
      setError("请先完成人机验证");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, email, password, turnstileToken }),
      });
      const data = (await response
        .json()
        .catch(() => ({ error: "注册服务暂时不可用，请稍后再试" }))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error || "注册失败");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("网络连接失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#f0e6d3]">创建账号</h1>
          <p className="mt-2 text-sm text-[#8b8ba3]">
            保存你的角色关系和聊天记录
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-[#c9bfd4]" htmlFor="nickname">
              昵称
            </label>
            <Input
              id="nickname"
              autoComplete="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className="h-11 border-white/10 bg-white/10 text-[#f0e6d3]"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#c9bfd4]" htmlFor="email">
              邮箱
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 border-white/10 bg-white/10 text-[#f0e6d3]"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#c9bfd4]" htmlFor="password">
              密码
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 border-white/10 bg-white/10 text-[#f0e6d3]"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          {turnstileSiteKey ? (
            <div className="relative min-h-[65px] overflow-hidden rounded-lg bg-white/5">
              {turnstileStatus === "loading" ? (
                <p className="absolute inset-0 flex items-center justify-center text-sm text-[#8b8ba3]">
                  正在加载人机验证...
                </p>
              ) : null}
              {turnstileStatus === "script-error" ? (
                <p className="absolute inset-0 flex items-center justify-center px-3 text-center text-sm text-red-200">
                  人机验证加载失败，请刷新页面或关闭拦截插件后重试
                </p>
              ) : null}
              <Turnstile
                id="register-turnstile"
                siteKey={turnstileSiteKey}
                options={{ language: "zh-CN", size: "flexible", theme: "dark" }}
                scriptOptions={{
                  onError: () => {
                    setTurnstileToken("");
                    setTurnstileStatus("script-error");
                  },
                }}
                onWidgetLoad={() => setTurnstileStatus("ready")}
                onSuccess={(token) => {
                  setTurnstileToken(token);
                  setTurnstileStatus("ready");
                }}
                onExpire={() => setTurnstileToken("")}
                onError={() => {
                  setTurnstileToken("");
                  setTurnstileStatus("ready");
                  setError("人机验证暂时失败，请刷新页面后重试");
                }}
              />
            </div>
          ) : (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">
              人机验证暂未配置，请稍后再试
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-[#ff6b9d] text-[#1a1a2e] hover:bg-[#ff82ad]"
          >
            {loading ? "创建中..." : "创建账号"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-[#8b8ba3]">
          已经有账号？{" "}
          <Link className="text-[#ff9fbd] hover:underline" href="/login">
            去登录
          </Link>
        </p>
      </div>
    </main>
  );
}
