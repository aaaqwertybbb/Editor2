//__#__
// preprocessor.cjs
import "./fieldBuffer"
//__#__

/**
 * TODO: long term 'EDI_getEntireLineVisualWidth' should be replaced by a lookup within 'EDI_trackingUint32MaxHeap'...
 * ...but currently there are some cases that are inaccurately updating this map.
 * As of writing this comment this is used to draw the horizontal width of the content relative to the longest line.
 */
let EDI_trackingUint32MaxHeap = new TrackingUint32MaxHeap();

/**
 * @type {UInt32List}
 */
let EDI_findOverlay_searchResultPositionList = null;

let EDI_textByteList_bytes = new Uint8Array(INTS[fEDI_textByteList_capacity]);

let EDI_lineStringCache = [];
let EDI_line_NUMBER_StringCache = [];
//let EDI_lineStringCache_capacity = [];
//let EDI_lineStringCache_count = [];

/**
 * When this is cleared the information is not removed, only 'gapBufferCount' is set to 0.
 */
const EDI_cursor_textInsertionBuffer = new Uint8Array(CONST_EDI_cursor_GAP_BUFFER_CAPACITY);

/**
 * TODO: This used to be const so make sure you check all the references that they weren't relying on that for either behavior or optimization.
 * TODO: Prior to this changing you need to finalize the edits
 */
let EDI_on_tab_bytes = new Uint8Array(1);
EDI_on_tab_bytes[0] = CONST_EDI_ASCII_TAB;
INTS[fEDI_ontab_visualWidth_perCharacter] = 4;

/**
 * When a cursor removes a line end the position of the line end is stored in this list until the edit is finalized.
 */
const EDI_lineEndPositionList_PENDING = new UInt32List(128);


/** Be wary to the possibility of pending edits causing this to not be up to date. */
let EDI_lineEndPositionList_data = new Uint32Array(INTS[fEDI_lineEndPositionList_capacity]);

let EDI_textSourceIdentifier = '';
let EDI_FORMATTED_textSourceIdentifier = '';

let EDI_lineEndString = null;

let EDI_documentSymbolResult = null;
/**
 * @type {ListComponent}
 */
let EDI_listComponent = null;

// Pre-allocate a typed array to prevent memory allocation during runtime
/**
 * TODO: If you queue more than 32 renderKinds in a single frame you're gonna lose information. (remedy this?) see 'BUFFER_SIZE = 32'
 */
const EDI_renderKindBuffer = new Uint8Array(BUFFER_SIZE);

let EDI_styleBuffer = new Uint8Array(0);

// Quick index token to color assignment map
const EDI_tokenColors = [
    '#d4d4d4', // Token 0: standardText
    '#CE9178', // Token 1: string
    '#6A9955', // Token 2: comment
    '#569CD6', // Token 3: keyword
    '#C586C0', // Token 4: keywordControl
    '#9CDCFE', // Token 5: identifier
    '#4EC9B0', // Token 6: type
    '#4FC1FF', // Token 7: member
    '#CECE84', // Token 8: function
    // 9 is hardcoded throughout the app to force write if you add another you need to start using 10 instead of 9 or etc...
];

/** decimal */
let EDI_lastReadNumber_scrollLeft = 0;
/** decimal */
let EDI_lastReadNumber_scrollTop = 0;

let EDI_characterWidth = 8;
//let EDI_character_count_that_fits_view = 100;

//let EDI_verticalCenterPadding = 0;
let EDI_textTopPadding = 3;

let EDI_cursor_cursorTranslateXValue = 0;

/**
 * Depending on 'BYTES[byteEDI_cursor_enterKeyEventKind]' this may either start OR end with '\n'.
 * 
 * Upon an enter keystroke this is inserted onto the newly added line.
 * 
 * The value is stored here to avoid high overhead from indentation matching when holding down the Enter key.
 * 
 * TODO: ^ that being said, you preferably wouldn't store this string allocation long term. If a more "localized" caching can be implemented, that would be preferable. (or the timing upon which this is set to null)
 * 
 * TODO: Don't null this just change the count to 0 and use a separate bool to indicate "nullness". UNLESS if clearing cache and this is for some reason MASSIVE idk maybe > 256 then maybe clear it idk
 * 
 * TODO: clear these when setting text, if not already? My code isn't working so I can't give a better TODO than this
 * 
 * @type {ByteList | null}
 */
let EDI_cursor_enterKey_newLinePlusIndentation_byteList = null;

/** Depending on 'BYTES[byteEDI_cursor_enterKeyEventKind]' this may either start OR end with '\n'. */
let EDI_cursor_cached_indentation_string = null;

// see: 'const byteEDI_clipboard_may_have_changed' in fieldBuffer.js
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 */
let EDI_cursor_EDI_paste_clipboardContent_string = null;
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 */
let EDI_cursor_EDI_paste_clipboardContent_bytes = null;
// see: 'const fEDI_cursor_EDI_paste_clipboardContent_totalLineEndCount' in fieldBuffer.js
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 * editPosition + this[i]
 * EOF style
 */
let EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS = null;
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 * EOF style
 * 
 * !!!! The first index of this has to be visual lengthed relative to the column index that you insert at as it cannot be known ahead of time, after the first tab or upon hitting a tab stop.
 */
let EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths = null;


// see: 'const byteEDI_duplication_may_have_changed' in fieldBuffer.js
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 */
//let EDI_cursor_EDI_duplication_string = null;
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 */
let EDI_cursor_EDI_duplication_bytes = null;
// see: 'const fEDI_cursor_EDI_duplication_totalLineEndCount' in fieldBuffer.js
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 * 
 * editPosition + this[i]
 * 
 * EOF style
 */
let EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS = null;
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 * EOF style
 */
let EDI_cursor_EDI_duplication_arrayLineVisualLengths = null;

/**
 * Google AI: "I want to make a Custom TextDecoder"
 * 
 * Lol I'm sitting here reading back the EDI_CustomDecoder while trying to find something to watch on youtube.
 * 
 * I saw `outStr += String.fromCharCode.apply(null, this.charBuffer.subarray(0, bufIdx));` and thought
 * "wtf is going on in this line".
 * 
 * New Thread with Google AI:
 * 
 * >
 * You generated the code that I'll put at the bottom of this prompt. It is MUCH faster than using TextDecoder for certain. But nevertheless I have a question about it.
 * ... (I put the entire class here)
 * 
 * <
 * The core issue with your code lies in how V8 handles argument passing for native builtins. Using String.fromCharCode.apply(null, typedArray)
 * is a hidden performance trap in V8 because it forces the engine to unpack the elements of your typed array onto the JavaScript call stack.
 * ...
 * 
 */
class EDI_CustomDecoder {
  constructor() {
    /**
     * TODO: Make chunkSize the amount of characters that can fit from viewport_0_pixel to viewport_whateverTheTotalPixelWidthOrWhatever_pixel but in character units of the monospace form...
     * ...just make sure you add a minimum so a small width screen doesn't thrash tokens.
     */
    this.chunkSize = 2048;
    this.charBuffer = new Uint16Array(this.chunkSize);
  }

  // High-performance V8 string builder helper
  _flushBuffer(bufIdx) {
    let chunkStr = '';
    for (let j = 0; j < bufIdx; j++) {
      chunkStr += String.fromCharCode(this.charBuffer[j]);
    }
    return chunkStr;
  }

  /**
   * Decodes an entire line's tokens, processes tabs, and populates lineSpans in a single method invocation.
   * 
   * @param {number} start - new_lineStart
   * @param {number} lineEnd - new_lineEnd
   * @param {Array} lineSpans - Cache array for this line's spans
   * @param {number} spanIndex - The starting span index to write to
   * @param {Array} tokenColors - EDI_tokenColors array/map
   * @param {object} tokenResult - Persistent state holder (for .bytes and .styles references)
   * @returns {number} The updated spanIndex count for the line
   */
  decodeLineTokens(start, lineEnd, lineSpans, spanIndex, tokenColors, tokenResult) {
    const sharedBytes = tokenResult.bytes;
    const styles = tokenResult.styles;
    const limit = this.chunkSize;

    let i = start;
    let col = 0; // Completely local counter now, no object tracking property needed!

    while (i < lineEnd) {
      let outStr = '';
      let bufIdx = 0;

      const initialStyleId = styles[i];

      // Inner token consumption loop: runs entirely inside local registers
      while (i < lineEnd) {
        if (styles[i] !== initialStyleId) {
          break; // Hit a token boundary, drop out to push this span
        }

        let codePoint = sharedBytes[i++];

        // FAST PATH: Horizontal tab (ASCII 9)
        if (codePoint === 0x09) {
          const spacesNeeded = 4 - (col & 3);
          col += spacesNeeded;
          
          for (let s = 0; s < spacesNeeded; s++) {
            this.charBuffer[bufIdx++] = 32; 
            if (bufIdx >= limit - 1) {
              outStr += this._flushBuffer(bufIdx);
              bufIdx = 0;
            }
          }
          continue;
        }

        // Multi-byte UTF-8 parsing
        if ((codePoint & 0x80) !== 0) {
          if ((codePoint & 0xE0) === 0xC0) {
            if (i < lineEnd) codePoint = ((codePoint & 0x1F) << 6) | (sharedBytes[i++] & 0x3F);
          }
          else if ((codePoint & 0xF0) === 0xE0) {
            if (i + 1 < lineEnd) {
              codePoint = ((codePoint & 0x0F) << 12) | 
                          ((sharedBytes[i++] & 0x3F) << 6) | 
                          (sharedBytes[i++] & 0x3F);
            }
          }
          else if ((codePoint & 0xF8) === 0xF0) {
            if (i + 2 < lineEnd) {
              codePoint = ((codePoint & 0x07) << 18) | 
                          ((sharedBytes[i++] & 0x3F) << 12) | 
                          ((sharedBytes[i++] & 0x3F) << 6) | 
                          (sharedBytes[i++] & 0x3F);
            }
          }
        }

        col++;

        if (codePoint <= 0xFFFF) {
          this.charBuffer[bufIdx++] = codePoint;
        } else {
          codePoint -= 0x10000;
          this.charBuffer[bufIdx++] = (codePoint >> 10) + 0xD800;
          this.charBuffer[bufIdx++] = (codePoint & 0x3FF) + 0xDC00;
        }

        if (bufIdx >= limit - 1) {
          outStr += this._flushBuffer(bufIdx);
          bufIdx = 0;
        }
      }

      // Flush remaining data for this token
      if (bufIdx > 0) {
        outStr += this._flushBuffer(bufIdx);
      }

      // Write token output directly into your line spans array record
      if (spanIndex < lineSpans.length) {
        const existingSpan = lineSpans[spanIndex++];
        existingSpan.text = outStr;
        existingSpan.color = tokenColors[initialStyleId];
      } else {
        lineSpans.push({
          text: outStr,
          color: tokenColors[initialStyleId]
        });
        spanIndex++;
      }
    }

    return spanIndex; // Return total parsed spans count for line cleanup
  }
}

const EDI_encoder = new TextEncoder();
const EDI_decoder = new TextDecoder();
const EDI_decoder_CUSTOM = new EDI_CustomDecoder();

//// Find-All for "EDI_debug_optimization" to find all the commented out logic that was related to this.
// let EDI_debug_optimization_has_logged_disassembleFunction = false;
// let EDI_debug_optimization_last_seen_code = -1;
// let EDI_debug_optimization_delay_heavy_logging = 4;
// let EDI_debug_optimization_run_count = 0;

/** invoked from requestAnimationFrame */
function EDI_init() {

    INTS[fEDI_gutterWidthTotal] = 60;

    EDI_state_setText_byteArray(new Uint8Array(16), /*textByteLength*/ 0, /*fileStartsWithBom*/ false, /*textSourceIdentifier*/ null, /*FORMATTED_textSourceIdentifier*/ null, /*extensionKind*/ 0, /*lineEndString*/ '\n', /*lineEndCount*/ 0);
    EDI_registerHandlers();
    EDI_render_do_Resize();
}

function EDI_createViewport() {
    EDI_render_request(RenderKind_CreateViewport);
}

function EDI_state_clear(trackingUint32MaxHeap_initialCapacity) {
    if (trackingUint32MaxHeap_initialCapacity === 0) {
        // 0 will break the capacity of the heap
        trackingUint32MaxHeap_initialCapacity = undefined;
    }

    EDI_finalizeEdit();
    EDI_cursor_clear();
    set_EDI_recentBoundingClientRect_isNull_intFalsey(1);
    EDI_textSourceIdentifier = '';
    EDI_FORMATTED_textSourceIdentifier = '';
    BYTES[byteEDI_extensionKind] = ExtensionKind_None;
    set_EDI_fileStartsWithBom(false);
    EDI_lineEndString = null;
    // TODO: Maybe re-use the 'TrackingUint32MaxHeap' rather than making a new one everytime
    EDI_trackingUint32MaxHeap = new TrackingUint32MaxHeap(trackingUint32MaxHeap_initialCapacity);
    INTS[fEDI_lineEndPositionList_count] = 0;
    INTS[fEDI_textByteList_count] = 0;
    INTS[fEDI_longestLine_indexLine] = 0;
    INTS[fEDI_longestLine_length] = 0;
    
    // TODO: This placement is slightly odd because the styleBuffer is made asynchronously and whether there could be a race condition that clears the styleBuffer you just received is uncertain (I just have not checked recently maybe I did when I first wrote it, it just looks odd though, need to check this).
    INTS[fEDI_styleBuffer_count] = 0;

    //EDI_lineStringCache = new Array(trackingUint32MaxHeap_initialCapacity);
}

function EDI_clear() {
    EDI_state_clear();
    EDI_render_request(RenderKind_Clear);
}

/**
 * TODO: assert that the function parameters fit the requirements as described in the respective param documentation.
 * @param {*} paddedUint8Array all line endings replaced by '\n' regardless of the desired line ending when saving the file (or copying text, etc...). 'paddedUint8Array.length' is not necessarily equal to 'textLength'. If you want to avoid reallocating when you type a single character. You can pad the uint8array, a padding of 1 gives a textLength of 'paddedUint8Array.length - 1'.
 * @param {*} lineEndString this is the desired line ending when saving the file (or copying text, etc...)
 */
function EDI_state_setText_byteArray(paddedUint8Array, textByteLength, fileStartsWithBom, textSourceIdentifier, FORMATTED_textSourceIdentifier, extensionKind, lineEndString, lineEndCount) {
    EDI_scroll_viewport.scrollTop = 0;
    EDI_scroll_viewport.scrollLeft = 0;
    EDI_lastReadNumber_scrollTop = 0;
    EDI_lastReadNumber_scrollLeft = 0;

    EDI_state_clear(lineEndCount);
    set_EDI_fileStartsWithBom(fileStartsWithBom);
    EDI_textSourceIdentifier = textSourceIdentifier;
    EDI_FORMATTED_textSourceIdentifier = FORMATTED_textSourceIdentifier;
    BYTES[byteEDI_extensionKind] = extensionKind;
    EDI_lineEndString = lineEndString;
    if (!EDI_lineEndString) {
        EDI_lineEndString = '\n';
    }

    EDI_textByteList_bytes = paddedUint8Array;
    INTS[fEDI_textByteList_capacity] = paddedUint8Array.length;
    const local_EDI_textByteList_bytes = EDI_textByteList_bytes;
    INTS[fEDI_textByteList_count] = textByteLength;
    const local_EDI_textByteList_count = INTS[fEDI_textByteList_count];

    if (lineEndCount === 0) {
        // TODO: Move this inside of 'EDI_lineEndPositionList_ensureCapacityForInsertion'?
        lineEndCount = 16;
    }
    EDI_lineEndPositionList_ensureCapacityForInsertion(0, lineEndCount);
    const local_EDI_lineEndPositionList_data = EDI_lineEndPositionList_data;

    const local_EDI_trackingUint32MaxHeap = EDI_trackingUint32MaxHeap;
    const local_EDI_trackingUint32MaxHeap_heap = local_EDI_trackingUint32MaxHeap.heap;
    const local_EDI_trackingUint32MaxHeap_lineIndexToHeapIndex = local_EDI_trackingUint32MaxHeap.lineIndexToHeapIndex;

    let lineLengthVisual = 0; /** TODO: Track the linePosition last seen when making a line or something you don't have to increment this per character, you just need the difference of the last line drawn to the current or something. */
    let local_EDI_lineEndPositionList_count = INTS[fEDI_lineEndPositionList_count];

    for (let sourceI = 0; sourceI < local_EDI_textByteList_count; ++sourceI) {
        ++lineLengthVisual; // avoid branching by eager counting the lineLengthVisual and then excluding the lineEnding later
        if (local_EDI_textByteList_bytes[sourceI] === CONST_EDI_ASCII_TAB) {
            lineLengthVisual += ((4 - ((lineLengthVisual - 1) % 4)) - 1); // (tab logic): avoid branching by eager counting... 'lineLengthVisual - 1... % 4)) - 1)'
        }
        else if (local_EDI_textByteList_bytes[sourceI] === CONST_EDI_ASCII_LINE_FEED) {
            local_EDI_lineEndPositionList_data[local_EDI_lineEndPositionList_count] = sourceI;
            // Directly stream data sequentially into the heap buffer without sorting yet
            const bufferIndex = local_EDI_lineEndPositionList_count * 2;
            local_EDI_trackingUint32MaxHeap_heap[bufferIndex] = lineLengthVisual - 1;     // length
            local_EDI_trackingUint32MaxHeap_heap[bufferIndex + 1] = local_EDI_lineEndPositionList_count; // lineIndex
            local_EDI_trackingUint32MaxHeap_lineIndexToHeapIndex[local_EDI_lineEndPositionList_count] = local_EDI_lineEndPositionList_count;
            //
            ++local_EDI_lineEndPositionList_count;
            lineLengthVisual = 0;
        }
    }

    local_EDI_lineEndPositionList_data[local_EDI_lineEndPositionList_count] = local_EDI_textByteList_count;
  
    // Directly stream data sequentially into the heap buffer without sorting yet
    const bufferIndex = local_EDI_lineEndPositionList_count * 2;
    local_EDI_trackingUint32MaxHeap_heap[bufferIndex] = lineLengthVisual;     // length
    local_EDI_trackingUint32MaxHeap_heap[bufferIndex + 1] = local_EDI_lineEndPositionList_count; // lineIndex
    local_EDI_trackingUint32MaxHeap_lineIndexToHeapIndex[local_EDI_lineEndPositionList_count] = local_EDI_lineEndPositionList_count;

    ++local_EDI_lineEndPositionList_count;
    INTS[fEDI_lineEndPositionList_count] = local_EDI_lineEndPositionList_count;

    local_EDI_trackingUint32MaxHeap.heapify(local_EDI_lineEndPositionList_count);
    local_EDI_trackingUint32MaxHeap.tryPooledPeek();
    INTS[fEDI_longestLine_indexLine] = local_EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
    INTS[fEDI_longestLine_length] = local_EDI_trackingUint32MaxHeap.unpack_pool_length;

    // TODO: Timing of 'EDI_render_do_SetText'...
    // ...probably what you can do is invoke the inner render requests directly...
    // ...but you'd still have a moment where they can click and the event sees current layout like scrollTop etc...
    EDI_render_request(RenderKind_SetText);
}

/**
 * @param {string} text 
 * @param {string} textSourceIdentifier I intend to have this be an absolute path. Then when the app saves a file, it can verify against the database that this absolute path is "safe" and then write to the file.
 * @param {string} lineEndString pass null (or do not include the parameter) to have line endings set to the first encountered kind in the text. Otherwise specify here. The string is used EXACTLY AS PROVIDED if non-falsey.
 */
function EDI_state_setText(text, fileStartsWithBom, textSourceIdentifier, FORMATTED_textSourceIdentifier, extensionKind, lineEndString) {
    if (!lineEndString) {
        const firstNewlineMatch = text.match(/\r?\n/);
        lineEndString = firstNewlineMatch ? firstNewlineMatch[0] : '\n';
    }

    const normalizedText = text.replaceAll('\r\n', '\n');
    const uint8Array = EDI_encoder.encode(normalizedText); /** how do I 'encodeInto' when a character might actually be multi-byte thus I don't ever truly know the size ahead of time? */
    let lineEndCount = countNewlines(text); // TODO: This using 'text' rather the 'normalizedText' feels upsetting at a glance.

    // TODO: add padding to this function's uint8Array.
    EDI_state_setText_byteArray(uint8Array, /*textByteLength*/ 0, fileStartsWithBom, textSourceIdentifier, FORMATTED_textSourceIdentifier, extensionKind, lineEndString, lineEndCount);
}

function countNewlines(sourceString) {
    let count = 0;
    let pos = sourceString.indexOf('\n');
    while (pos !== -1) {
        count++;
        pos = sourceString.indexOf('\n', pos + 1);
    }
    return count;
}



