import { HomeGateway } from "@/components/home/home-gateway";
import { SplashGate } from "@/components/splash-gate";

export default function Home() {
  return (
    <SplashGate>
      <HomeGateway />
    </SplashGate>
  );
}
