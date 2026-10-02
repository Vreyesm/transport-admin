import { api } from "@/lib/api";
import { Occupation } from "@/lib/types";
export async function saveOccupation(value: Occupation) {
  await api("occupations", value);
}
