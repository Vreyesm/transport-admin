import { AccessRevokedError } from "./access";
export const configured = true;
export async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : method,
    cache: "no-store",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) throw new AccessRevokedError();
    throw new Error(data.error || "No se pudo completar la solicitud.");
  }
  return data;
}
export async function signOut() {
  try {
    await api("session", {}, "DELETE");
    return { error: null };
  } catch (error) {
    return { error };
  }
}
export async function signInWithPassword(credentials: {
  email: string;
  password: string;
}) {
  try {
    await api("session", credentials);
    window.dispatchEvent(new Event("transport-session"));
    return { error: null };
  } catch (error) {
    return { error };
  }
}
