import { supabase } from "@/lib/supabase";
export async function uploadPhoto(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("Usa JPG, PNG o WebP de hasta 5 MB.");
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
