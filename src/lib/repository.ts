import { supabase } from "./supabase";
import { Data, Settings, Vehicle, Occupation } from "./types";
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
  const results = await Promise.all([
    supabase.from("vehicles").select("*"),
    supabase.from("occupations").select("*"),
    supabase.from("settings").select("name,color,logo,version").single(),
  ]);
  for (const r of results) if (r.error) throw r.error;
  return {
    vehicles: results[0].data as Vehicle[],
    occupations: results[1].data as Occupation[],
    settings: results[2].data as Settings,
  };
}
import { demo } from "./demo-store";
export { saveVehicle } from "@/modules/fleet/repository";
export { uploadPhoto } from "@/modules/fleet/photos";
export { saveOccupation } from "@/modules/planning/repository";
export { saveSettings } from "@/modules/settings/repository";
