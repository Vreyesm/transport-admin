export class AccessRevokedError extends Error {
  constructor() {
    super(
      "La sesión ya no tiene acceso administrativo. Ingresa nuevamente con una cuenta autorizada.",
    );
  }
}
