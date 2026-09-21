class TrackingUint32MaxHeap {
  constructor(initialCapacity = 16) {
    this.capacity = initialCapacity;
    this.size = 0;
    this.heap = new Uint32Array(this.capacity);

    // Maps lineIndex -> current position in this.heap. Initialize with -1.
    // Assuming a max layout size, or grow dynamically. We'll start it large or match capacity.
    this.positionMap = new Int32Array(initialCapacity).fill(-1);
    
    this.ID_BITS = 20;
    this.ID_MASK = (1 << this.ID_BITS) - 1;

    /**
     * The id is not the lineIndex.
     * 
     * This is necessary because you then avoid that when an entire line is removed from the editor you would have to update many nodes in the heap to have their new line index.
     * Thus 'id is not the lineIndex'.
     * That being said 'id' does act as an index into 'this.positionMap'.
     * 
     * Long term as you remove entire lines of text from the editor you'll be creating holes in 'this.positionMap' where an
     * array entry exists but is never in use because if the entire creates
     * a line at lineIndex 0 for the first time it happens to align.
     * But the second time and everytime after that, it stops aligning.
     * 
     * So you have to figure out a timing to go through the 'this.positionMap' and periodically clear out all the holes,
     * and when doing this you'd then have to update the heap as well, but instead of per edit of a whole line
     * you're doing it per "whenever you decide to remove the holes".
     */
    this.nextId = 0;

    this.unpack_pool_id = 0;
    this.unpack_pool_length = 0;
  }

  pack(id, length) {
    return (length << this.ID_BITS) | (id & this.ID_MASK);
  }

  /** Result is stored in the fields: 'this.unpack_pool_id' and 'this.unpack_pool_length' */
  unpack(entry) {
    this.unpack_pool_length = entry >>> this.ID_BITS;
    this.unpack_pool_id = entry & this.ID_MASK;
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
    const oldLength = oldEntry >>> this.ID_BITS;
    
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
  
  /**
   * @param {*} diff positive or negative to reflect length change
   */
  updateLength_diff(lineId, diffLength) {
    // 1. Look up where this line index currently lives in the heap array
    if (lineId >= this.positionMap.length) return; // or resize positionMap
    const heapIndex = this.positionMap[lineId];
    
    // If it's not currently in the heap, just insert it normally
    if (heapIndex === -1) {
      // TODO: ERROR: cannot access newLength before initialization...
      // ...using 'diffLength' fixes the error, and from some perspectives actually seems sensible.
      // But this is probably extremely bad because you have to track the line index -> heap id and vice versa
      // so the idea that you ever accidentally update something that doesn't exist sounds catastrophically bad
      // because it implies you're failing to track the previously mentioned mappings.
      this.insert(lineId, diffLength);
      return;
    }

    // 2. Get the old packed entry to compare lengths
    const oldEntry = this.heap[heapIndex];
    const oldLength = oldEntry >>> this.ID_BITS;
    const newLength = oldLength + diffLength;
    
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

  /** TODO: Eventual "garbage collection / defragmentation" of the 'this._resizePositionMap' and 'this.nextId' for the no longer in use 'this.nextId'(s) */
  insert(lineId, lineLength) {
    if (this.size >= this.capacity) this._resize();
    
    // Grow position tracking map if necessary
    if (lineId >= this.positionMap.length) {
      this._resizePositionMap(lineId * 2);
    }

    // Pre-calculated bit limits based on your 20/12 bit layout
    const MAX_LINE_INDEX = 1048575; // (2 ** 20) - 1
    const MAX_LINE_LENGTH = 4095;   // (2 ** 12) - 1
    if (lineId > MAX_LINE_INDEX) {
      throw new RangeError(`Line index (${lineId}) exceeds the 20-bit limit (${MAX_LINE_INDEX}).`);
    }
    if (lineLength > MAX_LINE_LENGTH) {
      throw new RangeError(`Line length (${lineLength}) exceeds the 12-bit limit (${MAX_LINE_LENGTH}).`);
    }

    this.heap[this.size] = this.pack(lineId, lineLength);
    this.positionMap[lineId] = this.size; // Track initial placement
    
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

      /*
       > It's this line of '_bubbleUp' that says 'if (entry <= parentEntry) break;'.
       > A comparison on the entry (which is packed) would fail to do a "then by" comparison.
       > I think you'd have to explicitly unpack both values from the entry and compare them one at a time.

       < The Faster Fix: Swap Your Bit Packing Layout
       <
       < Instead of unpacking elements on every single heap movement (which slows things down), you can simply swap where the bits live:
       < Upper 20 bits: Line Length (Sorted first!)
       < Lower 12 bits: Line ID
       <
       < Because the most significant bits dictate the size of the whole 32-bit integer,
       < a raw comparison like entryA > entryB will now naturally sort by length first.
       < If two lengths are identical, it will cleanly break ties using the ID in the lower bits.
       < 
       < ...
      */
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
    // 10 times
    //console.log('_resize');
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
