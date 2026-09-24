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
class TrackingUint32MaxHeap {
  constructor(initialCapacity = 16) {
    this.capacity = initialCapacity;
    this.size = 0;
    
    // Interleaved: Each logical entry takes 2 slots (0: length, 1: lineId)
    this.heap = new Uint32Array(this.capacity * 2);

    // Maps lineId -> current logical position in this.heap.
    this.positionMap = new Int32Array(initialCapacity).fill(-1);
    
    // The pool fields can now directly hold the unpacked values without bitwise limits
    this.unpack_pool_id = 0;
    this.unpack_pool_length = 0;
  }

  // Safely extracts values into the pool variables using the logical index
  unpackAt(index) {
    const bufferIndex = index * 2;
    this.unpack_pool_length = this.heap[bufferIndex];
    this.unpack_pool_id = this.heap[bufferIndex + 1];
  }

  peek() {
    if (this.size === 0) return null;
    this.unpackAt(0);
    return { id: this.unpack_pool_id, length: this.unpack_pool_length };
  }

  insert(lineId, lineLength) {
    if (this.size >= this.capacity) {
      this._resize();
    }
    if (lineId >= this.positionMap.length) {
      this._resizePositionMap(lineId + 1);
    }

    const index = this.size;
    const bufferIndex = index * 2;
    
    this.heap[bufferIndex] = lineLength;
    this.heap[bufferIndex + 1] = lineId;
    this.positionMap[lineId] = index;
    
    this.size++;
    this._bubbleUp(index);
  }

  extractMax() {
    if (this.size === 0) return null;

    // Grab max info from root (logical index 0)
    this.unpackAt(0);
    const maxId = this.unpack_pool_id;
    const maxLength = this.unpack_pool_length;

    this.positionMap[maxId] = -1; // Removed

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
    } else {
      this.size--;
    }

    return { id: maxId, length: maxLength };
  }

  // --- The Core Update Methods ---
  updateLength(lineId, newLength) {
    const index = this.positionMap[lineId];
    if (index === -1) return;

    const bufferIndex = index * 2;
    const oldLength = this.heap[bufferIndex];
    this.heap[bufferIndex] = newLength;

    if (newLength > oldLength) {
      this._bubbleUp(index);
    } else if (newLength < oldLength) {
      this._sinkDown(index);
    }
  }
  
  updateLength_diff(lineId, diffLength) {
    const index = this.positionMap[lineId];
    if (index === -1) return;

    const bufferIndex = index * 2;
    const oldLength = this.heap[bufferIndex];
    const newLength = oldLength + diffLength; // Assumes length stays unsigned/positive
    this.heap[bufferIndex] = newLength;

    if (diffLength > 0) {
      this._bubbleUp(index);
    } else if (diffLength < 0) {
      this._sinkDown(index);
    }
  }

  // --- Internal Heap Mechanics ---
  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      
      // Compare lengths at slot 0 of both entries
      if (this.heap[index * 2] <= this.heap[parentIndex * 2]) break;
      
      this._swap(index, parentIndex);
      index = parentIndex;
    }
  }

  _sinkDown(index) {
    const halfSize = this.size >> 1;
    while (index < halfSize) {
      let leftChild = (index << 1) + 1;
      let rightChild = leftChild + 1;
      let largest = index;

      if (this.heap[leftChild * 2] > this.heap[largest * 2]) {
        largest = leftChild;
      }
      if (rightChild < this.size && this.heap[rightChild * 2] > this.heap[largest * 2]) {
        largest = rightChild;
      }

      if (largest === index) break;

      this._swap(index, largest);
      index = largest;
    }
  }

  // Swaps full 2-slot records and updates the position map pointers
  _swap(i, j) {
    const idxA = i * 2;
    const idxB = j * 2;

    // Swap Lengths
    const lenA = this.heap[idxA];
    this.heap[idxA] = this.heap[idxB];
    this.heap[idxB] = lenA;

    // Swap IDs
    const idA = this.heap[idxA + 1];
    const idB = this.heap[idxB + 1];
    this.heap[idxA + 1] = this.heap[idxB + 1];
    this.heap[idxB + 1] = idA;

    // Update the position mappings to reflect their new logical heap index
    this.positionMap[idA] = j;
    this.positionMap[idB] = i;
  }

  _resize() {
    this.capacity *= 2;
    const newHeap = new Uint32Array(this.capacity * 2);
    newHeap.set(this.heap);
    this.heap = newHeap;
  }

  _resizePositionMap(newMinSize) {
    let newSize = this.positionMap.length * 2;
    if (newSize < newMinSize) newSize = newMinSize;
    
    const newMap = new Int32Array(newSize).fill(-1);
    newMap.set(this.positionMap);
    this.positionMap = newMap;
  }
}
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

