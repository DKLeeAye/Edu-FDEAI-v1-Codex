import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduFDE",
  description: "AI 智能体项目交付实训平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
