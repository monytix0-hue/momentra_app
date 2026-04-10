import { GroupDetailLayout } from "@/components/group/group-detail-layout";

export const runtime = "edge";

export default async function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-m-4 py-m-8 pb-m-16 lg:px-m-8 lg:py-m-10">
        <GroupDetailLayout groupId={groupId} />
      </div>
    </div>
  );
}