> I need to add 'removeAt' logic for the heap. For example I have this code currently:
> 
> function EDI_lineEndPositionList_removeAt(index, count) {
>     // ... (the code was included in the prompt)
> }

< In a tracking max heap, removing a contiguous block of lines from your document structure requires two distinct updates to the heap system:
< 
< 1. Heap Element Removal: The specific lines that are deleted must be scrubbed out of the heap completely.
< 2. Tracking Map Shift: For all surviving lines positioned after the deleted block (lineId >= index + count), their absolute lineId has effectively
<    shifted down by count. This means your tracking structures and the IDs stored within the interleaved heap itself need to be decremented.
< 
< Here is the refactored logic broken down into a helper method for your heap class and an updated version of your document-level removeAt function.
< 
< 1. Add removeLineId to your Heap Class
< 
< Instead of removing by heap index, it is much safer to look up the line by its identity using your tracking map.
< To remove a node from an arbitrary position in a heap:
< 
< 1. Swap it with the last element in the heap.
< 2. Decrease this.size.
< 3. Repair the heap structural invariant by either bubbling the swapped element up or sinking it down.
< 
< Add this method to your TrackingUint32MaxHeap class:
< ```js
removeLineId(lineId) {
  const index = this.positionMap[lineId];
  if (index === -1) return; // Not in the heap

  this.positionMap[lineId] = -1;
  const lastIndex = this.size - 1;

  if (index === lastIndex) {
    this.size--;
    return;
  }

  // Move the last element into the hole
  const lastBufferIndex = lastIndex * 2;
  const targetBufferIndex = index * 2;
  
  const movedLength = this.heap[lastBufferIndex];
  const movedId = this.heap[lastBufferIndex + 1];

  this.heap[targetBufferIndex] = movedLength;
  this.heap[targetBufferIndex + 1] = movedId;
  this.positionMap[movedId] = index;

  this.size--;

  // The element could need to move up or down depending on its value
  // We check its parent to see if it needs to bubble up, otherwise sink it down
  if (index > 0) {
    const parentIndex = (index - 1) >> 1;
    if (this.heap[targetBufferIndex] > this.heap[parentIndex * 2]) {
      this._bubbleUp(index);
      return;
    }
  }
  this._sinkDown(index);
}
< ```
< 
< 2. Update your removeAt Document Function
< 
< Your current function correctly shifts your linear document vectors down. We need to integrate the heap logic so that:
< 
< 1. Before the array copy shift: We completely remove the targeted lines from the heap.
< 2. After the array copy shift: We loop over the internal storage of the heap to decrement the IDs of elements that migrated to a lower index.
< 
< (Note: There was a minor logic branch bug in your original snippet: if (index + count === EDI_lineEndPositionList_count) calculated shiftableCount,
<        but then executed if (shiftableCount > 0) which would always be false since EDI_lineEndPositionList_count - (index + count) is 0 under that condition.
<        The refactored version consolidates this safely.)
< 
< ```js
function EDI_lineEndPositionList_removeAt(index, count) {
    if (index > EDI_lineEndPositionList_count) { throw new Error('removeAt(...): index > EDI_lineEndPositionList_count'); }
    if (index + count > EDI_lineEndPositionList_count) { throw new Error('removeAt(...): index + count > EDI_lineEndPositionList_count'); }
    if (count === 0) { return; }

    // --- Step 1: Remove the deleted lines from the heap tracking system ---
    const endDeletedRange = index + count;
    for (let i = index; i < endDeletedRange; i++) {
        // Look up the specific heap ID assigned to this line row
        let heapId = EDI_lineIndexToHeapId[i];
        if (heapId !== -1) { 
            myTrackingHeap.removeLineId(heapId);
        }
    }

    // --- Step 2: Concurrently shift down your document linear structures ---
    let shiftableCount = EDI_lineEndPositionList_count - endDeletedRange;
    if (shiftableCount > 0) {
        EDI_lineEndPositionList_copyTo(
            EDI_lineEndPositionList_data,
            endDeletedRange,
            EDI_lineEndPositionList_data,
            index,
            shiftableCount
        );
        EDI_lineIndexToHeapId_copyTo(
            EDI_lineIndexToHeapId,
            endDeletedRange,
            EDI_lineIndexToHeapId,
            index,
            shiftableCount
        );

        // --- Step 3: Shift the structural IDs of lines that survived ---
        // Every line that was past the deletion zone just got its index decremented by 'count'.
        // We must update the references inside the interleaved heap and position map.
        
        // Loop through the heap buffer directly to re-align internal IDs
        const heapTotalSlots = myTrackingHeap.size * 2;
        for (let slot = 1; slot < heapTotalSlots; slot += 2) {
            let currentLineId = myTrackingHeap.heap[slot];
            if (currentLineId >= endDeletedRange) {
                myTrackingHeap.heap[slot] = currentLineId - count;
            }
        }

        // Shift down the tracking positions map entries for remaining indices
        // Assuming your positionMap grows to track maximum layout boundaries
        const originalMapLen = myTrackingHeap.positionMap.length;
        for (let i = endDeletedRange; i < originalMapLen; i++) {
            myTrackingHeap.positionMap[i - count] = myTrackingHeap.positionMap[i];
        }
        // Blank out the tail entries left behind by the shift
        myTrackingHeap.positionMap.fill(-1, originalMapLen - count, originalMapLen);
    }

    EDI_lineEndPositionList_count -= count;
}
< ```
< 
< Why this design avoids fragmentation
< 
< - Linear Shifts: The position map data updates cleanly with a simple fast-loop index assignment, matching your underlying vector strategy.
< - Heap Scan: The heap payload itself only scans up to this.size * 2 elements rather than the whole capacity buffer, making the pointer reassignment rapid.
< 
< Would you like help adapting your companion insertAt logic to safely increase and offset those tracking IDs when
< new lines are spliced into the middle of the document?

