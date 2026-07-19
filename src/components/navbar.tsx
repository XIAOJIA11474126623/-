"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  Heart,
  Home,
  Info,
  LogIn,
  Menu,
  Tags,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/pricing", label: "价格页", icon: Tags },
  { href: "/blog", label: "博客", icon: BookOpenText },
  { href: "/about", label: "关于我们", icon: Info },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#10101a]/86 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 rounded-md text-[#f0e6d3] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b9d]/70"
          aria-label="纸片人女友首页"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#ff6b9d]/30 bg-[#ff6b9d]/14 text-[#ff9fbd]">
            <Heart className="h-4 w-4" aria-hidden />
          </span>
          <span className="truncate text-base font-bold tracking-normal sm:text-lg">
            纸片人女友
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-[#c9bfd4] transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b9d]/70",
                  active && "bg-white/10 text-[#f0e6d3]",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center md:flex">
          <Button
            asChild
            className="h-10 rounded-md bg-[#ff6b9d] px-4 text-[#10101a] hover:bg-[#ff82ad]"
          >
            <Link href="/login">
              <LogIn className="h-4 w-4" aria-hidden />
              登录
            </Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md border border-white/10 text-[#f0e6d3] hover:bg-white/10 hover:text-white md:hidden"
              aria-label="打开导航菜单"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent className="border-white/10 bg-[#10101a] text-[#f0e6d3]">
            <SheetHeader className="border-b border-white/10 px-0 pb-4">
              <SheetTitle className="flex items-center gap-2 text-[#f0e6d3]">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#ff6b9d]/30 bg-[#ff6b9d]/14 text-[#ff9fbd]">
                  <Heart className="h-4 w-4" aria-hidden />
                </span>
                纸片人女友
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-2 py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);

                return (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-[#c9bfd4] transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b9d]/70",
                        active && "bg-white/10 text-[#f0e6d3]",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {item.label}
                    </Link>
                  </SheetClose>
                );
              })}
            </div>

            <SheetClose asChild>
              <Button
                asChild
                className="h-11 w-full rounded-md bg-[#ff6b9d] text-[#10101a] hover:bg-[#ff82ad]"
              >
                <Link href="/login">
                  <LogIn className="h-4 w-4" aria-hidden />
                  登录
                </Link>
              </Button>
            </SheetClose>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
