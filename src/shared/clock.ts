import { format } from './format';

export class Clock {
  constructor(private start = Date.now()) {}

  set() {
    this.start = Date.now();
  }

  check() {
    const now = Date.now();
    const diff = now - this.start;

    this.start = now;

    return format(diff);
  }
}