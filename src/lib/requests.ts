// Separate scope changes (login/logout/unmount) from request ordering.
export class RequestScope {
  private scope = 0;
  private request = 0;
  invalidate() {
    this.scope++;
    this.request++;
  }
  capture() {
    const scope = this.scope;
    return () => scope === this.scope;
  }
  begin() {
    const scope = this.scope,
      request = ++this.request;
    return {
      sameScope: () => scope === this.scope,
      current: () => scope === this.scope && request === this.request,
    };
  }
}
