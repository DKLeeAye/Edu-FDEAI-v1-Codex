"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { tokenStorageKey } from "@/src/lib/auth-storage";
import { login } from "@/src/lib/api";
import {
  createInitialLoginFormState,
  demoPassword,
  roleConfig,
  shouldUseDemoCredentials,
  type LoginRole,
} from "./login-portal-model";

const roleLabels: Array<{
  description: string;
  label: string;
  role: LoginRole;
}> = [
  {
    description: "实验区、阶段任务、产物提交",
    label: "学生",
    role: "student",
  },
  {
    description: "课程运行、AI 评审、教学反馈",
    label: "教师",
    role: "teacher",
  },
  {
    description: "租户、账号、模型与审计",
    label: "管理员",
    role: "admin",
  },
];

export function LoginPortal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialState = useMemo(() => {
    return createInitialLoginFormState({
      demo: searchParams.get("demo"),
      role: searchParams.get("role"),
    });
  }, [searchParams]);
  const demoCredentials = shouldUseDemoCredentials(searchParams.get("demo"));
  const [role, setRole] = useState<LoginRole>(initialState.role);
  const [account, setAccount] = useState(initialState.account);
  const [password, setPassword] = useState(initialState.password);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.body.classList.add("login-page");
    return () => document.body.classList.remove("login-page");
  }, []);

  function handleRoleChange(nextRole: LoginRole) {
    setRole(nextRole);
    setAccount(demoCredentials ? roleConfig[nextRole].email : "");
    setPassword(demoCredentials ? demoPassword : "");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedAccount = account.trim();
    if (!trimmedAccount || !password.trim()) {
      setMessage("请填写账号和密码后继续。");
      return;
    }

    setIsSubmitting(true);
    setMessage("身份确认中，正在连接平台工作台…");
    try {
      const result = await login(trimmedAccount, password);
      window.localStorage.setItem(tokenStorageKey, result.access_token);
      setMessage("身份确认通过，正在进入对应工作台…");
      router.push("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-brand-panel" aria-label="EduFDE 平台说明">
        <Link className="login-brand" href="/" aria-label="返回 EduFDE 首页">
          <span className="site-brand-mark">FDE</span>
          <span>
            <strong>EduFDE</strong>
            <small>教育版 FDE 实训平台</small>
          </span>
        </Link>

        <div className="login-hero-copy">
          <p>Account Portal</p>
          <h1 className="title-lines">
            <span>按教学身份进入</span>
            <span>对应的实训工作台</span>
          </h1>
          <span>
            统一承载学生实验、教师评审与高校平台管理，让课程过程、阶段产物、AI
            反馈和最终确认保持清晰边界。
          </span>
        </div>

        <div className="login-product-preview" aria-label="登录后的课程实训概览">
          <div className="login-preview-top">
            <div>
              <small>当前课程</small>
              <strong>AI 智能体项目交付实训</strong>
            </div>
            <span>第 4 周</span>
          </div>
          <div className="login-preview-grid">
            <article>
              <small>学生进行中</small>
              <strong>126</strong>
              <span>企业知识库智能客服项目</span>
            </article>
            <article>
              <small>AI 预评待确认</small>
              <strong>18</strong>
              <span>Rubric 证据定位完成</span>
            </article>
          </div>
          <div className="login-stage-strip" aria-label="五阶段进度">
            <span className="done">需求访谈</span>
            <span className="current">方案定义</span>
            <span>知识决策</span>
            <span>实现测试</span>
            <span>交付验收</span>
          </div>
        </div>

        <div className="login-trust-row">
          <span>高校统一身份认证</span>
          <span>课程权限隔离</span>
          <span>过程审计留痕</span>
        </div>
      </section>

      <section className="login-card" aria-label="EduFDE 登录">
        <div className="login-card-head">
          <Link className="login-back" href="/">
            返回首页
          </Link>
          <h2>登录平台</h2>
          <p id="roleHelp">{roleConfig[role].help}</p>
        </div>

        <div className="role-selector" role="radiogroup" aria-label="选择登录身份">
          {roleLabels.map((item) => {
            const isActive = item.role === role;
            return (
              <button
                aria-pressed={isActive}
                className={`role-option ${isActive ? "active" : ""}`}
                data-role={item.role}
                key={item.role}
                onClick={() => handleRoleChange(item.role)}
                type="button"
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </button>
            );
          })}
        </div>

        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <label className="field-group">
            <span>学校邮箱 / 学号</span>
            <input
              autoComplete="username"
              className={!account.trim() && message ? "invalid" : ""}
              id="account"
              name="account"
              onChange={(event) => setAccount(event.target.value)}
              placeholder="请输入学校邮箱或学号"
              type="text"
              value={account}
            />
          </label>
          <label className="field-group">
            <span>密码</span>
            <div className="password-field">
              <input
                autoComplete="current-password"
                className={!password.trim() && message ? "invalid" : ""}
                id="password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入密码"
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                data-toggle-password
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? "隐藏" : "显示"}
              </button>
            </div>
          </label>

          <div className="form-row">
            <label className="remember-row">
              <input type="checkbox" defaultChecked />
              <span>保持本机登录状态</span>
            </label>
            <a href="#support">忘记密码</a>
          </div>

          <p className="form-message" role="status" aria-live="polite">
            {message}
          </p>

          <button className="site-button large login-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "正在进入…" : roleConfig[role].submit}
          </button>
          <button className="sso-button" type="button">
            使用高校统一身份认证登录
          </button>
        </form>

        <div className="login-support" id="support">
          <strong>首次开课？</strong>
          <span>联系课程教师或学院管理员开通账号，学生账号通常随课程名单同步创建。</span>
        </div>
      </section>
    </main>
  );
}