function EDI_indentMore() {
    let SMALL_pos;
    let LARGE_pos;
    if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
        SMALL_pos = INTS[fEDI_cursor_selectionAnchor];
        LARGE_pos = INTS[fEDI_cursor_selectionEnd];
    }
    else {
        SMALL_pos = INTS[fEDI_cursor_selectionEnd];
        LARGE_pos = INTS[fEDI_cursor_selectionAnchor];
    }

    EDI_ret_getLineAndColumnIndices_raw(SMALL_pos);
    let SMALL_lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];

    EDI_ret_getLineAndColumnIndices_raw(LARGE_pos);
    let LARGE_lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];

    // start at the LARGE position
    let startingIndex = LARGE_lineAndColumnIndices_indexLine;
    EDI_ret_getLineBoundaryPositions_raw(startingIndex);
    let startingLinePos_start = INTS[fEDI_ret_getLineBoundaryPositions_start];
    let startingLinePos_end = INTS[fEDI_ret_getLineBoundaryPositions_end];
    if (startingLinePos_start === LARGE_pos) {
        startingIndex -= 1;
        if (startingIndex >= 0) {
            EDI_ret_getLineBoundaryPositions_raw(startingIndex);
            startingLinePos_start = INTS[fEDI_ret_getLineBoundaryPositions_start]; // TODO: This updated start value isn't actually used. Keep it for symmetry with 'startingLinePos_end'?
            startingLinePos_end = INTS[fEDI_ret_getLineBoundaryPositions_end]; // TODO: Well actually this end value is used but you could move the if statement for 'INTS[fEDI_cursor_editLength_characters] === 0' and just immediately set 'INTS[fEDI_editret_indentLess_startingLinePos_end]' here...
                                                                           // ...This would avoid the symmetry issue because you updated a different value than the "end" so both values are still outdated rather than just 1.
        }
    }
    if (startingIndex < SMALL_lineAndColumnIndices_indexLine) {
        return;
    }

    INTS[fEDI_indent_SMALL_lineAndColumnIndices_indexLine] = SMALL_lineAndColumnIndices_indexLine;
    INTS[fEDI_indent_startingIndex] = startingIndex;

    if (INTS[fEDI_cursor_edit_eventCount_occurred] === 0) {
        INTS[fEDI_editret_indentLess_startingLinePos_end] = startingLinePos_end;
    } 

    // # Update the cursor's indexColumn to reflect the inserted text
    INTS[fEDI_cursor_indexColumn] += EDI_on_tab_bytes.length;
    INTS[fEDI_cursorVisualColumnIndex] += EDI_on_tab_bytes.length;

    INTS[fEDI_cursor_edit_eventCount_occurred]++;
    EDI_render_request(RenderKind_IndentMore);
}

function EDI_indentLess() {
    // selection positions
    let SMALL_pos;
    let LARGE_pos;
    if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
        SMALL_pos = INTS[fEDI_cursor_selectionAnchor];
        LARGE_pos = INTS[fEDI_cursor_selectionEnd];
    }
    else {
        SMALL_pos = INTS[fEDI_cursor_selectionEnd];
        LARGE_pos = INTS[fEDI_cursor_selectionAnchor];
    }

    EDI_ret_getLineAndColumnIndices_raw(SMALL_pos);
    let SMALL_lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
    
    EDI_ret_getLineAndColumnIndices_raw(LARGE_pos);
    let LARGE_lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];

    // starting index
    let startingIndex = LARGE_lineAndColumnIndices_indexLine;
    EDI_ret_getLineBoundaryPositions_raw(startingIndex);
    let startingLinePos_start = INTS[fEDI_ret_getLineBoundaryPositions_start];
    let startingLinePos_end = INTS[fEDI_ret_getLineBoundaryPositions_end];
    if (startingLinePos_start === LARGE_pos) {
        startingIndex -= 1;
        if (startingIndex >= 0) {
            EDI_ret_getLineBoundaryPositions_raw(startingIndex);
            startingLinePos_start = INTS[fEDI_ret_getLineBoundaryPositions_start]; // TODO: This updated start value isn't actually used. Keep it for symmetry with 'startingLinePos_end'?
            startingLinePos_end = INTS[fEDI_ret_getLineBoundaryPositions_end]; // TODO: Well actually this end value is used but you could move the if statement for 'INTS[fEDI_cursor_editLength_characters] === 0' and just immediately set 'INTS[fEDI_editret_indentLess_startingLinePos_end]' here...
                                                                           // ...This would avoid the symmetry issue because you updated a different value than the "end" so both values are still outdated rather than just 1.
        }
    }
    if (startingIndex < SMALL_lineAndColumnIndices_indexLine) {
        return;
    }

    INTS[fEDI_indent_SMALL_lineAndColumnIndices_indexLine] = SMALL_lineAndColumnIndices_indexLine;
    INTS[fEDI_indent_startingIndex] = startingIndex;

    if (INTS[fEDI_cursor_edit_eventCount_occurred] === 0) {
        INTS[fEDI_editret_indentLess_startingLinePos_end] = startingLinePos_end;
    }

    // TODO: Some kind of "fake" selection somehow because you really only need to modify the top-left most selection and the bottom-right most selection.
    // Then when you perhaps hit 'ctrl + c' to copy. You'd need to finalize the edit then and there so you copy the text correctly.
    //
    //if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
    //    INTS[fEDI_cursor_selectionEnd] -= ORIGINAL_decrementBy;
    //}
    //else {
    //    INTS[fEDI_cursor_selectionAnchor] -= ORIGINAL_decrementBy;
    //}

    INTS[fEDI_cursor_edit_eventCount_occurred]++;
    EDI_render_request(RenderKind_IndentLess);
}

/**
 * Invoking 'EDI_finalizeEdit()' is a good idea prior to invoking this. Long term perhaps this won't be so important.
 */
async function EDI_copySelection() {
	if (!EDI_cursor_hasSelection()) {
    	EDI_onMouseDownDetailRankThree(0, false, INTS[fEDI_cursor_indexLine], INTS[fEDI_cursor_indexColumn]);
	}
	let selectionAnchor = INTS[fEDI_cursor_selectionAnchor];
    let selectionEnd = INTS[fEDI_cursor_selectionEnd];
    let small;
    let large;
    if (selectionAnchor < selectionEnd) {
        small = selectionAnchor;
        large = selectionEnd;
    }
    else {
        small = selectionEnd;
        large = selectionAnchor;
    }
    await window.myAPI.editorSetClipboard(EDI_textByteList_bytes, small, large - small, EDI_lineEndString);
    BYTES[byteEDI_clipboard_may_have_changed] = 1;
}

/**
 * Invoking 'EDI_finalizeEdit()' is a good idea prior to invoking this. Long term perhaps this won't be so important.
 */
async function EDI_duplicateSelection() {
	if (!EDI_cursor_hasSelection()) {
    	EDI_onMouseDownDetailRankThree(0, false, INTS[fEDI_cursor_indexLine], INTS[fEDI_cursor_indexColumn]);
	}

	let selectionAnchor = INTS[fEDI_cursor_selectionAnchor];
    let selectionEnd = INTS[fEDI_cursor_selectionEnd];
    let small;
    let large;
    if (selectionAnchor < selectionEnd) {
        small = selectionAnchor;
        large = selectionEnd;
    }
    else {
        small = selectionEnd;
        large = selectionAnchor;
    }

    let length = large - small;

    INTS[fEDI_cursor_editPosition] = large;
    EDI_ret_getLineAndColumnIndices_raw(large);
    let large_lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
    let large_lineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
    INTS[fEDI_cursor_editIndexLine] = large_lineAndColumnIndices_indexLine;
    INTS[fEDI_cursor_editIndexColumn] = large_lineAndColumnIndices_indexColumn;
    INTS[fEDI_cursor_editLength_characters] = length;
    INTS[fEDI_cursor_edit_eventCount_occurred]++;

    INTS[fEDI_cursor_indexLine] = large_lineAndColumnIndices_indexLine;
    INTS[fEDI_cursor_indexColumn] = large_lineAndColumnIndices_indexColumn;
    INTS[fEDI_cursorVisualColumnIndex] = large_lineAndColumnIndices_indexColumn;

    INTS[fEDI_editret_cursor_EDI_duplicate_small] = small;
    INTS[fEDI_editret_cursor_EDI_duplicate_length] = length;

    INTS[fEDI_cursor_selectionAnchor] = large;
    INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
    INTS[fEDI_cursor_selectionEnd] = large + length;
    INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];

    EDI_read_duplication();

    // TODO: The previous render logic was actually moving the cursor as well. Just something to keep in mind, you might see a bug related to this.
    EDI_render_request(RenderKind_DuplicateOrPaste);
}

function EDI_paste() {
    INTS[fEDI_cursor_editPosition] = EDI_getPositionIndex_cursor_raw();
    INTS[fEDI_cursor_editIndexLine] = INTS[fEDI_cursor_indexLine];
    INTS[fEDI_cursor_editIndexColumn] = INTS[fEDI_cursor_indexColumn];
    INTS[fEDI_cursor_edit_eventCount_occurred]++;
    INTS[fEDI_cursor_editLength_characters] = EDI_cursor_EDI_paste_clipboardContent_bytes.length;

    // TODO: The previous render logic was actually moving the cursor as well. Just something to keep in mind, you might see a bug related to this.
    // TODO: ^Moving the cursor would be done here.
    EDI_render_request(RenderKind_DuplicateOrPaste);
}

function EDI_tabKey() {
    if (INTS[fEDI_cursor_edit_eventCount_occurred] === 0) {
        INTS[fEDI_cursor_editPosition] = EDI_getPositionIndex_cursor_raw();
        INTS[fEDI_cursor_editIndexLine] = INTS[fEDI_cursor_indexLine];
        INTS[fEDI_cursor_editIndexColumn] = INTS[fEDI_cursor_indexColumn];
    }

    INTS[fEDI_cursor_edit_eventCount_occurred]++;

    // TODO: I probably don't want these if else statements in here long term.
    if (EDI_on_tab_bytes.length === 4) {
        // 4 space characters are being inserted.
        INTS[fEDI_cursorVisualColumnIndex] += EDI_on_tab_bytes.length;
        INTS[fEDI_cursor_editLength_characters] += EDI_on_tab_bytes.length;
    }
    else {
        // 1 tab character ('\t') is being inserted
        // thus match visual width of the insertion to the next tab-stop.

        // Tab Length (L) = 4 - (col (mod 4));
        let tabLengthL = 4 - (INTS[fEDI_cursorVisualColumnIndex] % 4);
        INTS[fEDI_cursorVisualColumnIndex] += tabLengthL;
        INTS[fEDI_cursor_editLength_characters] += EDI_on_tab_bytes.length;
        if (INTS[fEDI_cursor_edit_eventCount_occurred] === 1) {
            //
            // TODO: Don't do this...
            // ...but the first tab might not be a tab-width of 4.
            // Since this code exists already that gets the tabLength,
            // and INTS[fEDI_cursor_edit_eventCount_occurred] was just incremented,
            // then if 'INTS[fEDI_cursor_edit_eventCount_occurred] === 1' then this is the tab being typed
            // of this edit batch.
            //
            // The 'INTS[fEDI_cursor_editLengthVisual]' isn't currently being used for
            // the tab key.
            // Thus I can store the first tab key's tabWidth in there.
            //
            // Then when finalizing the tab edit
            // I know every tab being inserted after the first is indeed a tabWidth of 4
            // so I just multiple 4 by editLength (amount of tabs to insert)
            // then I subtract 4 and then add 'INTS[fEDI_cursor_editLengthVisual]'.
            // or something like that.
            //
            INTS[fEDI_cursor_editLengthVisual] = tabLengthL;
        }
    }

    INTS[fEDI_cursor_indexColumn] += EDI_on_tab_bytes.length;

    INTS[fEDI_cursor_STORED_visualWidth] = INTS[fEDI_cursorVisualColumnIndex];
    EDI_render_request(RenderKind_TabKey);
}

/**
 * @param {boolean} ctrlKey 
 * @param {boolean} shiftKey 
 */
function EDI_EnterKey(ctrlKey, originalIndexLine, originalIndexColumn) {
    const lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(INTS[fEDI_cursor_indexLine]);

    if (INTS[fEDI_cursor_edit_eventCount_occurred] === 0) {
        BYTES[byteEDI_cursor_enterKeyEventKind] = EnterKeyEventKind_None;
        INTS[fEDI_cursor_editPosition] = EDI_getPositionIndex_cursor_raw();
        INTS[fEDI_cursor_editIndexLine] = INTS[fEDI_cursor_indexLine];
        INTS[fEDI_cursor_editIndexColumn] = INTS[fEDI_cursor_indexColumn];
    }

    if (BYTES[byteEDI_cursor_enterKeyEventKind] === 0) {
        if (INTS[fEDI_cursor_indexColumn] === 0 && lastValidIndexColumn !== 0) {
            BYTES[byteEDI_cursor_enterKeyEventKind] = EnterKeyEventKind_StartOfLine;
        }
        else {
            if (lastValidIndexColumn === INTS[fEDI_cursor_indexColumn]) {
                if (INTS[fEDI_cursor_editPosition] === INTS[fEDI_textByteList_count]) {
                    BYTES[byteEDI_cursor_enterKeyEventKind] = EnterKeyEventKind_EndOfFile;
                }
                else {
                    BYTES[byteEDI_cursor_enterKeyEventKind] = EnterKeyEventKind_EndOfLine;
                }
            }
            else {
                BYTES[byteEDI_cursor_enterKeyEventKind] = EnterKeyEventKind_AmongALine;
            }
        }
    }

    if (!ctrlKey)
        INTS[fEDI_cursor_indexLine]++;

    if (!EDI_cursor_enterKey_newLinePlusIndentation_byteList)
        EDI_cacheIndentation(originalIndexLine, originalIndexColumn, lastValidIndexColumn);

    const insertionCount = EDI_cursor_enterKey_newLinePlusIndentation_byteList.length;

    INTS[fEDI_cursor_indexColumn] = insertionCount - 1; // minus the newline
    INTS[fEDI_cursorVisualColumnIndex] = INTS[fEDI_cursor_cached_indentation_string_visualWidth]; // the indentation_string doesn't include the newline
    INTS[fEDI_cursor_editLength_characters] += insertionCount;
    INTS[fEDI_cursor_editLineFeedCount]++;
    INTS[fEDI_cursor_edit_eventCount_occurred]++;

    INTS[fEDI_cursor_END_editIndexLine] = INTS[fEDI_cursor_indexLine];
    INTS[fEDI_cursor_END_editIndexColumn] = INTS[fEDI_cursor_indexColumn];

    EDI_render_request(RenderKind_Enter);
}

/**
 * @returns 
 */
function EDI_removeSelection() {
    if (INTS[fEDI_cursor_editKind] != EditKind_None) {
        EDI_finalizeEdit();
    }

    let smallPosition;
    let largePosition;
    if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
        smallPosition = INTS[fEDI_cursor_selectionAnchor];
        largePosition = INTS[fEDI_cursor_selectionEnd];
    }
    else {
        smallPosition = INTS[fEDI_cursor_selectionEnd];
        largePosition = INTS[fEDI_cursor_selectionAnchor];
    }

    INTS[fEDI_editret_RemoveSelection_smallPosition] = smallPosition;
    INTS[fEDI_editret_RemoveSelection_largePosition] = largePosition;

    INTS[fEDI_cursor_selectionAnchor] = 0;
    INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = 0;
    INTS[fEDI_cursor_selectionEnd] = 0;
    INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];

    let editLength = largePosition - smallPosition;
    // editLength is 0 in this ...startEdit invocation intentionally, you cannot set the editLength until the end (TODO: remember what the exact reason was and put it here... I think it was because 'EDI_readLineEndPositionList' function is used rather than reading directly)
    EDI_startEdit(EditKind_RemoveTextNoBatching, smallPosition, /*editLength*/ 0);

    EDI_ret_getLineAndColumnIndices_raw(smallPosition);
    let smallLineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
    let smallLineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
    INTS[fEDI_editret_RemoveSelection_smallLineAndColumnIndices_small_indexLine] = smallLineAndColumnIndices_indexLine;
    INTS[fEDI_editret_RemoveSelection_smallLineAndColumnIndices_small_indexColumn] = smallLineAndColumnIndices_indexColumn;
    // TODO: Why is this set twice (seemingly redundantly) #EDI_removeSelection() (1 of 2)
    INTS[fEDI_cursor_indexLine] = smallLineAndColumnIndices_indexLine;
    INTS[fEDI_cursor_indexColumn] = smallLineAndColumnIndices_indexColumn;
    INTS[fEDI_cursorVisualColumnIndex] = smallLineAndColumnIndices_indexColumn;
    INTS[fEDI_cursor_editIndexLine] = smallLineAndColumnIndices_indexLine;
    INTS[fEDI_cursor_editIndexColumn] = smallLineAndColumnIndices_indexColumn;

    EDI_ret_getLineAndColumnIndices_raw(largePosition);
    let largeLineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
    let largeLineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
    INTS[fEDI_cursor_END_editIndexLine] = largeLineAndColumnIndices_indexLine;
    INTS[fEDI_cursor_END_editIndexColumn] = largeLineAndColumnIndices_indexColumn;

    // TODO: Why is this set twice (seemingly redundantly) #EDI_removeSelection() (2 of 2)
    INTS[fEDI_cursor_indexLine] = smallLineAndColumnIndices_indexLine;
    INTS[fEDI_cursor_indexColumn] = smallLineAndColumnIndices_indexColumn;
    INTS[fEDI_cursorVisualColumnIndex] = smallLineAndColumnIndices_indexColumn;

    INTS[fEDI_cursor_editLength_characters] = editLength;
    INTS[fEDI_cursor_edit_eventCount_occurred]++;
    
    INTS[fEDI_cursor_STORED_visualWidth] = INTS[fEDI_cursorVisualColumnIndex];

    EDI_render_request(RenderKind_RemoveSelection);
}

function EDI_state_do_Delete(event) {
    if (EDI_cursor_hasSelection()) {
        EDI_removeSelection();
        return;
    }

    let virtual_cursorIndexLine = INTS[fEDI_cursor_indexLine] + INTS[fEDI_cursor_editLineFeedCount];

    let virtual_cursorIndexColumn = INTS[fEDI_cursor_editLength_characters] - INTS[fEDI_cursor_edit_flagLineChanged];

    let lineEnd = EDI_getLineEnd_pos_raw(virtual_cursorIndexLine);
    let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(virtual_cursorIndexLine);

    // You might have to finalize when moving the cursor from this scenario though with ArrowAaa or mousedown
    // not necessarily impossible long term but short term you're gonna make a mess with this...
    // but it worth it?

    if (virtual_cursorIndexColumn === lastValidIndexColumn) {
        if (virtual_cursorIndexLine < INTS[fEDI_lineEndPositionList_count] - 1) {

            // flag the current editlength whenever u change lines so you can check the editlength relative to the line

            INTS[fEDI_cursor_editLength_characters]++;
            INTS[fEDI_cursor_editLineFeedCount]++;
            EDI_lineEndPositionList_PENDING.insert(EDI_lineEndPositionList_PENDING.count, lineEnd);

            INTS[fEDI_cursor_edit_flagLineChanged] = INTS[fEDI_cursor_editLength_characters];
        }
        else { // End of file
            return;
        }
    }
    else {

        // TODO: All in all I think you should just use the "visual corruption" logic that you have somewhere else in this file...
        // ...delete as if everything is a width of 1
        // ...if you see a tab you set a boolean
        // ...when done deleting everything if you check the boolean and it says you saw a tab you throw away the visual measurements and just "RESET" calculate it.
        //
        // TODO: no that isn't correct...
        // The problem with tabs is movement from right to left.
        // Delete key is left to right
        // You gotta look into every detail of this cause you don't fully remember all the details.
        // I do think there is something problematic with delete key but maybe you can solve it without a "RESET" due to the movement being left to right.

        if (event.ctrlKey) {
            // INTS[fEDI_cursor_editPosition] is intended to be equal due to the batch requirements / a new edit would also be equal.
            let tempIndexColumn = INTS[fEDI_cursor_indexColumn];
            let tempPosition = INTS[fEDI_cursor_editPosition];

            let originalCharacterKind;
            if (tempIndexColumn < lineEnd) {
                originalCharacterKind = EDI_getCharacterKind(String.fromCharCode(EDI_textByteList_bytes[tempPosition]));
            }
            else {
                originalCharacterKind = CharacterKind_None;
            }

            let thisCharacterKind = CharacterKind_None;
            
            tempIndexColumn++;
            tempPosition++;
            INTS[fEDI_cursor_editLength_characters]++;
            
            while (INTS[fEDI_cursor_indexColumn] < lastValidIndexColumn) {
                if (tempIndexColumn < lineEnd) {
                    thisCharacterKind = EDI_getCharacterKind(String.fromCharCode(EDI_textByteList_bytes[tempPosition]));
                }
                else {
                    thisCharacterKind = CharacterKind_None;
                }
                if (thisCharacterKind !== originalCharacterKind) {
                    break;
                }
                tempIndexColumn++;
                tempPosition++;
                INTS[fEDI_cursor_editLength_characters]++;
            }

            EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_editPosition]);
            EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_ret_getLineAndColumnIndices_indexLine]);
            EDI_ret_getIndexFromColumn_sameLine_newRxIsLarger(
                tempIndexColumn, INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end], INTS[fEDI_cursor_indexColumn], INTS[fEDI_cursorVisualColumnIndex]);
            let columnVisual = INTS[fEDI_ret_getIndexFromX_visualColumns];
            INTS[fEDI_cursor_editLengthVisual] += columnVisual - INTS[fEDI_cursorVisualColumnIndex];
        }
        else {
            // TODO: When a single delete key (non ctrl) causes a tab of length <4 to fall into a slot of 4 your (visual length of a line tracking) code breaks.
            //
            // subTODO: I wrote an example of the above TODO but it actually is describing something else.
            //          it is saying "a\t\t" delete 'a'
            // Example of the above TODO:
            // 3widthTab 4widthTab
            // delete event for 3widthTab
            // 4widthTab becomes a 3widthTab
            // delete event for the tab that became a 3widthTab
            //
            // erroneous: (delete 3widthTab) + (delete 3widthTab) => visual width edit of 6
            // reality:   (delete 3widthTab) + (delete 4widthTab) => visual width edit of 7
            //
            // Further explanation: consider if instead of pressing two distinct delete key events, you had pressed Ctrl + Delete.
            // 
            // TODO: You can fix this by doing some sort of reset-ish calculation for consecutive delete key presses that batch you recalculate the entire visual length instead of appending to a previous.

            INTS[fEDI_cursor_editLength_characters]++;
            INTS[fEDI_cursor_editLengthVisual]++;
            if (EDI_textByteList_bytes[INTS[fEDI_cursor_editPosition]] === CONST_EDI_ASCII_TAB) {
                let tabLength = 4 - (INTS[fEDI_cursorVisualColumnIndex] % 4);
                INTS[fEDI_cursor_editLengthVisual] += (tabLength - 1);
            }
        }
    }

    INTS[fEDI_cursor_edit_eventCount_occurred]++;
    EDI_render_request(RenderKind_DeleteLtr);
}

