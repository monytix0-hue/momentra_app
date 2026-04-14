import { BusinessShell } from "@/app/business/business-shell";

export default function WorkspaceBusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <BusinessShell>
      <div className="space-y-m-4">{children}</div>
    </BusinessShell>
  );
}
