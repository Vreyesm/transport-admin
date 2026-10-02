import type { Vehicle } from "./types";

type PhotoOperations = {
  upload: (file: File) => Promise<string>;
  save: (vehicle: Vehicle) => Promise<void>;
  remove: (urls: string[]) => Promise<void>;
};

export async function persistPhotoDraft(
  vehicle: Vehicle,
  files: Map<string, File>,
  originalPhotos: string[],
  operations: PhotoOperations,
  active: () => boolean,
) {
  const uploaded: string[] = [];
  const photos: string[] = [];
  const assertActive = () => {
    if (!active())
      throw new Error(
        "La sesión cambió. Vuelve a iniciar sesión antes de guardar.",
      );
  };
  try {
    for (const url of vehicle.photos) {
      assertActive();
      const file = files.get(url);
      if (file) {
        const saved = await operations.upload(file);
        uploaded.push(saved);
        photos.push(saved);
      } else photos.push(url);
    }
    assertActive();
    await operations.save({ ...vehicle, photos });
  } catch (error) {
    try {
      await operations.remove(uploaded);
    } catch {
      throw new Error(
        "No se pudo guardar la ficha ni limpiar las fotos subidas. Revisa Storage antes de reintentar.",
      );
    }
    throw error;
  }
  try {
    await operations.remove(
      originalPhotos.filter((url) => !photos.includes(url)),
    );
  } catch {
    // A cleanup failure must not invite the user to repeat an already committed save.
    return "Cambios guardados. No se pudieron limpiar las fotos descartadas; reintenta la limpieza desde Storage.";
  }
}
