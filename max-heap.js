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