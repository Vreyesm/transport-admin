import { api } from "./api";
import { Data } from "./types";
export async function loadData(admin: boolean): Promise<Data> {
  return api(`data${admin ? "?admin=1" : ""}`);
}
export { saveVehicle } from "@/modules/fleet/repository";
export { uploadPhoto } from "@/modules/fleet/photos";
export { saveOccupation } from "@/modules/planning/repository";
export { saveSettings } from "@/modules/settings/repository";
