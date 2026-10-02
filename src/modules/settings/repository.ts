import { supabase } from "@/lib/supabase";
import { Settings } from "@/lib/types";
import { demo, KEY } from "@/lib/demo-store";
import { nextVersion } from "@/lib/version";
export async function saveSettings(s: Settings) {
  if (!supabase) {
    const d = demo();
    d.settings = { ...s, version: nextVersion(s, d.settings) };
    localStorage.setItem(KEY, JSON.stringify(d));
    return;
  }
  const { error } = await supabase.from("settings").update(s).eq("id", 1);
  if (error) throw error;
}
