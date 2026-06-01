import type { Metadata } from "next";
import "./globals.css";
import "./open-design-vnext.css";

export const metadata: Metadata = {
  title: "EduFDE｜高校 AI 智能体项目交付实训平台",
  description:
    "EduFDE 是面向高校 FDE 人才培养的 AI 智能体项目交付实训平台，覆盖学生五阶段实训、教师评审闭环与高校专有部署。",
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