- [ ] TODO: All you need is this
  - [ ] lineEndPositionList
  - [ ] lineIndexToHeapIndex
  - [ ] maxHeapLineLength
- [ ] Auto update or defer when removing a line
  - [ ] Immediately shift down all the data
    - [ ] TODO: All you need is this
      - [ ] lineEndPositionList
      - [ ] lineIndexToHeapIndex
      - [ ] maxHeapLineLength
        - [ ] length
        - [ ] lineIndex
      - [ ] remove:
          - [ ] shift down lineEndPositionList
              - [ ] modify count so data is no longer in reach
          - [ ] shift down lineIndexToHeapIndex
              - [ ] the 'foreach' step means that this is "in order"
              - [ ] just need to modify the count so that the data is no longer in reach
          - [ ] loop the entire heap array
            - [ ] find any indices that are >= exclusiveEndLineIndexRemoved, modify the heap entry's lineIndex by count removed
            - [ ] if line index on heap entry is > inclusiveStartLineIndexRemoved and < exclusiveEndLineIndexRemoved
              - [ ] mark heap entry for deletion
            - [ ] re-heapify
  - [ ] De-couple lineIndex from heap
    - [ ] TODO: All you need is this
      - [ ] lineEndPositionList
      - [ ] lineIndexToPosHIndex <-> posHIndexToLineIndex
      - [ ] maxHeapLineLength
        - [ ] length
        - [ ] posHIndex
      - [ ] remove:
          - [ ] foreach : remove from maxHeapLineLength by lineIndex
              - [ ] remove will bubble down all the way foreach removed line
              - [ ] then modify heap count so that data is no longer in reach
          - [ ] shift down lineEndPositionList
              - [ ] modify count so data is no longer in reach
          - [ ] shift down lineIndexToHeapIndex
              - [ ] the 'foreach' step means that this is "in order"
              - [ ] just need to modify the count so that the data is no longer in reach
          - [ ] shift down posHIndexToLineIndex
              - [ ] the 'foreach' step means that this is "in order"
              - [ ] just need to modify the count so that the data is no longer in reach
          - [ ] fragmentation is created somewhere that eventually needs to be dealt with
