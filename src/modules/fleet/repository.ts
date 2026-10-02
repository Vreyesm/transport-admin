import { api } from "@/lib/api";
import { Vehicle } from "@/lib/types";
import { removePhotos, uploadPhoto } from "./photos";
import { persistPhotoDraft } from "@/lib/photo-draft";
export async function saveVehicle(v: Vehicle) {
  await api("vehicles", v);
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
