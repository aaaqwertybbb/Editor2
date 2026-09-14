/** TODO: Remove this class (enter key logic still uses it) */
class ByteList {
    bytes;
    capacity;
    count;

    constructor(initialCapacity) {
        // The Uint8Array avoids serialization during IPC
        this.bytes = new Uint8Array(initialCapacity);
        this.capacity = initialCapacity;
        this.count = 0;
    }

    /**
     * TODO: ensure all the parameters are encoded, especially because I'm noticing myself forgetting.
     */
    insert(index, byte) {
        this.ensureCapacityForInsertion(index, 1);

        if (index !== this.count) {
            this.copyTo(this.bytes, index, this.bytes, index + 1, this.count - index);
        }

        this.bytes[index] = byte;

        this.count++;
    }

    ensureCapacityForInsertion(index, count) {
        // TODO: sparse insertions?
        const requiredCapacity = Math.max(this.count + count, index);
        
        // If we already have enough capacity, do absolutely nothing
        if (requiredCapacity <= this.capacity) {
            return;
        }

        // Calculate the new capacity by doubling until it fits
        let capacityNew = this.capacity || 1; // Prevent infinite loops if capacity is 0
        while (capacityNew < requiredCapacity) {
            capacityNew *= 2;
        }

        // Safety check against integer overflow / negative bounds
        if (capacityNew < this.capacity) {
            throw new Error('ensureCapacityForInsertion(...): Capacity overflowed or went negative');
        }

        // Allocate and copy EXACTLY ONCE
        let bytesNew = new Uint8Array(capacityNew);
        this.copyTo(this.bytes, 0, bytesNew, 0, this.count);
        
        // Commit the changes to your global/module state
        this.bytes = bytesNew;
        this.capacity = capacityNew;
    }

    /**
     * inclusive/exclusive
     */
    copyTo(bytesSource, sourceStart, bytesDestination, destinationStart, length) {

        if (bytesSource === bytesDestination) {
            if (bytesSource !== this.bytes) {
                throw new Error('bytesSource === bytesDestination ; but bytesSource !== this');
            }

            this.bytes.copyWithin(destinationStart, sourceStart, sourceStart + length);
        }
        else {
            // TODO: use 'set' method here and other such locations
            for (var i = 0; i < length; i++) {
                bytesDestination[destinationStart + i] = bytesSource[sourceStart + i];
            }
        }
    }
}

class UInt32List {
    data;
    capacity;
    count;

    constructor(initialCapacity) {
        this.data = new Uint32Array(initialCapacity);
        this.capacity = initialCapacity;
        this.count = 0;
    }

    /**
     * Does not clear the information, only sets 'this.count' to '0'.
     */
    clear() {
        this.count = 0;
    }

    /**
     * TODO: ensure all the parameters are encoded, especially because I'm noticing myself forgetting.
     */
    insert(index, int32Value) {
        this.ensureCapacityForInsertion(index, 1);

        if (index !== this.count) {
            this.copyTo(this.data, index, this.data, index + 1, this.count - index);
        }

        this.data[index] = int32Value;

        this.count++;
    }

    /**
     * Does not clear trailing information.
     * 
     * count === 0 immediately returns
     */
    removeAt(index, count) {

        if (index > this.count) { throw new Error('removeAt(...): index > this.count'); }
        if (index + count > this.count) { throw new Error('removeAt(...): index + count > this.count'); }
        if (count === 0) { return; }

        if (index + count === this.count) {
            let shiftableCount = this.count - (index + count);
            if (shiftableCount > 0) {
                this.copyTo(
                    this.data,
                    index + count,
                    this.data,
                    index,
                    shiftableCount);
            }
        }
        else {
            this.copyTo(
                this.data,
                index + count,
                this.data,
                index,
                this.count - (index + count));
        }

        this.count -= count;
    }

    ensureCapacityForInsertion(index, count) {
        // TODO: sparse insertions?
        const requiredCapacity = Math.max(this.count + count, index);
        
        // If we already have enough capacity, do absolutely nothing
        if (requiredCapacity <= this.capacity) {
            return;
        }

        // Calculate the new capacity by doubling until it fits
        let capacityNew = this.capacity || 1; // Prevent infinite loops if capacity is 0
        while (capacityNew < requiredCapacity) {
            capacityNew *= 2;
        }

        // Safety check against integer overflow / negative bounds
        if (capacityNew < this.capacity) {
            throw new Error('ensureCapacityForInsertion(...): Capacity overflowed or went negative');
        }

        // Allocate and copy EXACTLY ONCE
        let dataNew = new Uint32Array(capacityNew);
        this.copyTo(this.data, 0, dataNew, 0, this.count);
        
        // Commit the changes to your global/module state
        this.data = dataNew;
        this.capacity = capacityNew;
    }

    /**
     * inclusive/exclusive
     */
    copyTo(bytesSource, sourceStart, bytesDestination, destinationStart, length) {

        if (bytesSource === bytesDestination) {
            if (bytesSource !== this.data) {
                throw new Error('bytesSource === bytesDestination ; but bytesSource !== this');
            }

            this.data.copyWithin(destinationStart, sourceStart, sourceStart + length);
        }
        else {
            // TODO: use 'set' method here and other such locations
            for (var i = 0; i < length; i++) {
                bytesDestination[destinationStart + i] = bytesSource[sourceStart + i];
            }
        }
    }
}
