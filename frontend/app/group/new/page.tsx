import { GroupCreationStepper } from "@/components/group/GroupCreationStepper";

export default function GroupNewPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-m-4 py-m-8 pb-m-28 lg:px-m-8 lg:py-m-12">
        <div
          className="mb-m-10 h-px w-16 opacity-70 lg:mb-m-12 lg:w-24"
          style={{
            background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--ctx-accent) 65%, transparent), transparent)",
          }}
          aria-hidden
        />
        <GroupCreationStepper />
      </div>
    </div>
  );
}
