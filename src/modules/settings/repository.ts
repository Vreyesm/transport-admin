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
  // RLS can hide the row and return a successful response with zero updates.
  // Require the updated row before reporting that the draft was saved.
  const { error } = await supabase
    .from("settings")
    .update(s)
    .eq("id", 1)
    .select("id")
    .single();
  if (error) throw error;
}
