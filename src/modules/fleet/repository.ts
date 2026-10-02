import { supabase } from "@/lib/supabase";
import { Vehicle } from "@/lib/types";
import { demo, KEY } from "@/lib/demo-store";
import { nextVersion } from "@/lib/version";
import { removePhotos, uploadPhoto } from "./photos";
import { persistPhotoDraft } from "@/lib/photo-draft";
export async function saveVehicle(v: Vehicle) {
  if (!supabase) {
    const d = demo();
    const current = d.vehicles.find((x) => x.id === v.id);
    const version = nextVersion(v, current);
    if (
      v.archived &&
      !current?.archived &&
      d.occupations.some(
        (o) =>
          o.vehicle_id === v.id &&
          !o.cancelled &&
          Date.parse(o.ends_at) > Date.now(),
      )
    )
      throw new Error(
        "Cancela o reasigna las asignaciones pendientes antes de archivar el vehículo.",
      );
    if (
      d.vehicles.some(
        (x) =>
          x.id !== v.id &&
          x.plate.toUpperCase().replace(/[^A-Z0-9]/g, "") ===
            v.plate.toUpperCase().replace(/[^A-Z0-9]/g, ""),
      )
    )
      throw new Error("La patente ya está registrada.");
    d.vehicles = [
      ...d.vehicles.filter((x) => x.id !== v.id),
      { ...v, version },
    ];
    localStorage.setItem(KEY, JSON.stringify(d));
    return;
  }
  const { error } = await supabase.from("vehicles").upsert(v);
  if (error) throw error;
}

export async function saveVehicleDraft(
  v: Vehicle,
  files: Map<string, File>,
  originalPhotos: string[],
  active: () => boolean = () => true,
) {
  return persistPhotoDraft(
    v,
    files,
    originalPhotos,
    {
      upload: uploadPhoto,
      save: saveVehicle,
      remove: removePhotos,
    },
    active,
  );
}
