/*
New Google AI session


> I wrote this comment in my code do you have any feedback?
> 
> ...the comment here


< The parallel array ("mirror image") approach is an excellent and common optimization to overcome bit-packing limits while maintaining zero-allocation overhead.
< In high-performance systems, splitting a single array of objects into multiple primitive arrays (Structure of Arrays, or SoA)
< removes the constraints of fitting everything into 32 or 64 bits.
< 
< Here is a breakdown of your idea, its trade-offs, and alternative paths to consider:
< The "Mirror Image" (Parallel Array) Approach
< Instead of a single array where each element contains packed bits, you maintain two (or more) arrays aligned by the exact same heap index.
< - Pros:
<     - Removes Limits: You can allocate a full 32-bit int for lineIndex (allowing 4+ billion lines) and a full 32-bit int or 16-bit short for visualLength.
<     - Zero Allocation: It completely bypasses the per-node object allocation overhead.
< - Cons / Trade-offs:
<     - Cache Locality: When swapping or comparing heap elements, you have to read/write from two distinct memory locations.
<       If your heap operations frequently look at both fields simultaneously, this can trigger more CPU cache misses.
<     - Maintenance Overhead: Every time you swap elements during a heapify operation (up or down), you must perform the swap in both arrays at the
<       exact same index.
< 
< Alternative Solutions to Consider
< 
< Strategy                   | How it Works                                                                                                 | Pros                                                                                                                                        | Cons
< ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
< Widen the Packed Primitive | Use a 64-bit long (if you currently use a 32-bit int)                                                        | Gives you 64 bits to split (e.g., 44 bits for lineIndex = 17 trillion; 20 bits for length = 1 million). Single array, great cache locality. | Slight increase in memory footprint per node compared to perfectly-sized parallel parallel primitives.
< Implicit Indexing / Offset | If your lines are processed in chunks or sections, store a relative lineIndex instead of an absolute one.    | Saves bits, keeping everything in a single smaller primitive.                                                                               | Adds complexity to resolvve the actual absolute line index when reading from the heap.
< Value Types / Structs      | If using a language like C#, Rust or C++, use a custom value type / struct array instead of an object array. | The language naturally lays them out inline as an array of structures (AoS) with zero allocation overhead.                                  | Not applicable if you are using Java or JavaScript (where arrays of objects are arrays of references)
< 
< Summary Recommendations
< - If you are using Java/JavaScript: Your parallel array idea is the best way to scale out of bit-packing limits without causing GC pressure.
<   Alternatively, switch to a packed 64-bit long if you haven't already, as 64 bits easily solves your constraint.
< - If you are using C#/Rust/C++: Simply use an array of unmanaged structs.
<   You will get full-sized fields and zero-allocation overhead without needing parallel arrays.
< 
< To help narrow down the best approach, could you tell me:
< - What programming language are you using?
< - What primitive data type (e.g., int, long) are you currently packing these bits into?


> I am using javascript


< In JavaScript, your "mirror image" approach is highly effective.
< Because JavaScript arrays of objects store references (causing major garbage collection and memory overhead), you are right to avoid object allocation.
< 
< By splitting the data into parallel arrays using TypedArrays (like Int32Array or Uint16Array), you get a flat block of memory,
< zero garbage collection overhead, and a massive performance boost.
< 
< Here is how your two best JavaScript options stack up against each other:
< 
< Option 1: The "Mirror Image" Parallel Arrays (Structure of Arrays)
< You instantiate two separate typed arrays of the exact same size. The array index acts as the implicit link between the two pieces of data.
< ```js
const heapSize = 1024;
// Separate arrays aligned by the same heap index
const heapVisualLength = new Uint16Array(heapSize); // Max length 65,535
const heapLineIndex = new Int32Array(heapSize);    // Max line ~2.1 billion
< ```
< 
< - Why it works well in JS: You completely drop the bit-packing math, allowing you to hit huge limits (billions of lines).
< - The Gotcha: During your heap swap operations, you must manually swap the values in both arrays at the same time:
< 
< ```js
function swap(i, j) {
  // Swap visual lengths
  let tempLen = heapVisualLength[i];
  heapVisualLength[i] = heapVisualLength[j];
  heapVisualLength[j] = tempLen;

  // Swap line indices
  let tempLine = heapLineIndex[i];
  heapLineIndex[i] = heapLineIndex[j];
  heapLineIndex[j] = tempLine;
}
< ```
< 
< Option 2: Interleaved Typed Array (Array of Structures)
< If you want to keep your data close together in memory to avoid multiple array lookups, you can use a single typed array but interleave the fields.
< Index i is the length, index i+1 is the line index.
< ```js
const heapSize = 1024;
// Allocate space for both fields side-by-side (2 slots per heap node)
const heapData = new Int32Array(heapSize * 2); 

// Accessing node at 'heapIndex'
const visualLength = heapData[heapIndex * 2];
const lineIndex    = heapData[heapIndex * 2 + 1];
< ```
< 
< - Why it works well in JS: It behaves like a single array of C-style structs. Because the fields sit right next to each other in memory,
<   the CPU cache handles it beautifully. It also keeps your code cleaner because you are managing a single array variable.
< - The Gotcha: You have to remember to multiply your heap indices by 2 whenever you index into the array,
<   and your swap function needs to swap a 2-slot block of memory.
< 
< Recommendation
< If your heap operations are highly frequent (constantly bubbling up and down), use Option 2 (Interleaved Array).
< It balances zero allocation, huge limits, and single-array management without hurting your CPU cache.
< 
< If you prefer cleaner code where you don't have to think about index * 2 math everywhere, go with your original Option 1 (Parallel Arrays).
< The JS engine optimizes TypedArrays so well that the performance difference will likely be negligible unless your heap is massive.
< 
< Would you like help writing out the bubble-up / bubble-down swap logic using either the interleaved or parallel array pattern?


> I like the interleaved option. My current heap class is:
```js
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

    this.nextId = 0;

    this.unpack_pool_id = 0;
    this.unpack_pool_length = 0;
  }

  pack(id, length) {
    // .. (these are actually commented out just like this in my prompt)
  }

  // Result is stored in the fields: 'this.unpack_pool_id' and 'this.unpack_pool_length'
  unpack(entry) {
    // (
    // I left this one hoping they'd pick up on my avoidance of creating an object as a return value.
    // I need to read the final resulting code still.
    // )
    this.unpack_pool_length = entry >>> this.ID_BITS;
    this.unpack_pool_id = entry & this.ID_MASK;
  }

  peek() {
    // .. (these are actually commented out just like this in my prompt)
  }

  // --- The Core Update Method ---
  updateLength(lineId, newLength) {
    // .. (these are actually commented out just like this in my prompt)
  }
  
  // 
  // @param {*} diff positive or negative to reflect length change
  // 
  updateLength_diff(lineId, diffLength) {
    // .. (these are actually commented out just like this in my prompt)
  }

  // TODO: Eventual "garbage collection / defragmentation" of the 'this._resizePositionMap' and 'this.nextId' for the no longer in use 'this.nextId'(s)
  insert(lineId, lineLength) {
    // .. (these are actually commented out just like this in my prompt)
  }

  extractMax() {
    // .. (these are actually commented out just like this in my prompt)
  }

  _bubbleUp(index) {
    // .. (these are actually commented out just like this in my prompt)
  }

  _sinkDown(index) {
    // .. (these are actually commented out just like this in my prompt)
  }

  _resize() {
    // .. (these are actually commented out just like this in my prompt)
  }

  _resizePositionMap(newMinSize) {
    // .. (these are actually commented out just like this in my prompt)
  }
}
> ```


< Here is how you can refactor your class into an interleaved heap.
< 
< Since your positionMap tracks where a lineId lives in the heap, switching to an interleaved layout means the logical heap index i maps to
< this.heap[i * 2] and this.heap[i * 2 + 1]. Crucially, the value stored in positionMap should still be the logical index i (not the multiplied buffer index)
< to keep your logic clean.
< 
< We will use a 2-slot stride per entry:
< - Slot 0 (index * 2): length
< - Slot 1 (index * 2 + 1): lineId
< 
< Refactored Class Template
< ```js
// lots of code...
< ```
< 
< Key Differences & Benefits
< 1. No Bit Packing Limits: Your max layout line size is now bound by Uint32Array limits (~4.2 billion)
<    and visual string lengths can cleanly utilize the full 32 bits as well.
< 2. Atomic Swaps: The _swap(i, j) function swaps both the tracking indices and lengths back-to-back, matching memory locality perfectly.
< 3. Implicit Mapping: Because positionMap holds the logical entity location, code querying internal states (like updateLength) doesn't change dramatically,
<    keeping outer structures easy to reason about.
< 
< Would you like to write a unit test suite / harness to verify that the heap invariant holds and that the positionMap tracks line migrations correctly during heavy updates?
*/