/**
 * @param {*} event 
 * @returns 
 */
function EDI_deleteDo(event) {
    EDI_state_do_Delete(event);
}

function EDI_state_do_Backspace(event) {
    if (EDI_cursor_hasSelection()) {
        EDI_removeSelection();
        return;
    }
    
    if (INTS[fEDI_cursor_indexColumn] === 0) {
        if (INTS[fEDI_cursor_indexLine] > 0) {

            // TODO: this logic is extremely suspect given editIndexLine and editIndexColumn...
            // ...as well if you move the cursor during a pending edit then finalize does it edit the correct positions?
            //
            // wrap to previous line
            INTS[fEDI_cursor_indexLine]--;
            INTS[fEDI_cursor_indexColumn] = EDI_getLastValidIndexColumn_raw(INTS[fEDI_cursor_indexLine]);
            INTS[fEDI_cursorVisualColumnIndex] = INTS[fEDI_cursor_indexColumn];
            INTS[fEDI_cursor_editPosition]--;
            INTS[fEDI_cursor_editLength_characters]++;
            INTS[fEDI_cursor_editIndexLine] = INTS[fEDI_cursor_indexLine];
            INTS[fEDI_cursor_editIndexColumn] = INTS[fEDI_cursor_indexColumn];

            INTS[fEDI_cursor_editLineFeedCount]++;
            EDI_lineEndPositionList_PENDING.insert(0, INTS[fEDI_cursor_editPosition]);
        }
        else {
            return;
        }
    }
    else {
        if (event.ctrlKey) {
            // INTS[fEDI_cursor_editPosition] is intended to be equal due to the batch requirements / a new edit would also be equal.
            let originalCharacterKind = EDI_getCharacterKind(String.fromCharCode(EDI_textByteList_bytes[INTS[fEDI_cursor_editPosition] - 1]));
            INTS[fEDI_cursor_editPosition]--;
            INTS[fEDI_cursor_editIndexColumn]--;
            INTS[fEDI_cursor_editLength_characters]++;
            INTS[fEDI_cursor_indexColumn]--;

            while (INTS[fEDI_cursor_indexColumn] > 0) {
                if (EDI_getCharacterKind(String.fromCharCode(EDI_textByteList_bytes[INTS[fEDI_cursor_editPosition] - 1])) !== originalCharacterKind) {
                    break;
                }
                INTS[fEDI_cursor_editPosition]--;
                INTS[fEDI_cursor_editIndexColumn]--;
                INTS[fEDI_cursor_editLength_characters]++;
                INTS[fEDI_cursor_indexColumn]--;
            }

            EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_editPosition]);
            EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_ret_getLineAndColumnIndices_indexLine]);
            EDI_ret_getIndexFromColumn_RESET(INTS[fEDI_cursor_indexColumn], INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
            let columnVisual = INTS[fEDI_ret_getIndexFromX_visualColumns];

            INTS[fEDI_cursor_editLengthVisual] += (INTS[fEDI_cursorVisualColumnIndex] - columnVisual);
            INTS[fEDI_cursorVisualColumnIndex] = columnVisual;
        }
        else {

            // TODO: I'm getting the sense that all visual updates should just be done immediately?...
            // ...but maybe it is sufficient to say that any multiline edits
            // the first and last line are the only ones that need to be updated
            // so doing a full reset for their visual length isn't the end of the world
            // no matter how many lines you selected it only is the first and last cause
            // any line between doesn't exist any more.

            INTS[fEDI_cursor_editPosition] -= 1;
            INTS[fEDI_cursor_editIndexColumn] -= 1;
            INTS[fEDI_cursor_editLength_characters]++;
            INTS[fEDI_cursor_editLengthVisual]++;
            INTS[fEDI_cursor_indexColumn] -= 1;
            INTS[fEDI_cursorVisualColumnIndex]--;
            if (EDI_textByteList_bytes[INTS[fEDI_cursor_editPosition]] === CONST_EDI_ASCII_TAB) {
                // Undo the default path to avoid branching on default path
                INTS[fEDI_cursor_editLengthVisual]--;
                INTS[fEDI_cursorVisualColumnIndex]++;

                // Now actually get the correct answer for tabs
                EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_editPosition]);
                EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_ret_getLineAndColumnIndices_indexLine]);
                EDI_ret_getIndexFromColumn_RESET(INTS[fEDI_cursor_indexColumn], INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
                let columnVisual = INTS[fEDI_ret_getIndexFromX_visualColumns];

                INTS[fEDI_cursor_editLengthVisual] += (INTS[fEDI_cursorVisualColumnIndex] - columnVisual);
                INTS[fEDI_cursorVisualColumnIndex] = columnVisual;
            }
        }
    }

    INTS[fEDI_cursor_edit_eventCount_occurred]++;
    EDI_render_request(RenderKind_BackspaceRtl);
}

/**
 * @param {*} event 
 * @returns 
 */
function EDI_backspaceDo(event) {
    EDI_state_do_Backspace(event);

    // EDI_render_request(RenderKind_BackspaceRtl);
    //
    // This is too confusing for me to read given my current mood / energy levels. (I tell myself it is just my current mood / energy levels to cope with my incompetence)
    // I'm just gonna isolate the code that doesn't remove a lineEnd and get that part working with 'EDI_render_request(RenderKind_BackspaceRtl);'
    // first.

    // I'm exhausted I'll probably do non-lineEnd delete key then be done
}

/**
 * @param {string} character 
 */
function EDI_insertDo(character) {
    EDI_cursor_textInsertionBuffer[INTS[fEDI_cursor_textInsertionBufferCount]] = character.charCodeAt(0);
    INTS[fEDI_cursor_textInsertionBufferCount]++;

    INTS[fEDI_cursor_edit_eventCount_occurred]++;
    INTS[fEDI_cursor_editLength_characters]++;
    INTS[fEDI_cursor_indexColumn]++;
    INTS[fEDI_cursorVisualColumnIndex]++;
}

//#region editEvent
/**
 * @param {*} clipboardContent This is a temporary hack to help in transitioning paste to an edit.
 */
function EDI_editEvent(editKind, event) {
    // check for pending => selection
    // if so then finalize all current pending
    // ...this actually is checking for selection, then presuming at least 1 cursor has a pending...
    let shouldFinalizeAllCursors = false;
    let atLeastOneCursorHasASelection = false;
    if (EDI_cursor_hasSelection()) {
        shouldFinalizeAllCursors = true;
        atLeastOneCursorHasASelection = true;
    }
    if (shouldFinalizeAllCursors) {

        shouldFinalizeAllCursors = false;
        
        if ((editKind === EditKind_Tab && INTS[fEDI_cursor_editKind] === EditKind_IndentMore) ||
            (editKind === EditKind_Tab && INTS[fEDI_cursor_editKind] === EditKind_IndentLess && event.shiftKey)) {

                // TODO: IndentLess when no selection however shiftTab then it does indentLess even still but I haven't gone out of the way to handle that hack...
                // ...maybe it'll be covered maybe it won't.

                // TODO: Rewrite this if statement (it is a hack for the moment while I get indent more of a single cursor to batch)
        }
        else {
            EDI_finalizeEdit();
        }
    }

    // If you have delete/backspace you need to ONLY remove the selection if it exists not remove selection then delete/backspace
    // but insert needs to remove selection AND insert.
    if (editKind === EditKind_InsertLtr || editKind === EditKind_Enter || editKind === EditKind_Paste) {
        // check for EditKind_None => selection
        // if so then attempt to remove selection foreach cursor
        // then finalize all those newly made selection removal edits
        if (atLeastOneCursorHasASelection) {
            shouldFinalizeAllCursors = true;
            if (EDI_cursor_hasSelection()) {
                EDI_removeSelection();
            }
        }
        if (shouldFinalizeAllCursors) {
            shouldFinalizeAllCursors = false;
            EDI_finalizeEdit();
        }
    }

    // check for NOTcanBatch... I don't want the switch in the for loop... if you have a selection then you have a not can batch?
    //
    // NOTcanBatch is bothersome to read, canBatch is a possibility?
    // 
    // The perspective of "NOTcanBatch" is confusing.
    // I thought this switch was over the current editKind.
    //
    // And the current editKind was checking whether the incoming event could batch with it.
    //
    // what this actually says is something like "the incoming event is checking whether the current editKind could batch with it"
    //
    // "current editKind"/"pending editKind"/"previous_and_not_yet_finalized editKind"
    //
    switch (editKind) {
        case EditKind_InsertLtr:
            shouldFinalizeAllCursors = EDI_NOTcanBatch_insert();
            break;
        case EditKind_DeleteLtr:
            shouldFinalizeAllCursors = EDI_NOTcanBatch_delete();
            break;
        case EditKind_BackspaceRtl:
            shouldFinalizeAllCursors = EDI_NOTcanBatch_backspace();
            break;
        case EditKind_Tab:
            // yeah "aaaa\t" all as one "edit" crashed the app
            shouldFinalizeAllCursors = EDI_editEvent_checkFor_NOTcanBatch_Tab(event);
            break;
        case EditKind_IndentMore:
            shouldFinalizeAllCursors = EDI_editEvent_checkFor_NOTcanBatch_IndentMore();
            break;
        case EditKind_IndentLess:
            shouldFinalizeAllCursors = EDI_editEvent_checkFor_NOTcanBatch_IndentLess();
            break;
        case EditKind_Enter:
            shouldFinalizeAllCursors = EDI_NOTcanBatch_enter();
            break;
        case EditKind_Paste:
            shouldFinalizeAllCursors = true;
            break;
        case EditKind_Duplicate:
            shouldFinalizeAllCursors = true;
            break;
        default:
            throw new Error(`The EditKind:${editKind} was not recognized.`);
    }
    if (shouldFinalizeAllCursors) {
        shouldFinalizeAllCursors = false;
        EDI_finalizeEdit();
    }

    // start/continue edit... I don't want the switch in the for loop
    switch (editKind) {
        case EditKind_InsertLtr:
            EDI_editEvent_theEditIself_InsertLtr(event);
            break;
        case EditKind_DeleteLtr:
            EDI_editEvent_theEditIself_DeleteLtr(event);
            break;
        case EditKind_BackspaceRtl:
            EDI_editEvent_theEditIself_BackspaceRtl(event);
            break;
        case EditKind_Tab:
            EDI_editEvent_theEditIself_Tab(event);
            break;
        case EditKind_Enter:
            EDI_editEvent_theEditIself_Enter(event);
            break;
        case EditKind_Paste:
            EDI_editEvent_theEditIself_Paste();
            break;
        case EditKind_Duplicate:
            EDI_editEvent_theEditIself_Duplicate();
            break;
        default:
            throw new Error(`The EditKind:${editKind} was not recognized.`);
    }
}

