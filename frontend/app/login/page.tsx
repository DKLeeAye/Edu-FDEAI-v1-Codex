import { Suspense } from "react";

import { LoginPortal } from "@/src/components/vnext-public/login-portal";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPortal />
    </Suspense>
  );
}