- [ ] TODO: When you modify don't use line index use the map
- [ ] TODO: the above remove from heap logic
- [ ] TODO: insert a line needs to shift the map from lineIndex to heapId etc...
- [ ] TODO: There's all kinds of '-1' logic that the AI is doing with the uint...arrays
            when it comes to the initialization I figured they just do it for the max-value
            but they also have code that is checking whether the heap id is -1 after reading the uint...array?


> Do you see any reasoning in my notes? I'm trying to understand

< Your notes show you are wrestling with a classic architecture problem: Entity Identity vs. Memory Position.
< 
< You are trying to figure out how to avoid a massive performance bottleneck when lines are deleted.
< Specifically, you want to avoid having to loop through the entire heap array to decrement line numbers every time a line changes position in the document.
< 
< Here is the core reasoning hidden inside your two notes options, broken down simply:
< 
< Option 1: "Immediately shift down all the data"
< In this note, your heap explicitly stores lineIndex.
< 
< - The Problem You Noticed: If you delete line 5, line 6 becomes line 5, line 7 becomes line 6, and so on.
< - The Bottleneck: Because the heap stores absolute line indices, you are forced to run that final step in your notes:
<   "loop the entire heap array and find any indices that are greater > end remove and modify by count removed." If your heap has 100,000 entries,
<   deleting a line means scanning 100,000 slots just to fix the line numbers.
< 
< Option 2: "De-couple lineIndex from heap"
< This is where your brilliant realization happens. You introduce a stable intermediary token, which you call posHIndex (Persistent/Position Heap Index).
< - The Core Insight: The heap doesn't store the volatile lineIndex anymore. It stores a fixed ID (posHIndex).
< - How it Solves the Problem: When a line shifts in the document, its ID inside the heap never changes. Only the mapping between the document line and that ID changes.
< - The Trade-off (The Fragmentation): You correctly noted that this creates "fragmentation... that eventually needs to be dealt with."
<   Because you aren't shifting IDs inside the heap, deleting a line leaves a "dead ID hole" in your ID map.
<   You don't have to scan the heap immediately, but you will eventually need a garbage collection step to reuse those dead IDs.
< 
< The Direct Answer to Your Question
< 
< Yes, your reasoning is completely sound, and Option 2 is the correct architectural path for high performance.
< 
< By introducing the decoupled layer (lineIndex <-> stableId), you trade an expensive O(N) heap-scanning penalty on every single deletion for a dirt-cheap O(1)
< pointer shift in your linear array, deferring the cleanup cost to a later, asynchronous "defragmentation" phase.
< 
< Would you like to map out how the indirection mapping arrays look under Option 2 during a deletion,
< so you can visualize exactly how to write the garbage collection / defragmentation loop later?

> what is the time complexity of "foreach : remove from maxHeapLineLength by lineIndex".
> I wonder because it seems very wasteful shift down each heap "entry" 1 by 1.
> Even if you have the map from lineIndex to the index within the heap, you likely are interacting with other entries that later will be targeted for their own bubble down?

