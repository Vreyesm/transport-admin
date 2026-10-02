import { supabase } from "@/lib/supabase";
export function validatePhoto(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("Usa JPG, PNG o WebP de hasta 5 MB.");
}
export async function uploadPhoto(file: File) {
  validatePhoto(file);
  if (!supabase)
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  const path = crypto.randomUUID() + "." + file.type.split("/")[1];
  const { error } = await supabase.storage
    .from("vehicle-photos")
    .upload(path, file);
  if (error) throw error;
  return supabase.storage.from("vehicle-photos").getPublicUrl(path).data
    .publicUrl;
}

export async function removePhotos(urls: string[]) {
  if (!supabase || !urls.length) return;
  const prefix = supabase.storage.from("vehicle-photos").getPublicUrl("")
    .data.publicUrl;
  const paths = urls
    .filter((url) => url.startsWith(prefix))
    .map((url) => url.slice(prefix.length));
  if (!paths.length) return;
  const { error } = await supabase.storage.from("vehicle-photos").remove(paths);
  if (error)
    throw new Error(
      "Los cambios se guardaron, pero no se pudieron limpiar las fotos descartadas. Reintenta la limpieza desde Storage.",
    );
}
