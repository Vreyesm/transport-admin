export type PendingExit = {
  message: string;
  action: () => void;
  discard: boolean;
};
export class UnsavedChanges {
  private active = false;
  private dirty = false;
  pending: PendingExit | null = null;
  authorize(active: boolean) {
    this.active = active;
    if (!active) this.clear();
  }
  mark() {
    if (this.active) this.dirty = true;
  }
  isDirty() {
    return this.active && this.dirty;
  }
  clear() {
    this.dirty = false;
    this.pending = null;
  }
  request(action: () => void, message?: string) {
    if (!this.active || (!this.dirty && !message)) {
      action();
      return;
    }
    if (!this.pending)
      this.pending = {
        action,
        discard: !message,
        message: message || "Hay cambios sin guardar. ¿Descartarlos y salir?",
      };
  }
  reject() {
    this.pending = null;
  }
  accept() {
    const action = this.pending?.action;
    // A confirmed mutation can fail: retain dirtiness until persistence succeeds.
    if (this.pending?.discard) this.clear();
    else this.reject();
    if (this.active) action?.();
  }
}