< You have hit on a critical flaw in that plan. "Foreach: remove from heap" is highly inefficient, precisely for the reason you guessed:
< you are wastefully shifting elements into positions only to overwrite or move them again in the next loop iteration.
< 
< The Time Complexity Analysis
< 
< If you delete a block of K contiguous lines from a heap containing N total elements, the time complexity of removing them one-by-one is \(O(K \log N)\). 
<
< Here is why that gets ugly:
< 1. Redundant Work: When you remove the first line, the heap fills the gap by pulling the last element of the heap to that spot and sinking it down (\(O(\log N)\)). 
< 2. Cascading Swaps: If the next line you delete happens to be that element you just moved, or if the structure changes dramatically,
<    you spend CPU cycles bubbling elements down, only to delete or shift them again in the very next loop iteration.
< 3. Cache Trashing: You are constantly bouncing all over the Uint32Array memory space repairing structural invariants that are about to be broken anyway.
< 
< A Much Faster Alternative: Mass Invalidation + Re-Heapify (O(N))
< Instead of maintaining the heap structure perfectly after each deleted line, it is significantly faster to destroy the heap invariants in bulk, then fix the heap all at once.
< If K (the number of lines being removed) is large, or if you want consistent performance, you should treat removal as a lazy batch operation:
<
< 1. Mark as Dead (O(K)): Loop through your K lines and simply mark their lengths as 0 (or -1 if signed) directly in the heap, and set their positionMap entries to -1.
<    Do not bubble anything yet.
< 2. Trunk Truncation (O(1)): If any of those dead elements happen to be at the very end of your heap array, just decrement this.size.
< 3. Build Heap / Bottom-Up Heapify (O(N)): Run a classic buildHeap algorithm from the bottom up.
<    You start at the last non-leaf node (index (this.size - 2) >> 1) and call _sinkDown on each node going backwards to index 0.
< 
< The Mathematical Payoff
< 
< Approach               | Worse-Case Time Complexity | Best for...
< ----------------------------------------------------------------------------------------------------------
< One-by-One (foreach)   | O(KlogN)                   | Small deletions (K = 1 or 2)
< Mass Mark + Re-Heapify | O(K + N)                   | Large block selections, multi-line cuts, or cleanups
< 
< Because a bottom-up buildHeap naturally runs in linear O(N) time (not \(O(N \log N)\)), it completely eliminates the cascading overhead.
< You only move elements to their final resting positions exactly once. 
< 
< Would you like to look at how to implement a linear-time rebuild() method on your interleaved heap to handle this kind of batch deletion?

> If 'Mass Mark + Re-Heapify' is 'O(K + N)' then it touches every heap entry and thus you could as you go modify the line indices of each heap entry where the line index is greater than or equal
> to the end exclusion line index removed. And then this removes the need for 'posHIndexToLineIndex'?

< Yes, your reasoning is 100% correct, and this is a profound insight.
< 
< If you are already paying the \(O(N)\) cost to rebuild the heap, you can update the line indices of every surviving entry in that exact same loop.
< This completely eliminates the need for a complicated posHIndexToLineIndex redirection map and prevents memory fragmentation entirely. 
< 
< By combining the Mass Mark and Re-Heapify steps into a single pass, your layout system gains a massive optimization.
< 
< How the Single-Pass O(K + N) Algorithm Works
< 
< Instead of separating the steps, you can process the deletion in two tight, cache-friendly loops:
< 
< Loop 1: Invalidate the Deleted Range \(O(K)\) 
< Look up the positions of the lines being deleted using your tracking map and mark them as dead (e.g., set their length to a tombstone value like 0 or 0xFFFFFFFF).
< 
< Loop 2: Filter, Shift, and Re-Heapify \(O(N)\) 
< Instead of running a standard buildHeap on the messy array, create a single-pass filter that compacts the array in place, updates the surviving line indices, and then repairs the heap structure:
< 1. Compaction & Index Shifting: Loop through the heap from index 0 to size. If an entry is not marked as dead, slide it down to the next available slot at the front of the array to fill the gaps left by deleted entries.
< 2. Line Index Adjustment: As you slide an entry forward, check its lineIndex. If lineIndex >= index + count, subtract count from it right then and there.
< 3. Bottom-Up Heapify: Update this.size to the new compacted total, and run a standard \(O(N)\) bottom-up siftDown loop over the surviving nodes to restore the max-heap property. 
< 
< Why This Architecture Wins
< By anchoring this logic during batch operations, you achieve the best of both worlds:
< - Zero Map Redirection Overhead: The heap points directly to the real lineIndex. You avoid the memory footprint and lookup overhead of double-indirection maps like posHIndexToLineIndex.
< - Zero Fragmentation: The array remains perfectly compacted. You don't have to write a separate, asynchronous garbage collection loop to clean up "dead holes" later.
< - Incredible Cache Locality: JavaScript engines can optimize a single contiguous Uint32Array compaction loop extremely well, meaning the \(O(N)\) loop will execute blazing fast in practice compared to sporadic individual heap swaps.
< 
< Would you like to see how to write the specific compaction and line-shifting loop for your interleaved Uint32Array heap?

- [ ] remove:
  - [ ] shift down lineEndPositionList
    - [ ] modify count so data is no longer in reach
  - [ ] shift down lineIndexToHeapIndex
    - [ ] the 'foreach' step means that this is "in order"
    - [ ] just need to modify the count so that the data is no longer in reach
  - [ ] loop the entire heap array
    - [ ] find any indices that are >= exclusiveEndLineIndexRemoved, modify the heap entry's lineIndex by count removed
    - [ ] if line index on heap entry is > inclusiveStartLineIndexRemoved and < exclusiveEndLineIndexRemoved
      - [ ] mark heap entry for deletion
  - [ ] re-heapify