function EDI_editEvent_theEditIself_InsertLtr(event) {
    // You can do this because the function 'EDI_NOTcanBatch_insert' was already checked for all the cursors, if it is possible to batch, the editKind will stay InsertLtr otherwise it is finalized and set to None.
    // TODO: Use if === EditKind_None for copy and paste safety / it might just even be more readable
    if (INTS[fEDI_cursor_editKind] !== EditKind_InsertLtr) {
        EDI_startEdit(EditKind_InsertLtr, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
    }
    EDI_insertDo(event.key);
    INTS[fEDI_cursor_STORED_visualWidth] = INTS[fEDI_cursorVisualColumnIndex];
    EDI_render_request(RenderKind_Cursor_n);
    EDI_render_request(RenderKind_InsertLtr);
}

function EDI_editEvent_theEditIself_DeleteLtr(event) {
    if (EDI_cursor_hasSelection()) {
        EDI_removeSelection();
    }
    else {
        if (INTS[fEDI_cursor_editKind] !== EditKind_DeleteLtr) {
            EDI_startEdit(EditKind_DeleteLtr, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
        }
        EDI_deleteDo(event);
    }
    EDI_render_request(RenderKind_Cursor_n);
}

function EDI_editEvent_theEditIself_BackspaceRtl(event) {
    if (EDI_cursor_hasSelection()) {
        EDI_removeSelection();
    }
    else {
        if (INTS[fEDI_cursor_editKind] !== EditKind_BackspaceRtl) {
            EDI_startEdit(EditKind_BackspaceRtl, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
        }
        EDI_backspaceDo(event);
        INTS[fEDI_cursor_STORED_visualWidth] = INTS[fEDI_cursorVisualColumnIndex];
    }
    EDI_render_request(RenderKind_Cursor_n);
}

function EDI_editEvent_theEditIself_Tab(event) {
    if (EDI_cursor_hasSelection()) {
        if (event.shiftKey) {
            if (INTS[fEDI_cursor_editKind] !== EditKind_IndentLess) {
                EDI_startEdit(EditKind_IndentLess, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
            }
            EDI_indentLess();
        }
        else {
            if (INTS[fEDI_cursor_editKind] !== EditKind_IndentMore) {
                EDI_startEdit(EditKind_IndentMore, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
            }
            EDI_indentMore();
        }
    }
    else {
        if (event.shiftKey) {
            EDI_onMouseDownDetailRankThree(0, false, INTS[fEDI_cursor_indexLine], INTS[fEDI_cursor_indexColumn]);
            if (INTS[fEDI_cursor_editKind] !== EditKind_IndentLess) {
                EDI_startEdit(EditKind_IndentLess, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
            }
            EDI_indentLess();
        }
        else {
            if (INTS[fEDI_cursor_editKind] !== EditKind_Tab) {
                EDI_startEdit(EditKind_Tab, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
            }
            EDI_tabKey();
        }
    }
    EDI_render_request(RenderKind_Cursor_n);
}

function EDI_editEvent_theEditIself_Enter(event) {
    const originalIndexLine = INTS[fEDI_cursor_indexLine];
    const originalIndexColumn = INTS[fEDI_cursor_indexColumn];

    if (INTS[fEDI_cursor_editKind] !== EditKind_Enter) {
        if (event.ctrlKey) {
            if (INTS[fEDI_cursor_indexColumn] !== 0) {
                INTS[fEDI_cursor_indexColumn] = 0;
            }
        }
        else if (event.shiftKey) {
            const lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(INTS[fEDI_cursor_indexLine]);
            if (INTS[fEDI_cursor_indexColumn] !== lastValidIndexColumn) {
                INTS[fEDI_cursor_indexColumn] = lastValidIndexColumn;
            }
        }
        EDI_startEdit(EditKind_Enter, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
    }
    
    EDI_EnterKey(event.ctrlKey, originalIndexLine, originalIndexColumn);
    INTS[fEDI_cursor_STORED_visualWidth] = INTS[fEDI_cursorVisualColumnIndex];
    EDI_render_request(RenderKind_Cursor_n);
}

function EDI_editEvent_theEditIself_Paste() {
    if (INTS[fEDI_cursor_editKind] !== EditKind_Enter) {
        EDI_startEdit(EditKind_Paste, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
    }
    EDI_paste();
    INTS[fEDI_cursor_STORED_visualWidth] = INTS[fEDI_cursorVisualColumnIndex];
    EDI_render_request(RenderKind_Cursor_n);
}

function EDI_editEvent_theEditIself_Duplicate() {
    if (INTS[fEDI_cursor_editKind] !== EditKind_Duplicate) {
        EDI_startEdit(EditKind_Duplicate, EDI_getPositionIndex_cursor_raw(), /*editLength*/ 0);
    }
    EDI_duplicateSelection();
    INTS[fEDI_cursor_STORED_visualWidth] = INTS[fEDI_cursorVisualColumnIndex];
    EDI_render_request(RenderKind_Cursor_n);
}

/**
 * @returns 
 */
function EDI_NOTcanBatch_insert() {
    return INTS[fEDI_cursor_editKind] != EditKind_InsertLtr ||
           INTS[fEDI_cursor_indexLine] !== INTS[fEDI_cursor_editIndexLine] ||
           INTS[fEDI_cursor_indexColumn] !== INTS[fEDI_cursor_editIndexColumn] + INTS[fEDI_cursor_editLength_characters] ||
           INTS[fEDI_cursor_editLength_characters] >= CONST_EDI_cursor_GAP_BUFFER_CAPACITY ||
           EDI_cursor_hasSelection();
}

/**
 * @returns 
 */
function EDI_NOTcanBatch_enter() {
    return BYTES[byteEDI_cursor_enterKeyEventKind] === EnterKeyEventKind_None ||
           INTS[fEDI_cursor_editKind] !== EditKind_Enter ||
           INTS[fEDI_cursor_indexLine] !== INTS[fEDI_cursor_END_editIndexLine] ||
           INTS[fEDI_cursor_indexColumn] !== INTS[fEDI_cursor_END_editIndexColumn] ||
           INTS[fEDI_cursor_editLength_characters] >= CONST_EDI_cursor_GAP_BUFFER_CAPACITY ||
           !EDI_cursor_enterKey_newLinePlusIndentation_byteList ||
           EDI_cursor_hasSelection();
}

/**
 * @returns 
 */
function EDI_NOTcanBatch_backspace() {
    return INTS[fEDI_cursor_editKind] != EditKind_BackspaceRtl ||
           INTS[fEDI_cursor_indexLine] !== INTS[fEDI_cursor_editIndexLine] ||
           INTS[fEDI_cursor_indexColumn] !== INTS[fEDI_cursor_editIndexColumn] ||
           EDI_cursor_hasSelection();
}

/**
 * @returns 
 */
function EDI_NOTcanBatch_delete() {
    return INTS[fEDI_cursor_editKind] != EditKind_DeleteLtr ||
           INTS[fEDI_cursor_indexLine] !== INTS[fEDI_cursor_editIndexLine] ||
           INTS[fEDI_cursor_indexColumn] !== INTS[fEDI_cursor_editIndexColumn] ||
           EDI_cursor_hasSelection();
}

/** @returns {boolean} 'shouldFinalizeAllCursors' */
function EDI_editEvent_checkFor_NOTcanBatch_Tab(event) {
    if (EDI_cursor_hasSelection() && !event.shiftKey) {
        return EDI_editEvent_checkFor_NOTcanBatch_IndentMore();
    }
    else if (EDI_cursor_hasSelection() && event.shiftKey) {
        // TODO: write 'if (EDI_cursor_hasSelection())' then nest these in the same wrapping if statement.
        return EDI_editEvent_checkFor_NOTcanBatch_IndentLess();
    }
    else if (!EDI_cursor_hasSelection()) {
        if (event.shiftKey) {
            return EDI_editEvent_checkFor_NOTcanBatch_IndentLess();
        }
        else {
            if (INTS[fEDI_cursor_editKind] === EditKind_Tab &&
                INTS[fEDI_cursor_editIndexLine] === INTS[fEDI_cursor_indexLine] &&
                INTS[fEDI_cursor_editIndexColumn] + INTS[fEDI_cursor_editLength_characters] === INTS[fEDI_cursor_indexColumn] &&
                INTS[fEDI_cursor_editLength_characters] < CONST_EDI_cursor_GAP_BUFFER_CAPACITY) {
                    return false;
            }
        }
    }

    return true;
}

/**
 * @returns {boolean} 'shouldFinalizeAllCursors'
 * 
 * TODO: This function never is "naturally" invoked because all tab keypresses start with a 'Tab' edit event and only convert to indentMore downstream
 * 
 */
function EDI_editEvent_checkFor_NOTcanBatch_IndentMore() {
    if (INTS[fEDI_cursor_editKind] !== EditKind_IndentMore) {
        return true;
    }
    
    let SMALL_pos;
    let LARGE_pos;
    if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
        SMALL_pos = INTS[fEDI_cursor_selectionAnchor];
        LARGE_pos = INTS[fEDI_cursor_selectionEnd];
    }
    else {
        SMALL_pos = INTS[fEDI_cursor_selectionEnd];
        LARGE_pos = INTS[fEDI_cursor_selectionAnchor];
    }

    EDI_ret_getLineAndColumnIndices_raw(SMALL_pos);
    let SMALL_lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];

    EDI_ret_getLineAndColumnIndices_raw(LARGE_pos);
    let LARGE_lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];

    // start at the LARGE position
    let startingIndex = LARGE_lineAndColumnIndices_indexLine;
    EDI_ret_getLineBoundaryPositions_raw(startingIndex);
    let startingLinePos_start = INTS[fEDI_ret_getLineBoundaryPositions_start];
    if (startingLinePos_start === LARGE_pos) {
        startingIndex -= 1;
        if (startingIndex >= 0) { // TODO: This if statement is NOT used in this specific case. It was copy and pasted from somewhere that it IS used, i.e.: TODO: remove it from this function?
            EDI_ret_getLineBoundaryPositions_raw(startingIndex);
            startingLinePos_start = INTS[fEDI_ret_getLineBoundaryPositions_start]
        }
    }
    if (startingIndex < SMALL_lineAndColumnIndices_indexLine) {
        return true;
    }

    if (INTS[fEDI_indent_SMALL_lineAndColumnIndices_indexLine] === SMALL_lineAndColumnIndices_indexLine &&
        INTS[fEDI_indent_startingIndex] === startingIndex) {
            return false;
    }

    // TODO: if "fEDI_cursor_editLength_characters" > "..." then finalize the edit? or no limit on edit length per batch for indent more?...
    // ...maybe there already is one idk

    return true;
}

/**
 * @returns {boolean} 'shouldFinalizeAllCursors'
 * 
 * TODO: This function never is "naturally" invoked because all tab keypresses start with a 'Tab' edit event and only convert to indentLess downstream
 * 
 */
function EDI_editEvent_checkFor_NOTcanBatch_IndentLess() {
    if (INTS[fEDI_cursor_editKind] !== EditKind_IndentLess) {
        return true;
    }
    
    let SMALL_pos;
    let LARGE_pos;
    if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
        SMALL_pos = INTS[fEDI_cursor_selectionAnchor];
        LARGE_pos = INTS[fEDI_cursor_selectionEnd];
    }
    else {
        SMALL_pos = INTS[fEDI_cursor_selectionEnd];
        LARGE_pos = INTS[fEDI_cursor_selectionAnchor];
    }

    // TODO: You could probably have cache for these things too, like if the batch is "complex" to calculate you cache some of the repeated computation.
    EDI_ret_getLineAndColumnIndices_raw(SMALL_pos);
    let SMALL_lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];

    EDI_ret_getLineAndColumnIndices_raw(LARGE_pos);
    let LARGE_lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];

    // start at the LARGE position
    let startingIndex = LARGE_lineAndColumnIndices_indexLine;
    EDI_ret_getLineBoundaryPositions_raw(startingIndex);
    let startingLinePos_start = INTS[fEDI_ret_getLineBoundaryPositions_start];
    if (startingLinePos_start === LARGE_pos) {
        startingIndex -= 1;
        if (startingIndex >= 0) { // TODO: This if statement is NOT used in this specific case. It was copy and pasted from somewhere that it IS used, i.e.: TODO: remove it from this function?
            EDI_ret_getLineBoundaryPositions_raw(startingIndex);
            startingLinePos_start = INTS[fEDI_ret_getLineBoundaryPositions_start];
        }
    }
    if (startingIndex < SMALL_lineAndColumnIndices_indexLine) {
        return;
    }

    if (INTS[fEDI_indent_SMALL_lineAndColumnIndices_indexLine] === SMALL_lineAndColumnIndices_indexLine &&
        INTS[fEDI_indent_startingIndex] === startingIndex) {
            return false;
    }

    // TODO: if "fEDI_cursor_editLength_characters" > "..." then finalize the edit? or no limit on edit length per batch for indent less?...
    // ...maybe there already is one idk

    return true;
}
//#endregion

//#region finalize
/**
 * TODO: Exception during finalize softlocks the editor because you can't even clear to reset the state: 'Uncaught (in promise) Error: removeAt(...): index > this.count'
 * 
 * Retrospectively I'd say... I imagine there'd be more than one scenario of this I have a lot of 'critical booleans'.
 * i.e.: if you enter the 'critical boolean guarded code path' then throw an exception in the middle of that code path with bad state for the 'critical boolean guarded code path' you might never be able to enter it again.
 * i.e.: I don't see this happen myself unless I'm messing with new code and running the code that I am in progress of writing. But I don't have a try catch so if an error were to occur it'd completely softlock things.
 */
function EDI_finalizeEdit() {
    /**
     * Later code needs to know the line index that the removal occurred on.
     * In a naive approach, presume every edit only spans a single line.
     * Then reversing backwards gets you the first line index that "fits" the edit and thus the line index the edit occurred on.
     * 
     * If for whatever reason the first time around this loop fails, then you never decremented so you wouldn't increment to restore
     * the iteration variable to the previous loop's state.
     */
    let indexLine_editOccurredOn = -1;

    switch (INTS[fEDI_cursor_editKind]) {
        case EditKind_InsertLtr:
            indexLine_editOccurredOn = EDI_finalizeEdit_InsertLtr(indexLine_editOccurredOn);
            break;
        case EditKind_Enter:
            indexLine_editOccurredOn = EDI_finalizeEdit_Enter(indexLine_editOccurredOn);
            return;
        case EditKind_Tab:
            indexLine_editOccurredOn = EDI_finalizeEdit_Tab(indexLine_editOccurredOn);
            return;
        case EditKind_IndentMore:
            indexLine_editOccurredOn = EDI_finalizeEdit_IndentMore(indexLine_editOccurredOn);
            return;
        case EditKind_IndentLess:
            indexLine_editOccurredOn = EDI_finalizeEdit_IndentLess(indexLine_editOccurredOn);
            break;
        case EditKind_Paste:
            indexLine_editOccurredOn = EDI_finalizeEdit_Paste(indexLine_editOccurredOn);
            return;
        case EditKind_Duplicate:
            indexLine_editOccurredOn = EDI_finalizeEdit_Duplicate(indexLine_editOccurredOn);
            return;
        case EditKind_DeleteLtr:
        case EditKind_BackspaceRtl:
        case EditKind_RemoveTextNoBatching:
            indexLine_editOccurredOn = EDI_finalizeEdit_DeleteLtr_BackspaceRtl_RemoveTextNoBatching(indexLine_editOccurredOn);
            break;
    }
}

function EDI_finalizeEdit_InsertLtr(indexLine_editOccurredOn) {
    if (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        EDI_render_do_InsertLtr();
    }

    // given the current state of the following for loop, you do indeed need this set to 0 otherwise the 0th line will not track visual length properly cause it'll try to update a line index of '-1' in the heap.
    indexLine_editOccurredOn = 0;
    for (let i = INTS[fEDI_lineEndPositionList_count] - 1; i >= 0; i--) {
        if (INTS[fEDI_cursor_editPosition] <= EDI_lineEndPositionList_data[i]) {
            EDI_lineEndPositionList_data[i] += INTS[fEDI_cursor_editLength_characters];
        }
        else {
            if (i === INTS[fEDI_lineEndPositionList_count] - 1) {
                indexLine_editOccurredOn = i;
            }
            else {
                indexLine_editOccurredOn = i + 1;
            }
            break;
        }
    }
    EDI_textByteList_insertBytes(INTS[fEDI_cursor_editPosition], EDI_cursor_textInsertionBuffer, /*offset*/ 0, /*length*/ INTS[fEDI_cursor_textInsertionBufferCount]);
    // TODO: ensure 'EDI_styleBuffer' count has 'INTS[fEDI_cursor_editPosition]' in range / ensure it is equal with 'EDI_textByteList' count/capacity?
    if (INTS[fEDI_styleBuffer_count] !== 0) {
        EDI_styleBuffer_insertBytes(INTS[fEDI_cursor_editPosition], new Uint8Array(INTS[fEDI_cursor_textInsertionBufferCount]), 0, INTS[fEDI_cursor_textInsertionBufferCount]);
    }

    sendTransaction_MessageKind_custom_edit_InsertLtr(INTS[fEDI_cursor_editPosition], EDI_cursor_textInsertionBuffer.subarray(0, INTS[fEDI_cursor_textInsertionBufferCount]));

    EDI_trackingUint32MaxHeap.updateLength_diff(indexLine_editOccurredOn, INTS[fEDI_cursor_editLength_characters]);
    if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
        (INTS[fEDI_longestLine_length] !== EDI_trackingUint32MaxHeap.unpack_pool_length || INTS[fEDI_longestLine_indexLine] !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
            INTS[fEDI_longestLine_indexLine] = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
            INTS[fEDI_longestLine_length] = EDI_trackingUint32MaxHeap.unpack_pool_length;
            requestAnimationFrame(EDI_drawHorizontalScrollbar);
    }
    
    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

function EDI_finalizeEdit_Enter(indexLine_editOccurredOn) {
    if (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        EDI_render_do_EnterKey();
    }

    // throws an exception if 'EnterKeyEventKind_None' (...or falsey).
    if (!BYTES[byteEDI_cursor_enterKeyEventKind] || BYTES[byteEDI_cursor_enterKeyEventKind] === EnterKeyEventKind_None) { EDI_finalizeEdit_ClearEditState(); throw new Error('if (!enterKeyEventKind...)'); }

    const per_edit_insertionCount = EDI_cursor_enterKey_newLinePlusIndentation_byteList.length;
    
    let actualEditPosition = INTS[fEDI_cursor_editPosition];
    let actualLineFeedPosition = actualEditPosition;
    let actualIndexLine = INTS[fEDI_cursor_editIndexLine];
    let actualNewLineVisualWidth = INTS[fEDI_cursor_cached_indentation_string_visualWidth];
    
    let specialCase_number = 0;
    let specialCase_firstLineIndexInserted = 0; // TODO: This is probably the lineIndex you end up on after the loop minus some number, maybe 'INTS[fEDI_cursor_editLineFeedCount]'.

    if (BYTES[byteEDI_cursor_enterKeyEventKind] === EnterKeyEventKind_EndOfLine) {
        actualEditPosition++; // Move past the current line's '\n'
        actualLineFeedPosition = actualEditPosition;
        actualLineFeedPosition += per_edit_insertionCount - 1;
        actualIndexLine++;
    }
    else if (BYTES[byteEDI_cursor_enterKeyEventKind] === EnterKeyEventKind_EndOfFile) {
        specialCase_firstLineIndexInserted = actualIndexLine;
        const lastLineIndex = INTS[fEDI_lineEndPositionList_count] - 1;
        specialCase_number = EDI_trackingUint32MaxHeap.getLength(lastLineIndex);
        EDI_trackingUint32MaxHeap.updateLength(lastLineIndex, actualNewLineVisualWidth);
    }
    else if (BYTES[byteEDI_cursor_enterKeyEventKind] === EnterKeyEventKind_StartOfLine) {
        // Contrary to 'EnterKeyEventKind_EndOfLine' this case actually does NOT have to move past the "current line's '\n'"
        // NOTE: Ctrl + Enter keybind is a known case for why this line of code is needed, perhaps there are more that will come later I have no idea.
        actualLineFeedPosition += per_edit_insertionCount - 1;
    }
    else if (BYTES[byteEDI_cursor_enterKeyEventKind] === EnterKeyEventKind_AmongALine) {
        EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_editIndexLine]);
        const lineStart = INTS[fEDI_ret_getLineBoundaryPositions_start];
        const lineEnd = INTS[fEDI_ret_getLineBoundaryPositions_end];
        EDI_ret_getIndexFromColumn_RESET(INTS[fEDI_cursor_editIndexColumn], lineStart, lineEnd);
        let firstSplitVisualWidth = INTS[fEDI_ret_getIndexFromX_visualColumns];
        let lastValidIndexColumn = lineEnd - lineStart;
        EDI_ret_getIndexFromColumn_sameLine_newRxIsLarger(
            lastValidIndexColumn,
            lineStart,
            lineEnd,
            INTS[fEDI_cursor_editIndexColumn],
            firstSplitVisualWidth);
        let lastSplitVisualWidth = INTS[fEDI_ret_getIndexFromX_visualColumns] - firstSplitVisualWidth;
        EDI_trackingUint32MaxHeap.updateLength(INTS[fEDI_cursor_editIndexLine], actualNewLineVisualWidth + lastSplitVisualWidth);
        specialCase_firstLineIndexInserted = actualIndexLine;
        specialCase_number = firstSplitVisualWidth;
    }

    for (var i = actualIndexLine; i < INTS[fEDI_lineEndPositionList_count]; i++) {
        EDI_lineEndPositionList_data[i] += INTS[fEDI_cursor_editLength_characters];
    }

    let bytes = EDI_cursor_enterKey_newLinePlusIndentation_byteList;
    const per_edit_length = bytes.length;
    let length = per_edit_length;

    if (INTS[fEDI_cursor_editLineFeedCount] > 1) {
        length *= INTS[fEDI_cursor_editLineFeedCount];
        const src_bytes = bytes;
        bytes = new Uint8Array(length);
        // TODO: typed array function usage
        for (let i = 0; i < length; i += per_edit_length) {
            // TODO: Why is this not using 'bytes.set(src_bytes, i)'?
            for (let k = 0; k < per_edit_length; k++) {
                bytes[i + k] = src_bytes[k];
            }
        }
    }

    EDI_textByteList_insertBytes(actualEditPosition, bytes, /*offset*/ 0, length);
    // TODO: ensure 'EDI_styleBuffer' count has 'INTS[fEDI_cursor_editPosition]' in range / ensure it is equal with 'EDI_textByteList' count/capacity?
    if (INTS[fEDI_styleBuffer_count] !== 0) {
        EDI_styleBuffer_insertBytes(actualEditPosition, new Uint8Array(bytes.length), 0, bytes.length);
    }

    sendTransaction_MessageKind_custom_edit_InsertLtr(actualEditPosition, bytes);

    // TODO: bulk insertion of lines
    for (let i = 0; i < INTS[fEDI_cursor_editLineFeedCount]; i++) {
        EDI_lineEndPositionList_insert(actualIndexLine, actualLineFeedPosition, actualNewLineVisualWidth);
        actualIndexLine++;
        actualLineFeedPosition += per_edit_insertionCount;
    }

    if (BYTES[byteEDI_cursor_enterKeyEventKind] === EnterKeyEventKind_EndOfFile) {
        EDI_trackingUint32MaxHeap.updateLength(specialCase_firstLineIndexInserted, specialCase_number);
        if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
            (INTS[fEDI_longestLine_length] !== EDI_trackingUint32MaxHeap.unpack_pool_length || INTS[fEDI_longestLine_indexLine] !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
                // "aaa\n" => 'EDI_lineEndPositionList_insert' causes a temporary longest line index is 1 and the longest line length is 0
                // that needs to be overwritten.
                // The example is "as you type it" so the '\n' gets finalized and that's when you see the wrong answer it is only temporary due to 'EDI_lineEndPositionList_insert'.
                //
                // TODO: This should be looked into a bit more?
                //
                // Of course this is happening updateLength doesn't draw the UI?
                // 
                // yeah cause you lost the longest line temporarily you moved it into the specialCase variables.
                // Then updated the EOF to have the length of the indentation.
                // So then EDI_lineEndPositionList_insert(...) internally updates the UI and it doesn't see the "specialCase variable's visual length existing in the heap" anymore
                // and it took the line you just added like if both end up 0 it's just w/e the algorithm picked one or the other due to some tiebreaker cause you only had the 2 lines
                //
                INTS[fEDI_longestLine_indexLine] = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
                INTS[fEDI_longestLine_length] = EDI_trackingUint32MaxHeap.unpack_pool_length;
                requestAnimationFrame(EDI_drawHorizontalScrollbar);
        }
    }
    else if (BYTES[byteEDI_cursor_enterKeyEventKind] === EnterKeyEventKind_AmongALine) {
        EDI_trackingUint32MaxHeap.updateLength(specialCase_firstLineIndexInserted, specialCase_number);
        if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
            (INTS[fEDI_longestLine_length] !== EDI_trackingUint32MaxHeap.unpack_pool_length || INTS[fEDI_longestLine_indexLine] !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
                // "gets finalized and that's when you see the wrong answer it is only temporary due to 'EDI_lineEndPositionList_insert'."
                // is happening again for this case too...
                //
                // TODO: This should be looked into a bit more?
                //
                // The "debug" UI that showed the line index with longest visual length and its value was correct.
                // But for some reason the horizontal scrollbar was slightly longer than it should've been and then I inserted 1 character and finalized to cause it to redraw
                // and then it drew properly then ?
                // 
                INTS[fEDI_longestLine_indexLine] = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
                INTS[fEDI_longestLine_length] = EDI_trackingUint32MaxHeap.unpack_pool_length;
                requestAnimationFrame(EDI_drawHorizontalScrollbar);
        }
    }
    
    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

function EDI_finalizeEdit_Tab(indexLine_editOccurredOn) {
    if (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        EDI_render_do_TabKey();
    }

    let bytes = EDI_on_tab_bytes;
    const per_edit_length = bytes.length;
    let length = per_edit_length;

    if (INTS[fEDI_cursor_edit_eventCount_occurred] > 1) {
        length *= INTS[fEDI_cursor_edit_eventCount_occurred];
        const src_bytes = bytes;
        bytes = new Uint8Array(length);
        // TODO: typed array function usage
        for (let i = 0; i < length; i += per_edit_length) {
            for (let k = 0; k < per_edit_length; k++) {
                bytes[i + k] = src_bytes[k];
            }
        }
    }

    EDI_textByteList_insertBytes(INTS[fEDI_cursor_editPosition], bytes, /*offset*/ 0, /*length*/ length);
    // TODO: ensure 'EDI_styleBuffer' count has 'INTS[fEDI_cursor_editPosition]' in range / ensure it is equal with 'EDI_textByteList' count/capacity?
    if (INTS[fEDI_styleBuffer_count] !== 0) {
        EDI_styleBuffer_insertBytes(INTS[fEDI_cursor_editPosition], new Uint8Array(bytes.length), 0, bytes.length);
    }

    for (var i = INTS[fEDI_cursor_editIndexLine]; i < INTS[fEDI_lineEndPositionList_count]; i++) {
        EDI_lineEndPositionList_data[i] += length;
    }

    sendTransaction_MessageKind_custom_edit_InsertLtr(INTS[fEDI_cursor_editPosition], bytes);

    let editLengthVisual = length * INTS[fEDI_ontab_visualWidth_perCharacter];
    if (INTS[fEDI_ontab_visualWidth_perCharacter] === 4) {
        editLengthVisual -= 4;
        let tabWidthOfFirstTab = INTS[fEDI_cursor_editLengthVisual];
        editLengthVisual += tabWidthOfFirstTab;
    }

    EDI_trackingUint32MaxHeap.updateLength_diff(INTS[fEDI_cursor_editIndexLine], editLengthVisual);
    if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
        (INTS[fEDI_longestLine_length] !== EDI_trackingUint32MaxHeap.unpack_pool_length || INTS[fEDI_longestLine_indexLine] !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
            INTS[fEDI_longestLine_indexLine] = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
            INTS[fEDI_longestLine_length] = EDI_trackingUint32MaxHeap.unpack_pool_length;
            requestAnimationFrame(EDI_drawHorizontalScrollbar);
    }

    indexLine_editOccurredOn = INTS[fEDI_cursor_editIndexLine];

    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

function EDI_finalizeEdit_IndentMore(indexLine_editOccurredOn) {
    if (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        EDI_render_do_IndentMore();
    }

    let startingIndex = INTS[fEDI_indent_startingIndex];
    INTS[fEDI_indent_startingIndex] = 0;
    let SMALL_lineAndColumnIndices_indexLine = INTS[fEDI_indent_SMALL_lineAndColumnIndices_indexLine];
    INTS[fEDI_indent_SMALL_lineAndColumnIndices_indexLine] = 0;

    let bytes = EDI_on_tab_bytes;
    const per_edit_length = bytes.length;

    let ORIGINAL_incrementBy = (startingIndex + 1 - SMALL_lineAndColumnIndices_indexLine) * per_edit_length;
    let incrementBy = ORIGINAL_incrementBy;
    
    let bytesLength = per_edit_length;

    if (INTS[fEDI_cursor_edit_eventCount_occurred] > 1) {
        ORIGINAL_incrementBy *= INTS[fEDI_cursor_edit_eventCount_occurred];
        incrementBy *= INTS[fEDI_cursor_edit_eventCount_occurred];
        bytesLength *= INTS[fEDI_cursor_edit_eventCount_occurred];
        const src_bytes = bytes;
        bytes = new Uint8Array(bytesLength);
        // TODO: typed array function usage
        for (let i = 0; i < bytesLength; i += per_edit_length) {
            for (let k = 0; k < per_edit_length; k++) {
                bytes[i + k] = src_bytes[k];
            }
        }
    }

    let startingLinePos_end = INTS[fEDI_editret_indentLess_startingLinePos_end];
    INTS[fEDI_editret_indentLess_startingLinePos_end] = 0;

    // # Determine the total count of text that will be inserted, prior to actually beginning the edit.
    // ...

    const perEdit_styleBuffer_changes = new Uint8Array(bytesLength);

    // # Descending indexLine loop:
    //     # Insert the text on the respective line.
    //     # Increment the entry in 'EDI_lineEndPositionList' for the respective line
    //     # There's a second (relative to this entire function) modification to the start positions of the tracked syntax list
    //     # Then, you immediately know the trackedSyntax that encompasses the insertion (if it exists), so you increment its length by the text inserted on that respective line.
    //     # Each loop you reduce incrementBy, because you're initial starting the loop knowing you will eventually insert 4 characters on every line.
    //         # thus, the first iteration of the loop you're increasing that line's end position by the length of text inserted per line by the amount of lines.
    //         # The next iteration is a smaller indexLine so you decrement because you have the insertion of one less line to consider.
    for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices_indexLine; lineI--) {
        EDI_ret_getLineBoundaryPositions_raw(lineI);
        const line_start = INTS[fEDI_ret_getLineBoundaryPositions_start];

        // # Insert the text on the respective line.
        EDI_textByteList_insertBytes(line_start, bytes, 0 /*offset*/, bytesLength /*length*/);
        // TODO: ensure 'EDI_styleBuffer' count has 'INTS[fEDI_cursor_editPosition]' in range / ensure it is equal with 'EDI_textByteList' count/capacity?
        if (INTS[fEDI_styleBuffer_count] !== 0) {
            EDI_styleBuffer_insertBytes(line_start, perEdit_styleBuffer_changes, 0, bytesLength);
        }

        sendTransaction_MessageKind_custom_edit_InsertLtr(line_start, bytes);
        
        // # Increment the entry in 'EDI_lineEndPositionList' for the respective line
        EDI_lineEndPositionList_data[lineI] += incrementBy;

        // # Each loop you reduce incrementBy, because you're initial starting the loop knowing you will eventually insert 4 characters on every line.
        //     # thus, the first iteration of the loop you're increasing that line's end position by the length of text inserted per line by the amount of lines.
        //     # The next iteration is a smaller indexLine so you decrement because you have the insertion of one less line to consider.
        incrementBy -= bytesLength;
    }

    // # Any line that is not part of the selected set of lines, and is at a greater indexLine, needs to have their line end position entry updated.
    for (var lineI = startingIndex + 1; lineI < INTS[fEDI_lineEndPositionList_count]; lineI++) {
        EDI_lineEndPositionList_data[lineI] += ORIGINAL_incrementBy;
    }

    // 'startingIndex' is the larger index, the loop that this variable comes from goes in reverse.
    // This information doesn't matter much here but I'm ensuring an understanding incase the future necessitates it.
    //
    if (startingIndex === SMALL_lineAndColumnIndices_indexLine) {
        EDI_trackingUint32MaxHeap.updateLength_diff(INTS[fEDI_cursor_editIndexLine], bytesLength * INTS[fEDI_ontab_visualWidth_perCharacter]);
        if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
            (INTS[fEDI_longestLine_length] !== EDI_trackingUint32MaxHeap.unpack_pool_length || INTS[fEDI_longestLine_indexLine] !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
                INTS[fEDI_longestLine_indexLine] = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
                INTS[fEDI_longestLine_length] = EDI_trackingUint32MaxHeap.unpack_pool_length;
                requestAnimationFrame(EDI_drawHorizontalScrollbar);
        }
    }
    
    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

function EDI_finalizeEdit_IndentLess(indexLine_editOccurredOn) {
    if (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        EDI_render_do_IndentLess();
    }

    let startingIndex = INTS[fEDI_indent_startingIndex];
    INTS[fEDI_indent_startingIndex] = 0;
    let SMALL_lineAndColumnIndices_indexLine = INTS[fEDI_indent_SMALL_lineAndColumnIndices_indexLine];
    INTS[fEDI_indent_SMALL_lineAndColumnIndices_indexLine] = 0;

    // !!!!!! watch out for the big breaks when hitting a tab presuming that_four is 4
    let maxVirtualColumnIndex = 4;
    maxVirtualColumnIndex *= INTS[fEDI_cursor_edit_eventCount_occurred];
    let largestRank = INTS[fEDI_cursor_edit_eventCount_occurred];

    // loop over the lines to sum the "amount" of whitespace being removed
    let DETERMINE_decrementBy = 0;
    for (var lineI = SMALL_lineAndColumnIndices_indexLine; lineI <= startingIndex; lineI++) {
        EDI_ret_getLineBoundaryPositions_raw(lineI);
        const line_start = INTS[fEDI_ret_getLineBoundaryPositions_start];
        let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(lineI);
        let upperLimitIndexColumn;
        if (lastValidIndexColumn > maxVirtualColumnIndex) {
            upperLimitIndexColumn = maxVirtualColumnIndex;
        }
        else {
            upperLimitIndexColumn = lastValidIndexColumn;
        }
        let seenSpaceCount = 0;
        let rank = 0;
        outer: for (var i = 0; i < upperLimitIndexColumn; i++) {

            if (rank >= largestRank) break outer; // "case '\t':" has this as well.

            // if you walked the text without hitting the maximum rank it isn't an issue.
            // rank is just a means of short circuiting any weird combinations of spaces and tabs.
            // (TODO: maybe I should believe in tab stops.)

            // TODO: Why are you getting the text from the bytes here rather than using the bytes?
            let c = String.fromCharCode(EDI_textByteList_bytes[line_start + i]);
            switch (c) {
                case ' ':
                    seenSpaceCount++;
                    DETERMINE_decrementBy++;
                    if (seenSpaceCount % 4 === 0) {
                        // avoid a number that could approach infinity because I don't understand how machines compute division/modulo
                        // and I assume that it is easier to keep 'seenSpaceCount' at [0, 4] than compute division/modulo on very large numbers.
                        seenSpaceCount = 0;
                        rank++;
                    }
                    break;
                case '\t':
                    if (seenSpaceCount > 0) {
                        rank++;
                        seenSpaceCount = 0;
                    }
                    if (rank >= largestRank) break outer;
                    DETERMINE_decrementBy++;
                    rank++;
                    break;
                default:
                    break outer;
            }
        }
    }

    // Remember the total whitespace removed
    let ORIGINAL_decrementBy = DETERMINE_decrementBy;
    let decrementBy = ORIGINAL_decrementBy;

    let mostRecent_decrementedVisualWidthAbsolute = 0;

    for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices_indexLine; lineI--) {
        mostRecent_decrementedVisualWidthAbsolute = 0;
        let innerRemoveCount = 0;
        EDI_ret_getLineBoundaryPositions_raw(lineI);
        const line_start = INTS[fEDI_ret_getLineBoundaryPositions_start];
        let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(lineI);
        let upperLimitIndexColumn;
        if (lastValidIndexColumn > maxVirtualColumnIndex) {
            upperLimitIndexColumn = maxVirtualColumnIndex;
        }
        else {
            upperLimitIndexColumn = lastValidIndexColumn;
        }

        let seenSpaceCount = 0;
        let rank = 0;
        outer: for (var i = 0; i < upperLimitIndexColumn; i++) {

            if (rank >= largestRank) break outer; // "case '\t':" has this as well.

            // if you walked the text without hitting the maximum rank it isn't an issue.
            // rank is just a means of short circuiting any weird combinations of spaces and tabs.
            // (TODO: maybe I should believe in tab stops.)

            let c = String.fromCharCode(EDI_textByteList_bytes[line_start + i]);
            switch (c) {
                case ' ':
                    seenSpaceCount++;
                    innerRemoveCount++;
                    mostRecent_decrementedVisualWidthAbsolute++;
                    if (seenSpaceCount % 4 === 0) {
                        // avoid a number that could approach infinity because I don't understand how machines compute division/modulo
                        // and I assume that it is easier to keep 'seenSpaceCount' at [0, 4] than compute division/modulo on very large numbers.
                        seenSpaceCount = 0;
                        rank++;
                    }
                    break;
                case '\t':
                    if (seenSpaceCount > 0) {
                        rank++;
                        seenSpaceCount = 0;
                    }
                    if (rank >= largestRank) break outer;
                    innerRemoveCount++;
                    mostRecent_decrementedVisualWidthAbsolute += 4 - (mostRecent_decrementedVisualWidthAbsolute % 4);
                    rank++;
                    break;
                default:
                    break outer;
            }
        }

        EDI_textByteList_removeAt(line_start, innerRemoveCount);
        // TODO: ensure 'EDI_styleBuffer' count has 'INTS[fEDI_cursor_editPosition]' in range / ensure it is equal with 'EDI_textByteList' count/capacity?
        if (INTS[fEDI_styleBuffer_count] !== 0) {
            EDI_styleBuffer_removeAt(line_start, innerRemoveCount);
        }

        sendTransaction_MessageKind_custom_edit_Remove(line_start, innerRemoveCount);

	    EDI_lineEndPositionList_data[lineI] -= decrementBy;

        decrementBy -= innerRemoveCount;
    }

    for (var lineI = startingIndex + 1; lineI < INTS[fEDI_lineEndPositionList_count]; lineI++) {
        EDI_lineEndPositionList_data[lineI] -= ORIGINAL_decrementBy;
    }

    // 'startingIndex' is the larger index, the loop that this variable comes from goes in reverse.
    // This information doesn't matter much here but I'm ensuring an understanding incase the future necessitates it.
    //
    if (startingIndex === SMALL_lineAndColumnIndices_indexLine) {
        EDI_trackingUint32MaxHeap.updateLength_diff(INTS[fEDI_cursor_editIndexLine], -1 * mostRecent_decrementedVisualWidthAbsolute);
        if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
            (INTS[fEDI_longestLine_length] !== EDI_trackingUint32MaxHeap.unpack_pool_length || INTS[fEDI_longestLine_indexLine] !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
                INTS[fEDI_longestLine_indexLine] = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
                INTS[fEDI_longestLine_length] = EDI_trackingUint32MaxHeap.unpack_pool_length;
                requestAnimationFrame(EDI_drawHorizontalScrollbar);
        }
    }

    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

/** TODO: the finalize for paste is also very bad, not just the event/render */
function EDI_finalizeEdit_Paste(indexLine_editOccurredOn) {
    if (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        EDI_render_do_DuplicateOrPaste();
    }

    let content = EDI_cursor_EDI_paste_clipboardContent_string;

    let linesInsertedCount = INTS[fEDI_cursor_EDI_paste_clipboardContent_totalLineEndCount];
    let insertionLength = EDI_cursor_EDI_paste_clipboardContent_string.length;

    let editLengthVisual = 0;

    EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_editPosition]);
    EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_ret_getLineAndColumnIndices_indexLine]);
    EDI_ret_getIndexFromColumn_RESET(INTS[fEDI_cursor_editIndexColumn], INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
    let columnVisual = INTS[fEDI_ret_getIndexFromX_visualColumns];

    EDI_textByteList_insertBytes(INTS[fEDI_cursor_editPosition], EDI_cursor_EDI_paste_clipboardContent_bytes, 0, EDI_cursor_EDI_paste_clipboardContent_bytes.length);
    // TODO: ensure 'EDI_styleBuffer' count has 'INTS[fEDI_cursor_editPosition]' in range / ensure it is equal with 'EDI_textByteList' count/capacity?
    if (INTS[fEDI_styleBuffer_count] !== 0) {
        EDI_styleBuffer_insertBytes(INTS[fEDI_cursor_editPosition], EDI_cursor_EDI_paste_clipboardContent_bytes, 0, EDI_cursor_EDI_paste_clipboardContent_bytes.length);
    }

    for (var i = INTS[fEDI_cursor_editIndexLine] /*+ linesInsertedCount*/; i < INTS[fEDI_lineEndPositionList_count]; i++) {
        EDI_lineEndPositionList_data[i] += insertionLength;
    }

    sendTransaction_MessageKind_custom_edit_InsertLtr(INTS[fEDI_cursor_editPosition], EDI_cursor_EDI_paste_clipboardContent_bytes);

    indexLine_editOccurredOn = INTS[fEDI_cursor_editIndexLine];
    // TODO: 'EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths[0]' is wrong
    EDI_trackingUint32MaxHeap.updateLength_diff(indexLine_editOccurredOn, EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths[0]);
    if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
        (INTS[fEDI_longestLine_length] !== EDI_trackingUint32MaxHeap.unpack_pool_length || INTS[fEDI_longestLine_indexLine] !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
            INTS[fEDI_longestLine_indexLine] = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
            INTS[fEDI_longestLine_length] = EDI_trackingUint32MaxHeap.unpack_pool_length;
            requestAnimationFrame(EDI_drawHorizontalScrollbar);
    }

    // it's the same logic as the enter key
    // I need to get there in phases though
    //
    for (let i = 0; i < EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS.length - 1; i++) {
        let linePosition = INTS[fEDI_cursor_editPosition] + EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS[i];
        let lineVisualLength = EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths[i + 1]; // TODO: 'EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths[0]' is wrong
        EDI_lineEndPositionList_insert(INTS[fEDI_cursor_editIndexLine] + i, linePosition, lineVisualLength);
    }

    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

function EDI_finalizeEdit_Duplicate(indexLine_editOccurredOn) {
    if (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        EDI_render_do_DuplicateOrPaste();
    }

    let small = INTS[fEDI_editret_cursor_EDI_duplicate_small];
    let length = INTS[fEDI_editret_cursor_EDI_duplicate_length];

    INTS[fEDI_editret_cursor_EDI_duplicate_small] = 0;
    INTS[fEDI_editret_cursor_EDI_duplicate_length] = 0;

    let linesInsertedCount = INTS[fEDI_cursor_EDI_duplication_totalLineEndCount];
    let insertionLength = EDI_cursor_EDI_duplication_bytes.length;

    let editLengthVisual = 0;

    // it's stored at +1

    // TODO: The state that is retrieved via this paragraph of code I think already exists in this function somewhere. i.e.: needs optimization (remove redundancy)
    EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_editPosition]);
    EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_ret_getLineAndColumnIndices_indexLine]);
    EDI_ret_getIndexFromColumn_RESET(INTS[fEDI_cursor_editIndexColumn], INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
    let columnVisual = INTS[fEDI_ret_getIndexFromX_visualColumns];

    EDI_textByteList_duplicateWithin(small, INTS[fEDI_cursor_editPosition], length);
    // TODO: ensure 'EDI_styleBuffer' count has 'INTS[fEDI_cursor_editPosition]' in range / ensure it is equal with 'EDI_textByteList' count/capacity?
    if (INTS[fEDI_styleBuffer_count] !== 0) {
        EDI_styleBuffer_insertBytes(INTS[fEDI_cursor_editPosition], new Uint8Array(length), 0, length);
    }

    for (var i = INTS[fEDI_cursor_editIndexLine] /*+ linesInsertedCount*/; i < INTS[fEDI_lineEndPositionList_count]; i++) {
        EDI_lineEndPositionList_data[i] += insertionLength;
    }

    sendTransaction_MessageKind_custom_edit_InsertLtr(INTS[fEDI_cursor_editPosition], EDI_cursor_EDI_duplication_bytes);

    indexLine_editOccurredOn = INTS[fEDI_cursor_editIndexLine];
    // TODO: 'EDI_cursor_EDI_duplication_arrayLineVisualLengths[0]' is wrong
    EDI_trackingUint32MaxHeap.updateLength_diff(indexLine_editOccurredOn, EDI_cursor_EDI_duplication_arrayLineVisualLengths[0]);
    if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
        (INTS[fEDI_longestLine_length] !== EDI_trackingUint32MaxHeap.unpack_pool_length || INTS[fEDI_longestLine_indexLine] !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
            INTS[fEDI_longestLine_indexLine] = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
            INTS[fEDI_longestLine_length] = EDI_trackingUint32MaxHeap.unpack_pool_length;
            requestAnimationFrame(EDI_drawHorizontalScrollbar);
    }

    // it's the same logic as the enter key
    // I need to get there in phases though
    //
    for (let i = 0; i < EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS.length - 1; i++) {
        let linePosition = INTS[fEDI_cursor_editPosition] + EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS[i];
        let lineVisualLength = EDI_cursor_EDI_duplication_arrayLineVisualLengths[i + 1]; // TODO: 'EDI_cursor_EDI_duplication_arrayLineVisualLengths[0]' is wrong
        EDI_lineEndPositionList_insert(INTS[fEDI_cursor_editIndexLine] + i, linePosition, lineVisualLength);
    }

    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

function EDI_finalizeEdit_DeleteLtr_BackspaceRtl_RemoveTextNoBatching(indexLine_editOccurredOn) {
    if (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        if (INTS[fEDI_cursor_editKind] === EditKind_RemoveTextNoBatching) {
            EDI_render_do_RemoveSelection();
        }
        else if (INTS[fEDI_cursor_editKind] === EditKind_DeleteLtr) {
            EDI_render_do_Delete();
        }
        else if (INTS[fEDI_cursor_editKind] === EditKind_BackspaceRtl) {
            EDI_render_do_Backspace();
        }
    }

    // TODO: surely u'd get this before doing the edit?
    let startLineAndColumnIndices_indexLine;
    let startLineAndColumnIndices_indexColumn;
    if (INTS[fEDI_cursor_editKind] === EditKind_RemoveTextNoBatching) {
        startLineAndColumnIndices_indexLine = INTS[fEDI_cursor_editIndexLine];
        startLineAndColumnIndices_indexColumn = INTS[fEDI_cursor_editIndexColumn];
    }
    else {
        EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_editPosition]);
        startLineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
        startLineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
    }
    let endLineAndColumnIndices_indexLine;
    let endLineAndColumnIndices_indexColumn;
    if (INTS[fEDI_cursor_editKind] === EditKind_RemoveTextNoBatching) {
        endLineAndColumnIndices_indexLine = INTS[fEDI_cursor_END_editIndexLine];
        endLineAndColumnIndices_indexColumn = INTS[fEDI_cursor_END_editIndexColumn];
    }
    else {
        EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_editPosition] + INTS[fEDI_cursor_editLength_characters]);
        endLineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
        endLineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
    }

    if (INTS[fEDI_cursor_editLineFeedCount] > 0) {
        let count = 0;
        let lastMatchedIndexLine = 0;
        for (let i = EDI_lineEndPositionList_PENDING.count - 1; i >= 0; i--) {
            let lineEndPos = EDI_lineEndPositionList_PENDING.data[i];
            if (INTS[fEDI_cursor_editPosition] <= lineEndPos && INTS[fEDI_cursor_editPosition] + INTS[fEDI_cursor_editLength_characters] > lineEndPos) {
                EDI_ret_getLineAndColumnIndices_raw(lineEndPos);
                lastMatchedIndexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
                count++;
                EDI_lineEndPositionList_PENDING.removeAt(i, 1);
            }
            else if (INTS[fEDI_cursor_editPosition] > lineEndPos) {
                break;
            }
        }
        if (count > 0) {
            EDI_lineEndPositionList_removeAt(lastMatchedIndexLine, count);
        }
    }
    for (let i = INTS[fEDI_lineEndPositionList_count] - 1; i >= 0; i--) {
        if (INTS[fEDI_cursor_editPosition] < EDI_lineEndPositionList_data[i]) {
            EDI_lineEndPositionList_data[i] -= INTS[fEDI_cursor_editLength_characters];
        }
        else {
            if (i === INTS[fEDI_lineEndPositionList_count] - 1) {
                indexLine_editOccurredOn = i;
            }
            else {
                indexLine_editOccurredOn = i + 1;
            }
            break;
        }
    }

    EDI_textByteList_removeAt(INTS[fEDI_cursor_editPosition], INTS[fEDI_cursor_editLength_characters]);
    // TODO: ensure 'EDI_styleBuffer' count has 'INTS[fEDI_cursor_editPosition]' in range / ensure it is equal with 'EDI_textByteList' count/capacity?
    if (INTS[fEDI_styleBuffer_count] !== 0) {
        EDI_styleBuffer_removeAt(INTS[fEDI_cursor_editPosition], INTS[fEDI_cursor_editLength_characters]);
    }

    sendTransaction_MessageKind_custom_edit_Remove(INTS[fEDI_cursor_editPosition], INTS[fEDI_cursor_editLength_characters]);

    if (startLineAndColumnIndices_indexLine === endLineAndColumnIndices_indexLine) {
        EDI_trackingUint32MaxHeap.updateLength_diff(INTS[fEDI_cursor_editIndexLine], -1 * INTS[fEDI_cursor_editLengthVisual]);
        if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
            (INTS[fEDI_longestLine_length] !== EDI_trackingUint32MaxHeap.unpack_pool_length || INTS[fEDI_longestLine_indexLine] !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
                INTS[fEDI_longestLine_indexLine] = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
                INTS[fEDI_longestLine_length] = EDI_trackingUint32MaxHeap.unpack_pool_length;
                requestAnimationFrame(EDI_drawHorizontalScrollbar);
        }
    }

    EDI_finalizeEdit_ClearEditState();

    return indexLine_editOccurredOn;
}

