import TransportApp from "@/components/transport-app";
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  return (
    <TransportApp
      admin
      section={
        section?.[0] === "flota"
          ? "fleet"
          : section?.[0] === "configuracion"
            ? "settings"
            : section?.[0] === "auditoria"
              ? "audit"
              : "calendar"
      }
    />
  );
}