> Do my notes look correct to you?:
< ...the above checklist for '- [ ] remove:' is here

< Your notes are almost 100% correct, and you have mapped out the logic beautifully.
< There are just two minor logical adjustments needed to make it bulletproof: the order of your execution steps and a slight tweak to your conditional bounds.
< 
< Here is the breakdown of what is perfect and how to refine those two small areas:
< 
< 1. The Order of Execution (Critical Tweak)
< 
< In your notes, you listed shifting lineIndexToHeapIndex before looping through the heap array.
< - The Catch: If you shift down your tracking array first, you overwrite and lose the pointers to the heap entries for the lines you are deleting.
< - The Fix: You need to read from lineIndexToHeapIndex to find and mark the deleted heap entries before you shift it down.
< 
< 2. The Conditional Bounds Tweak
< 
< In your conditional block:
<     "if line index on heap entry is > inclusiveStartLineIndexRemoved and < exclusiveEndLineIndexRemoved"
< 
< The Fix: Change the first check to >= (greater than or equal to). Since it is inclusive, a line right at the start bound must be marked for deletion too.
< 
< The Corrected, Optimized Plan
< 
< Here is your updated checklist with those two corrections integrated into a high-performance sequence:
< 
< - 1. Loop the entire heap array first (or use your map to target entries)
<     - If a heap entry's lineIndex >= inclusiveStartLineIndexRemoved AND < exclusiveEndLineIndexRemoved:
<         - Mark this heap entry for deletion (e.g., set length to 0 or a tombstone value).
<     - If a heap entry's lineIndex >= exclusiveEndLineIndexRemoved:
<         - Subtract count from the heap entry's lineIndex.
< - 2. Compact & Re-heapify
<     - Slide surviving heap entries forward in the typed array to overwrite the marked "dead" gaps.
<     - Run the bottom-up O(N) loop to restore max-heap balance.
< - 3. Shift down linear document structures
<     - Shift down lineEndPositionList and modify its count.
<     - Shift down lineIndexToHeapIndex and modify its count.
< 
< An Added Bonus of This Setup
< Because your loop scans the entire heap array to update the line indices anyway, you don't even need to look at lineIndexToHeapIndex to find what to delete.
< The heap entry tells you its own lineIndex! You can evaluate, mark, and shift indices for every single element in a single, flat, linear pass over the heap array.
< 
< Would you like to review the specific JavaScript loop syntax that handles both the index shifting and the gap-compaction simultaneously inside the interleaved array?

*/

class TrackingUint32MaxHeap {
  constructor(initialCapacity = 16) {
    this.capacity = initialCapacity;
    this.size = 0;
    
    // Interleaved: Each logical entry takes 2 slots (0: length, 1: lineId)
    this.heap = new Uint32Array(this.capacity * 2);

    // Maps lineIndex -> current position in this.heap. Initialize with -1.
    // Assuming a max layout size, or grow dynamically. We'll start it large or match capacity.
    this.lineIndexToHeapIndex = new Int32Array(initialCapacity).fill(-1);

    this.unpack_pool_lineIndex = 0;
    this.unpack_pool_length = 0;
  }

  /** Result is stored in the fields: 'this.unpack_pool_lineIndex' and 'this.unpack_pool_length' */
  unpackAt(logicalIndex) {
    const bufferIndex = logicalIndex * 2;
    this.unpack_pool_length = this.heap[bufferIndex];
    this.unpack_pool_lineIndex = this.heap[bufferIndex + 1];
  }

  /**
   * result is stored in: 'this.unpack_pool_lineIndex', and 'this.unpack_pool_length'
   * Returns a boolean that indicates whether a node existed.
   */
  tryPooledPeek() {
    if (this.size === 0) return false;
    this.unpackAt(0);
    return true;
  }

