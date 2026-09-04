// # Pools
//
// Logline: Contrail ring and entity pools.
//
class ContrailRingBufferF32 {
  constructor(capacity = 64, stride = 4) {
    this.capacity = capacity;
    this.stride = stride;
    this.buffer = new Float32Array(capacity * stride);
    this.head = 0;
    this.count = 0;
  }

  push(x, y, alpha, extra = 0) {
    const offset = this.head * this.stride;
    this.buffer[offset] = x;
    this.buffer[offset + 1] = y;
    this.buffer[offset + 2] = alpha;
    if (this.stride > 3) {
      this.buffer[offset + 3] = extra;
    }
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  forEach(callback) {
    if (this.count === 0) return;
    const start = (this.head - this.count + this.capacity) % this.capacity;
    for (let i = 0; i < this.count; i++) {
      const idx = (start + i) % this.capacity;
      const offset = idx * this.stride;
      callback(
        this.buffer[offset],
        this.buffer[offset + 1],
        this.buffer[offset + 2],
        this.stride > 3 ? this.buffer[offset + 3] : 0,
        i,
        idx
      );
    }
  }

  clear() {
    this.head = 0;
    this.count = 0;
  }
}

class StaticEntityPoolF32 {
  constructor(maxEntities = 128, stride = 8) {
    this.maxEntities = maxEntities;
    this.stride = stride;
    this.buffer = new Float32Array(maxEntities * stride);
    this.activeCount = 0;
  }

  alloc() {
    if (this.activeCount >= this.maxEntities) {
      return -1;
    }
    const index = this.activeCount;
    this.activeCount++;
    return index;
  }

  free(index) {
    if (index < 0 || index >= this.activeCount) return false;
    const last = this.activeCount - 1;
    if (index !== last) {
      const targetOffset = index * this.stride;
      const lastOffset = last * this.stride;
      for (let s = 0; s < this.stride; s++) {
        this.buffer[targetOffset + s] = this.buffer[lastOffset + s];
      }
    }
    this.activeCount--;
    return true;
  }

  clear() {
    this.activeCount = 0;
  }
}

class VfxParticlePool extends StaticEntityPoolF32 {
  constructor(maxEntities = 512, stride = 8) {
    super(maxEntities, stride);
  }
}

class WreckagePool extends StaticEntityPoolF32 {
  constructor(maxEntities = 32, stride = 10) {
    super(maxEntities, stride);
  }
}
