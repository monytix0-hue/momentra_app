import { GroupDetailExperience } from "@/components/group/group-detail-experience";

export default async function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-m-4 py-m-6 pb-m-28 lg:px-m-8 lg:py-m-10">
        <GroupDetailExperience groupId={groupId} />
      </div>
    </div>
  );
}
