import { GroupCreationWizard } from "@/components/group/group-creation-wizard";

export default function GroupNewPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-m-4 py-m-8 pb-m-16 lg:px-m-8 lg:py-m-10">
        <div
          className="mb-m-8 h-px w-20 opacity-60 lg:mb-m-10 lg:w-28"
          style={{
            background: "linear-gradient(90deg, transparent, var(--ctx-accent), transparent)",
          }}
        />
        <GroupCreationWizard />
      </div>
    </div>
  );
}