/** This function needs the 'INTS[fEDI_cursor_editKind]' that was finalized, and will set it to 'EditKind_None' internally, so don't do it yourself within a specific finalizeEdit function. */
function EDI_finalizeEdit_ClearEditState() {

    if (INTS[fEDI_cursor_editKind] !== EditKind_Paste) {
        // TODO: You can over time have this be a longer living cache but for now just get accuracy while still allowing me to paste, move cursor, paste, move cursor, etc...
        EDI_cursor_EDI_paste_clipboardContent_string = null;
        EDI_cursor_EDI_paste_clipboardContent_bytes = null;
        EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS = null;
        EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths = null;
        BYTES[byteEDI_clipboard_may_have_changed] = 1;
    }

    if (true) { // if true to explicitly point out the pattern matching of the above and that this one intentionally will always clear.
        BYTES[byteEDI_duplication_may_have_changed] = 1;
        //EDI_cursor_EDI_duplication_string = null;
        EDI_cursor_EDI_duplication_bytes = null;
        INTS[fEDI_cursor_EDI_duplication_totalLineEndCount] = 0;
        EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS = null;
        EDI_cursor_EDI_duplication_arrayLineVisualLengths = null;
    }

    INTS[fEDI_cursor_editKind] = EditKind_None;
    INTS[fEDI_cursor_editLength_characters] = 0;
    INTS[fEDI_cursor_editLengthVisual] = 0;
    INTS[fEDI_cursor_editPosition] = 0;
    INTS[fEDI_cursor_editIndexLine] = 0;
    INTS[fEDI_cursor_editIndexColumn] = 0;

    INTS[fEDI_cursor_edit_eventCount_occurred] = 0;
    INTS[fEDI_cursor_edit_eventCount_drawn] = 0;
    INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue] = 0;

    INTS[fEDI_cursor_END_editIndexLine] = 0;
    INTS[fEDI_cursor_END_editIndexColumn] = 0;
    INTS[fEDI_cursor_textInsertionBufferCount] = 0;
    INTS[fEDI_editret_cursor_gapBufferWriteToSpanElement_SpanTextContentRelativeIndex] = 0;
    INTS[fEDI_cursor_editLineFeedCount] = 0;
    EDI_lineEndPositionList_PENDING.clear();

    // TODO: You do indeed have to clear this because of ctrl or shift cases of enter.
    BYTES[byteEDI_cursor_enterKeyEventKind] = EnterKeyEventKind_None;

    // TODO: I want to put these in the paste case directly and above the 'EDI_finalizeEdit_ClearEditState' invocation...
    // ...but 'EDI_cursor_clear' needs to "clear an unfinalized edit" (I think that would be the sensible behavior at least)...
    // ...and I'm not currently doing this, but maybe you could simplify that by invoking 'EDI_finalizeEdit_ClearEditState' rather...
    // ...than duplicating the logic?
    EDI_cursor_enterKey_newLinePlusIndentation_byteList = null;
    EDI_cursor_cached_indentation_string = null;

    INTS[fEDI_cursor_edit_flagLineChanged] = 0;
}
//#endregion

