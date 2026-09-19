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

class Uint32MaxHeap {
  /**
   * @param {number} initialCapacity - The starting capacity of the internal typed array.
   */
  constructor(initialCapacity = 16) {
    this.capacity = initialCapacity;
    this.size = 0;
    this.heap = new Uint32Array(this.capacity);
  }

  /**
   * Returns the maximum value without removing it.
   * @returns {number|null}
   */
  peek() {
    return this.size > 0 ? this.heap[0] : null;
  }

  /**
   * Inserts a new unsigned integer value into the heap.
   * @param {number} value 
   */
  insert(index, length) {
    // Ensure the length fits the unsigned 32-bit boundary
    if (length < 0 || length > 4294967295) {
      throw new RangeError("Length must be a valid 32-bit unsigned integer.");
    }

    if (this.size >= this.capacity) {
      this._resize();
    }

    // Place length at the end of the heap and bubble up
    this.heap[this.size] = length;
    this._bubbleUp(this.size);
    this.size++;
  }

  /**
   * Removes and returns the maximum value from the heap.
   * @returns {number|null}
   */
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

  /**
   * Doubles the capacity of the internal typed array when full.
   */
  _resize() {
    this.capacity *= 2;
    const nextHeap = new Uint32Array(this.capacity);
    nextHeap.set(this.heap);
    this.heap = nextHeap;
  }

  /**
   * Bubbles up the node at the given index to restore max-heap property.
   */
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

  /**
   * Sinks down the node at the given index to restore max-heap property.
   */
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

const maxHeap = new Uint32MaxHeap();

/*
1. 
2. a
3. bb
4. ccc

                                      (lineIndex, length)
maxHeap.peek()... expected answer is: (        3,      3)
*/

// TODO: Actually pick a number that makes sense for the lineIndex, i.e.: it doesn't need 20 bits, presumably it'd be the shorter side.
// TODO: once you do this it completely invalidates the fact that your line end position list can fit indices up to 32 bits.
//       because you can only track up to (currently 20 bits given the exact way this is written at the moment).
const LENGTH_BITS = 12;

// 00000000000000000000000000000000
//
// =>
//
// 00000000000000000000    000000000000
// ||||||||||||||||||||    ||||||||||||
//            lineIndex      lineLength
let entryTest = (3 << LENGTH_BITS) | 3;

consoleLogMaxHeapEntry(entryTest);



//maxHeap.insert(0, 0);
//maxHeap.insert(1, 1);
//maxHeap.insert(2, 2);
//maxHeap.insert(3, 3);

//consoleLogMaxHeapEntry(maxHeap.peek());
//consoleLogMaxHeapEntry(maxHeap.extractMax());
//consoleLogMaxHeapEntry(maxHeap.extractMax());

function consoleLogMaxHeapEntry(entry) {


    // TODO: Is the explorerGlobal.js even using the bit packing logic???? Maybe it is I just at a glance am a little confused.
    const LENGTH_BITS = 12;
    const LENGTH_MASK = (1 << LENGTH_BITS) - 1; // Binary: 00000000000000000000111111111111 (0xFFF)
    const entryLength = entry & LENGTH_MASK;
    const entryIndex = entry & (LENGTH_MASK ^ 1);


    console.log(`(${entryIndex}, ${entryLength})`);
}

const LENGTH_BITS = 12;

// 00000000000000000000000000000000
//
// =>
//
// 00000000000000000000    000000000000
// ||||||||||||||||||||    ||||||||||||
//            lineIndex      lineLength
let entryTest = (3 << LENGTH_BITS) | 3;

consoleLogMaxHeapEntry(entryTest);









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
*/







