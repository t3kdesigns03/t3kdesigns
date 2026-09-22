import * as THREE from "three";

/**
 * Every small glowing thing in the traffic layer — engine trails, nav
 * lights, dock-ring lights, satellite beacons, visor glints — writes into
 * one dynamic buffer and draws in a single call. Owners reserve a slot
 * range once and write into it per frame; nothing allocates after mount.
 */
export class PointPool {
  readonly capacity: number;
  readonly position: Float32Array;
  readonly color: Float32Array;
  readonly size: Float32Array;
  readonly bright: Float32Array;
  readonly seed: Float32Array;

  geometry: THREE.BufferGeometry | null = null;
  private cursor = 0;
  private named = new Map<string, number>();

  constructor(capacity: number) {
    this.capacity = capacity;
    this.position = new Float32Array(capacity * 3);
    this.color = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.bright = new Float32Array(capacity);
    this.seed = new Float32Array(capacity);
    for (let i = 0; i < capacity; i++) this.seed[i] = Math.random();
  }

  /** Reserve `n` contiguous slots. Returns the base index, or -1 if full. */
  alloc(n: number): number {
    if (this.cursor + n > this.capacity) return -1;
    const base = this.cursor;
    this.cursor += n;
    return base;
  }

  /**
   * Idempotent reservation. Strict mode renders components twice, and a
   * plain alloc would hand out two ranges and silently halve the pool.
   */
  allocNamed(key: string, n: number): number {
    const seen = this.named.get(key);
    if (seen !== undefined) return seen;
    const base = this.alloc(n);
    this.named.set(key, base);
    return base;
  }

  set(
    i: number,
    x: number,
    y: number,
    z: number,
    r: number,
    g: number,
    b: number,
    size: number,
    bright: number,
  ) {
    const p = i * 3;
    this.position[p] = x;
    this.position[p + 1] = y;
    this.position[p + 2] = z;
    this.color[p] = r;
    this.color[p + 1] = g;
    this.color[p + 2] = b;
    this.size[i] = size;
    this.bright[i] = bright;
  }

  /** Brightness 0 is discarded in the fragment shader — cheaper than moving it. */
  hide(i: number) {
    this.bright[i] = 0;
  }

  hideRange(base: number, n: number) {
    for (let i = base; i < base + n; i++) this.bright[i] = 0;
  }

  flush() {
    const g = this.geometry;
    if (!g) return;
    (g.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute("aColor") as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute("aSize") as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute("aBright") as THREE.BufferAttribute).needsUpdate = true;
  }
}
