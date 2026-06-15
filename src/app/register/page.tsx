"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, email, password }),
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
