export class GameEvents {
  constructor() {
    this.listeners = new Map();
  }

  on(type, handler) {
    const handlers = this.listeners.get(type) || new Set();
    handlers.add(handler);
    this.listeners.set(type, handlers);
    return () => handlers.delete(handler);
  }

  emit(type, detail = {}) {
    const handlers = this.listeners.get(type);
    if (!handlers) return;
    handlers.forEach(handler => handler(detail));
  }
}
