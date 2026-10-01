import { supabase } from "@/lib/supabase";
import { Settings } from "@/lib/types";
import { demo, KEY } from "@/lib/demo-store";
export async function saveSettings(s: Settings) {
  if (!supabase) {
    const d = demo();
    d.settings = s;
    localStorage.setItem(KEY, JSON.stringify(d));
    return;
  }
  const { error } = await supabase.from("settings").update(s).eq("id", 1);
  if (error) throw error;
}
