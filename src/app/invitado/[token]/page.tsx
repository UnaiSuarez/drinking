import InvitadoClient from "@/components/InvitadoClient";

export default async function InvitadoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InvitadoClient token={token} />;
}
