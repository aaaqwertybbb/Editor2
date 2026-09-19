class TrackingUint32MaxHeap {
  constructor(initialCapacity = 16) {
    this.capacity = initialCapacity;
    this.size = 0;
    this.heap = new Uint32Array(this.capacity);

    // Maps lineIndex -> current position in this.heap. Initialize with -1.
    // Assuming a max layout size, or grow dynamically. We'll start it large or match capacity.
    this.positionMap = new Int32Array(initialCapacity).fill(-1);
    
    this.LENGTH_BITS = 12;
    this.LENGTH_MASK = (1 << this.LENGTH_BITS) - 1;
  }

  pack(index, length) {
    return (index << this.LENGTH_BITS) | (length & this.LENGTH_MASK);
  }

  unpack(entry) {
    return {
      index: entry >>> this.LENGTH_BITS,
      length: entry & this.LENGTH_MASK
    };
  }

  peek() {
    return this.size > 0 ? this.heap[0] : null;
  }

  // --- The Core Update Method ---
  updateLength(lineIndex, newLength) {
    // 1. Look up where this line index currently lives in the heap array
    if (lineIndex >= this.positionMap.length) return; // or resize positionMap
    const heapIndex = this.positionMap[lineIndex];
    
    // If it's not currently in the heap, just insert it normally
    if (heapIndex === -1) {
      this.insert(this.pack(lineIndex, newLength));
      return;
    }

    // 2. Get the old packed entry to compare lengths
    const oldEntry = this.heap[heapIndex];
    const oldLength = oldEntry & this.LENGTH_MASK;
    
    // 3. Overwrite the element with the new packed entry
    const newEntry = this.pack(lineIndex, newLength);
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

  insert(entry) {
    if (this.size >= this.capacity) this._resize();

    const { index } = this.unpack(entry);
    
    // Grow position tracking map if necessary
    if (index >= this.positionMap.length) {
      this._resizePositionMap(index * 2);
    }

    this.heap[this.size] = entry;
    this.positionMap[index] = this.size; // Track initial placement
    
    this._bubbleUp(this.size);
    this.size++;
  }

  extractMax() {
    if (this.size === 0) return null;

    const maxEntry = this.heap[0];
    const { index: maxIndex } = this.unpack(maxEntry);
    this.positionMap[maxIndex] = -1; // Removed

    if (this.size > 1) {
      const lastEntry = this.heap[this.size - 1];
      const { index: lastIndex } = this.unpack(lastEntry);
      
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
    const { index: lineIndex } = this.unpack(entry);

    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      const parentEntry = this.heap[parentIndex];

      if (entry <= parentEntry) break;

      // Swap entry and update its position tracking
      this.heap[index] = parentEntry;
      const { index: parentLineIndex } = this.unpack(parentEntry);
      this.positionMap[parentLineIndex] = index;

      index = parentIndex;
    }
    
    this.heap[index] = entry;
    this.positionMap[lineIndex] = index;
  }

  _sinkDown(index) {
    const entry = this.heap[index];
    const { index: lineIndex } = this.unpack(entry);
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
      const { index: childLineIndex } = this.unpack(childEntry);
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

const maxHeap = new TrackingUint32MaxHeap();

maxHeap.insert(maxHeap.pack(0, 0));
maxHeap.insert(maxHeap.pack(1, 1));
maxHeap.insert(maxHeap.pack(2, 2));
maxHeap.insert(maxHeap.pack(3, 3));

consoleLogMaxHeapEntry(maxHeap.peek());
consoleLogMaxHeapEntry(maxHeap.extractMax());
consoleLogMaxHeapEntry(maxHeap.extractMax());

function consoleLogMaxHeapEntry(entry) {
    const unpackedObject = maxHeap.unpack(entry);
    console.log(`(${unpackedObject.index}, ${unpackedObject.length})`);
}





/*
> javascript max heap implementation as uint array

< Here is a complete, optimized JavaScript Max Heap implementation using a Uint32Array (Unsigned 32-bit Integer Typed Array).
< Using a typed array provides significantly better memory layout, lower garbage collection overhead, and better performance for large integer datasets compared to a standard JavaScript array.
<
```js
class Uint32MaxHeap {
  //
  // @param {number} initialCapacity - The starting capacity of the internal typed array.
  //
  constructor(initialCapacity = 16) {
    this.capacity = initialCapacity;
    this.size = 0;
    this.heap = new Uint32Array(this.capacity);
  }

  //
  // Returns the maximum value without removing it.
  // @returns {number|null}
  //
  peek() {
    return this.size > 0 ? this.heap[0] : null;
  }

  //
  // Inserts a new unsigned integer value into the heap.
  // @param {number} value 
  //
  insert(value) {
    // Ensure the value fits the unsigned 32-bit boundary
    if (value < 0 || value > 4294967295) {
      throw new RangeError("Value must be a valid 32-bit unsigned integer.");
    }

    if (this.size >= this.capacity) {
      this._resize();
    }

    // Place value at the end of the heap and bubble up
    this.heap[this.size] = value;
    this._bubbleUp(this.size);
    this.size++;
  }

  //
  // Removes and returns the maximum value from the heap.
  // @returns {number|null}
  //
  extractMax() {
    if (this.size === 0) return null;

    const max = this.heap[0];
    const lastValue = this.heap[this.size - 1];
    
    if (this.size > 1) {
      this.heap[0] = lastValue;
      this._sinkDown(0);
    }
    
    this.size--;
    return max;
  }

  //
  // Doubles the capacity of the internal typed array when full.
  //
  _resize() {
    this.capacity *= 2;
    const nextHeap = new Uint32Array(this.capacity);
    nextHeap.set(this.heap);
    this.heap = nextHeap;
  }

  //
  // Bubbles up the node at the given index to restore max-heap property.
  //
  _bubbleUp(index) {
    const value = this.heap[index];

    while (index > 0) {
      const parentIndex = (index - 1) >> 1; // Faster Math.floor((index - 1) / 2)
      const parentValue = this.heap[parentIndex];

      if (value <= parentValue) break;

      // Swap
      this.heap[index] = parentValue;
      index = parentIndex;
    }
    
    this.heap[index] = value;
  }

  //
  // Sinks down the node at the given index to restore max-heap property.
  //
  _sinkDown(index) {
    const value = this.heap[index];
    const halfSize = this.size >> 1; // Indices past this have no children

    while (index < halfSize) {
      let leftChildIndex = (index << 1) + 1;
      let rightChildIndex = leftChildIndex + 1;
      let largestChildIndex = leftChildIndex;

      // Check if right child exists and is larger than left child
      if (rightChildIndex < this.size && this.heap[rightChildIndex] > this.heap[leftChildIndex]) {
        largestChildIndex = rightChildIndex;
      }

      // If the parent is already larger than the largest child, we are done
      if (value >= this.heap[largestChildIndex]) break;

      // Swap
      this.heap[index] = this.heap[largestChildIndex];
      index = largestChildIndex;
    }

    this.heap[index] = value;
  }
}
```

Key Performance Benefits
- Bitwise Operations: Uses >> 1 for fast integer division when finding parents, and << 1 for fast multiplication when finding children.
- Continuous Memory: Utilizing Uint32Array ensures data values sit next to each other in raw memory blocks, minimizing lookup times.
- Zero Pointer Overhead: Unlike traditional tree node object allocations, this design uses strict array relative indexing mapping (2i + 1 and 2i + 2).

Basic Usage Example
```js
const maxHeap = new Uint32MaxHeap();

maxHeap.insert(10);
maxHeap.insert(40);
maxHeap.insert(15);
maxHeap.insert(50);

console.log(maxHeap.peek());        // Output: 50
console.log(maxHeap.extractMax());  // Output: 50
console.log(maxHeap.extractMax());  // Output: 40
```

If you are dealing with smaller data or specific memory constraints, we can adapt this further. Let me know:
- Do you want to use Uint8Array or Uint16Array instead to preserve memory for smaller integer sizes?
- Do you prefer a fixed capacity variant that avoids the _resize() method altogether?

=======

I'm gonna pack into the 32 bit entry something like this:
16 bits for the index
16 bits for the length
*/




/*
> I'm trying to do some bit packing logic does this look correct to you?:
> 
> ...

< No, this logic contains two critical issues that will cause incorrect values when extracting the data:
<
< ...
<
< ```js
// Constants
const LENGTH_BITS = 12;
const LENGTH_MASK = (1 << LENGTH_BITS) - 1; // 0xFFF (Lower 12 bits)

// Packs a 20-bit line index and a 12-bit length into a single 32-bit unsigned integer.
function packEntry(index, length) {
  // Clamp length to 12 bits max (4095) to prevent corruption of the index
  const safeLength = length & LENGTH_MASK; 
  
  // Shift index left by 12 bits, then merge with length using bitwise OR
  return (index << LENGTH_BITS) | safeLength;
}

// Unpacks the data from a 32-bit entry.
function unpackEntry(entry) {
  // Extract length: clear the upper bits using the mask
  const length = entry & LENGTH_MASK;

  // Extract index: shift right by 12 bits using >>> (unsigned right shift)
  const index = entry >>> LENGTH_BITS;

  return { index, length };
}
< ```
<
< Why >>> (Unsigned Right Shift) Matters
<
< In JavaScript, standard bitwise operators operate on signed 32-bit integers.
< If your line index grows large enough that the 32nd bit becomes 1, using a normal shift (>>) will preserve the sign bit and inject negative numbers.
< Using >>> guarantees it is treated as a clean, unsigned 32-bit entity, which matches your Uint32Array perfectly.
< 
< To test your understanding, let's try a quick practice problem:
< If you pack a line index of 5 and a line length of 10 using the layout above ((5 << 12) | 10), what is the resulting decimal value stored in the entry?
< a) 20490
< b) 4106
< c) 50
< d) None of the above
< 
< Or if you want to swap the layout so Length occupies the upper bits instead, let me know and we can adjust the shifts!
< 

Extremely convenient, Google AI is telling me:

< Note: Since a Max-Heap sorts by value, putting the Length in the lower bits means a direct numeric comparison (entryA > entryB) will naturally sort by length first!
< If lengths are equal, it will break ties using the line index.

I wasn't even considering that, just happened to put Length in lower bits.

> If I wanted to update the length of a line that  already existed in the Max-Heap how would I do this?

< To update a value in a standard binary heap, you have to find its location first. Because heaps are not designed for O(1) random lookups, you can't instantly know where in the Uint32Array a specific line index is currently sitting.
<
< To achieve high-performance updates, you need a lookup table (a second array) that maps every line index to its current position (its array index) inside the heap.
< 
< ...

*/







