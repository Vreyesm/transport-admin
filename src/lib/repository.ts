import { supabase } from "./supabase";
import { Data, Settings, Vehicle, Occupation } from "./types";
import { AccessRevokedError } from "./access";
export async function loadData(admin: boolean): Promise<Data> {
  if (!supabase) {
    const data = demo();
    return admin
      ? data
      : {
          ...data,
          vehicles: data.vehicles
            .filter((v) => !v.archived)
            .map(({ notes, ...v }) => {
              void notes;
              return v;
            }),
          occupations: data.occupations
            .filter((o) => !o.cancelled)
            .map((o) => ({
              id: o.id,
              vehicle_id: o.vehicle_id,
              kind: o.kind,
              starts_at: o.starts_at,
              ends_at: o.ends_at,
              cancelled: false,
            })),
        };
  }
  if (!admin) {
    const { data, error } = await supabase.rpc("public_transport_data");
    if (error) throw error;
    return data;
  }
  const session = await supabase.auth.getUser();
  if (!session.data.user) throw new AccessRevokedError();
  const profile = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("id", session.data.user.id)
    .maybeSingle();
  if (profile.error) throw profile.error;
  if (!profile.data) throw new AccessRevokedError();
  const results = await Promise.all([
    supabase.from("vehicles").select("*"),
    supabase.from("occupations").select("*"),
    // Selecting existing columns also permits read-only access before migration.
    supabase.from("settings").select("*").single(),
  ]);
  for (const r of results) if (r.error) throw r.error;
  const vehicles = results[0].data as Vehicle[];
  const occupations = results[1].data as Occupation[];
  const settings = results[2].data as Settings;
  return {
    requiresMigration:
      typeof settings.version !== "number" ||
      vehicles.some((v) => typeof v.version !== "number") ||
      occupations.some((o) => typeof o.version !== "number"),
    vehicles,
    occupations,
    settings,
  };
}
import { demo } from "./demo-store";
export { saveVehicle } from "@/modules/fleet/repository";
export { uploadPhoto } from "@/modules/fleet/photos";
export { saveOccupation } from "@/modules/planning/repository";
export { saveSettings } from "@/modules/settings/repository";
