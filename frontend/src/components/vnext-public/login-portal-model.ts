export type LoginRole = "student" | "teacher" | "admin";

export const demoPassword = "EduFDE-demo-123";

export const roleConfig: Record<
  LoginRole,
  {
    email: string;
    help: string;
    submit: string;
  }
> = {
  student: {
    email: "student@edufde.demo",
    help: "选择学生身份后，登录将进入实验区与五阶段实训任务。",
    submit: "进入学生实验区",
  },
  teacher: {
    email: "teacher@edufde.demo",
    help: "选择教师身份后，登录将进入课程运行、班级监控与 AI 评审工作台。",
    submit: "进入教师工作台",
  },
  admin: {
    email: "admin@edufde.demo",
    help: "选择管理员身份后，登录将进入租户、账号、部署与审计管理。",
    submit: "进入管理控制台",
  },
};

export function parseLoginRole(role: string | null): LoginRole {
  return role === "teacher" || role === "admin" || role === "student" ? role : "student";
}

export function shouldUseDemoCredentials(demo: string | null): boolean {
  return demo === "1" || demo === "true";
}

export function createInitialLoginFormState({
  demo,
  role,
}: {
  demo: string | null;
  role: string | null;
}): {
  account: string;
  password: string;
  role: LoginRole;
} {
  const parsedRole = parseLoginRole(role);
  if (shouldUseDemoCredentials(demo)) {
    return {
      account: roleConfig[parsedRole].email,
      password: demoPassword,
      role: parsedRole,
    };
  }
  return {
    account: "",
    password: "",
    role: parsedRole,
  };
}

