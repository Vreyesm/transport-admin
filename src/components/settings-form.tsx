"use client";
import { useState } from "react";
import { Settings } from "@/lib/types";
import { Button } from "./ui/button";

export function SettingsForm({
  initial,
  busy,
  save,
  changed,
}: {
  initial: Settings;
  busy: boolean;
  changed: () => void;
  save: (settings: Settings) => void;
}) {
  // Keep the version paired with the actual values shown in this editor.
  const [snapshot] = useState(initial);
  return (
    <form
      onInput={changed}
      onChange={changed}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save({
          ...snapshot,
          name: String(f.get("name")),
          color: String(f.get("color")),
          logo: String(f.get("logo")),
        });
      }}
    >
      <fieldset disabled={busy}>
        <label>
          Nombre de la municipalidad
          <input name="name" defaultValue={snapshot.name} required />
        </label>
        <label>
          Color principal
          <input name="color" type="color" defaultValue={snapshot.color} />
        </label>
        <label>
          URL del logo (HTTPS)
          <input name="logo" type="url" defaultValue={snapshot.logo} />
        </label>
      </fieldset>
      <Button disabled={busy}>Guardar configuración</Button>
    </form>
  );
}
