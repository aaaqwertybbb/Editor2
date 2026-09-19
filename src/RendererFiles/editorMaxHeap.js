export class TrackingUint32MaxHeap {
  constructor(initialCapacity = 16) {
    this.capacity = initialCapacity;
    this.size = 0;
    this.heap = new Uint32Array(this.capacity);

    // Maps lineIndex -> current position in this.heap. Initialize with -1.
    // Assuming a max layout size, or grow dynamically. We'll start it large or match capacity.
    this.positionMap = new Int32Array(initialCapacity).fill(-1);
    
    this.LENGTH_BITS = 12;
    this.LENGTH_MASK = (1 << this.LENGTH_BITS) - 1;

    this.nextId = 0;
    this.unpack_pool_id = 0;
    this.unpack_pool_length = 0;
  }

  pack(id, length) {
    return (id << this.LENGTH_BITS) | (length & this.LENGTH_MASK);
  }

  /** Result is stored in the fields: 'this.unpack_pool_index' and 'this.unpack_pool_length' */
  unpack(entry) {
    this.unpack_pool_id = entry >>> this.LENGTH_BITS;
    this.unpack_pool_length = entry & this.LENGTH_MASK;
  }

  peek() {
    return this.size > 0 ? this.heap[0] : null;
  }

  // --- The Core Update Method ---
  updateLength(lineId, newLength) {
    // 1. Look up where this line index currently lives in the heap array
    if (lineId >= this.positionMap.length) return; // or resize positionMap
    const heapIndex = this.positionMap[lineId];
    
    // If it's not currently in the heap, just insert it normally
    if (heapIndex === -1) {
      this.insert(lineId, newLength);
      return;
    }

    // 2. Get the old packed entry to compare lengths
    const oldEntry = this.heap[heapIndex];
    const oldLength = oldEntry & this.LENGTH_MASK;
    
    // 3. Overwrite the element with the new packed entry
    const newEntry = this.pack(lineId, newLength);
    this.heap[heapIndex] = newEntry;

    // 4. Restore the Max-Heap property
    if (newLength > oldLength) {
      // If it grew longer, it might need to bubble up toward the top
      this._bubbleUp(heapIndex);
    } else if (newLength < oldLength) {
      // If it grew shorter, it might need to sink down toward the leaves
      this._sinkDown(heapIndex);
    }
  }

  insert(lineIndex, lineLength) {
    if (this.size >= this.capacity) this._resize();
    
    // Grow position tracking map if necessary
    if (lineIndex >= this.positionMap.length) {
      this._resizePositionMap(lineIndex * 2);
    }

    // Pre-calculated bit limits based on your 20/12 bit layout
    const MAX_LINE_INDEX = 1048575; // (2 ** 20) - 1
    const MAX_LINE_LENGTH = 4095;   // (2 ** 12) - 1
    if (lineIndex > MAX_LINE_INDEX) {
      throw new RangeError(`Line index (${lineIndex}) exceeds the 20-bit limit (${MAX_LINE_INDEX}).`);
    }
    if (lineLength > MAX_LINE_LENGTH) {
      throw new RangeError(`Line length (${lineLength}) exceeds the 12-bit limit (${MAX_LINE_LENGTH}).`);
    }

    this.heap[this.size] = this.pack(lineIndex, lineLength);
    this.positionMap[lineIndex] = this.size; // Track initial placement
    
    this._bubbleUp(this.size);
    this.size++;
  }

  extractMax() {
    if (this.size === 0) return null;

    const maxEntry = this.heap[0];
    this.unpack(maxEntry);
    const maxIndex = this.unpack_pool_id;

    this.positionMap[maxIndex] = -1; // Removed

    if (this.size > 1) {
      const lastEntry = this.heap[this.size - 1];
      this.unpack(lastEntry);
      const lastIndex = this.unpack_pool_id;
      
      this.heap[0] = lastEntry;
      this.positionMap[lastIndex] = 0; // Updated track
      
      this.size--;
      this._sinkDown(0);
    } else {
      this.size--;
    }

    return maxEntry;
  }

  _bubbleUp(index) {
    const entry = this.heap[index];
    this.unpack(entry);
    const lineIndex = this.unpack_pool_id;

    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      const parentEntry = this.heap[parentIndex];

      if (entry <= parentEntry) break;

      // Swap entry and update its position tracking
      this.heap[index] = parentEntry;
      this.unpack(parentEntry);
      const parentLineIndex = this.unpack_pool_id;
      this.positionMap[parentLineIndex] = index;

      index = parentIndex;
    }
    
    this.heap[index] = entry;
    this.positionMap[lineIndex] = index;
  }

  _sinkDown(index) {
    const entry = this.heap[index];
    this.unpack(entry);
    const lineIndex = this.unpack_pool_id;
    const halfSize = this.size >> 1;

    while (index < halfSize) {
      let leftChildIndex = (index << 1) + 1;
      let rightChildIndex = leftChildIndex + 1;
      let largestChildIndex = leftChildIndex;

      if (rightChildIndex < this.size && this.heap[rightChildIndex] > this.heap[leftChildIndex]) {
        largestChildIndex = rightChildIndex;
      }

      if (entry >= this.heap[largestChildIndex]) break;

      // Swap entry and update its position tracking
      const childEntry = this.heap[largestChildIndex];
      this.heap[index] = childEntry;
      this.unpack(childEntry);
      const childLineIndex = this.unpack_pool_id;
      this.positionMap[childLineIndex] = index;

      index = largestChildIndex;
    }

    this.heap[index] = entry;
    this.positionMap[lineIndex] = index;
  }

  _resize() {
    this.capacity *= 2;
    const nextHeap = new Uint32Array(this.capacity);
    nextHeap.set(this.heap);
    this.heap = nextHeap;
  }

  _resizePositionMap(newMinSize) {
    const nextMap = new Int32Array(Math.max(this.positionMap.length * 2, newMinSize)).fill(-1);
    nextMap.set(this.positionMap);
    this.positionMap = nextMap;
  }
}