  /**
   * result is stored in: 'this.unpack_pool_lineIndex', and 'this.unpack_pool_length'
   * Returns a boolean that indicates whether a node existed.
   */
  tryPooledExtractMax() {
    if (this.size === 0) return false;

    // Grab max info from root (logical index 0)
    this.unpackAt(0);
    const maxIndex = this.unpack_pool_lineIndex;

    this.lineIndexToHeapIndex[maxIndex] = -1; // Removed

    const lastLogicalIndex = this.size - 1;
    if (lastLogicalIndex > 0) {
      // Move last item to root
      const lastBufferIndex = lastLogicalIndex * 2;
      const lastLength = this.heap[lastBufferIndex];
      const lastId = this.heap[lastBufferIndex + 1];

      this.heap[0] = lastLength;
      this.heap[1] = lastId;
      this.lineIndexToHeapIndex[lastId] = 0;

      this.size--;
      this._sinkDown(0);
    }
    else {
      this.size--;
    }

    return true;
  }

  /** TODO: Eventual "garbage collection / defragmentation" of the 'this._resizePositionMap' and 'this.nextId' for the no longer in use 'this.nextId'(s) */
  insert(lineIndex, lineLength) {
    // Ensure heap capacity
    if (this.size >= this.capacity) {
      this._resize();
    }
    
    // Proactively ensure the lookup map can index this specific line
    if (lineIndex >= this.lineIndexToHeapIndex.length) {
      this._resizeLineIndexToHeapIndexMap(lineIndex + 1);
    }

    const logicalIndex = this.size;
    const bufferIndex = logicalIndex * 2;
    
    this.heap[bufferIndex] = lineLength;
    this.heap[bufferIndex + 1] = lineIndex;
    this.lineIndexToHeapIndex[lineIndex] = logicalIndex;
    
    this.size++;
    this._bubbleUp(logicalIndex);
  }

  // --- The Core Update Method ---
  updateLength(lineIndex, newLength) {
    // 1. Look up where this line index currently lives in the heap array
    if (lineIndex >= this.lineIndexToHeapIndex.length) { throw new Error(); }
    
    const logicalIndex = this.lineIndexToHeapIndex[lineIndex];
    if (logicalIndex === -1) { throw new Error(); }

    const bufferIndex = logicalIndex * 2;
    const oldLength = this.heap[bufferIndex];
    this.heap[bufferIndex] = newLength;

    if (newLength > oldLength) {
      this._bubbleUp(logicalIndex);
    }
    else if (newLength < oldLength) {
      this._sinkDown(logicalIndex);
    }
  }
  
  /**
   * @param {*} diff positive or negative to reflect length change
   */
  updateLength_diff(lineIndex, diffLength) {
    if (lineIndex >= this.lineIndexToHeapIndex.length) { throw new Error(); }

    const logicalIndex = this.lineIndexToHeapIndex[lineIndex];
    if (logicalIndex === -1) { throw new Error(); }

    const bufferIndex = logicalIndex * 2;
    const oldLength = this.heap[bufferIndex];
    const newLength = oldLength + diffLength;
    this.heap[bufferIndex] = newLength;

    if (newLength > oldLength) {
      this._bubbleUp(logicalIndex);
    }
    else if (newLength < oldLength) {
      this._sinkDown(logicalIndex);
    }
  }

  /** Swaps full 2-slot records and updates the position map pointers */
  _swap(i, j) {
    const idxA = i * 2;
    const idxB = j * 2;

    // Swap Lengths
    const lenA = this.heap[idxA];
    this.heap[idxA] = this.heap[idxB];
    this.heap[idxB] = lenA;

    // Swap IDs
    const indexA = this.heap[idxA + 1];
    const indexB = this.heap[idxB + 1];
    this.heap[idxA + 1] = indexB;
    this.heap[idxB + 1] = indexA;

    // Update the position mappings to reflect their new logical heap index
    this.lineIndexToHeapIndex[indexA] = j;
    this.lineIndexToHeapIndex[indexB] = i;
  }

  _bubbleUp(logicalIndex) {
    while (logicalIndex > 0) {
      const parentLogicalIndex = (logicalIndex - 1) >> 1;

      // Read the values dynamically from the array each iteration
      const currentLength = this.heap[logicalIndex * 2];
      const parentLength  = this.heap[parentLogicalIndex * 2];

      // Compare lengths at slot 0 of both entries
      if (currentLength <= parentLength) break;

      this._swap(logicalIndex, parentLogicalIndex);
      logicalIndex = parentLogicalIndex;
    }
  }

