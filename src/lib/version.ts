export function nextVersion(
  submitted: { version?: number },
  current?: { version?: number },
) {
  if (current && (submitted.version ?? 1) !== (current.version ?? 1))
    throw new Error(
      "Otro administrador modificó este registro. Cierra la ficha y vuelve a abrirla antes de guardar.",
    );
  return current ? (current.version ?? 1) + 1 : 1;
}
