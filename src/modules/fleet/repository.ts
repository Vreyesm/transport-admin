import { supabase } from "@/lib/supabase";
import { Vehicle } from "@/lib/types";
import { demo, KEY } from "@/lib/demo-store";
export async function saveVehicle(v: Vehicle) {
  if (!supabase) {
    const d = demo();
    if (
      d.vehicles.some(
        (x) =>
          x.id !== v.id &&
          x.plate.replace(/[^A-Z0-9]/g, "") ===
            v.plate.replace(/[^A-Z0-9]/g, ""),
      )
    )
      throw new Error("La patente ya está registrada.");
    d.vehicles = [...d.vehicles.filter((x) => x.id !== v.id), v];
    localStorage.setItem(KEY, JSON.stringify(d));
    return;
  }
  const { error } = await supabase.from("vehicles").upsert(v);
  if (error) throw error;
}
