import { SHAPES } from "./shapes.js";

export class SevenBag {
  constructor() {
    this.queue = [];
    this.refill();
  }

  take() {
    if (!this.queue.length) this.refill();
    return this.queue.shift();
  }

  peek(count) {
    while (this.queue.length < count) {
      this.refill();
    }
    return this.queue.slice(0, count);
  }

  refill() {
    const bag = Object.keys(SHAPES);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    this.queue.push(...bag);
  }
}
