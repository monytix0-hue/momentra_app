import { PersonalShell } from "./personal-shell";

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  return <PersonalShell>{children}</PersonalShell>;
}
