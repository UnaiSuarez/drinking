import PasswordRecovery from "@/components/PasswordRecovery";

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <PasswordRecovery enlaceInvalido={error === "enlace"} />;
}
