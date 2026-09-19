import "./src/RendererFiles/editorMaxHeap"

const maxHeap = new TrackingUint32MaxHeap();

maxHeap.insert(0, 0);
maxHeap.insert(1, 1);
maxHeap.insert(2, 2);
maxHeap.insert(3, 3);

consoleLogMaxHeapEntry(maxHeap.peek());
consoleLogMaxHeapEntry(maxHeap.extractMax());
consoleLogMaxHeapEntry(maxHeap.extractMax());

function consoleLogMaxHeapEntry(entry) {
    maxHeap.unpack(entry);
    console.log(`(${maxHeap.unpack_pool_index}, ${maxHeap.unpack_pool_length})`);
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
<
< Would you like to explore how to handle inserting/deleting whole lines in the middle of the document (which shifts subsequent line numbers down/up), or does your editor reuse fixed line structures?

> "how to handle inserting/deleting whole lines in the middle of the document"

< Handling line insertions or deletions in the middle of a document introduces a classic challenge:
< when a line is inserted at line 10, lines 11, 12, 13, etc., all have their line indices shifted up by 1.
<
< If you use raw line indices as the keys inside your packed 32-bit entries, a single insertion forces you to loop through and update almost every element in the heap,
< destroying your O(logN) performance and causing lag in large files. 
< 
< To solve this efficiently, you must decouple the heap from the physical, shifting line numbers. You can choose between two primary options depending on how your text editor's core data structure is built:
<
< Option 1: Use Unique, Persistent Line IDs (Highly Recommended)
<
< Instead of packing the shifting line number into the 32-bit entry, you pack a unique, immutable ID assigned to that line when it is created.
<
< How it works:
< 1. The Core Editor Structure: Your editor likely uses a B-Tree, Rope, or Piece Table to manage lines.
<    Each line object or block gets a unique, incremental ID (e.g., id = nextId++) that never changes, even if the line moves up or down in the document.
< 2. The Heap Structure: The heap packs the Persistent ID and the Length.
< 3. The Lookup Map: The positionMap translates Persistent ID -> Heap Index.
< 4. Finding the Longest Line: When extractMax() or peek() gives you the winning entry, you unpack the Persistent ID, and ask your main editor structure:
<    "Hey, what line number currently owns ID 502?" (Which a B-Tree or Rope can look up in O(logN) time).
< 
< Trade-off:
< - Pros: Complete separation of concerns. Inserting or deleting lines requires zero updates to the heap (other than inserting the single new line or removing the deleted one).
< - Cons: Requires your editor's main data structure to maintain a fast lookup or reference for line IDs.
<
< Option 2: An Implicit Heap via the Editor's Tree Structure
< If you want absolutely zero overhead from shifting indices, you shouldn't use a separate binary heap array at all. Instead, you integrate the "max length" logic directly into the text editor's internal tree structure (like a Rope or B-Tree).
<
< How it works:
< If your editor uses a tree structure where leaf nodes hold the actual text lines, you can augment every internal node in the tree to store a maxLength property.
<
< ```text
            [ Root: Max Length = 45 ]
           /                         \
  [ Node A: Max = 12 ]       [ Node B: Max = 45 ]
   /              \           /              \
Line 1 (Len: 8)  Line 2    Line 3 (Len: 45)  Line 4 (Len: 19)
< ```
<
< 1. Insertion/Deletion: When you insert a line or edit text, you modify a leaf node
< 2. Bubbling Up the Tree: You walk up from that leaf to the root node, updating the maxLength property of each parent by taking the Math.max(leftChild.maxLength, rightChild.maxLength).
< 3. Finding the Maximum: The root node always knows the length of the longest line instantly (O(1)). Finding exactly which line it is requires walking down the path of maximums, which takes \(O(\log N)\) steps. 
<
< Trade-off:
< - Pros: Updates, insertions, and deletions are handled naturally during the standard tree mutation. No separate positionMap array or bit-packing is required.
< - Cons: Requires you to write or heavily modify a tree-based document model rather than using a simple flat array.
<
< Comparion Matrix:
< 
< Operation                 | Option 1: Persistent IDs + Binary Heap          | Option 2: Augmented Tree (Rope/B-Tree)
< ---------------------------------------------------------------------------------------------------------------------------
< Line Text Edit            | O(logN) (Heap restructure)                      | O(logN) (Tree walk)
< Insert/Delete Line        | O(logN) (Only affects the target line)          | O(logN) (Natural tree mutation)
< Memory overhead           | Low (Uint32Array + Int32Array)                  | Moderate (Object references per node)
< Implementation Complexity | Low-Medium (Extends the heap you already wrote) | High (Requires a full tree-based text buffer)
<
< Which option aligns better with your project? If your editor uses a flat array of lines,
< Option 1 (Persistent IDs) is by far the easiest to plug into your existing code. Let me know if you want to write the ID mapping logic for it!

*/