class TrackingUint32MaxHeap {
  constructor(initialCapacity = 16) {
    this.capacity = initialCapacity;
    this.size = 0;
    
    // Interleaved: Each logical entry takes 2 slots (0: length, 1: lineId)
    this.heap = new Uint32Array(this.capacity * 2);

    // Maps lineIndex -> current position in this.heap. Initialize with -1.
    // Assuming a max layout size, or grow dynamically. We'll start it large or match capacity.
    this.positionMap = new Int32Array(initialCapacity).fill(-1);

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

  /** Result is stored in the fields: 'this.unpack_pool_id' and 'this.unpack_pool_length' */
  unpackAt(index) {
    const bufferIndex = index * 2;
    this.unpack_pool_length = this.heap[bufferIndex];
    this.unpack_pool_id = this.heap[bufferIndex + 1];
  }

  /**
   * result is stored in: 'this.unpack_pool_id', and 'this.unpack_pool_length'
   * Returns a boolean that indicates whether a node existed.
   */
  tryPooledPeek() {
    if (this.size === 0) return false;
    this.unpackAt(0);
    return true;
  }

  /**
   * result is stored in: 'this.unpack_pool_id', and 'this.unpack_pool_length'
   * Returns a boolean that indicates whether a node existed.
   */
  tryPooledExtractMax() {
    if (this.size === 0) return false;

    // Grab max info from root (logical index 0)
    this.unpackAt(0);
    const maxId = this.unpack_pool_id;
    const maxLength = this.unpack_pool_length;

    this.positionMap[maxId] = -1; // Removed

    const maxEntry = this.heap[0];
    this.unpackAt(maxEntry);
    const maxIndex = this.unpack_pool_id;

    this.positionMap[maxIndex] = -1; // Removed

    const lastIndex = this.size - 1;
    if (lastIndex > 0) {
      // Move last item to root
      const lastBufferIndex = lastIndex * 2;
      const lastLength = this.heap[lastBufferIndex];
      const lastId = this.heap[lastBufferIndex + 1];

      this.heap[0] = lastLength;
      this.heap[1] = lastId;
      this.positionMap[lastId] = 0;

      this.size--;
      this._sinkDown(0);
    }
    else {
      this.size--;
    }

    return true;
  }

  /** TODO: Eventual "garbage collection / defragmentation" of the 'this._resizePositionMap' and 'this.nextId' for the no longer in use 'this.nextId'(s) */
  insert(lineId, lineLength) {
    if (this.size >= this.capacity) this._resize();
    
    // Grow position tracking map if necessary
    if (lineId >= this.positionMap.length) {
      this._resizePositionMap(lineId * 2);
    }

    const index = this.size;
    const bufferIndex = index * 2;

    this.heap[bufferIndex] = lineLength;
    this.heap[bufferIndex + 1] = lineId;
    this.positionMap[lineId] = index;
    
    this._bubbleUp(index);
    this.size++;
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
