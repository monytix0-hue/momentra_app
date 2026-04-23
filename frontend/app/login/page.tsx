import { Suspense } from "react";
import { LoginForm } from "./login-form";

function LoginFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-pulse rounded-full border-2 border-gold/30 border-t-gold" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-m-4 py-m-8">
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
