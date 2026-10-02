import { Data } from "./types";
import { demoData } from "./demo";
export const KEY = "transport-demo-v1";
export function demo() {
  const value = localStorage.getItem(KEY);
  return value ? (JSON.parse(value) as Data) : demoData();
}
