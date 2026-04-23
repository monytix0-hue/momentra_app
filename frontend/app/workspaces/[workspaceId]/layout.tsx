export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-m-4 py-m-6 pb-m-28 lg:px-m-8 lg:py-m-10 lg:pb-m-12">{children}</div>
    </div>
  );
}
