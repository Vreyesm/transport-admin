import { supabase } from "@/lib/supabase";
import { Occupation } from "@/lib/types";
import { demo, KEY } from "@/lib/demo-store";
import { overlaps } from "@/lib/time";
import { nextVersion } from "@/lib/version";
export async function saveOccupation(o: Occupation) {
  if (!supabase) {
    const d = demo();
    const version = nextVersion(
      o,
      d.occupations.find((x) => x.id === o.id),
    );
    if (!o.cancelled) {
      if (d.vehicles.find((v) => v.id === o.vehicle_id)?.archived)
        throw new Error("El vehículo está archivado.");
      if (
        d.occupations.some(
          (x) =>
            x.id !== o.id &&
            !x.cancelled &&
            x.vehicle_id === o.vehicle_id &&
            overlaps(x, o),
        )
      )
        throw new Error("El vehículo ya está ocupado en ese horario.");
    }
    d.occupations = [
      ...d.occupations.filter((x) => x.id !== o.id),
      { ...o, version },
    ];
    localStorage.setItem(KEY, JSON.stringify(d));
    return;
  }
  const { error } = await supabase.from("occupations").upsert(o);
  if (error) {
    if (error.code === "23P01")
      throw new Error("El vehículo ya está ocupado en ese horario.");
    throw error;
  }
}