//#region ancillary
/** modification of Google AI Overview "javascript count of digits" */
function positiveNumbersOnly_countDigitsLoop(number) {
  if (number <= 0) return 1;
  let count = 0;

  while (number > 0) {
    number = Math.floor(number / 10); // Remove the last digit
    count++;
  }

  return count;
}

function EDI_getCharacterPrevious_KIND(indexColumn, positionIndex) {
    if (indexColumn !== 0) {
        return EDI_getCharacterKind(String.fromCharCode(EDI_textByteList_bytes[positionIndex - 1]));
    }
    else {
        return CharacterKind_None;
    }
}

function EDI_getCharacterCurrent_KIND(indexColumn, positionIndex, lineEnd) {
    if (indexColumn < lineEnd) {
        return EDI_getCharacterKind(String.fromCharCode(EDI_textByteList_bytes[positionIndex]));
    }
    else {
        return CharacterKind_None;
    }
}

/**
 * 'ret_' will overwrite one another do not mix the function invocations without having read the values first
 * 
 * Returns 'true' if success otherwise 'false' the "return" values are indexLine, and indexColumn; which are stored in 'fieldBuffer.js'
 * as 'INTS[fEDI_ret_getLineAndColumnIndices_indexLine] = indexLine;' and 'INTS[fEDI_ret_getLineAndColumnIndices_indexColumn] = indexColumn;'.
 * 
 * TODO: Local variables for this looping logic?
 */
function EDI_ret_getLineAndColumnIndices_raw(positionIndex) {
    let left = 0;
    let right = INTS[fEDI_lineEndPositionList_count] - 1;

    let indexLine = -1;
    let indexColumn = -1;

    const local_EDI_lineEndPositionList_data = EDI_lineEndPositionList_data;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        
        if (local_EDI_lineEndPositionList_data[mid] >= positionIndex) {
            indexLine = mid;

            if (local_EDI_lineEndPositionList_data[mid] === positionIndex) {
                break;
            }
            
            right = mid - 1;
        }
        else if (local_EDI_lineEndPositionList_data[mid] < positionIndex) {
            left = mid + 1;
        }
        else {
            return false; // NaN
        }
    }

    if (indexLine === -1) {
        return false;
        //return {
        //  indexLine: 0,
        //  indexColumn: 0,  
        //};
    }

    if (indexLine === 0) {
        indexColumn = positionIndex;
    }
    else {
        indexColumn = positionIndex - (local_EDI_lineEndPositionList_data[indexLine - 1] + 1);
    }

    INTS[fEDI_ret_getLineAndColumnIndices_indexLine] = indexLine;
    INTS[fEDI_ret_getLineAndColumnIndices_indexColumn] = indexColumn;
    return true;
}

function EDI_getLastValidIndexColumn_raw(indexLine) {
    if (indexLine < INTS[fEDI_lineEndPositionList_count]) {
        if (indexLine === 0) {
            return EDI_lineEndPositionList_data[indexLine] - 0;
        }
        else {
            return EDI_lineEndPositionList_data[indexLine] - (EDI_lineEndPositionList_data[indexLine - 1] + 1);
        }
    }
    return 0;
}

/**
 * 'ret_' will overwrite one another do not mix the function invocations without having read the values first
 * 
 * 'INTS[fEDI_ret_getLineBoundaryPositions_start]' is the position of the first character on that line.
 * 
 * 'INTS[fEDI_ret_getLineBoundaryPositions_end]' is the position of the "line end" (i.e.: ascii code for '\n' or EOF).
 * 
 * The inclusivity/exclusivity is in reference to whether the position
 * points to non-line-end-text that exists on the line
 * 
 * NOTE: In performance critical sections this code is explicitly inlined and modified to be as performant as it seemingly can get for that specific section of code.
 * 
 * @returns nothing: the results are stored in 'INTS[fEDI_ret_getLineBoundaryPositions_start]' inclusive and 'INTS[fEDI_ret_getLineBoundaryPositions_end]' exclusive.
 */
function EDI_ret_getLineBoundaryPositions_raw(indexLine) {
    if (indexLine < INTS[fEDI_lineEndPositionList_count]) {
        if (indexLine === 0) {
            INTS[fEDI_ret_getLineBoundaryPositions_start] = 0;
            INTS[fEDI_ret_getLineBoundaryPositions_end] = EDI_lineEndPositionList_data[indexLine] - 0;
            return;
        }
        else {
            INTS[fEDI_ret_getLineBoundaryPositions_start] = EDI_lineEndPositionList_data[indexLine - 1] + 1;
            INTS[fEDI_ret_getLineBoundaryPositions_end] = EDI_lineEndPositionList_data[indexLine];
            return;
        }
    }
    INTS[fEDI_ret_getLineBoundaryPositions_start] = 0;
    INTS[fEDI_ret_getLineBoundaryPositions_end] = 0;
}

function EDI_getLineStart_pos_raw(indexLine) {
    if (indexLine < INTS[fEDI_lineEndPositionList_count]) {
        if (indexLine === 0) {
            return 0;
        }
        else {
            return (EDI_lineEndPositionList_data[indexLine - 1] + 1);
        }
    }
    return 0;
}

function EDI_getLineEnd_pos_raw(indexLine) {
    if (indexLine < INTS[fEDI_lineEndPositionList_count]) {
        if (indexLine === 0) {
            return EDI_lineEndPositionList_data[indexLine] - 0;
        }
        else {
            return EDI_lineEndPositionList_data[indexLine];
        }
    }
    return 0;
}

function EDI_getPositionIndex_Overload(indexLine, indexColumn) {
    return EDI_getLineStart_pos_raw(indexLine) + indexColumn;
}

/**
 * @returns 
 */
function EDI_getPositionIndex_cursor_raw() {
    return EDI_getLineStart_pos_raw(INTS[fEDI_cursor_indexLine]) + INTS[fEDI_cursor_indexColumn];
}

/**
 * TODO: Reduce the amount of redundant drawing of lines that haven't changed in the selection logic.
*/
function EDI_getEntireLineVisualWidth(lineStart, lineEnd) {
    let indexColumn = 0;
    let visualColumns = 0;
    let positionIndex = lineStart;

    while (positionIndex < lineEnd) {
        let charLength = 1;
        
        if (String.fromCharCode(EDI_textByteList_bytes[positionIndex]) === '\t') {
            charLength = 4 - (visualColumns % 4);
        }

        visualColumns += charLength;
        positionIndex++;
        indexColumn++;
    }

    return visualColumns;
}

function EDI_set_indexColumn_and_visualColumn_relativeTo_storedVisualWidth(lineStart, lineEnd) {
    let indexColumn = 0;
    let visualColumns = 0;
    let positionIndex = lineStart;
    let charWidth = EDI_characterWidth;
    let rx = INTS[fEDI_cursor_STORED_visualWidth] * charWidth;

    while (positionIndex < lineEnd) {
        let charLength = 1;
        
        if (String.fromCharCode(EDI_textByteList_bytes[positionIndex]) === '\t') {
            charLength = 4 - (visualColumns % 4);
        }

        // Calculate pixel boundaries for the current character
        const charLeftX = visualColumns * charWidth;
        const charRightX = (visualColumns + charLength) * charWidth;
        const charMidpointX = charLeftX + (charRightX - charLeftX) / 2;

        // If the click is before the midpoint of this character/tab, target this index
        if (rx < charMidpointX) {
            INTS[fEDI_cursor_indexColumn] = indexColumn;
            INTS[fEDI_cursorVisualColumnIndex] = visualColumns;
            return;
        }

        visualColumns += charLength;
        positionIndex++;
        indexColumn++;
    }

    // If clicked past the end of the line text
    INTS[fEDI_cursor_indexColumn] = indexColumn;
    INTS[fEDI_cursorVisualColumnIndex] = visualColumns;
}

/**
 * 'ret_' will overwrite one another do not mix the function invocations without having read the values first
 * 
 * 'INTS[fEDI_ret_getIndexFromX_indexColumn]'
 * 
 * 'INTS[fEDI_ret_getIndexFromX_visualColumns]'
 * 
 * @returns nothing: the results are stored in 'INTS[fEDI_ret_getIndexFromX_indexColumn]' and 'INTS[fEDI_ret_getIndexFromX_visualColumns]'.
 */
function EDI_ret_getIndexFromColumn_sameLine_newRxIsLarger(targetColumn, lineStart, lineEnd, startColumn, startVisualColumns) {
    let indexColumn = startColumn;
    let visualColumns = startVisualColumns;
    let positionIndex = lineStart + startColumn;
    let charWidth = EDI_characterWidth;

    while (positionIndex < lineEnd) {
        let charLength = 1;
        
        if (String.fromCharCode(EDI_textByteList_bytes[positionIndex]) === '\t') {
            charLength = 4 - (visualColumns % 4);
        }

        // Calculate pixel boundaries for the current character
        const charLeftX = visualColumns * charWidth;
        const charRightX = (visualColumns + charLength) * charWidth;
        const charMidpointX = charLeftX + (charRightX - charLeftX) / 2;

        // If the click is before the midpoint of this character/tab, target this index
        if (targetColumn === indexColumn) {
            INTS[fEDI_ret_getIndexFromX_indexColumn] = indexColumn;
            INTS[fEDI_ret_getIndexFromX_visualColumns] = visualColumns;
            return;
        }

        visualColumns += charLength;
        positionIndex++;
        indexColumn++;
    }

    // If clicked past the end of the line text
    INTS[fEDI_ret_getIndexFromX_indexColumn] = indexColumn;
    INTS[fEDI_ret_getIndexFromX_visualColumns] = visualColumns;
}

/**
 * 'ret_' will overwrite one another do not mix the function invocations without having read the values first
 * 
 * 'INTS[fEDI_ret_getIndexFromX_indexColumn]'
 * 
 * 'INTS[fEDI_ret_getIndexFromX_visualColumns]'
 * 
 * @returns nothing: the results are stored in 'INTS[fEDI_ret_getIndexFromX_indexColumn]' and 'INTS[fEDI_ret_getIndexFromX_visualColumns]'.
 */
function EDI_ret_getIndexFromColumn_RESET(targetColumn, lineStart, lineEnd) {
    let indexColumn = 0;
    let visualColumns = 0;
    let positionIndex = lineStart;
    let charWidth = EDI_characterWidth;

    while (positionIndex < lineEnd) {
        let charLength = 1;
        
        if (String.fromCharCode(EDI_textByteList_bytes[positionIndex]) === '\t') {
            charLength = 4 - (visualColumns % 4);
        }

        // Calculate pixel boundaries for the current character
        const charLeftX = visualColumns * charWidth;
        const charRightX = (visualColumns + charLength) * charWidth;
        const charMidpointX = charLeftX + (charRightX - charLeftX) / 2;

        // If the click is before the midpoint of this character/tab, target this index
        if (targetColumn === indexColumn) {
            INTS[fEDI_ret_getIndexFromX_indexColumn] = indexColumn;
            INTS[fEDI_ret_getIndexFromX_visualColumns] = visualColumns;
            return;
        }

        visualColumns += charLength;
        positionIndex++;
        indexColumn++;
    }

    // If clicked past the end of the line text
    INTS[fEDI_ret_getIndexFromX_indexColumn] = indexColumn;
    INTS[fEDI_ret_getIndexFromX_visualColumns] = visualColumns;
}

/**
 * 'ret_' will overwrite one another do not mix the function invocations without having read the values first
 * 
 * 'INTS[fEDI_ret_getIndexFromX_indexColumn]'
 * 
 * 'INTS[fEDI_ret_getIndexFromX_visualColumns]'
 * 
 * @returns nothing: the results are stored in 'INTS[fEDI_ret_getIndexFromX_indexColumn]' and 'INTS[fEDI_ret_getIndexFromX_visualColumns]'.
 */
function EDI_ret_getIndexFromX_RESET(rx, lineStart, lineEnd) {
    let indexColumn = 0;
    let visualColumns = 0;
    let positionIndex = lineStart;
    let charWidth = EDI_characterWidth;

    while (positionIndex < lineEnd) {
        let charLength = 1;
        
        if (String.fromCharCode(EDI_textByteList_bytes[positionIndex]) === '\t') {
            charLength = 4 - (visualColumns % 4);
        }

        // Calculate pixel boundaries for the current character
        const charLeftX = visualColumns * charWidth;
        const charRightX = (visualColumns + charLength) * charWidth;
        const charMidpointX = charLeftX + (charRightX - charLeftX) / 2;

        // If the click is before the midpoint of this character/tab, target this index
        if (rx < charMidpointX) {
            INTS[fEDI_ret_getIndexFromX_indexColumn] = indexColumn;
            INTS[fEDI_ret_getIndexFromX_visualColumns] = visualColumns;
            return;
        }

        visualColumns += charLength;
        positionIndex++;
        indexColumn++;
    }

    // If clicked past the end of the line text
    INTS[fEDI_ret_getIndexFromX_indexColumn] = indexColumn;
    INTS[fEDI_ret_getIndexFromX_visualColumns] = visualColumns;
}

/** 'ret_' will overwrite one another do not mix the function invocations without having read the values first */
function EDI_ret_getIndexFromX_sameLine_newRxIsLarger(goalRx, lineStart, lineEnd, startColumn, startVisualColumns) {
    let indexColumn = startColumn;
    let visualColumns = startVisualColumns;
    let positionIndex = lineStart + startColumn;
    let charWidth = EDI_characterWidth;

    while (positionIndex < lineEnd) {
        let charLength = 1;
        
        if (String.fromCharCode(EDI_textByteList_bytes[positionIndex]) === '\t') {
            charLength = 4 - (visualColumns % 4);
        }

        // Calculate pixel boundaries for the current character
        const charLeftX = visualColumns * charWidth;
        const charRightX = (visualColumns + charLength) * charWidth;
        const charMidpointX = charLeftX + (charRightX - charLeftX) / 2;

        // If the click is before the midpoint of this character/tab, target this index
        if (goalRx < charMidpointX) {
            INTS[fEDI_ret_getIndexFromX_indexColumn] = indexColumn;
            INTS[fEDI_ret_getIndexFromX_visualColumns] = visualColumns;
            return;
        }

        visualColumns += charLength;
        positionIndex++;
        indexColumn++;
    }

    // If clicked past the end of the line text
    INTS[fEDI_ret_getIndexFromX_indexColumn] = indexColumn;
    INTS[fEDI_ret_getIndexFromX_visualColumns] = visualColumns;
}

/**
 * 'ret_' will overwrite one another do not mix the function invocations without having read the values first
 * 
 * 'INTS[fEDI_ret_getIndexFromX_indexColumn]'
 * 
 * 'INTS[fEDI_ret_getIndexFromX_visualColumns]'
 * 
 * @returns nothing: the results are stored in 'INTS[fEDI_ret_getIndexFromX_indexColumn]' and 'INTS[fEDI_ret_getIndexFromX_visualColumns]'.
 */
function EDI_ret_getIndexFromX_sameLine_newRxIsSmaller(goalRx, lineStart, startColumn, startVisualColumns) {
    let indexColumn = startColumn;
    let visualColumns = startVisualColumns;
    let positionIndex = lineStart + startColumn;
    let charWidth = EDI_characterWidth;

    while (positionIndex >= lineStart && positionIndex > 0) {
        let charLength = 1;
        
        if (String.fromCharCode(EDI_textByteList_bytes[positionIndex - 1]) === '\t') {
            charLength = 4 - (visualColumns % 4);
        }

        // Calculate pixel boundaries for the current character
        const charLeftX = (visualColumns - charLength) * charWidth;
        const charRightX = (visualColumns) * charWidth;
        const charMidpointX = charLeftX + (charRightX - charLeftX) / 2;

        // If the click is before the midpoint of this character/tab, target this index
        if (goalRx >= charMidpointX) {
            INTS[fEDI_ret_getIndexFromX_indexColumn] = indexColumn;
            INTS[fEDI_ret_getIndexFromX_visualColumns] = visualColumns;
            return;
        }

        visualColumns -= charLength;
        positionIndex--;
        indexColumn--;
    }

    // If clicked past the end of the line text
    INTS[fEDI_ret_getIndexFromX_indexColumn] = indexColumn;
    INTS[fEDI_ret_getIndexFromX_visualColumns] = visualColumns;
}

/**
 * This clears the cursor's selection.
 */
function EDI_moveCursor_position(intValue) {
    if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
        // TODO: Timing issue, someone typing while they scroll
        EDI_finalizeEdit();
    }
    EDI_ret_getLineAndColumnIndices_raw(intValue);
    let lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
    let lineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
    EDI_moveCursor_indexLine_indexColumn(lineAndColumnIndices_indexLine, lineAndColumnIndices_indexColumn);
}

/**
 * This clears the cursor's selection.
 */
function EDI_moveCursor_indexLine_indexColumn(indexLine, indexColumn) {
    if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
        // TODO: Timing issue, someone typing while they scroll
        EDI_finalizeEdit();
    }
    let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(indexLine);

    if (indexColumn > lastValidIndexColumn) {
        INTS[fEDI_cursor_indexColumn] = lastValidIndexColumn;
    }
    else {
        INTS[fEDI_cursor_indexColumn] = indexColumn;
    }

    INTS[fEDI_cursor_indexLine] = indexLine;

    EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
    const lineStart = INTS[fEDI_ret_getLineBoundaryPositions_start];
    const lineEnd = INTS[fEDI_ret_getLineBoundaryPositions_end];
    EDI_ret_getIndexFromColumn_RESET(INTS[fEDI_cursor_indexColumn], lineStart, lineEnd);
    INTS[fEDI_cursorVisualColumnIndex] = INTS[fEDI_ret_getIndexFromX_visualColumns];
    
    // TODO: selectionAnchor = selectionEnd; EDI_drawCursor(/*NOTscrollCursorIntoView*/ false); # being the way to clear a selection should be documented / wrapped by a method for ease of use / readability?
    INTS[fEDI_cursor_selectionAnchor] = INTS[fEDI_cursor_selectionEnd];
    EDI_render_request(RenderKind_Cursor_n);
}

/**
 * It will read the entire indentation regardless of cursor column position.
 * 
 * Returns the 'endExclusiveIndentationIndexColumn' of the indentation i.e.: "the column index that exclusively ends the indentation.".
 * Sets the state for:
 * - EDI_cursor_cached_indentation_string
 */
function EDI_measureEndExclusiveIndentationIndexColumn() {
    let upperLimitIndexColumn = EDI_getLastValidIndexColumn_raw(INTS[fEDI_cursor_indexLine]);
    EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
    const line_start = INTS[fEDI_ret_getLineBoundaryPositions_start];

    let count = 0;
    let indentation_string_visualWidth = 0;

    // Currently an enter key press only batches with other enter key presses so either the edit is finalized or the indentation was already cached and thus this code wouldn't run,
    // i.e.: you can read directly from the byte array without worrying about a pending edit.
    outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
        switch (EDI_textByteList_bytes[line_start + i]) {
            case CONST_EDI_ASCII_SPACE:
                indentation_string_visualWidth++;
                count++;
                break;
            case CONST_EDI_ASCII_TAB:
                indentation_string_visualWidth += 4;
                count++;
                break;
            default:
                break outer;
        }
    }

    INTS[fEDI_cursor_cached_indentation_string_visualWidth] = indentation_string_visualWidth;

    return count;
}

function EDI_lineWasInsertedValidateGutter(lineCount) {
    if (EDI_drawGutter_Width(lineCount)) {
        // If true then you need to also draw the dependent UI
        EDI_render_request(RenderKind_Cursor_n);
        EDI_drawHorizontalScrollbar();
    }
}

function EDI_getCharacterKind(character) {
    switch (character) {
        case 'a':
        case 'b':
        case 'c':
        case 'd':
        case 'e':
        case 'f':
        case 'g':
        case 'h':
        case 'i':
        case 'j':
        case 'k':
        case 'l':
        case 'm':
        case 'n':
        case 'o':
        case 'p':
        case 'q':
        case 'r':
        case 's':
        case 't':
        case 'u':
        case 'v':
        case 'w':
        case 'x':
        case 'y':
        case 'z':
        case 'A':
        case 'B':
        case 'C':
        case 'D':
        case 'E':
        case 'F':
        case 'G':
        case 'H':
        case 'I':
        case 'J':
        case 'K':
        case 'L':
        case 'M':
        case 'N':
        case 'O':
        case 'P':
        case 'Q':
        case 'R':
        case 'S':
        case 'T':
        case 'U':
        case 'V':
        case 'W':
        case 'X':
        case 'Y':
        case 'Z':
        case '_':
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            return CharacterKind_LetterOrDigit;
        case ' ':
        case '\t':
        case '\r':
        case '\n':
            return CharacterKind_Whitespace;
        default:
            return CharacterKind_Punctuation;
    }
}

function EDI_measureBaseElement() {
    INTS[fEDI_lastReadNumber_offsetWidth] = Math.floor(EDI_baseElement.offsetWidth);
    INTS[fEDI_lastReadNumber_offsetHeight] = Math.floor(EDI_baseElement.offsetHeight);
}

/**
 * TODO: repeated duplications of the same extremely large selection might benefit from temporary caching of this functions result.
 * 
 * textonly is in reference to conversion of the raw storage of the text editor such that all line feeds get returned as as EDI_lineEndString rather than the internal representation of '\n'.
 * 
 * @returns {string}
 */
