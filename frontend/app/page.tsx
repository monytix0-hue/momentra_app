import { MainShell } from "@/components/layout/main-shell";
import { SplashGate } from "@/components/splash-gate";

export default function Home() {
  return (
    <SplashGate>
      <MainShell />
    </SplashGate>
  );
}