  _sinkDown(logicalIndex) {

    const halfSize = this.size >> 1;

    while (logicalIndex < halfSize) {
      let leftChild = (logicalIndex << 1) + 1;
      let rightChild = leftChild + 1;
      let largest = logicalIndex;

      if (this.heap[leftChild * 2] > this.heap[largest * 2]) {
        largest = leftChild;
      }
      if (rightChild < this.size && this.heap[rightChild * 2] > this.heap[largest * 2]) {
        largest = rightChild;
      }

      if (largest === logicalIndex) break;

      this._swap(logicalIndex, largest);
      logicalIndex = largest;
    }
  }

  batchRemoveLines(start, count) {
    const exclusiveEnd = start + count;
    let writeLogicalIndex = 0;
    const oldSize = this.size;

    // Pass 1: Compact data and adjust surviving line numbers
    for (let i = 0; i < oldSize; i++) {
      const readBufferIndex = i * 2;
      const length = this.heap[readBufferIndex];
      const lineIndex = this.heap[readBufferIndex + 1];

      if (lineIndex >= start && lineIndex < exclusiveEnd) {
        continue; // Drop line
      }

      const writeBufferIndex = writeLogicalIndex * 2;
      this.heap[writeBufferIndex] = length;

      if (lineIndex >= exclusiveEnd) {
        this.heap[writeBufferIndex + 1] = lineIndex - count;
      } else {
        this.heap[writeBufferIndex + 1] = lineIndex;
      }

      writeLogicalIndex++;
    }

    this.size = writeLogicalIndex;

    // Pass 2: Re-balance heap structure
    const halfSize = this.size >> 1;
    for (let i = halfSize - 1; i >= 0; i--) {
      this._sinkDown(i);
    }

    // Pass 3: Self-contained internal synchronization pass
    this.syncTrackingMap();
  }

  /**
   * Mass updates the heap for line insertions.
   * @param {number} start The index where new lines were spliced in.
   * @param {number} count The number of lines inserted.
   */
  batchInsertLines(start, count) {
    const oldSize = this.size;

    // 1. Proactively check if the shifted lines will overshoot the map capacity.
    // We look through the heap to find the maximum line index that will exist *after* the shift.
    let maxAnticipatedLineIndex = start + count;
    for (let i = 0; i < oldSize; i++) {
      const currentLineIndex = this.heap[i * 2 + 1];
      if (currentLineIndex >= start) {
        const shiftedIndex = currentLineIndex + count;
        if (shiftedIndex > maxAnticipatedLineIndex) {
          maxAnticipatedLineIndex = shiftedIndex;
        }
      }
    }

    // Ensure the map can hold the largest line index we just calculated
    if (maxAnticipatedLineIndex >= this.lineIndexToHeapIndex.length) {
      this._resizeLineIndexToHeapIndexMap(maxAnticipatedLineIndex + 1);
    }

    // 2. Perform the safe index shift
    for (let i = 0; i < oldSize; i++) {
      const bufferIndex = i * 2;
      const currentLineIndex = this.heap[bufferIndex + 1];
      if (currentLineIndex >= start) {
        this.heap[bufferIndex + 1] = currentLineIndex + count;
      }
    }
    
    // 3. This is now 100% safe from out-of-bounds errors
    this.syncTrackingMap();
  }

  /** Call this after rebuilding to sync your lineIndexToHeapIndex lookup vector */
  syncTrackingMap() {
    // Blank out active boundaries
    this.lineIndexToHeapIndex.fill(-1);
    for (let i = 0; i < this.size; i++) {
      const lineIndex = this.heap[i * 2 + 1];
      this.lineIndexToHeapIndex[lineIndex] = i; 
    }
  }

  _resize() {
    this.capacity *= 2;
    const nextHeap = new Uint32Array(this.capacity * 2);
    nextHeap.set(this.heap);
    this.heap = nextHeap;
  }

  _resizeLineIndexToHeapIndexMap(newMinSize) {

    let newSize = this.lineIndexToHeapIndex.length * 2;
    if (newSize < newMinSize) { newSize = newMinSize; }

    const newMap = new Int32Array(newSize).fill(-1);
    newMap.set(this.lineIndexToHeapIndex);
    this.lineIndexToHeapIndex = newMap;
  }
}