function EDI_decode_textonly(start, length) {
    if (length <= 0) {
		return '';
	}

	let end = start + length;

	let decodedText = EDI_decoder.decode(EDI_textByteList_bytes.subarray(start, end));
	if (!EDI_lineEndString) {
		EDI_lineEndString = '\n';
	}
	if (EDI_lineEndString !== '\n') {
		decodedText = decodedText.replaceAll('\n', EDI_lineEndString);
	}
	
	return decodedText;
}

/**
 * @param {*} editKind 
 * @param {*} editPosition 
 * @param {*} editLength 
 */
function EDI_startEdit(editKind, editPosition, editLength) {
    INTS[fEDI_cursor_editKind] = editKind;
    INTS[fEDI_cursor_editPosition] = editPosition;
    INTS[fEDI_cursor_editIndexLine] = INTS[fEDI_cursor_indexLine];
    INTS[fEDI_cursor_editIndexColumn] = INTS[fEDI_cursor_indexColumn];
    INTS[fEDI_cursor_editLength_characters] = editLength;

    //switch (editKind) {
    //    case EditKind_InsertLtr:
    //        EDI_insertGapBufferSpan();
    //        break;
    //}
}
//#endregion

function EDI_autocomplete_get_filter() {
    let wordToLeftOfCursor = '';
    if (INTS[fEDI_cursor_editKind] === EditKind_None || INTS[fEDI_cursor_editKind] === EditKind_InsertLtr) {
        // TODO: this is just to say 'INTS[fEDI_cursor_editIndexColumn]'? (in the case of 'EditKind_InsertLtr')
        let columnNoEdit = INTS[fEDI_cursor_indexColumn] - INTS[fEDI_cursor_editLength_characters];
        if (columnNoEdit > 0) {
            let position = EDI_getPositionIndex_cursor_raw() - INTS[fEDI_cursor_editLength_characters];
            let typeOfLeftCharacter = EDI_getCharacterPrevious_KIND(columnNoEdit, position);
            if (typeOfLeftCharacter === CharacterKind_LetterOrDigit) {
                let another_column = columnNoEdit - 1;
                let another_position = position - 1;
                // TODO: checks it twice...
                while (another_column > 0) {
                    let another_charKind = EDI_getCharacterPrevious_KIND(another_column, another_position);
                    if (another_charKind !== CharacterKind_LetterOrDigit) {
                        //another_column++;
                        //another_position++;
                        break;
                    }
                    another_column--;
                    another_position--;
                }
                let text = EDI_decode_textonly(another_position, position - another_position);
                wordToLeftOfCursor = text;
            }
        }
    }
    return wordToLeftOfCursor + EDI_decoder.decode(EDI_cursor_textInsertionBuffer.subarray(0, INTS[fEDI_cursor_textInsertionBufferCount]));
}

//#region cursorDrawing
/** obsolete-ish */
function EDI_render_do_cursor_flag_scrollIntoViewExplicit() {
    let notShouldScrollIntoView = false;
    let flag_scrollIntoViewExplicit = false;

    flag_scrollIntoViewExplicit = true;

    if (flag_scrollIntoViewExplicit) {
        // TODO: consider setting 'notShouldScrollIntoView' to false to avoid two scroll into views redundantly?
        EDI_scrollCursorIntoView();
    }
    EDI_drawCursor(notShouldScrollIntoView);
}

function EDI_cursor_hasSelection() {
    return INTS[fEDI_cursor_selectionAnchor] >= 0 &&
            INTS[fEDI_cursor_selectionEnd] >= 0 &&
            INTS[fEDI_cursor_selectionAnchor] != INTS[fEDI_cursor_selectionEnd];
}

/**
 * TODO: move this closer to 'EDI_finalizeEdit_ClearEditState'
 * 
 * !!!! You need to be careful. You might think "I can tie state clearing solely to the respective edit's finalize"...
 * ...but it feels sensible that if I wanted to just reset everything I'd be allowed to just invoke 'EDI_cursor_clear()'...
 * ...without having to worry about finalizing any pending edits...
 * ...(I think this is unfortunate I'd prefer it weren't the case but I can't help but think it is a very important thing to get right.)...
 * ...so all the edit finalize logic needs to correctly clear its state here as well.
 * 
 * The code that clears the editor is dependent on this method NOT clearing 'BYTES[byteEDI_cursor_selectionDivExists]'
 * 
 * Somewhat duplicated code: This messes with the language features if I invoke clear() in the constructor, it puts "| undefined" on all the types.
 */
function EDI_cursor_clear() {
    INTS[fEDI_cursor_indexLine] = 0;
    INTS[fEDI_cursor_indexColumn] = 0;
    INTS[fEDI_cursorVisualColumnIndex] = 0;
    INTS[fEDI_cursor_STORED_visualWidth] = 0;
    // TODO: You can't include 'fEDI_cursor_cursorTranslateYValue' or 'EDI_cursor_cursorTranslateXValue' here. Otherwise changing a file won't redraw the cursor at 0,0
    //INTS[fEDI_cursor_cursorTranslateYValue] = 0;
    //EDI_cursor_cursorTranslateXValue = 0;
    INTS[fEDI_cursor_selectionAnchor] = 0;
    INTS[fEDI_cursor_selectionEnd] = 0;
    INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = 0;
    INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = 0;
    INTS[fEDI_cursor_DRAWN_selectionAnchor] = 0;
    INTS[fEDI_cursor_DRAWN_selectionEnd] = 0;
    INTS[fEDI_cursor_DRAWN_selection_virtualIndexLine] = 0;
    INTS[fEDI_cursor_DRAWN_selection_virtualCount] = 0;
    INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL_DRAWN] = 0;
    INTS[fEDI_cursor_selectionIndexEndColumnVISUAL_DRAWN] = 0;
    INTS[fEDI_cursor_editKind] = EditKind_None;
    INTS[fEDI_cursor_editLength_characters] = 0;
    INTS[fEDI_cursor_editPosition] = 0;
    INTS[fEDI_cursor_editIndexLine] = 0;
    INTS[fEDI_cursor_editIndexColumn] = 0;
    INTS[fEDI_cursor_edit_eventCount_occurred] = 0;
    INTS[fEDI_cursor_edit_eventCount_drawn] = 0;
    INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue] = 0;
    INTS[fEDI_cursor_END_editIndexLine] = 0;
    INTS[fEDI_cursor_END_editIndexColumn] = 0;

    INTS[fEDI_cursor_textInsertionBufferCount] = 0;

    EDI_cursor_enterKey_newLinePlusIndentation_byteList = null;
    EDI_cursor_cached_indentation_string = null;
    BYTES[byteEDI_cursor_enterKeyEventKind] = EnterKeyEventKind_None;

    INTS[fEDI_cursor_editLineFeedCount] = 0;
    INTS[fEDI_cursor_edit_flagLineChanged] = 0;

    EDI_cursor_EDI_paste_clipboardContent_string = null;
    EDI_cursor_EDI_paste_clipboardContent_bytes = null;
    EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS = null;
    EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths = null;
    BYTES[byteEDI_clipboard_may_have_changed] = 1;

    BYTES[byteEDI_duplication_may_have_changed] = 1;
    //EDI_cursor_EDI_duplication_string = null;
    EDI_cursor_EDI_duplication_bytes = null;
    INTS[fEDI_cursor_EDI_duplication_totalLineEndCount] = 0;
    EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS = null;
    EDI_cursor_EDI_duplication_arrayLineVisualLengths = null;

    INTS[fEDI_editret_cursor_EDI_duplicate_small] = 0;
    INTS[fEDI_editret_cursor_EDI_duplicate_length] = 0;
}

function EDI_cursorBlinkingTrailingEdge() {
    BYTES[byteEDI_isChecking_cursorBlinkTrailingEdge] = 0;
    // TODO: does modifying animationPlayState benefit from rAF?
    //if (BYTES[byteEDI_editorHasFocus]) {
    //    EDI_cursor_cursorElement.style.animationPlayState = 'running';
    //}
    // TODO: (rAF) / it is possible that you paint more than the debug text due to combining that text modification with the same rAF frame...
    // ...that updates something more directly related to the text editor itself (i.e.: if you group this text modification with modifying the 'animationPlayState').
    EDI_draw_cursor_debug();

    if (BYTES[byteDIALOG_currentDialogKind] === DialogKind_Debug) {
        sendTransaction_MessageKind_custom_editorGetNodesAdjacentToCursor(EDI_getPositionIndex_cursor_raw());
    }
}
//#endregion

async function EDI_MenuOnClick(isCancelled, menuOption, request) {
    if (isCancelled || !menuOption) { return; }
    
    const commandKind = menuOption.commandKind;
    if (!commandKind) { return; }

    switch (commandKind) {
        case CommandKind_Cut:
            EDI_finalizeEdit();
            await EDI_copySelection();
            EDI_removeSelection();
            EDI_render_request(RenderKind_Cursor_n);
            return;
        case CommandKind_Copy:
            EDI_finalizeEdit();
            return EDI_copySelection();
        case CommandKind_Paste:
            EDI_finalizeEdit();
            await EDI_read_clipboard();
            EDI_paste();
            EDI_render_request(RenderKind_Cursor_n);
            return;
        case CommandKind_Find:
            EDI_findOverlay_showSetter(!get_EDI_findOverlay_show());
            return;
    }
}

async function EDI_read_clipboard() {
    if (BYTES[byteEDI_clipboard_may_have_changed] === 1) {
        BYTES[byteEDI_clipboard_may_have_changed] = 0;
        EDI_finalizeEdit();
        EDI_cursor_EDI_paste_clipboardContent_string = await window.myAPI.readClipboard();
        // TODO: what are the possible returned values of 'await window.myAPI.readClipboard();'? Is it nullable?
        EDI_cursor_EDI_paste_clipboardContent_string = EDI_cursor_EDI_paste_clipboardContent_string.replaceAll('\r\n', '\n');
        EDI_cursor_EDI_paste_clipboardContent_bytes = EDI_encoder.encode(EDI_cursor_EDI_paste_clipboardContent_string);
        INTS[fEDI_cursor_EDI_paste_clipboardContent_totalLineEndCount] = countNewlines(EDI_cursor_EDI_paste_clipboardContent_string);
        EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS = new Array(1 + INTS[fEDI_cursor_EDI_paste_clipboardContent_totalLineEndCount]);
        EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths = new Array(1 + INTS[fEDI_cursor_EDI_paste_clipboardContent_totalLineEndCount]);

        let lineEndIndex = 0;
        let visualLength = 0;

        // TODO: multibyte logic
        const byteLength = EDI_cursor_EDI_paste_clipboardContent_bytes.length;
        let i = 0;
        for (; i < byteLength; i++) {
            switch (EDI_cursor_EDI_paste_clipboardContent_bytes[i]) {
                case 10:
                    EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS[lineEndIndex] = i;
                    EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths[lineEndIndex] = visualLength;
                    lineEndIndex++;
                    visualLength = 0;
                    break;
                case 9:
                    visualLength += 4 - (visualLength % 4);
                    break;
                default:
                    visualLength++;
                    break;
            }
        }

        EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS[lineEndIndex] = i;
        EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths[lineEndIndex] = visualLength;
    }
}

function EDI_read_duplication() {
    if (BYTES[byteEDI_duplication_may_have_changed] === 1) {
        BYTES[byteEDI_duplication_may_have_changed] = 0;
        
        // Timing don't do this like u did in the other
        //EDI_finalizeEdit();

        const large = INTS[fEDI_editret_cursor_EDI_duplicate_small] + INTS[fEDI_editret_cursor_EDI_duplicate_length];
        EDI_cursor_EDI_duplication_bytes = EDI_textByteList_bytes.subarray(INTS[fEDI_editret_cursor_EDI_duplicate_small], large);

        INTS[fEDI_cursor_EDI_duplication_totalLineEndCount] = countNewlines(EDI_decoder.decode(EDI_cursor_EDI_duplication_bytes));
        EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS = new Array(1 + INTS[fEDI_cursor_EDI_duplication_totalLineEndCount]);
        EDI_cursor_EDI_duplication_arrayLineVisualLengths = new Array(1 + INTS[fEDI_cursor_EDI_duplication_totalLineEndCount]);

        let lineEndIndex = 0;
        let visualLength = 0;

        // TODO: multibyte logic
        const byteLength = EDI_cursor_EDI_duplication_bytes.length;
        let i = 0;
        for (; i < byteLength; i++) {
            switch (EDI_cursor_EDI_duplication_bytes[i]) {
                case 10:
                    EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS[lineEndIndex] = i;
                    EDI_cursor_EDI_duplication_arrayLineVisualLengths[lineEndIndex] = visualLength;
                    lineEndIndex++;
                    visualLength = 0;
                    break;
                case 9:
                    visualLength += 4 - (visualLength % 4);
                    break;
                default:
                    visualLength++;
                    break;
            }
        }

        EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS[lineEndIndex] = i;
        EDI_cursor_EDI_duplication_arrayLineVisualLengths[lineEndIndex] = visualLength;
    }
}

function EDI_requestLspComplete() {
    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
        EDI_finalizeEdit();
    }
    //window.myAPI.editorCompletionRequest(INTS[fEDI_cursor_indexLine], INTS[fEDI_cursor_indexColumn]);
}

/**
 * TODO: You have 'EDI_onKeyDown_keyLengthEqualsOne_ctrlKey' this completely breaks that pattern to pass ctrlKey here so you can do this debug dialog
 * Also the F12 just does 'EDI_doEditorGoToDefinitionRequest' so having this internally do some entirely separate thing is confusing and the process feels hidden cause you threw it all in this function
 */
function EDI_doEditorGoToDefinitionRequest(ctrlKey) {
    if (!ctrlKey) {
        // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
        if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
            EDI_finalizeEdit();
        }
        sendTransaction_MessageKind_textDocument_definition(EDI_getPositionIndex_cursor_raw());
    }
    else {
        DIALOG_show(DialogKind_Debug, /*onResizeAction*/ null, /*elementToFocusOnDialogHideInitiated*/ null);
    }
}

function EDI_requestLspHover() {
    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
        EDI_finalizeEdit();
    }
    let event_clientY = INTS[fEDI_EDI_mouseOver_event_clientY];
    let event_clientX = INTS[fEDI_EDI_mouseOver_event_clientX];

    ///////////
    ///////////
    // # GET INDICES
    ///////////
    ///////////
    if (get_EDI_recentBoundingClientRect_isNull_intFalsey() === 1) {
        let boundingClientRect = EDI_baseElement.getBoundingClientRect();
        INTS[fEDI_recentBoundingClientRect_left] = boundingClientRect.left;
        INTS[fEDI_recentBoundingClientRect_top] = boundingClientRect.top;
        set_EDI_recentBoundingClientRect_isNull_intFalsey(0);
    }

    let rY = event_clientY - INTS[fEDI_recentBoundingClientRect_top] + EDI_lastReadNumber_scrollTop;
    let rX = event_clientX - INTS[fEDI_recentBoundingClientRect_left] - INTS[fEDI_gutterWidthTotal] + EDI_lastReadNumber_scrollLeft;
    
    let indexLine = Math.floor(rY / INTS[fEDI_lineHeight]);
    let indexColumn = Math.round(rX / EDI_characterWidth);

    if (indexLine < 0) return;
    if (indexColumn < 0) return;
    if (indexLine >= INTS[fEDI_lineEndPositionList_count]) return;
    // ----
    let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(indexLine);
    if (indexColumn > lastValidIndexColumn) return;
    
    ///////////
    ///////////
    // # GET INDICES
    ///////////
    ///////////

    // Indices are wrong... they're likely outdated
    if (BYTES[byteEDI_mousemove_eventListener_isActive] === 0) {
        //window.myAPI.editorHoverRequest(indexLine, indexColumn);
    }
}

function EDI_hideTooltip() {
    TOOLTIP_hide();
}

function EDI_onfocus() {
    BYTES[byteEDI_editorHasFocus] = 1;
    BYTES[byteEDI_clipboard_may_have_changed] = 1;
}

function EDI_onblur() {
    BYTES[byteEDI_editorHasFocus] = 0;
    BYTES[byteEDI_clipboard_may_have_changed] = 1;
}

/**
 * Returns the underlying uint8array that contains the encoded characters for the text.
 * The uint8array's capacity (i.e.: length) is not what should be saved out.
 * Instead only save the countOfBytesInUse.
 * 
 * The editor stores all line endings as '\n'.
 * When saving the bytes, swap out any '\n' for the 'lineEndString' which may or may not be '\n' (i.e.: it could be '\r\n' or '\r').
 * 
 * A '\0' character does NOT terminate the subarray's bytes that are in use.
 * You need to iterate specifically for 'countOfBytesInUse'.
 * 
 * @param {*} NOTfinalizePendingEdits if there is a pending edit, it needs to be finalized in order to see the updated text. The default behavior is to finalize the pending edits. To use default behavior, do NOT provide the parameter, or provide a falsey expression like 'null'.
 * @returns
 */
function EDI_getFinalizedEditsAndRawSaveFileData(NOTfinalizePendingEdits) {
    if (!NOTfinalizePendingEdits) {
        EDI_finalizeEdit();
    }
    return {
        uint8arrayTextBytes: EDI_textByteList_bytes,
        countOfBytesInUse: INTS[fEDI_textByteList_count],
        lineEndString: EDI_lineEndString,
        fileStartsWithBom: Boolean(get_EDI_fileStartsWithBom())
    };
}
//#endregion

//#region mousemove
//#endregion

function EDI_toExtensionKind(extensionWithPeriod) {
    switch (extensionWithPeriod) {
        case '.js':
        case '.cjs':
            return ExtensionKind_JavaScript;
        default:
            return ExtensionKind_None;
    }
}

function EDI_registerHandlers() {
    EDI_scroll_viewport.addEventListener('scroll', EDI_scrollViewport_scroll, { passive: true });
    // TODO: text area to capture all the languages
    EDI_baseElement.addEventListener('keydown', EDI_onKeyDown);




    ////EDI_baseElement.addEventListener('keydown', EDI_onKeyDown);
    EDI_baseElement.addEventListener('mousedown', EDI_onMouseDown);

    //EDI_baseElement.addEventListener('contextmenu', EDI_onContextMenu);
    window.addEventListener('resize', EDI_onResize);

    // Attach a single listener to your text container (Event Delegation)
    //EDI_baseElement.addEventListener('mouseover', EDI_mouseOver);
    //EDI_baseElement.addEventListener('mouseleave', EDI_mouseLeave);
    
    //EDI_baseElement.addEventListener('focus', EDI_onfocus);
    //EDI_baseElement.addEventListener('blur', EDI_onblur);

    ////EDI_scroll_viewport.addEventListener('scroll', EDI_scrollViewport_scroll, { passive: true });

    //EDI_gutter.addEventListener('wheel', EDI_onWheelGutter, { passive: false /* 'e.preventDefault();' is used*/ });
}
//#endregion

//#region textByteList
/**
 * @param {number} index 
 * @param {Uint8Array} incomingBs the incoming bytes, name avoids confusion with EDI_textByteList_bytes
 * @param {number} offset the offset to begin reading from
 * @param {number} length the amount of bytes to read
 */
function EDI_textByteList_insertBytes(index, incomingBs, offset, length) {
    // 1. Validate that the source parameters are within the actual bounds of incomingBs
    if (offset < 0 || length < 0 || offset + length > incomingBs.length) {
        throw new RangeError(
            //`Invalid source bounds: offset ${offset} and length ${length} exceed incomingBs.length of ${incomingBs.length}.`
        );
    }

    // 2. Validate that the target insertion index makes sense
    if (index < 0 || index > INTS[fEDI_textByteList_count]) {
        throw new RangeError(
            //`Invalid insertion index: index ${index} must be between 0 and current count ${INTS[fEDI_textByteList_count]}.`
        );
    }

    EDI_textByteList_ensureCapacityForInsertion(index, length);

    if (index !== INTS[fEDI_textByteList_count]) {
        EDI_textByteList_copyTo(EDI_textByteList_bytes, index, EDI_textByteList_bytes, index + length, INTS[fEDI_textByteList_count] - index);
    }

    // TODO: Google AI is telling me:
    // < In JavaScript, calling .subarray(0, incomingBs.length) on a TypedArray does not duplicate memory or create a heavy object.
    // < It is already optimized under the hood.
    // < ...
    // < You can simplify your code back down to a single line without losing any performance:
    // < ...
    //
    const segmentToInsert = (offset === 0 && offset + length === incomingBs.length)
        ? incomingBs
        : incomingBs.subarray(offset, offset + length);
    EDI_textByteList_bytes.set(segmentToInsert, index);

    INTS[fEDI_textByteList_count] += length;
}
/**
 * Does not clear trailing information.
 * 
 * count === 0 immediately returns
 */
function EDI_textByteList_removeAt(index, count) {
    if (index > INTS[fEDI_textByteList_count]) { throw new Error('removeAt(...): index > INTS[fEDI_textByteList_count]'); }
    if (index + count > INTS[fEDI_textByteList_count]) { throw new Error('removeAt(...): index + count > INTS[fEDI_textByteList_count]'); }
    if (count === 0) { return; }

    if (index + count === INTS[fEDI_textByteList_count]) {
        let shiftableCount = INTS[fEDI_textByteList_count] - (index + count);
        if (shiftableCount > 0) {
            EDI_textByteList_copyTo(
                EDI_textByteList_bytes,
                index + count,
                EDI_textByteList_bytes,
                index,
                shiftableCount);
        }
    }
    else {
        EDI_textByteList_copyTo(
            EDI_textByteList_bytes,
            index + count,
            EDI_textByteList_bytes,
            index,
            INTS[fEDI_textByteList_count] - (index + count));
    }

    INTS[fEDI_textByteList_count] -= count;
}
/**
 * 
 * @param {number} sourceStart 
 * @param {number} destinationStart 
 * @param {number} length 
 */
