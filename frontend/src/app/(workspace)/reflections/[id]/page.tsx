import { ReflectionWorkspace } from "./ReflectionWorkspace";

export default async function ReflectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReflectionWorkspace id={id} />;
}
