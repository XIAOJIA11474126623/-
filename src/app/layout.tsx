import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '纸片人女友 - 有温度的AI陪伴',
  description: '选择你的专属AI伙伴，感受有温度的对话陪伴',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className="antialiased min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
