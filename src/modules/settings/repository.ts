import { api } from "@/lib/api";
import { Settings } from "@/lib/types";
export async function saveSettings(value: Settings) {
  await api("settings", value);
}
