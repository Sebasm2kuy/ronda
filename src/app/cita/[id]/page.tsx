import CitaClient from "@/components/cita/cita-client";

export default async function CitaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CitaClient roundId={id} />;
}