function EDI_textByteList_duplicateWithin(sourceStart, destinationStart, length) {
    if (sourceStart + length > destinationStart) {
        // TODO: This perhaps could result in the initial 'copyTo' step that creates space within the array, having clobbered the source.
        //
        // TODO: I'm gonna throw an error if 'sourceStart + length > destinationStart' that should let me do the simple duplicate case and then go from there.
        //
        // TODO: When copying text you only need to remember the positions maybe, and then if the user loses focus of the app...
        // ...only then would you need to create text from their selection in case they intend to paste to an external app...
        // ...otherwise paste could just be a copyWithin if copy and paste only occurs within the app itself?
        //
        throw new Error('TODO: sourceStart + length > destinationStart');
    }

    EDI_textByteList_ensureCapacityForInsertion(destinationStart, length);

    if (destinationStart !== INTS[fEDI_textByteList_count]) {
        EDI_textByteList_copyTo(EDI_textByteList_bytes, destinationStart, EDI_textByteList_bytes, destinationStart + length, INTS[fEDI_textByteList_count] - destinationStart);
    }

    EDI_textByteList_copyTo(EDI_textByteList_bytes, sourceStart, EDI_textByteList_bytes, destinationStart, length);

    INTS[fEDI_textByteList_count] += length;
}
function EDI_textByteList_ensureCapacityForInsertion(index, count) {
    // TODO: sparse insertions?
    const requiredCapacity = Math.max(INTS[fEDI_textByteList_count] + count, index);
    
    // If we already have enough capacity, do absolutely nothing
    if (requiredCapacity <= INTS[fEDI_textByteList_capacity]) {
        return;
    }

    let capacityNew = INTS[fEDI_textByteList_capacity];

    // 1. Scale geometrically by 1.125x (current + current / 8)
    capacityNew = capacityNew + (capacityNew >> 3);

    // 2. Minimum growth step: Ensure it grows by at least 1024 bytes 
    //    so small files don't reallocate on every single keystroke.
    const minGrowth = INTS[fEDI_textByteList_capacity] + 1024;
    if (capacityNew < minGrowth) {
        capacityNew = minGrowth;
    }

    // 3. Safety fallback for massive inserts (e.g., large copy/paste):
    //    If capacityNew still doesn't fit requiredCapacity, pad requiredCapacity 
    //    by 1024 bytes so the user can keep typing immediately after pasting.
    if (capacityNew < requiredCapacity) {
        capacityNew = requiredCapacity + 1024;
    }

    // Safety check against integer overflow / negative bounds
    if (capacityNew < INTS[fEDI_textByteList_capacity]) {
        throw new Error('ensureCapacityForInsertion(...): Capacity overflowed or went negative');
    }

    // Allocate and copy EXACTLY ONCE
    let bytesNew = new Uint8Array(capacityNew);
    EDI_textByteList_copyTo(EDI_textByteList_bytes, 0, bytesNew, 0, INTS[fEDI_textByteList_count]);
    
    // Commit the changes to your global/module state
    EDI_textByteList_bytes = bytesNew;
    INTS[fEDI_textByteList_capacity] = capacityNew;
}
/**
 * inclusive/exclusive
 */
function EDI_textByteList_copyTo(bytesSource, sourceStart, bytesDestination, destinationStart, length) {
    if (bytesSource === bytesDestination) {
        if (bytesSource !== EDI_textByteList_bytes) {
            throw new Error('bytesSource === bytesDestination ; but bytesSource !== EDI_textByteList_bytes');
        }

        EDI_textByteList_bytes.copyWithin(destinationStart, sourceStart, sourceStart + length);
    }
    else {
        bytesDestination.set(bytesSource.subarray(sourceStart, sourceStart + length), destinationStart);
    }
}
//#endregion

//#region EDI_styleBuffer
/**
 * TODO: if you are just inserting 0's add a function for that or maybe a function for anything and then you're inserting it at each position for a length from an offset.
 * 
 * @param {number} index 
 * @param {Uint8Array} incomingBs the incoming bytes, name avoids confusion with EDI_styleBuffer
 * @param {number} offset the offset to begin reading from
 * @param {number} length the amount of bytes to read
 */
function EDI_styleBuffer_insertBytes(index, incomingBs, offset, length) {
    // 1. Validate that the source parameters are within the actual bounds of incomingBs
    if (offset < 0 || length < 0 || offset + length > incomingBs.length) {
        throw new RangeError(
            //`Invalid source bounds: offset ${offset} and length ${length} exceed incomingBs.length of ${incomingBs.length}.`
        );
    }

    // 2. Validate that the target insertion index makes sense
    if (index < 0 || index > INTS[fEDI_styleBuffer_count]) {
        throw new RangeError(
            //`Invalid insertion index: index ${index} must be between 0 and current count ${INTS[fEDI_styleBuffer_count]}.`
        );
    }

    EDI_styleBuffer_ensureCapacityForInsertion(index, length);

    if (index !== INTS[fEDI_styleBuffer_count]) {
        EDI_styleBuffer_copyTo(EDI_styleBuffer, index, EDI_styleBuffer, index + length, INTS[fEDI_styleBuffer_count] - index);
    }

    // TODO: Google AI is telling me:
    // < In JavaScript, calling .subarray(0, incomingBs.length) on a TypedArray does not duplicate memory or create a heavy object.
    // < It is already optimized under the hood.
    // < ...
    // < You can simplify your code back down to a single line without losing any performance:
    // < ...
    //
    const segmentToInsert = (offset === 0 && offset + length === incomingBs.length)
        ? incomingBs
        : incomingBs.subarray(offset, offset + length);
    EDI_styleBuffer.set(segmentToInsert, index);

    INTS[fEDI_styleBuffer_count] += length;
}
/**
 * Does not clear trailing information.
 * 
 * count === 0 immediately returns
 */
function EDI_styleBuffer_removeAt(index, count) {
    if (index > INTS[fEDI_styleBuffer_count]) { throw new Error('removeAt(...): index > INTS[fEDI_styleBuffer_count]'); }
    if (index + count > INTS[fEDI_styleBuffer_count]) { throw new Error('removeAt(...): index + count > INTS[fEDI_styleBuffer_count]'); }
    if (count === 0) { return; }

    if (index + count === INTS[fEDI_styleBuffer_count]) {
        let shiftableCount = INTS[fEDI_styleBuffer_count] - (index + count);
        if (shiftableCount > 0) {
            EDI_styleBuffer_copyTo(
                EDI_styleBuffer,
                index + count,
                EDI_styleBuffer,
                index,
                shiftableCount);
        }
    }
    else {
        EDI_styleBuffer_copyTo(
            EDI_styleBuffer,
            index + count,
            EDI_styleBuffer,
            index,
            INTS[fEDI_styleBuffer_count] - (index + count));
    }

    INTS[fEDI_styleBuffer_count] -= count;
}
function EDI_styleBuffer_ensureCapacityForInsertion(index, count) {
    // TODO: sparse insertions?
    const requiredCapacity = Math.max(INTS[fEDI_styleBuffer_count] + count, index);
    
    // If we already have enough capacity, do absolutely nothing
    if (requiredCapacity <= INTS[fEDI_styleBuffer_capacity]) {
        return;
    }

    let capacityNew = INTS[fEDI_styleBuffer_capacity];

    // 1. Scale geometrically by 1.125x (current + current / 8)
    capacityNew = capacityNew + (capacityNew >> 3);

    // 2. Minimum growth step: Ensure it grows by at least 1024 bytes 
    //    so small files don't reallocate on every single keystroke.
    const minGrowth = INTS[fEDI_styleBuffer_capacity] + 1024;
    if (capacityNew < minGrowth) {
        capacityNew = minGrowth;
    }

    // 3. Safety fallback for massive inserts (e.g., large copy/paste):
    //    If capacityNew still doesn't fit requiredCapacity, pad requiredCapacity 
    //    by 1024 bytes so the user can keep typing immediately after pasting.
    if (capacityNew < requiredCapacity) {
        capacityNew = requiredCapacity + 1024;
    }

    // Safety check against integer overflow / negative bounds
    if (capacityNew < INTS[fEDI_styleBuffer_capacity]) {
        throw new Error('ensureCapacityForInsertion(...): Capacity overflowed or went negative');
    }

    // Allocate and copy EXACTLY ONCE
    let bytesNew = new Uint8Array(capacityNew);
    EDI_styleBuffer_copyTo(EDI_styleBuffer, 0, bytesNew, 0, INTS[fEDI_styleBuffer_count]);
    
    // Commit the changes to your global/module state
    EDI_styleBuffer = bytesNew;
    INTS[fEDI_styleBuffer_capacity] = capacityNew;
}
/**
 * inclusive/exclusive
 */
function EDI_styleBuffer_copyTo(bytesSource, sourceStart, bytesDestination, destinationStart, length) {
    if (bytesSource === bytesDestination) {
        if (bytesSource !== EDI_styleBuffer) {
            throw new Error('bytesSource === bytesDestination ; but bytesSource !== EDI_styleBuffer');
        }

        EDI_styleBuffer.copyWithin(destinationStart, sourceStart, sourceStart + length);
    }
    else {
        bytesDestination.set(bytesSource.subarray(sourceStart, sourceStart + length), destinationStart);
    }
}
//#endregion

//#region lineEndPositionList
/**
 * This function is manually inlined and modified for performance within 'EDI_state_setText_byteArray'.
 * Within the for loop, and immediately after the for loop to handle EOF.
 * Neither the for loop nor the EOF handling is 1 to 1 at the moment. They differ slightly.
 */
function EDI_lineEndPositionList_insert(lineIndex, position, lineLengthVisual) {
    EDI_lineEndPositionList_ensureCapacityForInsertion(lineIndex, 1);

    // 1. First, tell the heap to increment the indices of all lines *at or after* lineIndex.
    // This makes a logical "hole" in the heap's index mapping.
    EDI_trackingUint32MaxHeap.batchInsertLines(lineIndex, 1);

    // 2. Shift your linear text data arrays down to open a hole in your document structure
    if (lineIndex !== INTS[fEDI_lineEndPositionList_count]) {
        EDI_lineEndPositionList_copyTo(EDI_lineEndPositionList_data, lineIndex, EDI_lineEndPositionList_data, lineIndex + 1, INTS[fEDI_lineEndPositionList_count] - lineIndex);
    }

    // 3. Now it is safe to insert the new line into the heap.
    // It will take the newly vacated lineIndex.
    EDI_trackingUint32MaxHeap.insert(lineIndex, lineLengthVisual);
    
    // 4. Update the linear data metrics
    EDI_lineEndPositionList_data[lineIndex] = position;
    INTS[fEDI_lineEndPositionList_count]++;

    // TODO: probably remove this and let the invoker do it themselves if warranted.
    if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
        (INTS[fEDI_longestLine_length] !== EDI_trackingUint32MaxHeap.unpack_pool_length || INTS[fEDI_longestLine_indexLine] !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
            INTS[fEDI_longestLine_indexLine] = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
            INTS[fEDI_longestLine_length] = EDI_trackingUint32MaxHeap.unpack_pool_length;
    }
}

/**
 * Does not clear trailing information.
 * 
 * count === 0 immediately returns
 */
function EDI_lineEndPositionList_removeAt(index, count) {
    if (index > INTS[fEDI_lineEndPositionList_count]) { throw new Error('removeAt(...): index > INTS[fEDI_lineEndPositionList_count]'); }
    if (index + count > INTS[fEDI_lineEndPositionList_count]) { throw new Error('removeAt(...): index + count > INTS[fEDI_lineEndPositionList_count]'); }
    if (count === 0) { return; }

    const endDeletedRange = index + count;

    // 1. Process the heap internally (it compacts, re-heapifies, and re-syncs its own map)
    EDI_trackingUint32MaxHeap.batchRemoveLines(index, count);

    let shiftableCount = INTS[fEDI_lineEndPositionList_count] - endDeletedRange;
    if (shiftableCount > 0) {
        EDI_lineEndPositionList_copyTo(
            EDI_lineEndPositionList_data,
            endDeletedRange,
            EDI_lineEndPositionList_data,
            index,
            shiftableCount
        );
    }

    INTS[fEDI_lineEndPositionList_count] -= count;

    if (EDI_trackingUint32MaxHeap.tryPooledPeek() &&
        (INTS[fEDI_longestLine_length] !== EDI_trackingUint32MaxHeap.unpack_pool_length || INTS[fEDI_longestLine_indexLine] !== EDI_trackingUint32MaxHeap.unpack_pool_lineIndex)) {
            INTS[fEDI_longestLine_indexLine] = EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
            INTS[fEDI_longestLine_length] = EDI_trackingUint32MaxHeap.unpack_pool_length;
    }
}
function EDI_lineEndPositionList_ensureCapacityForInsertion(index, count) {
    // TODO: sparse insertions?
    const requiredCapacity = Math.max(INTS[fEDI_lineEndPositionList_count] + count, index);
    
    // If we already have enough capacity, do absolutely nothing
    if (requiredCapacity <= INTS[fEDI_lineEndPositionList_capacity]) {
        return;
    }

    // Calculate the new capacity by doubling until it fits
    let capacityNew = INTS[fEDI_lineEndPositionList_capacity] || 1; // Prevent infinite loops if capacity is 0
    while (capacityNew < requiredCapacity) {
        capacityNew *= 2;
    }

    // Safety check against integer overflow / negative bounds
    if (capacityNew < INTS[fEDI_lineEndPositionList_capacity]) {
        throw new Error('ensureCapacityForInsertion(...): Capacity overflowed or went negative');
    }

    // Allocate and copy EXACTLY ONCE
    let dataNew = new Uint32Array(capacityNew);
    EDI_lineEndPositionList_copyTo(EDI_lineEndPositionList_data, 0, dataNew, 0, INTS[fEDI_lineEndPositionList_count]);
    // Commit the changes to your global/module state
    EDI_lineEndPositionList_data = dataNew;
    INTS[fEDI_lineEndPositionList_capacity] = capacityNew;
}
/**
 * inclusive/exclusive
 */
function EDI_lineEndPositionList_copyTo(bytesSource, sourceStart, bytesDestination, destinationStart, length) {
    if (bytesSource === bytesDestination) {
        if (bytesSource !== EDI_lineEndPositionList_data) {
            throw new Error('bytesSource === bytesDestination ; but bytesSource !== EDI_lineEndPositionList_data');
        }

        EDI_lineEndPositionList_data.copyWithin(destinationStart, sourceStart, sourceStart + length);
    }
    else {
        bytesDestination.set(bytesSource.subarray(sourceStart, sourceStart + length), destinationStart);
    }
}
//#endregion

////#region lineStringCache
//
////let EDI_lineStringCache = [];
////let EDI_lineStringCache_capacity = [];
////let EDI_lineStringCache_count = [];
//
///**
// * This function is manually inlined and modified for performance within 'EDI_state_setText_byteArray'.
// * Within the for loop, and immediately after the for loop to handle EOF.
// * Neither the for loop nor the EOF handling is 1 to 1 at the moment. They differ slightly.
// */
//function EDI_lineStringCache_insert(lineIndex, position, lineLengthVisual) {
//    EDI_lineStringCache_ensureCapacityForInsertion(lineIndex, 1);
//
//    // 1. First, tell the heap to increment the indices of all lines *at or after* lineIndex.
//    // This makes a logical "hole" in the heap's index mapping.
//    EDI_trackingUint32MaxHeap.batchInsertLines(lineIndex, 1);
//
//    // 2. Shift your linear text data arrays down to open a hole in your document structure
//    if (lineIndex !== EDI_lineStringCache_count) {
//        EDI_lineStringCache_copyTo(EDI_lineStringCache, lineIndex, EDI_lineStringCache, lineIndex + 1, EDI_lineStringCache_count - lineIndex);
//    }
//
//    // 3. Now it is safe to insert the new line into the heap.
//    // It will take the newly vacated lineIndex.
//    EDI_trackingUint32MaxHeap.insert(lineIndex, lineLengthVisual);
//    
//    // 4. Update the linear data metrics
//    EDI_lineStringCache[lineIndex] = position;
//    EDI_lineStringCache_count++;
//}
//
///**
// * Does not clear trailing information.
// * 
// * count === 0 immediately returns
// */
//function EDI_lineStringCache_removeAt(index, count) {
//    if (index > EDI_lineStringCache_count) { throw new Error('removeAt(...): index > EDI_lineStringCache_count'); }
//    if (index + count > EDI_lineStringCache_count) { throw new Error('removeAt(...): index + count > EDI_lineStringCache_count'); }
//    if (count === 0) { return; }
//
//    const endDeletedRange = index + count;
//
//    // 1. Process the heap internally (it compacts, re-heapifies, and re-syncs its own map)
//    EDI_trackingUint32MaxHeap.batchRemoveLines(index, count);
//
//    let shiftableCount = EDI_lineStringCache_count - endDeletedRange;
//    if (shiftableCount > 0) {
//        EDI_lineStringCache_copyTo(
//            EDI_lineStringCache,
//            endDeletedRange,
//            EDI_lineStringCache,
//            index,
//            shiftableCount
//        );
//    }
//
//    EDI_lineStringCache_count -= count;
//}
//function EDI_lineStringCache_ensureCapacityForInsertion(index, count) {
//    // TODO: sparse insertions?
//    const requiredCapacity = Math.max(EDI_lineStringCache_count + count, index);
//    
//    // If we already have enough capacity, do absolutely nothing
//    if (requiredCapacity <= EDI_lineStringCache_capacity) {
//        return;
//    }
//
//    // Calculate the new capacity by doubling until it fits
//    let capacityNew = EDI_lineStringCache_capacity || 1; // Prevent infinite loops if capacity is 0
//    while (capacityNew < requiredCapacity) {
//        capacityNew *= 2;
//    }
//
//    // Safety check against integer overflow / negative bounds
//    if (capacityNew < EDI_lineStringCache_capacity) {
//        throw new Error('ensureCapacityForInsertion(...): Capacity overflowed or went negative');
//    }
//
//    // Allocate and copy EXACTLY ONCE
//    let dataNew = new Uint32Array(capacityNew);
//    EDI_lineStringCache_copyTo(EDI_lineStringCache, 0, dataNew, 0, EDI_lineStringCache_count);
//    // Commit the changes to your global/module state
//    EDI_lineStringCache = dataNew;
//    EDI_lineStringCache_capacity = capacityNew;
//}
///**
// * inclusive/exclusive
// */
//function EDI_lineStringCache_copyTo(bytesSource, sourceStart, bytesDestination, destinationStart, length) {
//    if (bytesSource === bytesDestination) {
//        if (bytesSource !== EDI_lineStringCache) {
//            throw new Error('bytesSource === bytesDestination ; but bytesSource !== EDI_lineStringCache');
//        }
//
//        EDI_lineStringCache.copyWithin(destinationStart, sourceStart, sourceStart + length);
//    }
//    else {
//        bytesDestination.set(bytesSource.subarray(sourceStart, sourceStart + length), destinationStart);
//    }
//}
//#endregion

// Extremely important softlock possibility: see documentation comment for 'EDI_finalizeEdit()'.
// Retrospectively I'd say... I imagine there'd be more than one scenario of this I have a lot of 'critical booleans'.
// i.e.: if you enter the 'critical boolean guarded code path' then throw an exception in the middle of that code path with bad state for the 'critical boolean guarded code path' you might never be able to enter it again.
// i.e.: I don't see this happen myself unless I'm messing with new code and running the code that I am in progress of writing. But I don't have a try catch so if an error were to occur it'd completely softlock things.

/*
###################################
# Wording related to "indexLine": #
###################################

- indexLine        // The line number of '1' corresponds to the '0' indexLine; The end position of this line is located at index '0' within 'EDI_lineEndPositionList'.
- virtualIndexLine // If you map the indexLine to an index that exists from virtualIndex to (virtualIndex + virtualCount - 1); both sides are inclusive;
                   // Then you could imagine that the UI has HTML divs available to be rendered into.
                   // And that this 'virtualIndexLine' says: "given my indexLine, is this being shown in the UI?"
                   // BUT there is more to this, you next have to consider the position of the ringBuffer.

Why is it not a 'lineIndex' wording pattern?

It tends to be the case that you are working with an 'index'
so the inclusion of that word is rather unimportant when reading over the code.

I actually think 'lineIndex' "rolls off the tongue" a little easier.
But if you apply the pattern it hides the word 'line'.
And the importance when reading the code lies with the words 'line' and 'column'.

- [ ] When getting the ringBufferIndex of anything that follows this pattern you don't check whether the underlying data has a large enough count, it is solely related to whether the itemHeight and height of the element can fit "that many divs".
    - [ ] TreeView
    - [ ] List
- [ ] When creating divs for the viewport you follow up by drawing the viewport afterwards.
    - [ ] Thus the creation of divs ought to be fully ignoring any excessive calculations because its style is just overriden immediately afterwards.
*/

/*
###################################################################
# Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex': #
###################################################################

// TODO: This is an awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'...
// ...the initial declaration of 'let ringBufferIndex' is assigned what I refer to as the "virtualIndex"
// but 'ringBufferIndex' is the output of the function, and a 'virtualIndex' variable is only needed temporarily
// for the calculation. So by storing the 'virtualIndex' in 'ringBufferIndex' at the start I skip a variable declaration.
|
(retrospective comment): I see what I was doing.
It isn't just the single variable declaration.
You can't do the modulo logic UNLESS the virtual index is valid (that the line of text is actually being drawn in the UI).
BUT I think this was an assumption on my end.
I wonder if the modulo math would work out such that I could...
well I guess I'd need to add an if to verify that the modulo math went correctly
thus the same thing happens but now I can't just re-use that I'm virtual index first then you're safe thus the if else part...
*/
