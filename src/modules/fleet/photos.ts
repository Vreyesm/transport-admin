import { api } from "@/lib/api";
export function validatePhoto(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("Usa JPG, PNG o WebP de hasta 5 MB.");
}
export async function uploadPhoto(file: File) {
  validatePhoto(file);
  const response = await fetch("/api/photos", {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result.url as string;
}
export async function removePhotos(urls: string[]) {
  if (urls.length) await api("photos", { urls }, "DELETE");
}
