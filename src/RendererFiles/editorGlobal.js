//__#__
// preprocessor.cjs
import "./fieldBuffer"
import "./javascriptFeatures"
//__#__

let EDI_trackingUint32MaxHeap = new TrackingUint32MaxHeap();

/**
 * @type {UInt32List}
 */
let EDI_findOverlay_searchResultPositionList = null;

let EDI_textByteList_bytes = new Uint8Array(INTS[fEDI_textByteList_capacity]);

const EDI_encoder = new TextEncoder();
const EDI_decoder = new TextDecoder();

let gutterWidthTotal_withPxUnits = '';

/**
 * This is likely a decimal value once it gets measured for real, do not try to put it in an int container.
 * 
 * This is assumed to never be a negative value.
 * // mouse move only checks the relativeX of the event for being less than 0. Because the column is relativeX divided by 'EDI_characterWidth'.
 * Thus the only negative that can come from the column is because the 'EDI_characterWidth' were negative. So it isn't checked less than 0 the column.
 * 
 * TODO: "this is assumed to never be 0"?
 */
let EDI_characterWidth = 8;
/**
 * This is likely a decimal value once it gets measured for real, do not try to put it in an int container.
 */
let EDI_cursor_cursorTranslateXValue = 0;

/**
 * When this is cleared the information is not removed, only 'gapBufferCount' is set to 0.
 */
const EDI_cursor_textInsertionBuffer = new Uint8Array(CONST_EDI_cursor_GAP_BUFFER_CAPACITY);

let EDI_cursor_textInsertionBufferWriteToSpanElement = null;

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

/**
 * This purposefully avoids the wording "edit length" in order to avoid accident / confusing / hard to read code
 * but in simplest terms this variable is the resulting 'editLength' that existed after a delete or backspace removed a line end.
 * 
 * This way you can always just check whether the "sub length" which is relative to the edit_flagLineChanged has removed all the
 * text that other line that you landed on without having yet finalized.
 */
let EDI_cursor_edit_flagLineChanged = -1;

/**
 * 'await window.myAPI.editorSetClipboard(...);' needs to be followed up with 'EDI_clipboard_may_have_changed = false'
 * When reading the clipboard use 'await EDI_read_clipboard();'
 */
let EDI_clipboard_may_have_changed = true;
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 */
let EDI_cursor_EDI_paste_clipboardContent_string = null;
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 */
let EDI_cursor_EDI_paste_clipboardContent_bytes = null;
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 * editPosition + this[i]
 */
let EDI_cursor_EDI_paste_clipboardContent_totalLineEndCount = 0;
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









/**
 * 'await window.myAPI.editorSetClipboard(...);' needs to be followed up with 'EDI_clipboard_may_have_changed = false'
 * When reading the clipboard use 'await EDI_read_clipboard();'
 */
let EDI_duplication_may_have_changed = true;
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 */
//let EDI_cursor_EDI_duplication_string = null;
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 */
let EDI_cursor_EDI_duplication_bytes = null;
/**
 * When reading the clipboard use 'await EDI_read_clipboard();' and then read the result from this variable.
 * 
 * editPosition + this[i]
 */
let EDI_cursor_EDI_duplication_totalLineEndCount = 0;
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





const EDI_debug = document.getElementById('EDI_debug');
const EDI_findOverlay = document.getElementById('EDI_findOverlay');
EDI_findOverlay.style.visibility = 'hidden';

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

/** TODO: This allocation upsets me. */
const w_divNONE = document.createElement('div');
let w_div = w_divNONE;

let EDI_lineHeightStringWithPx = '';

/**
 * This queueing is currently a complete copy and paste of what Google AI generated.
 * I looked it over and it appears correct.
 * 
 * TODO: re-use the same hidden class somehow for the objects being put into this instead of having two separate ones.
 * 
 * ----
 * 
 * Type is either this: {
 *       absolutePath: textSourceIdentifier,
 *       version: version,
 *       startLine: lineAndColumnIndices_indexLine,
 *       startCharacter: lineAndColumnIndices_indexColumn,
 *       endLine: lineAndColumnIndices_indexLine,
 *       endCharacter: lineAndColumnIndices_indexColumn,
 *       text: text
 *   }
 * 
 * ---
 * OR
 * ---
 * 
 * this: {
 *       absolutePath: textSourceIdentifier,
 *       version: version,
 *       arrayOfEditInformation: [
 * 	         {
 * 	         	startLine,
 * 	         	startCharacter,
 * 	         	endLine,
 * 	         	endCharacter,
 *              text: text
 * 	         },
 *           // perhaps more than one in the array...
 *       ]
 * }
 * 
 */
const lspQueue = [];

// Pre-allocate a typed array to prevent memory allocation during runtime
/**
 * TODO: If you queue more than 32 renderKinds in a single frame you're gonna lose information. (remedy this?) see 'BUFFER_SIZE = 32'
 */
const EDI_renderKindBuffer = new Uint8Array(BUFFER_SIZE);

let EDI_ringBuffer_gutter = [];
let EDI_ringBuffer_text = EDI_ringBuffer_gutter;
// These empty arrays in javascript are an allocation per, and the editor immediately overwrites them with new arrays anyways. Not using null to avoid JS ever thinking these are null.
// V8 creates an internal JavaScript object header, but it does not allocate any heap memory for data elements yet. 

let EDI_ringBuffer_needsSyntaxHighlightingFlags = new Uint8Array(0);

/**
 * TODO: Long term you'd want to permit shifting nodes in the ringBuffer to avoid literally replacing child nodes foreach visible
 * line below you on enter keystroke but that isn't currently a thing, and I'm trying to work out the details of how to do this.
 * 
 * EDI_init()
 * EDI_ringBuffer_ringBufferIndex_to_arrayOfRangeObjectsOnLine.length = 0;
 * needs to run before accessing
 * 
 * @type {Range[][]}
 */
let EDI_ringBuffer_ringBufferIndex_to_arrayOfRangeObjectsOnLine = [];

let EDI_styleBuffer = new Uint8Array(0);
let EDI_styleBuffer_count = 0;
let EDI_styleBuffer_capacity = 0;

let EDI_lastReadNumber_scrollLeft = 0;
let EDI_lastReadNumber_scrollTop = 0;

const EDI_rangeInit = {
    startContainer: null,
    startOffset: 0,
    endContainer: null,
    endOffset: 0
};

const keywordHighlight = new Highlight();
CSS.highlights.set("js-keywords", keywordHighlight);
const keywordControlHighlight = new Highlight();
CSS.highlights.set("js-keywords-control", keywordControlHighlight);
const typeHighlight = new Highlight();
CSS.highlights.set("js-type", typeHighlight);
const memberHighlight = new Highlight();
CSS.highlights.set("js-member", memberHighlight);
const functionHighlight = new Highlight();
CSS.highlights.set("js-function", functionHighlight);
const identifierHighlight = new Highlight();
CSS.highlights.set("js-identifier", identifierHighlight);
const commentHighlight = new Highlight();
CSS.highlights.set("js-comment", commentHighlight);
const stringHighlight = new Highlight();
CSS.highlights.set("js-string", stringHighlight);

//// Find-All for "EDI_debug_optimization" to find all the commented out logic that was related to this.
// let EDI_debug_optimization_has_logged_disassembleFunction = false;
// let EDI_debug_optimization_last_seen_code = -1;
// let EDI_debug_optimization_delay_heavy_logging = 4;
// let EDI_debug_optimization_run_count = 0;

function EDI_init() {
    //EDI_ringBuffer_ringBufferIndex_to_arrayOfRangeObjectsOnLine.length = 0;

    EDI_measureLineHeightAndCharacterWidth();

    EDI_cursor_caretRow.style.height = EDI_lineHeightStringWithPx;
    EDI_cursor_caretRow.style.lineHeight = EDI_lineHeightStringWithPx;

    EDI_cursor_cursorElement.style.height = EDI_lineHeightStringWithPx;
    EDI_cursor_cursorElement.style.lineHeight = EDI_lineHeightStringWithPx;

    EDI_measureBaseElement();

    const gutterPaddingLeft = CONST_EDI_gutterPaddingLeft + 'px';
    const gutterPaddingRight = CONST_EDI_gutterPaddingRight + 'px';

    EDI_gutter.style.paddingLeft = gutterPaddingLeft;
    EDI_gutter.style.paddingRight = gutterPaddingRight;

    INTS[fEDI_gutterWidthStyleValue] = EDI_characterWidth;

    EDI_drawGutter_Width(INTS[fEDI_lineEndPositionList_count]);

    INTS[fEDI_longestLine_length_PreviousValueWhenLastDrewHorizontalScrollbar] = 1; // necessary for the first render, otherwise the if statement sees 0 !== 0.
    EDI_drawHorizontalScrollbar();
    EDI_drawCursor();

    EDI_state_setText_byteArray(new Uint8Array(16), /*textByteLength*/ 0, /*fileStartsWithBom*/ false, /*textSourceIdentifier*/ null, /*FORMATTED_textSourceIdentifier*/ null, /*extensionKind*/ 0, /*lineEndString*/ '\n', /*lineEndCount*/ 0);

    EDI_registerHandlers();
}

function EDI_render_do() {
    // Process everything in the queue until head catches up to tail
    while (BYTES[byteEDI_queueHead] !== BYTES[byteEDI_queueTail]) {
        // Read the item at the head and advance the head pointer safely
        const renderKind = EDI_renderKindBuffer[BYTES[byteEDI_queueHead] & BUFFER_MASK];
        BYTES[byteEDI_queueHead]++; 

        switch (renderKind) {
            case RenderKind_Scroll:
                EDI_render_do_Scroll();
                break;
            case RenderKind_Resize:
                EDI_render_do_Resize();
                break;
            case RenderKind_InsertLtr:
                EDI_render_do_InsertLtr();
                break;
            case RenderKind_TabKey:
                EDI_render_do_TabKey();
                break;
            case RenderKind_IndentMore:
                EDI_render_do_IndentMore();
                break;
            case RenderKind_IndentLess:
                EDI_render_do_IndentLess();
                break;
            case RenderKind_BackspaceRtl:
                EDI_render_do_Backspace();
                break;
            case RenderKind_DeleteLtr:
                EDI_render_do_Delete();
                break;
            case RenderKind_RemoveSelection:
                EDI_render_do_RemoveSelection();
                break;
            case RenderKind_Enter:
                EDI_render_do_EnterKey();
                break;
            case RenderKind_DuplicateOrPaste:
                EDI_render_do_DuplicateOrPaste();
                break;
            case RenderKind_Clear:
                EDI_render_do_Clear();
                break;
            case RenderKind_SetText:
                EDI_render_do_SetText();
                break;
            case RenderKind_CreateViewport:
                EDI_render_do_CreateViewport();
                break;
            case RenderKind_SyntaxHighlighting:
                EDI_render_do_SyntaxHighlighting();
                break;
            case RenderKind_Cursor_flag_scrollIntoViewExplicit:
                EDI_render_do_cursor_flag_scrollIntoViewExplicit();
                break;
            case RenderKind_Cursor_flag_doNotScrollIntoView:
                EDI_drawCursor(/*NOTscrollCursorIntoView*/ true);
                break;
            case RenderKind_Cursor_n:
                EDI_drawCursor(/*NOTscrollCursorIntoView*/ false);
                break;
        }
    }
    
    BYTES[byteEDI_isRenderPending] = 0;
}

function EDI_render_request(renderKind) {
    // Check if the queue is empty
    if (BYTES[byteEDI_queueHead] !== BYTES[byteEDI_queueTail]) {
        // Get the last inserted item's index
        const lastIndex = (BYTES[byteEDI_queueTail] - 1) & BUFFER_MASK;
        // De-duplicate: if it's the same renderKind, skip adding it
        if (EDI_renderKindBuffer[lastIndex] === renderKind) {
            return;
        }
    }

    // Insert the item at the tail and advance the tail pointer
    EDI_renderKindBuffer[BYTES[byteEDI_queueTail] & BUFFER_MASK] = renderKind;
    BYTES[byteEDI_queueTail]++;
    
    if (BYTES[byteEDI_isRenderPending] === 0) {
        BYTES[byteEDI_isRenderPending] = 1;
        requestAnimationFrame(EDI_render_do);
    }
}

/**
 * If 'ringBufferIndexOfDiv' is falsey clear everything, otherwise clear only what is related to the 'ringBufferIndexOfDiv'.
 * 
 * TODO: This clearing highlights logic was thrown together as a first draft it needs to be optimized.
 */
function EDI_clearHighlights_all() {
    for (let i = EDI_ringBuffer_ringBufferIndex_to_arrayOfRangeObjectsOnLine.length - 1; i >= 0; i--) {
        // TODO: length = 0?
        let arrayOfRangeObjectsOnLine = EDI_ringBuffer_ringBufferIndex_to_arrayOfRangeObjectsOnLine[i];
        let range = arrayOfRangeObjectsOnLine.pop();
        while (range) {
            range = arrayOfRangeObjectsOnLine.pop();
        }
    }
    keywordHighlight.clear();
    keywordControlHighlight.clear();
    memberHighlight.clear();
    functionHighlight.clear();
    identifierHighlight.clear();
    commentHighlight.clear();
    stringHighlight.clear();
    typeHighlight.clear();
}

/**
 * If 'ringBufferIndexOfDiv' is falsey clear everything, otherwise clear only what is related to the 'ringBufferIndexOfDiv'.
 * 
 * TODO: This clearing highlights logic was thrown together as a first draft it needs to be optimized.
 * 
 * This function is manually inlined(-ish) within 'EDI_syntaxHighlight_parallelArray' at the start of the function. (1 of 2)
 */
function EDI_clearHighlights_single(ringBufferIndexOfDiv) {
    const arrayOfRangeObjectsOnLine = EDI_ringBuffer_ringBufferIndex_to_arrayOfRangeObjectsOnLine[ringBufferIndexOfDiv];
    let range = arrayOfRangeObjectsOnLine.pop();
    while (range) {
        if (identifierHighlight.delete(range) ||
            keywordHighlight.delete(range) ||
            memberHighlight.delete(range) ||
            keywordControlHighlight.delete(range) ||
            functionHighlight.delete(range) ||
            commentHighlight.delete(range) ||
            stringHighlight.delete(range) ||
            typeHighlight.delete(range)) {
                // literally do nothing
        }
        range = arrayOfRangeObjectsOnLine.pop();
    }
}

/** TODO: This should grow or shrink when you resize, rather than the current behavior which recreates every single dom element. */
function EDI_render_do_CreateViewport() {

    EDI_clearHighlights_all();

    const virtualCount = INTS[fEDI_virtualCount];

    INTS[fEDI_ONSCROLLvirtualCount] = virtualCount;

    INTS[fEDI_ringBuffer_indexZero] = 0;
    const gutterWidth = `${INTS[fEDI_gutterWidthStyleValue]}px`;
    const virtualization_horizontal_style_width_attribute = EDI_virtualization_horizontal.style.width;

    const gutterFragment = document.createDocumentFragment();
    const textFragment = document.createDocumentFragment();

    const lower = INTS[fEDI_virtualIndexLine];
    const upper = lower + virtualCount;

    const local_EDI_ringBuffer_text = EDI_ringBuffer_text;
    let line = w_divNONE;
    while (line = local_EDI_ringBuffer_text.pop()) {
        line.remove();
    }
    EDI_ringBuffer_text = new Array(upper - lower);

    let loopIndex = 0;

    for (var indexLine = lower; indexLine < upper; indexLine++) {

        const gutterLineElement = document.createElement('div');
        gutterLineElement.className = 'eG';
        gutterLineElement.style.width = gutterWidth;
        gutterLineElement.style.height = EDI_lineHeightStringWithPx;
        gutterLineElement.style.lineHeight = EDI_lineHeightStringWithPx;
        gutterLineElement.appendChild(document.createTextNode(''));
        gutterFragment.appendChild(gutterLineElement);

        const textLineElement = document.createElement('div');
        textLineElement.className = 'eT';
        textLineElement.style.width = virtualization_horizontal_style_width_attribute;
        textLineElement.style.height = EDI_lineHeightStringWithPx;
        textLineElement.style.lineHeight = EDI_lineHeightStringWithPx;
        textLineElement.appendChild(document.createTextNode(''));
        textFragment.appendChild(textLineElement);
        EDI_ringBuffer_text[loopIndex] = textLineElement;

        loopIndex++;
    }

    EDI_gutter_scroll_mover.replaceChildren(gutterFragment);
    EDI_text.insertBefore(textFragment, EDI_cursor_caretRow);

    EDI_ringBuffer_gutter = Array.from(EDI_gutter_scroll_mover.children);

    const local_ArrayFrom_textElement_children_length = EDI_ringBuffer_text.length;
    INTS[fEDI_ArrayFrom_textElement_children_length] = local_ArrayFrom_textElement_children_length;

    EDI_ringBuffer_needsSyntaxHighlightingFlags = new Uint8Array(local_ArrayFrom_textElement_children_length);

    while (EDI_ringBuffer_ringBufferIndex_to_arrayOfRangeObjectsOnLine.length > local_ArrayFrom_textElement_children_length) {
        EDI_ringBuffer_ringBufferIndex_to_arrayOfRangeObjectsOnLine.pop();
    }
    while (EDI_ringBuffer_ringBufferIndex_to_arrayOfRangeObjectsOnLine.length < local_ArrayFrom_textElement_children_length) {
        EDI_ringBuffer_ringBufferIndex_to_arrayOfRangeObjectsOnLine.push([]);
    }

    EDI_drawHorizontalScrollbar();
}

function EDI_createViewport() {
    EDI_render_request(RenderKind_CreateViewport);
}

/**
 * TODO: This logic is very unfortunate.
 * ...
 * I want to move essentially all of it to be rAF.
 * 
 * Specifically my concern is with a mouse down event.
 * 
 * If you scroll, the scrollTop immediately is modified of the container.
 * 
 * Then a scroll event is queued.
 * 
 * This function is the resulting code that gets ran from the event.
 * 
 * This code does some things.
 * 
 * Then rAF.
 * 
 * If I scroll, then mouse down.
 * 
 * If the scroll and mouse down events are handled prior to my rAF
 * 
 * and I've moved all the INTS[fEDI_virtualIndexLine] logic from here to the rAF
 * then the user will "click the wrong line".
 * 
 * "I don't want to limit the speed of editing to that of the screen's refresh rate"
 * 
 * Thus the event handling code does some things immediately pertaining to the edit.
 * And only afterwards does the rAF to show the changes on the UI.
 * 
 * But if I move all this scroll logic then I've essentially forced myself to do that.
 * Unless I have logic that checks for a pending scroll in the rAF and then forces it to complete or something.
 * 
 * You have to think in two states:
 * - raw layout
 * - paint
 * 
 * I'm not sure what words I want for these states but that's what comes to mind.
 * When you scroll the scrollTop immediately is changed. Mousedown needs the "raw layout" scrolltop.
 * 
 * When you draw the resulting UI of a keypress that inserts a character however you want the "paint"
 * you want the last thing that you drew to the screen whether the text being edited appears on screen if so edit the UI accordingly
 * to reflect the edit.
 */
function EDI_scrollViewport_scroll() {
    EDI_lastReadNumber_scrollLeft = EDI_scroll_viewport.scrollLeft;
    EDI_lastReadNumber_scrollTop = EDI_scroll_viewport.scrollTop;
    EDI_render_request(RenderKind_Scroll);
}

/**
 * TODO: synchronous syntax highlighting for multiline syntax that spans multiple lines?
 * TODO: manually unroll the loop to be two chunks:
 * - the first chunk is up to the wrap around
 * - the second chunk is the latter
*/
function EDI_render_do_Scroll() {
    const yAndZ = 'px, -' + EDI_lastReadNumber_scrollTop + 'px, 0)';

    EDI_text.style.transform = 'translate3d(-' + EDI_lastReadNumber_scrollLeft + yAndZ;
    EDI_gutter_scroll_mover.style.transform = 'translate3d(0' + yAndZ;

    const local_lineHeight = INTS[fEDI_lineHeight];
    
    INTS[fEDI_virtualIndexLine] = (EDI_lastReadNumber_scrollTop / local_lineHeight) | 0; // By bit operator or'ing with 0 you "cast" the number to a signed 32-bit integer (Int32).
    
    let local_prevVli = INTS[fEDI_ONSCROLLvirtualIndexLine];
    const local_currVli = INTS[fEDI_virtualIndexLine];
    INTS[fEDI_ONSCROLLvirtualIndexLine] = local_currVli;

    if (INTS[fEDI_intFalsey_isScrolling] === 0) {
        // (Comment group ID: 'do_Scroll/LeadingEdge')...and here the locals are passed to the LeadingEdge because only when performing the LeadingEdge do you need to use the global versions. (part 1 of 3)
        if (EDI_onScroll_LeadingEdge(local_prevVli, local_currVli)) return; // This if statement reads poorly. You return for a reason that isn't gleaned by reading the function name alone.
        // (Comment group ID: 'do_Scroll/LeadingEdge')...and here the locals assigned the same value as the "globals" in case 'EDI_onScroll_LeadingEdge' modified the globals. (part 3 of 3)
        local_prevVli = INTS[fEDI_prevVli];
    }

    let diff = local_currVli - local_prevVli; // you cannot move this 'diff === 0' case prior to the leading edge.
    if (diff === 0) return;

    const local_ArrayFrom_textElement_children_length = INTS[fEDI_ArrayFrom_textElement_children_length];

    let lowerBound = 0;
    let ringBufferIndex = 0; // The 0th loop will immediately increment this variable, thus all the assignments to this have a '- 1' on them.

    if (diff >= local_ArrayFrom_textElement_children_length || diff <= -local_ArrayFrom_textElement_children_length) {
        lowerBound = local_currVli;
        diff = local_ArrayFrom_textElement_children_length; // Bound the loop run to the size of your screen viewport
        ringBufferIndex = INTS[fEDI_ringBuffer_indexZero] - 1;
    }
    else if (diff > 0) {
        lowerBound = local_prevVli + INTS[fEDI_ONSCROLLvirtualCount];
        ringBufferIndex = INTS[fEDI_ringBuffer_indexZero] - 1; // Moving down: Capture index BEFORE updating indexZero
        INTS[fEDI_ringBuffer_indexZero] = (INTS[fEDI_ringBuffer_indexZero] + diff) % local_ArrayFrom_textElement_children_length;
    }
    else {
        lowerBound = local_currVli;
        diff *= -1;
        INTS[fEDI_ringBuffer_indexZero] = (INTS[fEDI_ringBuffer_indexZero] - diff + local_ArrayFrom_textElement_children_length) % local_ArrayFrom_textElement_children_length;
        ringBufferIndex = INTS[fEDI_ringBuffer_indexZero] - 1; // Moving up: Capture index AFTER updating indexZero
    }

    const local_EDI_lineEndPositionList_data = EDI_lineEndPositionList_data;
    const local_EDI_lineEndPositionList_count = INTS[fEDI_lineEndPositionList_count];

    // If you intend to use the variables 'lineStart' or 'lineEnd': Important detail to consider: the lines that are >= INTS[fEDI_lineEndPositionList_count] will continually increment lineStart by 1 So if you expect this to accurately represent the EOF position when it is in view, it probably does NOT.
    let lineStart = 0;
    let lineEnd = -1;
    if (lowerBound < local_EDI_lineEndPositionList_count && lowerBound !== 0) {
        lineEnd = local_EDI_lineEndPositionList_data[lowerBound - 1];
    }

    const local_bytes = EDI_textByteList_bytes;
    const local_EDI_ringBuffer_gutter = EDI_ringBuffer_gutter;
    const local_EDI_ringBuffer_text = EDI_ringBuffer_text;
    const local_EDI_ringBuffer_ringBufferIndex_to_arrayOfRangeObjectsOnLine = EDI_ringBuffer_ringBufferIndex_to_arrayOfRangeObjectsOnLine;
    const local_EDI_decoder = EDI_decoder;
    
    let vertical = lowerBound * local_lineHeight;

    const local_loopLimit = lowerBound + diff;
    for (let indexLine = lowerBound; indexLine < local_loopLimit; ++indexLine) {
        // (faster than modulo given this context)
        ringBufferIndex++;
        if (ringBufferIndex >= local_ArrayFrom_textElement_children_length) {
            ringBufferIndex = 0;
        }

        const gutter = local_EDI_ringBuffer_gutter[ringBufferIndex];
        const div = local_EDI_ringBuffer_text[ringBufferIndex];

        let textNode = gutter.firstChild;
        lineStart = lineEnd + 1;
        if (indexLine < local_EDI_lineEndPositionList_count) {
            textNode.replaceData(0, textNode.length, '' + (indexLine + 1));
            lineEnd = local_EDI_lineEndPositionList_data[indexLine];
        }
        else {
            textNode.replaceData(0, textNode.length, '~');
            lineEnd = lineStart;
        }

        textNode = div.firstChild;
        textNode.replaceData(0, textNode.length, lineStart === lineEnd ? '' : local_EDI_decoder.decode(local_bytes.subarray(lineStart, lineEnd)));

        /////
        /////
        /////
        const arrayOfRangeObjectsOnLine = local_EDI_ringBuffer_ringBufferIndex_to_arrayOfRangeObjectsOnLine[ringBufferIndex];

        /// This function is manually inlined(-ish) within 'EDI_syntaxHighlight_parallelArray' at the start of the function. (2 of 2)
        let range = arrayOfRangeObjectsOnLine.pop();
        while (range) {
            if (identifierHighlight.delete(range) ||
                keywordHighlight.delete(range) ||
                memberHighlight.delete(range) ||
                keywordControlHighlight.delete(range) ||
                functionHighlight.delete(range) ||
                commentHighlight.delete(range) ||
                stringHighlight.delete(range) ||
                typeHighlight.delete(range)) {
                    // literally do nothing
            }
            range = arrayOfRangeObjectsOnLine.pop();
        }
        ///

        EDI_rangeInit.startContainer = textNode;
        EDI_rangeInit.endContainer = textNode;

        let start = 0;
        let length = 0;

        let i = lineStart;

        let TRAILINGstyleByteTRAILING = 0;

        // TODO: optimize the loop
        outerWhile: while (true) {
            if (i >= lineEnd) {
                TRAILINGstyleByteTRAILING = 0;
                break;
            }
            if (EDI_styleBuffer[i] !== 0) {
                const originalStyleByte = EDI_styleBuffer[i];
                if (originalStyleByte === undefined) { // out of bounds
                    TRAILINGstyleByteTRAILING = 0;
                    break;
                }
                start = i - lineStart;
                length = 0;
                while (true) {
                    i++;
                    length++;
                    if (i >= lineEnd) {
                        TRAILINGstyleByteTRAILING = originalStyleByte;
                        break outerWhile;
                    }
                    if (EDI_styleBuffer[i] !== originalStyleByte) {
                        EDI_rangeInit.startOffset = start;
                        EDI_rangeInit.endOffset = start + length;
                        let range = new StaticRange(EDI_rangeInit);
                        arrayOfRangeObjectsOnLine.push(range);
                        if (originalStyleByte === 1) {
                            stringHighlight.add(range);
                        }
                        else if (originalStyleByte === 2) {
                            commentHighlight.add(range);
                        }
                        else if (originalStyleByte === 3) {
                            keywordHighlight.add(range);
                        }
                        else if (originalStyleByte === 4) {
                            keywordControlHighlight.add(range);
                        }
                        else if (originalStyleByte === 5) {
                            identifierHighlight.add(range);
                        }
                        else if (originalStyleByte === 6) {
                            typeHighlight.add(range);
                        }
                        else if (originalStyleByte === 7) {
                            memberHighlight.add(range);
                        }
                        else if (originalStyleByte === 8) {
                            functionHighlight.add(range);
                        }
                        continue outerWhile;
                    }
                }
            }
            i++;
        }

        if (length > 0 && TRAILINGstyleByteTRAILING !== 0) {
            EDI_rangeInit.startOffset = start;
            EDI_rangeInit.endOffset = start + length;
            let range = new StaticRange(EDI_rangeInit);
            arrayOfRangeObjectsOnLine.push(range);
            if (TRAILINGstyleByteTRAILING === 1) {
                stringHighlight.add(range);
            }
            else if (TRAILINGstyleByteTRAILING === 2) {
                commentHighlight.add(range);
            }
            else if (TRAILINGstyleByteTRAILING === 3) {
                keywordHighlight.add(range);
            }
            else if (TRAILINGstyleByteTRAILING === 4) {
                keywordControlHighlight.add(range);
            }
            else if (TRAILINGstyleByteTRAILING === 5) {
                identifierHighlight.add(range);
            }
            else if (TRAILINGstyleByteTRAILING === 6) {
                typeHighlight.add(range);
            }
            else if (TRAILINGstyleByteTRAILING === 7) {
                memberHighlight.add(range);
            }
            else if (TRAILINGstyleByteTRAILING === 8) {
                functionHighlight.add(range);
            }
        }

        EDI_rangeInit.startContainer = null;
        EDI_rangeInit.endContainer = null;
        /////
        /////
        /////

        const translateY = 'translateY(' + vertical + 'px)';
        gutter.style.transform = translateY;
        div.style.transform = translateY;

        vertical += local_lineHeight;
    }
}

/**
 * @returns true if scrollTop (and a few other details) have not changed, thus indicating the invoker should immediately return from their own rather than continuing with scroll logic.
 */
function EDI_onScroll_LeadingEdge(local_prevVli, local_currVli) {

    if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
        // TODO: Timing issue, someone typing while they scroll
        EDI_finalizeEdit();
    }
    
    // (Comment group ID: 'do_Scroll/LeadingEdge')...and here the locals are moved to the global scope. (part 2 of 3)
    INTS[fEDI_prevVli] = local_prevVli;
    INTS[fEDI_currVli] = local_currVli;

    INTS[fEDI_intFalsey_isScrolling] = 1;

    // TODO: I'm fairly certain that this needs to go above 'INTS[fEDI_intFalsey_isScrolling] = 1;' at a minimum. (this is the only horizontal scroll short circuit to avoid vertical scroll logic from running)
    if (INTS[fEDI_prevVli] === INTS[fEDI_virtualIndexLine] && INTS[fEDI_ONSCROLLvirtualCount] === INTS[fEDI_virtualCount]) {
        return true;
    }

    if (INTS[fEDI_ONSCROLLvirtualCount] !== INTS[fEDI_virtualCount]) {
            // Force case 3
            //
            // An overflow will wrap around and still give you a diff of 'INTS[fEDI_virtualCount]'.
            // You cannot modify 'INTS[fEDI_currVli]' because the value is used by case '3' itself.
            //
            // This is very awkward because all other UI that has this sliding window logic just uses 'INTS[fEDI_currVli]'.
            //
            // The reason is because they're also re-evaluating their equivalent of 'INTS[fEDI_virtualIndexLine]'.
            //
            // The editor has a local variable 'let local_currVli = INTS[fEDI_virtualIndexLine];'
            // 
            // If you scroll enough to get a case 3 (full screen "draw") rather than doing some hacky forcing of case 3
            // you'll find that 'INTS[fEDI_virtualIndexLine]' within case 3 is
            // equal to 'local_currVli'.
            //
            // But 'INTS[fEDI_virtualIndexLine]' was being used within case 3
            // due to this awkward setting of the 'INTS[fEDI_currVli]' when doing a hack to force case 3.
            //
            // This meant case 3 was incurring an extra global variable lookup (global variable lookup of 'INTS')
            // - (or with 'ints' you are incurring a read of the array only, but still this is presumed to be more than just using the local variable).
            //
            // Wait I'm wrong with that explanation...
            // 'EDI_render_do_Clear()' does the hack too.
            // But it works maybe?
            //
            // If it does work for 'EDI_render_do_Clear()' it probably has to do with having set the state
            // prior to invoking the scroll function. Versus this leading edge case which changes the values out from under the scroll function.
            //
            // I don't know I'm tired and confused.
            //
            // TODO: Look into all the usages of 'INTS[fEDI_prevVli] and INTS[fEDI_currVli]' or like hacks to force cases
            //
            // TODO: What happens when you overflow 'INTS[fEDI_prevVli]' does it overflow such that you're the correct diff?
            //
            INTS[fEDI_prevVli] = INTS[fEDI_currVli] + INTS[fEDI_virtualCount];

            EDI_render_do_CreateViewport();
            return false;
    }

    return false;
}

function EDI_onScroll_TrailingEdge() {
    INTS[fEDI_intFalsey_isScrolling] = 0;
    EDI_render_request(RenderKind_SyntaxHighlighting);
}

function EDI_render_do_Clear() {
    EDI_clearHighlights_all();

    EDI_drawCursor(/*NOTscrollCursorIntoView*/ false);
    EDI_clearSelectionStyle();
    // TODO: Clear the ring buffer state?

    // Force case 3
    INTS[fEDI_prevVli] = 0;
    INTS[fEDI_currVli] = INTS[fEDI_virtualCount];
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
    EDI_styleBuffer_count = 0;
}

function EDI_clear() {
    EDI_state_clear();
    EDI_render_request(RenderKind_Clear);
}

function EDI_render_do_SetText() {
    EDI_render_do_Clear();

    update_VirtualIndexLine();
    update_virtualCount();

    update_verticalVirtualizationBoundary();

    EDI_drawGutter_Width(INTS[fEDI_lineEndPositionList_count]);
    EDI_drawCursor(/*NOTscrollCursorIntoView*/ false);
    EDI_drawHorizontalScrollbar();
    // Force 'case 3' within 'EDI_render_do_Scroll' downstream
    // TODO: (this comment is being made sometime after this solution was written but from memory...)...
    // ...I believe this works because when you change the text you guarantee a virtual index line of '0' because the scrollTop gets moved to 0...
    // ...the partial solution is to set it to anything other than '0' so the editor detects that a line of text needs to be drawn...
    // ...but this isn't enough because you want the editor to draw every line, thus you make the difference...
    // ...in the virtual index line equal to the count of lines being displayed, i.e.: set virtual index line to 'INTS[fEDI_virtualCount]'...
    // ...then it sees the new value for virtual index line is 0...
    // ...the difference between the previous and new value is 'INTS[fEDI_virtualCount]'...
    // ...thus 'INTS[fEDI_virtualCount]' amount of lines get redrawn...
    // ...i.e.: the entire viewport is redrawn with the new file's text.
    INTS[fEDI_ONSCROLLvirtualIndexLine] = INTS[fEDI_virtualCount];

    EDI_render_do_Scroll();

    // TODO: what is paragraph this doing?
    INTS[fEDI_prevVli] = INTS[fEDI_ONSCROLLvirtualIndexLine];
    INTS[fEDI_currVli] = INTS[fEDI_virtualIndexLine];
    INTS[fEDI_ONSCROLLvirtualIndexLine] = INTS[fEDI_virtualIndexLine];

    clearTimeout(INTS[fEDI_render_do_ScrollTrailingEdgeCheckTimeoutId]);
    INTS[fEDI_render_do_ScrollTrailingEdgeCheckTimeoutId] = setTimeout(EDI_onScroll_TrailingEdge, 200);
}

/**
 * TODO: assert that the function parameters fit the requirements as described in the respective param documentation.
 * @param {*} paddedUint8Array all line endings replaced by '\n' regardless of the desired line ending when saving the file (or copying text, etc...). 'paddedUint8Array.length' is not necessarily equal to 'textLength'. If you want to avoid reallocating when you type a single character. You can pad the uint8array, a padding of 1 gives a textLength of 'paddedUint8Array.length - 1'.
 * @param {*} lineEndString this is the desired line ending when saving the file (or copying text, etc...)
 */
function EDI_state_setText_byteArray(paddedUint8Array, textByteLength, fileStartsWithBom, textSourceIdentifier, FORMATTED_textSourceIdentifier, extensionKind, lineEndString, lineEndCount) {
    EDI_scroll_viewport.scrollTop = 0;
    EDI_lastReadNumber_scrollTop = 0;
    EDI_scroll_viewport.scrollLeft = 0;
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

    let lineLengthVisual = 0; /** TODO: Track the linePosition last seen when making a line or something you don't have to increment this per character, you just need the difference of the last line drawn to the current or something. */
    let local_EDI_lineEndPositionList_count = INTS[fEDI_lineEndPositionList_count];

    for (let sourceI = 0; sourceI < local_EDI_textByteList_count; ++sourceI) {
        ++lineLengthVisual; // avoid branching by eager counting the lineLengthVisual and then excluding the lineEnding later
        if (local_EDI_textByteList_bytes[sourceI] === CONST_EDI_ASCII_TAB) {
            lineLengthVisual += ((4 - ((lineLengthVisual - 1) % 4)) - 1); // (tab logic): avoid branching by eager counting... 'lineLengthVisual - 1... % 4)) - 1)'
        }
        else if (local_EDI_textByteList_bytes[sourceI] === CONST_EDI_ASCII_LINE_FEED) {
            // (they are not exactly the same) (1 of 2) EDI_lineEndPositionList_UNSAFEinsertUNSAFE(local_EDI_lineEndPositionList_count++, sourceI, lineLengthVisual - 1)
            local_EDI_trackingUint32MaxHeap.insert(local_EDI_lineEndPositionList_count, lineLengthVisual - 1);
            local_EDI_lineEndPositionList_data[local_EDI_lineEndPositionList_count] = sourceI;
            ++local_EDI_lineEndPositionList_count;
            lineLengthVisual = 0;
        }
    }

    // (they are not exactly the same) (2 of 2) EDI_lineEndPositionList_UNSAFEinsertUNSAFE(local_EDI_lineEndPositionList_count++, local_EDI_textByteList_count, lineLengthVisual)
    local_EDI_trackingUint32MaxHeap.insert(local_EDI_lineEndPositionList_count, lineLengthVisual);
    local_EDI_lineEndPositionList_data[local_EDI_lineEndPositionList_count] = local_EDI_textByteList_count;

    INTS[fEDI_lineEndPositionList_count] = local_EDI_lineEndPositionList_count + 1; // local_EDI_lineEndPositionList_count is off by '1' if used beyond this line

    local_EDI_trackingUint32MaxHeap.tryPooledPeek();
    INTS[fEDI_longestLine_indexLine] = local_EDI_trackingUint32MaxHeap.unpack_pool_lineIndex;
    INTS[fEDI_longestLine_length] = local_EDI_trackingUint32MaxHeap.unpack_pool_length;

    // TODO: Timing of 'EDI_render_do_SetText'...
    // ...probably what you can do is invoke the inner render requests directly...
    // ...but you'd still have a moment where they can click and the event sees current layout like scrollTop etc...
    EDI_render_request(RenderKind_SetText);
}

// When a file is opened you, without this function, end up invoking END_lineEndPositionList_insert(...) many times.
// That function has various checks, resizing, and shifting logic.
// None of this logic needs to be ran when opening the file for the first time because the resizing is done prior to inserting the individual lines.
// And all the inserts are done where 'lineIndex === list.count'
//
// function EDI_lineEndPositionList_UNSAFEinsertUNSAFE(lineIndex, position, lineLengthVisual) {
//     EDI_trackingUint32MaxHeap.insert(lineIndex, lineLengthVisual);
//     EDI_lineEndPositionList_data[lineIndex] = position;
//     INTS[fEDI_lineEndPositionList_count]++;
// }

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

function EDI_render_do_IndentMore() {
    
    if (INTS[fEDI_cursor_editKind] !== EditKind_IndentMore) {
        return;
    }

    if (INTS[fEDI_cursor_edit_eventCount_drawn] >= INTS[fEDI_cursor_edit_eventCount_occurred]) {
        return;
    }

    let startingIndex = INTS[fEDI_indent_startingIndex];
    let SMALL_lineAndColumnIndices_indexLine = INTS[fEDI_indent_SMALL_lineAndColumnIndices_indexLine];

    // TODO: Consider having this string available rather than making it everytime this function is invoked.
    let EDI_on_tab_string = EDI_decoder.decode(EDI_on_tab_bytes);
    
    // TODO: create 'EDI_on_tab_string' based on the amount of remaining eventCount to be drawn.
    while (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        INTS[fEDI_cursor_edit_eventCount_drawn]++;
        for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices_indexLine; lineI--) {
            // Draw the line to reflect the edit, if it is being currently shown on screen.
            // TODO: Use NEXT if the lines are one after another?
            
            // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
            let ringBufferIndex = lineI - INTS[fEDI_virtualIndexLine];
            if (ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex < 0) ringBufferIndex = -1;
            else ringBufferIndex = (ringBufferIndex + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

            if (ringBufferIndex >= 0) {
                const div = EDI_ringBuffer_text[ringBufferIndex];
                div.firstChild.insertData(0, EDI_on_tab_string);
            }
        }

        // # Draw the cursor
        EDI_createStyleForSelection_indentMore();
    }
}

function EDI_indentMore() {

    // TODO: You need to move the logic that moves the tracked syntax to the finalize edit.

    // You need to batch these edits so that if they hold down the tab key, you don't modify the underlying bytes of the text until the edit is finalized.
    // This function (and the 'less' version) are somewhat spahetti-code-y.
    // So make a "TOC", where you list out the main ideas, each main idea being a single line comment that starts with '#'
    // Do not overthink each individual main idea, you can easily change them as needed as you go, just start trying to make sense of things.

    // I think "TOC" has 18 lines of text I tried counting it
    // TOC:
    // ====
    // # Small and large selection positions
    // # Determine the starting indexLine (the start is the large position, this confused me for a moment)
    // # Determine the total count of text that will be inserted, prior to actually beginning the edit.
    // # Update the 'START POSITIONS specifically' of the tracked syntax list by the total count of text that will be inserted.
    // # Descending indexLine loop:
    //     # Insert the text on the respective line.
    //     # Increment the entry in 'EDI_lineEndPositionList' for the respective line
    //     # There's a second modification to the start positions of the tracked syntax list
    //     # Then, you immediately know the trackedSyntax that encompasses the insertion (if it exists), so you increment its length by the text inserted on that respective line.
    //     # Each loop you reduce incrementBy, because you're initial starting the loop knowing you will eventually insert 4 characters on every line.
    //         # thus, the first iteration of the loop you're increasing that line's end position by the length of text inserted per line by the amount of lines.
    //         # The next iteration is a smaller indexLine so you decrement because you have the insertion of one less line to consider.
    // # Any line that is not part of the selected set of lines, and is at a greater indexLine, needs to have their line end position entry updated.
    // # Update the cursor's selection to reflect the inserted text
    // # Update the cursor's indexColumn to reflect the inserted text
    // # Update the cursor's selection to reflect the inserted text
    // # Draw the cursor
    // # Redraw the entire viewport (I didn't even think about this... this should change)

    // Some of the ideas that I listed are vague.
    // Likely I have that wording because even I can't remember what was going on.
    //
    // For example "you immediately know the trackedSyntax that encompasses the insertion (if it exists)"
    // I can't remember why this works but I remember that it does.
    // So I need to figure out why it works.

    // all I gotta do is this one to move it all to the finalize other than modifying the UI I gotta go to the bathroom.

    // # Small and large selection positions
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

    //// # Update the cursor's selection to reflect the inserted text
    //if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
    //    INTS[fEDI_cursor_selectionEnd] += ORIGINAL_incrementBy;
    //}
    //else {
    //    INTS[fEDI_cursor_selectionAnchor] += ORIGINAL_incrementBy;
    //}

    // # Update the cursor's indexColumn to reflect the inserted text
    INTS[fEDI_cursor_indexColumn] += EDI_on_tab_bytes.length;
    INTS[fEDI_cursorVisualColumnIndex] += EDI_on_tab_bytes.length;

    //// # Update the cursor's selection to reflect the inserted text
    //let smallLinePos = EDI_ret_getLineBoundaryPositions_raw(SMALL_lineAndColumnIndices.indexLine);
    //if (SMALL_pos > smallLinePos.start) {
    //    if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
    //        INTS[fEDI_cursor_selectionAnchor] += 4;
    //    }
    //    else {
    //        INTS[fEDI_cursor_selectionEnd] += 4;
    //    }
    //}

    INTS[fEDI_cursor_edit_eventCount_occurred]++;
    EDI_render_request(RenderKind_IndentMore);
}

function EDI_render_do_IndentLess() {
    let startingIndex = INTS[fEDI_indent_startingIndex];
    let SMALL_lineAndColumnIndices_indexLine = INTS[fEDI_indent_SMALL_lineAndColumnIndices_indexLine];

    if (INTS[fEDI_cursor_editKind] !== EditKind_IndentLess) {
        return;
    }

    while (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        INTS[fEDI_cursor_edit_eventCount_drawn]++;

        /////////////////////// P_1
        let textSelectionDiv;
        if (BYTES[byteEDI_cursor_selectionDivExists] === 1) {
            for (var i = 0; i < EDI_selection.children.length; i++) {
                if (EDI_selection.children[i].id === CONST_EDI_cursor_htmlId) {
                    textSelectionDiv = EDI_selection.children[i];
                    break;
                }
            }
        }
        else {
            // TODO: Silent error confusing bad idea
        }
        let lesstraWidth_1 = 1 * EDI_characterWidth;
        let lesstraWidth_2 = 2 * EDI_characterWidth;
        let lesstraWidth_3 = 3 * EDI_characterWidth;
        let lesstraWidth_4 = 4 * EDI_characterWidth;
        /////////////////////// P_1

        let selectionLineDivIndex = 0;
        if (textSelectionDiv) {
            selectionLineDivIndex = textSelectionDiv.children.length - 1;
        }

        for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices_indexLine; lineI--) {
            let innerRemoveCount = 0;
            EDI_ret_getLineBoundaryPositions_raw(lineI);
            const line_start = INTS[fEDI_ret_getLineBoundaryPositions_start];
            let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(lineI);
            let upperLimitIndexColumn;
            if (lastValidIndexColumn > 4) {
                upperLimitIndexColumn = 4;
            }
            else {
                upperLimitIndexColumn = lastValidIndexColumn;
            }
            let seenSpace = false;
            outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
                let c = String.fromCharCode(EDI_textByteList_bytes[line_start + i]);
                switch (c) {
                    case ' ':
                        seenSpace = true;
                        innerRemoveCount++;
                        break;
                    case '\t':
                        if (!seenSpace) {
                            innerRemoveCount++;
                        }
                        break outer;
                    default:
                        break outer;
                }
            }

            /////////////////////// P_2
            // TODO: This is not entirely correct. Presumably most specifically I am referring to the first line that is selected.
            if (textSelectionDiv && innerRemoveCount >= 1 && innerRemoveCount <= 4) {
                let lineSelectionDiv = textSelectionDiv.children[selectionLineDivIndex--];
                // TODO: precalculate 'widthNumberValue' outside of this loop.
                let widthNumberValue = parseFloat(lineSelectionDiv.style.width, 10);
                let lesstraWidth;
                switch (innerRemoveCount) {
                    case 1:
                        lesstraWidth = lesstraWidth_1;
                        break;
                    case 2:
                        lesstraWidth = lesstraWidth_2;
                        break;
                    case 3:
                        lesstraWidth = lesstraWidth_3;
                        break;
                    case 4:
                        lesstraWidth = lesstraWidth_4;
                        break;
                }
                widthNumberValue -= lesstraWidth;
                lineSelectionDiv.style.width = widthNumberValue + 'px';
            }
            /////////////////////// P_2

            // Draw the line to reflect the edit, if it is being currently shown on screen.
            // TODO: Use NEXT if the lines are one after another?

            // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
            let ringBufferIndex = lineI - INTS[fEDI_virtualIndexLine];
            if (ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex < 0) ringBufferIndex = -1;
            else ringBufferIndex = (ringBufferIndex + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

            if (ringBufferIndex >= 0) {
                const textNode = EDI_ringBuffer_text[ringBufferIndex].firstChild;
                textNode.deleteData(0, innerRemoveCount);
            }
        }

        /////////////////////// P_3
        INTS[fEDI_cursor_DRAWN_selectionAnchor] = INTS[fEDI_cursor_selectionAnchor];
        INTS[fEDI_cursor_DRAWN_selectionEnd] = INTS[fEDI_cursor_selectionEnd];
        /////////////////////// P_3
    }
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
    EDI_clipboard_may_have_changed = true;
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

function EDI_render_do_DuplicateOrPaste() {

    if (INTS[fEDI_cursor_editKind] !== EditKind_Duplicate && INTS[fEDI_cursor_editKind] !== EditKind_Paste) {
        return;
    }

    while (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        INTS[fEDI_cursor_edit_eventCount_drawn]++;

        let byteArray = null;
        let insert_character_count = 0;
        let linesInsertedCount = 0;

        if (INTS[fEDI_cursor_editKind] === EditKind_Duplicate) {
            INTS[fEDI_cursor_edit_eventCount_drawn]++;
            byteArray = EDI_cursor_EDI_duplication_bytes;
            insert_character_count = byteArray.length;
            linesInsertedCount = EDI_cursor_EDI_duplication_totalLineEndCount;
        }
        else if (INTS[fEDI_cursor_editKind] === EditKind_Paste) {
            INTS[fEDI_cursor_edit_eventCount_drawn]++;
            byteArray = EDI_cursor_EDI_paste_clipboardContent_bytes;
            insert_character_count = EDI_cursor_EDI_paste_clipboardContent_string.length;
            linesInsertedCount = EDI_cursor_EDI_paste_clipboardContent_totalLineEndCount;
        }

        walkLineUntilIndexColumn();
        if (w_div === w_divNONE) {
            // TODO: silent error bad
            //alert('// EDI_paste TODO: silent error bad');
            return;
        }

        let insertionLength = 0;

        /** is a 0 based index, inclusive */
        let wordStart = 0;
        let wordLength = 0;

        // No need to consider '\r\n' and etc... only '\n'
        let linefeedLength = 0;

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let ringBufferIndex_current = INTS[fEDI_cursor_indexLine] - INTS[fEDI_virtualIndexLine];
        if (ringBufferIndex_current >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_current < 0) ringBufferIndex_current = -1;
        else ringBufferIndex_current = (ringBufferIndex_current + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let ringBufferIndex_first = INTS[fEDI_virtualIndexLine] - INTS[fEDI_virtualIndexLine]; // I found it 'INTS[fEDI_virtualIndexLine] - INTS[fEDI_virtualIndexLine]'
        if (ringBufferIndex_first >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_first < 0) ringBufferIndex_first = -1;
        else ringBufferIndex_first = (ringBufferIndex_first + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

        // TODO: Use PREVIOUS here from 'ringBufferIndex_first'

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let ringBufferIndex_last = (INTS[fEDI_virtualIndexLine] + INTS[fEDI_virtualCount] - 1) - INTS[fEDI_virtualIndexLine];
        if (ringBufferIndex_last >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_last < 0) ringBufferIndex_last = -1;
        else ringBufferIndex_last = (ringBufferIndex_last + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

        /** TODO: All this variable needs to be is a boolean for whether you're at the end of the line or not. */
        let last_valid_indexColumn_currentLine_isAt = INTS[fEDI_cursor_indexColumn] === EDI_getLastValidIndexColumn_raw(INTS[fEDI_cursor_indexLine]);

        // TODO: An optimization to check whether you even need to redraw any lines perhaps is possible but it would add too much complexity at the moment and so it isn't being considered...
        // ...i.e.: if you're inserting so many lines that you know you'll scroll or that only a small amount of lines need to be redrawn due to predicting a scroll event.

        let offset = 0;

        /**
         * 0 => None,
         * 1 => '\n',
         * 2 => wordLetterOrDigit
         */
        let characterKindNumber_NEEDS_WRITTEN = 0;

        let functionState = {
            ringBufferIndex_current: ringBufferIndex_current,
            ringBufferIndex_first: ringBufferIndex_first,
            ringBufferIndex_last: ringBufferIndex_last,
            last_valid_indexColumn_currentLine_isAt: last_valid_indexColumn_currentLine_isAt,
        };

        while (true) {

            characterKindNumber_NEEDS_WRITTEN = 0;

            if (offset >= insert_character_count) {
                if (wordLength > 0) characterKindNumber_NEEDS_WRITTEN = 2/*wordLetterOrDigit*/;
                else if (linefeedLength > 0) characterKindNumber_NEEDS_WRITTEN = 1/*'\n'*/;
            }
            else {
                switch (byteArray[offset]) {
                    case 10:
                        if (wordLength > 0) characterKindNumber_NEEDS_WRITTEN = 2/*wordLetterOrDigit*/;
                        break;
                    default:
                        if (linefeedLength > 0) characterKindNumber_NEEDS_WRITTEN = 1/*'\n'*/;
                        break;
                }
            }
            switch (characterKindNumber_NEEDS_WRITTEN) {
                case 1/*'\n'*/:
                    DUPLICATE_writeLinefeed(functionState, linefeedLength);
                    linefeedLength = 0;
                    break;
                case 2/*wordLetterOrDigit*/:
                    EDI_duplicate_and_paste_writeWord(wordLength, EDI_decoder.decode(byteArray.subarray(wordStart, wordStart + wordLength)));
                    wordStart = 0;
                    wordLength = 0;
                    break;
            }

            if (offset >= insert_character_count) {
                break;
            }
            else {
                switch (byteArray[offset]) {
                    case 10:
                        insertionLength++;
                        linefeedLength++;
                        break;
                    default:
                        insertionLength++;
                        if (wordLength === 0) { wordStart = offset; }
                        wordLength++;
                        break;
                }
            }

            ++offset;
        }

        if (linesInsertedCount > 0) {
            update_verticalVirtualizationBoundary(INTS[fEDI_lineEndPositionList_count] + linesInsertedCount);
            EDI_lineWasInsertedValidateGutter(INTS[fEDI_lineEndPositionList_count] + linesInsertedCount);
        }
    }

    INTS[fEDI_cursor_STORED_visualWidth] = INTS[fEDI_cursorVisualColumnIndex];
}

/**
 * TODO: If this ends up working don't duplicate this code, this is the 'EDI_EnterKey' function; copy, paste, and probably modified.
 */
function DUPLICATE_writeLinefeed(functionState, linefeedLength) {
    // TODO: this is a very lazy solution to the problem, likely a more optimal way is available. Also name the variable?
    for (let handleLineCounter = 0; handleLineCounter < linefeedLength; handleLineCounter++) {
        if (INTS[fEDI_cursor_indexColumn] === 0 && !functionState.last_valid_indexColumn_currentLine_isAt) { // start of line
            
            EDI_shiftLinesOfText_ToALarger_IndexLine_byOne(functionState.ringBufferIndex_last, functionState.ringBufferIndex_current);

            functionState.ringBufferIndex_current = (functionState.ringBufferIndex_current + 1) % INTS[fEDI_ArrayFrom_textElement_children_length];
            w_div = EDI_ringBuffer_text[functionState.ringBufferIndex_current];
            INTS[fEDI_w_indexColumn_Goal] = 0;
            INTS[fEDI_w_indexColumn_Sum] = 0;
            INTS[fEDI_w_indexColumn_SpanTextContentRelative] = 0;
            INTS[fEDI_cursor_indexLine]++;
            INTS[fEDI_cursor_indexColumn] = 0;
            INTS[fEDI_cursorVisualColumnIndex] = 0;

            continue;
        }
        else {
            // ensure this conditional branch continues if handled, otherwise it will execute the fallback case erroneously
            if (functionState.last_valid_indexColumn_currentLine_isAt) { // end of line

                functionState.ringBufferIndex_current = (functionState.ringBufferIndex_current + 1) % INTS[fEDI_ArrayFrom_textElement_children_length];
                
                EDI_shiftLinesOfText_ToALarger_IndexLine_byOne(functionState.ringBufferIndex_last, functionState.ringBufferIndex_current);

                w_div = EDI_ringBuffer_text[functionState.ringBufferIndex_current];
                INTS[fEDI_w_indexColumn_Goal] = 0;
                INTS[fEDI_w_indexColumn_Sum] = 0;
                INTS[fEDI_w_indexColumn_SpanTextContentRelative] = 0;
                INTS[fEDI_cursor_indexLine]++;
                INTS[fEDI_cursor_indexColumn] = 0;
                INTS[fEDI_cursorVisualColumnIndex] = 0;
                // functionState.last_valid_indexColumn_currentLine_isAt = true; // already is true

                continue;
            }
            else { // among a line
                // This case should be optimized such that you get it over with at the start of the edit (it is one time you shift the right side text by the amount of lines inserted and you know this already then the content per line inserted you still gotta get on the fly-ish)
                // yeah the most optimal solution I believe would be drawing all the inserted line feeds first if you tracked them by position ahead of time?

                let spanText = '';

                if (INTS[fEDI_w_indexColumn_Goal] > 0) {
                    if (INTS[fEDI_w_indexColumn_Goal] !== INTS[fEDI_w_indexColumn_Sum] + w_div.textContent.length) {
                        const textNode = w_div.firstChild;
                        const data = textNode.data;

                        let firstText = data.substring(0, INTS[fEDI_w_indexColumn_SpanTextContentRelative]);
                        let lastText = data.substring(INTS[fEDI_w_indexColumn_SpanTextContentRelative]);
                        // functionState.last_valid_indexColumn_currentLine_isAt = false; // already is false
                        textNode.replaceData(0, textNode.length, firstText);
                        spanText += lastText; // This might NOT have to be +=, but it is due to the enter key method having needed += and this continues the pattern.
                    }
                }

                functionState.ringBufferIndex_current = (functionState.ringBufferIndex_current + 1) % INTS[fEDI_ArrayFrom_textElement_children_length];

                EDI_shiftLinesOfText_ToALarger_IndexLine_byOne(functionState.ringBufferIndex_last, functionState.ringBufferIndex_current);

                const textNode = EDI_ringBuffer_text[functionState.ringBufferIndex_current].firstChild;
                textNode.replaceData(0, textNode.length, spanText);

                w_div = EDI_ringBuffer_text[functionState.ringBufferIndex_current];
                INTS[fEDI_w_indexColumn_Goal] = 0;
                INTS[fEDI_w_indexColumn_Sum] = 0;
                INTS[fEDI_w_indexColumn_SpanTextContentRelative] = 0;
                INTS[fEDI_cursor_indexLine]++;
                INTS[fEDI_cursor_indexColumn] = 0;
                INTS[fEDI_cursorVisualColumnIndex] = 0;
                // functionState.last_valid_indexColumn_currentLine_isAt is being set when splitting the text. // and already is false

                continue;
            }
        }
    }
}

function EDI_duplicate_and_paste_writeWord(wordLength, word) {
    w_div.firstChild.insertData(INTS[fEDI_w_indexColumn_SpanTextContentRelative], word);

    INTS[fEDI_cursor_indexColumn] += wordLength;
    INTS[fEDI_cursorVisualColumnIndex] += wordLength;
    INTS[fEDI_w_indexColumn_SpanTextContentRelative] += wordLength;
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

function EDI_render_do_TabKey() {
    if (INTS[fEDI_cursor_editKind] !== EditKind_Tab) {
        return;
    }

    if (INTS[fEDI_cursor_edit_eventCount_drawn] >= INTS[fEDI_cursor_edit_eventCount_occurred]) {
        return;
    }

    // TODO: Consider having this string available rather than making it everytime this function is invoked.
    // TODO: This is bad (there's many other ways to get this as a string: decoder, caching of a hardcoded string?, ???)
    //
    const EDI_on_tab_string = EDI_decoder.decode(EDI_on_tab_bytes);

    while (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        INTS[fEDI_cursor_edit_eventCount_drawn]++;

        // awkward thing to have 'walkLineUntilIndexColumn' work then at end of block. (1 of 2)
        const remember_indexColumn = INTS[fEDI_cursor_indexColumn];
        INTS[fEDI_cursor_indexColumn] = INTS[fEDI_cursor_editIndexColumn];

        walkLineUntilIndexColumn();

        if (w_div === w_divNONE) {
            // TODO: silent error bad
            return;
        }

        const offset_index_drawn = INTS[fEDI_cursor_edit_eventCount_drawn] - 1;
        w_div.firstChild.insertData(INTS[fEDI_w_indexColumn_SpanTextContentRelative] + offset_index_drawn, EDI_on_tab_string);

        // awkward thing to have 'walkLineUntilIndexColumn' work then at end of block. (2 of 2)
        INTS[fEDI_cursor_indexColumn] = remember_indexColumn;
    }
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

function EDI_render_do_EnterKey() {
    // TODO: This is wrong because you haven't inserted the lines yet so you just redraw the exact same height more or less (it does "work somewhat" cause you can miss and then at some point you'll probably hit enter again and see it fix something but that's still wrong.).
    update_verticalVirtualizationBoundary();

    if (INTS[fEDI_cursor_editKind] !== EditKind_Enter) {
        return;
    }

    // TODO: instead of a loop, handle the rendering in a more optimized bulk operation that renders the remaining 'INTS[fEDI_cursor_editLineFeedCount] - INTS[fEDI_cursor_edit_eventCount_drawn]'
    while (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        INTS[fEDI_cursor_edit_eventCount_drawn]++;

        const local_EDI_lineEndPositionList_count = INTS[fEDI_lineEndPositionList_count] + INTS[fEDI_cursor_edit_eventCount_drawn] - 1;
        
        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let ringBufferIndex_firstTilde = local_EDI_lineEndPositionList_count - INTS[fEDI_virtualIndexLine];
        if (ringBufferIndex_firstTilde >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_firstTilde < 0) ringBufferIndex_firstTilde = -1;
        else ringBufferIndex_firstTilde = (ringBufferIndex_firstTilde + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];
        if (ringBufferIndex_firstTilde >= 0) {
            const gutterTextNode = EDI_gutter_scroll_mover.children[ringBufferIndex_firstTilde].firstChild;
            gutterTextNode.replaceData(0, gutterTextNode.length, `${local_EDI_lineEndPositionList_count + 1}`);
        }
        
        let isASingledOutCase = false;

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let ringBufferIndex_current = INTS[fEDI_cursor_editIndexLine] - INTS[fEDI_virtualIndexLine];
        if (ringBufferIndex_current >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_current < 0) ringBufferIndex_current = -1;
        else ringBufferIndex_current = (ringBufferIndex_current + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];
        const lineIsPartOfTheCurrentVirtualizedContent = ringBufferIndex_current < 0
            ? false
            : true;

        // There are some cases that I don't feel like thinking about at the moment, this if statement singles them out.
        if (INTS[fEDI_virtualCount] <= 1 || EDI_ringBuffer_text.length !== INTS[fEDI_virtualCount])
            isASingledOutCase = true;

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let ringBufferIndex_first = INTS[fEDI_virtualIndexLine] - INTS[fEDI_virtualIndexLine]; // I found it 'INTS[fEDI_virtualIndexLine] - INTS[fEDI_virtualIndexLine]'
        if (ringBufferIndex_first >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_first < 0) ringBufferIndex_first = -1;
        else ringBufferIndex_first = (ringBufferIndex_first + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

        // TODO: Use PREVIOUS here from 'ringBufferIndex_first'
        //
        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let ringBufferIndex_last = (INTS[fEDI_virtualIndexLine] + INTS[fEDI_virtualCount] - 1) - INTS[fEDI_virtualIndexLine];
        if (ringBufferIndex_last >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_last < 0) ringBufferIndex_last = -1;
        else ringBufferIndex_last = (ringBufferIndex_last + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

        // 5 cases:
        // - "isASingledOutCase case": throws an exception
        // - "!lineIsPartOfTheCurrentVirtualizedContent" case
        // - "start of line":
        // - "end of line":
        // - "among a line":

        // TODO: Rewrite this comment in a way that isn't rambling:
        //
        // Currently this is written in a way that ignores 'BYTES[byteEDI_cursor_enterKeyEventKind]' for the 'render'.
        // This is because consecutive enter key events are not necessarily rendered the same way.
        // For example, if the cursor is among a line. And you render the first enter key event.
        // The cursor is among a line.
        // But that second enter key event may or may not be among a line.
        // If indentation existed on the original line and prior to the cursor position,
        // that indentation is copied to the line that was created by the enter key event.
        // Thus, your cursor on the second enter key event is among a line.
        // But if there wasn't indentation, your cursor is actually at the start of the newly added line.

        if (!lineIsPartOfTheCurrentVirtualizedContent) { // "!lineIsPartOfTheCurrentVirtualizedContent"
            // hmm is incorrect "nothing to draw", you need to actually draw maybe if the next index is in view
            // because you've split the line above it that was out of view?
            // TODO: I'm not sure.
            return;
        }

        if (isASingledOutCase) { throw new Error(); } // "isASingledOutCase case"

        if (INTS[fEDI_cursor_editIndexColumn] === 0) { // start of line
            EDI_shiftLinesOfText_ToALarger_IndexLine_byOne(ringBufferIndex_last, ringBufferIndex_current);
            EDI_lineWasInsertedValidateGutter(INTS[fEDI_lineEndPositionList_count] + INTS[fEDI_cursor_editLineFeedCount]);
        }
        else {
            let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(INTS[fEDI_cursor_editIndexLine]);

            if (lastValidIndexColumn === INTS[fEDI_cursor_editIndexColumn]) { // end of line
                let next_ringBufferIndex = (ringBufferIndex_current + 1) % INTS[fEDI_ArrayFrom_textElement_children_length];
                EDI_shiftLinesOfText_ToALarger_IndexLine_byOne(ringBufferIndex_last, next_ringBufferIndex);
                const textNode = EDI_ringBuffer_text[next_ringBufferIndex].firstChild;
                textNode.replaceData(0, textNode.length, EDI_cursor_cached_indentation_string);
                EDI_lineWasInsertedValidateGutter(INTS[fEDI_lineEndPositionList_count] + INTS[fEDI_cursor_editLineFeedCount]);
            }
            else { // among a line

                // among a line uses 'walkLineUntilIndexColumn', this function takes a cursor and accesses the fields: 'indexLine', and 'indexColumn'.
                // This is problematic because one needs to use INTS[fEDI_cursor_editIndexColumn] for this renderKind.
                // Since only this case needs the logic I'm going to isolate it to here.
                //
                // Remember 'indexLine', and 'indexColumn'.
                // Set them to the edit respective fields.
                //
                // Prior to returning from this function restore the original 'indexLine', and 'indexColumn'. (1 of 2)
                let remember_cursorIndexLine = INTS[fEDI_cursor_indexLine];
                let remember_cursorIndexColumn = INTS[fEDI_cursor_indexColumn];

                INTS[fEDI_cursor_indexLine] = INTS[fEDI_cursor_editIndexLine];
                INTS[fEDI_cursor_indexColumn] = INTS[fEDI_cursor_editIndexColumn];

                // TODO: (when holding enter key) Among a line, where you have indentation will recreate the same 'spanText' over and over, very wasteful. This includes the wasteful steps of substringing...
                // ...cache 'spanText'.
                //
                let spanText = EDI_cursor_cached_indentation_string;

                walkLineUntilIndexColumn();
                if (w_div === w_divNONE) {
                    throw new Error();
                }
                
                if (INTS[fEDI_w_indexColumn_Goal] > 0) {
                    if (INTS[fEDI_w_indexColumn_Goal] !== INTS[fEDI_w_indexColumn_Sum] + w_div.textContent.length) {
                        const textNode = w_div.firstChild;
                        const data = textNode.data;

                        let firstText = data.substring(0, INTS[fEDI_w_indexColumn_SpanTextContentRelative]);
                        let lastText = data.substring(INTS[fEDI_w_indexColumn_SpanTextContentRelative]);
                        textNode.replaceData(0, textNode.length, firstText);
                        spanText += lastText; // += due to the possibility of indentation
                    }
                }

                let next_ringBufferIndex = (INTS[fEDI_w_ringBufferIndex] + 1) % INTS[fEDI_ArrayFrom_textElement_children_length];
                EDI_shiftLinesOfText_ToALarger_IndexLine_byOne(ringBufferIndex_last, next_ringBufferIndex);
                const textNode = EDI_ringBuffer_text[next_ringBufferIndex].firstChild;
                textNode.replaceData(0, textNode.length, spanText);
                EDI_lineWasInsertedValidateGutter(INTS[fEDI_lineEndPositionList_count] + INTS[fEDI_cursor_editLineFeedCount]);

                // Prior to returning from this function restore the original 'indexLine', and 'indexColumn'. (2 of 2)
                INTS[fEDI_cursor_indexLine] = remember_cursorIndexLine;
                INTS[fEDI_cursor_indexColumn] = remember_cursorIndexColumn;
            }
        }
    }
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

function EDI_render_do_RemoveSelection() {
    if (INTS[fEDI_cursor_editKind] !== EditKind_RemoveTextNoBatching) {
        return;
    }

    if (INTS[fEDI_cursor_edit_eventCount_drawn] >= INTS[fEDI_cursor_edit_eventCount_occurred]) {
        return;
    }

    // RemoveSelection doesn't batch at the moment thus the equals rather than incrementing.
    // Although it doesn't "matter" cause they'd only ever be off by 1 but this way makes me feel less anxious nevertheless.
    INTS[fEDI_cursor_edit_eventCount_drawn] = INTS[fEDI_cursor_edit_eventCount_occurred];
    
    let smallPosition = INTS[fEDI_editret_RemoveSelection_smallPosition];
    let largePosition = INTS[fEDI_editret_RemoveSelection_largePosition];

    let editLength = largePosition - smallPosition;

    let smallLineAndColumnIndices_indexLine = INTS[fEDI_editret_RemoveSelection_smallLineAndColumnIndices_small_indexLine];
    let smallLineAndColumnIndices_indexColumn = INTS[fEDI_editret_RemoveSelection_smallLineAndColumnIndices_small_indexColumn];

    ///////////
    ///////////

    let original_edit_length = INTS[fEDI_cursor_editLength_characters];
    INTS[fEDI_cursor_editLength_characters] = 0;

    let linesRemovedCount = 0;
    // -1 since you can't remove EOF
    for (var iVarDependent = INTS[fEDI_cursor_indexLine]; iVarDependent < INTS[fEDI_lineEndPositionList_count] - 1; iVarDependent++) {
        let lineEnding = EDI_lineEndPositionList_data[iVarDependent];
        if (lineEnding >= INTS[fEDI_cursor_editPosition] && lineEnding < INTS[fEDI_cursor_editPosition] + editLength) {
            linesRemovedCount++;
            INTS[fEDI_cursor_editLineFeedCount]++;
            EDI_lineEndPositionList_PENDING.insert(EDI_lineEndPositionList_PENDING.count, lineEnding);
        }
        else {
            break;
        }
    }

    // TODO: two tabs one after another you delete the first one the second one falls into the first one's position...
    // ...and takes the tab-width of the first one which might not be equal to the second one.
    // Count line width after the edit? Probably not?

    if (linesRemovedCount === 0) {
        //
        // 'INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL]' is 0???
        //
        //INTS[fEDI_cursor_editLengthVisual] = Math.abs(INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] - INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL]);

        EDI_ret_getLineAndColumnIndices_raw(largePosition);
        let largeLineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
        let largeLineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];

        EDI_ret_getLineBoundaryPositions_raw(smallLineAndColumnIndices_indexLine);
        let lineStart = INTS[fEDI_ret_getLineBoundaryPositions_start];
        let lineEnd = INTS[fEDI_ret_getLineBoundaryPositions_end];

        EDI_ret_getIndexFromColumn_RESET(smallLineAndColumnIndices_indexColumn, lineStart, lineEnd);
        let small_columnVisual = INTS[fEDI_ret_getIndexFromX_visualColumns];

        // TODO: You don't have to RESET here but... this answer is ultimately going to be scrapped for something more correct so it isn't worth the time.
        EDI_ret_getIndexFromColumn_RESET(largeLineAndColumnIndices_indexColumn, lineStart, lineEnd);
        let large_columnVisual = INTS[fEDI_ret_getIndexFromX_visualColumns];

        INTS[fEDI_cursor_editLengthVisual] += large_columnVisual - small_columnVisual;
        //INTS[fEDI_cursorVisualColumnIndex] = small_columnVisual;

        //EDI_ret_getIndexFromColumn_RESET();
    }

    let finalLineEndPosition = EDI_lineEndPositionList_data[INTS[fEDI_cursor_indexLine] + linesRemovedCount];
    let largestDrawnIndexLine = INTS[fEDI_virtualIndexLine] + INTS[fEDI_virtualCount] - 1;
    let visibleLinesRemovedCount = 0;

    // 5 stages
    // ========
    // - Remove selection on large position line
    // - Remove selection on small position line
    // - Visually merge the small position line and large position line (if applicable)
    // - Remove middle line(s)
    // - 'Draw lines that came into view' / 'clear text for any lines > text length and use a '~' in the gutter'

    // Remove selection on small position line
    let smallLineDiv = null;
    {
        INTS[fEDI_cursor_indexLine] = smallLineAndColumnIndices_indexLine;
        INTS[fEDI_cursor_indexColumn] = smallLineAndColumnIndices_indexColumn;
        // TODO: this cursorVisualColumnIndex... logic here seems like it can be skipped here so long as you do it once by the end of the function to the correct indices.
        INTS[fEDI_cursorVisualColumnIndex] = smallLineAndColumnIndices_indexColumn;

        walkLineUntilIndexColumn();

        EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
        const line_end = INTS[fEDI_ret_getLineBoundaryPositions_end];
        let remaining;
        if (largePosition > line_end) {
            remaining = line_end - smallPosition;
        }
        else {
            remaining = largePosition - smallPosition;
        }

        if (w_div !== w_divNONE && INTS[fEDI_w_indexColumn_SpanTextContentRelative] >= 0) {
            smallLineDiv = w_div;
            const textNode = w_div.firstChild;
            while (remaining > 0) {
                let available = w_div.textContent.length - INTS[fEDI_w_indexColumn_SpanTextContentRelative];
                let count = remaining > available ? available : remaining;
                remaining -= count;
                
                if (count > 0) {
                    textNode.deleteData(INTS[fEDI_w_indexColumn_SpanTextContentRelative], count);
                }
                else {
                    break; // silent error?
                }
            }
        }
    }

    // Remove selection on large position line
    let largeLineDiv = null;
    if (linesRemovedCount > 0) {
        INTS[fEDI_cursor_indexLine] = INTS[fEDI_cursor_indexLine] + linesRemovedCount;
        INTS[fEDI_cursor_indexColumn] = 0;
        // TODO: this cursorVisualColumnIndex... logic here seems like it can be skipped here so long as you do it once by the end of the function to the correct indices.
        INTS[fEDI_cursorVisualColumnIndex] = 0;

        EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
        let remaining = largePosition - INTS[fEDI_ret_getLineBoundaryPositions_start];

        walkLineUntilIndexColumn();

        if (w_div !== w_divNONE && INTS[fEDI_w_indexColumn_SpanTextContentRelative] >= 0) {
            largeLineDiv = w_div;
            const textNode = w_div.firstChild;
            while (remaining > 0) {
                let available = w_div.textContent.length - INTS[fEDI_w_indexColumn_SpanTextContentRelative];
                let count = remaining > available ? available : remaining;
                remaining -= count;

                if (count > 0) {
                    textNode.deleteData(INTS[fEDI_w_indexColumn_SpanTextContentRelative], count);
                }
                else {
                    break; // silent error?
                }
            }
        }
    }

    // Merge the first and last lines (if applicable)
    //
    // Four cases of existence (!... implies it does NOT exist, i.e.: it is not rendered on the UI)
    // =======================
    // - [ ] keeping, removing
    // - [ ] keeping, !removing
    // - [ ] !keeping, removing
    // - [ ] !keeping, !removing
    //
    // - [ ] Ensure all 4 cases of existence handle 'EDI_stopTrackingIfTrackedSyntaxMadeToSpanSingleLine(cursor);'
    //
    if (linesRemovedCount > 0) {
        INTS[fEDI_cursor_indexLine] = smallLineAndColumnIndices_indexLine;
        INTS[fEDI_cursor_indexColumn] = smallLineAndColumnIndices_indexColumn;
        // TODO: this cursorVisualColumnIndex... logic here seems like it can be skipped here so long as you do it once by the end of the function to the correct indices.
        INTS[fEDI_cursorVisualColumnIndex] = smallLineAndColumnIndices_indexColumn;

        if (smallLineDiv) {
            if (largeLineDiv) { // - [x] keeping, removing
                const smallLineTextNode = smallLineDiv.firstChild;
                const largeLineTextNode = largeLineDiv.firstChild;
                smallLineTextNode.insertData(smallLineTextNode.length, largeLineTextNode.data);
                largeLineTextNode.deleteData(0, largeLineTextNode.length);
                visibleLinesRemovedCount++;
            }
            else { // - [ ] keeping, !removing

            }
        }
        else {
            if (largeLineDiv) { // - [ ] !keeping, removing
                
            }
            else { // - [ ] !keeping, !removing
                
            }
        }
    }

    // Remove middle line(s)
    if (linesRemovedCount > 0) {

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let ringBufferIndex_current = (smallLineAndColumnIndices_indexLine + 1) - INTS[fEDI_virtualIndexLine];
        if (ringBufferIndex_current >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_current < 0) ringBufferIndex_current = -1;
        else ringBufferIndex_current = (ringBufferIndex_current + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let ringBufferIndex_last = (INTS[fEDI_virtualIndexLine] + INTS[fEDI_virtualCount] - 1) - INTS[fEDI_virtualIndexLine];
        if (ringBufferIndex_last >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_last < 0) ringBufferIndex_last = -1;
        else ringBufferIndex_last = (ringBufferIndex_last + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

        // TODO: This will be wrong because you'd need to explicitly redraw the large selection line index.
        EDI_shiftLinesOfText_ToASmaller_IndexLine_byDistance(ringBufferIndex_last, ringBufferIndex_current, linesRemovedCount);

        if (EDI_drawGutter_Width(INTS[fEDI_lineEndPositionList_count] - linesRemovedCount)) {
            // If true then you need to also draw the dependent UI
            EDI_render_request(RenderKind_Cursor_n);
            EDI_drawHorizontalScrollbar();
        }
    }

    INTS[fEDI_cursor_editLength_characters] = original_edit_length;
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

/** TODO: this is nearly identical to backspace, the difference is the check 'if (INTS[fEDI_cursor_editKind] !== EditKind_DeleteLtr)', thus dedupe the logic or no? */
function EDI_render_do_Delete() {
    if (INTS[fEDI_cursor_editKind] !== EditKind_DeleteLtr) {
        return;
    }

    if (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        INTS[fEDI_cursor_edit_eventCount_drawn] = INTS[fEDI_cursor_edit_eventCount_occurred];

        walkLineUntilIndexColumn();

        if (w_div === w_divNONE) {
            // TODO: this
        }
        else {
            let remaining = INTS[fEDI_cursor_editLength_characters] - INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue];
            INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue] = INTS[fEDI_cursor_editLength_characters];
            while (remaining > 0) {
                // When the cursor is at the end of a span, there is no text to delete, because the text starts in the next span.
                let available = w_div.textContent.length - INTS[fEDI_w_indexColumn_SpanTextContentRelative];
                let count = remaining > available ? available : remaining;
                remaining -= count;

                if (count > 0) {
                    w_div.firstChild.deleteData(INTS[fEDI_w_indexColumn_SpanTextContentRelative], count);
                }

                if (remaining > 0) {
                    // This is a pain I'm not sure if the finalizeEdit will bug it all out timing wise
                    // but I'll presume for now that it won't and then everything should become clear in time (not always but in this scenario I feel it is the case).
                    // 
                    // Extreme cancellation logic whenever finalizeEdit runs, if there were any pending specific draws, skip them and force full screen redraw
                    // would permit a bridge of having the code work as I narrow down the edge cases more and more maybe.
                    //
                    if (INTS[fEDI_cursor_indexLine] < INTS[fEDI_lineEndPositionList_count] - 1) {

                        remaining--;

                        // Merge the lines if both are visible.
                        // TODO: Use NEXT here (... + 1)

                        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
                        let ringBufferIndex_next = (INTS[fEDI_cursor_indexLine] + 1) - INTS[fEDI_virtualIndexLine];
                        if (ringBufferIndex_next >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_next < 0) ringBufferIndex_next = -1;
                        else ringBufferIndex_next = (ringBufferIndex_next + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

                        if (ringBufferIndex_next >= 0) {
                            const keepingTextNode = w_div.firstChild;
                            const removingTextNode = EDI_ringBuffer_text[ringBufferIndex_next].firstChild;

                            keepingTextNode.insertData(keepingTextNode.length, removingTextNode.data);
                            removingTextNode.deleteData(0, removingTextNode.length);

                            // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
                            let ringBufferIndex_last = (INTS[fEDI_virtualIndexLine] + INTS[fEDI_virtualCount] - 1) - INTS[fEDI_virtualIndexLine];
                            if (ringBufferIndex_last >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_last < 0) ringBufferIndex_last = -1;
                            else ringBufferIndex_last = (ringBufferIndex_last + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

                            EDI_shiftLinesOfText_ToASmaller_IndexLine_byDistance(ringBufferIndex_last, ringBufferIndex_next, 1);
                        }
                    }
                    else {
                        return;
                    }
                }
            }
        }
    }
}

function EDI_state_do_Delete(event) {
    if (EDI_cursor_hasSelection()) {
        EDI_removeSelection();
        return;
    }

    let virtual_cursorIndexLine = INTS[fEDI_cursor_indexLine] + INTS[fEDI_cursor_editLineFeedCount];

    let virtual_cursorIndexColumn;
    if (EDI_cursor_edit_flagLineChanged === -1) {
        virtual_cursorIndexColumn = INTS[fEDI_cursor_indexColumn];
    }
    else {
        virtual_cursorIndexColumn = INTS[fEDI_cursor_editLength_characters] - EDI_cursor_edit_flagLineChanged;
    }

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

            EDI_cursor_edit_flagLineChanged = INTS[fEDI_cursor_editLength_characters];
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

function EDI_render_do_Backspace() {
    if (INTS[fEDI_cursor_editKind] !== EditKind_BackspaceRtl) {
        return;
    }

    if (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        INTS[fEDI_cursor_edit_eventCount_drawn] = INTS[fEDI_cursor_edit_eventCount_occurred];
        walkLineUntilIndexColumn();

        if (w_div === w_divNONE) {
            // TODO: this
        }
        else {
            let remaining = INTS[fEDI_cursor_editLength_characters] - INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue];
            INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue] = INTS[fEDI_cursor_editLength_characters];
            while (remaining > 0) {
                let available = w_div.textContent.length - INTS[fEDI_w_indexColumn_SpanTextContentRelative];
                let count = remaining > available ? available : remaining;
                remaining -= count;
    
                // When the cursor is at the end of a span, there is no text to delete, because the text starts in the next span.
                if (count > 0) {
                    w_div.firstChild.deleteData(INTS[fEDI_w_indexColumn_SpanTextContentRelative], count);
                }

                if (remaining > 0) {
                    if (INTS[fEDI_cursor_indexLine] < INTS[fEDI_lineEndPositionList_count] - 1) {

                        remaining--;

                        // Merge the lines if both are visible.
                        // TODO: Use NEXT here (... + 1)
                        
                        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
                        let ringBufferIndex_next = (INTS[fEDI_cursor_indexLine] + 1) - INTS[fEDI_virtualIndexLine];
                        if (ringBufferIndex_next >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_next < 0) ringBufferIndex_next = -1;
                        else ringBufferIndex_next = (ringBufferIndex_next + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

                        if (ringBufferIndex_next >= 0) {
                            const keepingTextNode = w_div.firstChild;
                            const removingTextNode = EDI_ringBuffer_text[ringBufferIndex_next].firstChild;

                            keepingTextNode.insertData(keepingTextNode.length, removingTextNode.data);
                            removingTextNode.deleteData(0, removingTextNode.length);

                            // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
                            let ringBufferIndex_last = (INTS[fEDI_virtualIndexLine] + INTS[fEDI_virtualCount] - 1) - INTS[fEDI_virtualIndexLine];
                            if (ringBufferIndex_last >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_last < 0) ringBufferIndex_last = -1;
                            else ringBufferIndex_last = (ringBufferIndex_last + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

                            EDI_shiftLinesOfText_ToASmaller_IndexLine_byDistance(ringBufferIndex_last, ringBufferIndex_next, 1);
                        }
                    }
                    else {
                        return;
                    }
                }
            }
        }
    }
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

function EDI_render_do_InsertLtr() {
    if (INTS[fEDI_cursor_editKind] !== EditKind_InsertLtr) {
        return;
    }
    if (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        INTS[fEDI_cursor_edit_eventCount_drawn] = INTS[fEDI_cursor_edit_eventCount_occurred];
        if (EDI_cursor_textInsertionBufferWriteToSpanElement) {
            EDI_cursor_textInsertionBufferWriteToSpanElement.firstChild.insertData(
                (INTS[fEDI_editret_cursor_gapBufferWriteToSpanElement_SpanTextContentRelativeIndex]) + INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue],
                EDI_decoder.decode(EDI_cursor_textInsertionBuffer.subarray(INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue], INTS[fEDI_cursor_editLength_characters])));

            INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue] = INTS[fEDI_cursor_editLength_characters];
        }
    }
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

    // indexLine_editOccurredOn is initialized to -1
    //
    // When gap buffer is finalized editor tries to redraw the line in order to lex it again.
    // You need to NOT do this when you are working with multiple cursors however, because it bugs everything out.
    // 
    /*if (indexLine_editOccurredOn >= 0 && indexLine_editOccurredOn < INTS[fEDI_lineEndPositionList_count]) {
        if (EDI_gutter.children.length === INTS[fEDI_virtualCount] &&
            EDI_textElement.children.length === INTS[fEDI_virtualCount]) {
                
                // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
                let ringBufferIndex = indexLine_editOccurredOn - INTS[fEDI_virtualIndexLine];
                if (ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex < 0) ringBufferIndex = -1;
                else ringBufferIndex = (ringBufferIndex + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

                if (ringBufferIndex >= 0) {
                    let gutterLineElement = EDI_gutter.children[ringBufferIndex];
                    gutterLineElement.innerHTML = '';
                    let textLineElement = EDI_textElement.children[ringBufferIndex];
                    textLineElement.innerHTML = '';
                    EDI_drawLine(indexLine_editOccurredOn, gutterLineElement, textLineElement);
                }
                else {
                    // TODO: Consider what to do in this case.
                }
        }
        else {
            // TODO: Consider what to do in this case.
        }
    }*/
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
    if (EDI_styleBuffer_count !== 0) {
        EDI_styleBuffer_insertBytes(INTS[fEDI_cursor_editPosition], new Uint8Array(INTS[fEDI_cursor_textInsertionBufferCount]), 0, INTS[fEDI_cursor_textInsertionBufferCount]);
    }

    EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_editPosition]);
    let lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
    let lineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
    let text = EDI_decoder.decode(EDI_cursor_textInsertionBuffer.subarray(0, INTS[fEDI_cursor_textInsertionBufferCount]));
    INTS[fEDI_didChangeTextDocument_version] = INTS[fEDI_didChangeTextDocument_version] + 1;
    let version = INTS[fEDI_didChangeTextDocument_version];

    enqueueLSPNotification({
        absolutePath: EDI_FORMATTED_textSourceIdentifier,
        version: version,
        startLine: lineAndColumnIndices_indexLine,
        startCharacter: lineAndColumnIndices_indexColumn,
        endLine: lineAndColumnIndices_indexLine,
        endCharacter: lineAndColumnIndices_indexColumn,
        text: text
    });

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
    if (EDI_styleBuffer_count !== 0) {
        EDI_styleBuffer_insertBytes(actualEditPosition, new Uint8Array(bytes.length), 0, bytes.length);
    }

    EDI_ret_getLineAndColumnIndices_raw(actualEditPosition);
    let lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
    let lineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
    let text = EDI_decoder.decode(bytes); // EDI_cursor_cached_indentation_string does not include the linefeed
    INTS[fEDI_didChangeTextDocument_version] = INTS[fEDI_didChangeTextDocument_version] + 1;
    let version = INTS[fEDI_didChangeTextDocument_version];
    enqueueLSPNotification({
        absolutePath: EDI_FORMATTED_textSourceIdentifier,
        version: version,
        startLine: lineAndColumnIndices_indexLine,
        startCharacter: lineAndColumnIndices_indexColumn,
        endLine: lineAndColumnIndices_indexLine,
        endCharacter: lineAndColumnIndices_indexColumn,
        text: text
    });

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
    if (EDI_styleBuffer_count !== 0) {
        EDI_styleBuffer_insertBytes(INTS[fEDI_cursor_editPosition], new Uint8Array(bytes.length), 0, bytes.length);
    }

    for (var i = INTS[fEDI_cursor_editIndexLine]; i < INTS[fEDI_lineEndPositionList_count]; i++) {
        EDI_lineEndPositionList_data[i] += length;
    }

    EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_editPosition]);
    let lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
    let lineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
    let text = EDI_decoder.decode(bytes);
    INTS[fEDI_didChangeTextDocument_version] = INTS[fEDI_didChangeTextDocument_version] + 1;
    let version = INTS[fEDI_didChangeTextDocument_version];

    enqueueLSPNotification({
        absolutePath: EDI_FORMATTED_textSourceIdentifier,
        version: version,
        startLine: lineAndColumnIndices_indexLine,
        startCharacter: lineAndColumnIndices_indexColumn,
        endLine: lineAndColumnIndices_indexLine,
        endCharacter: lineAndColumnIndices_indexColumn,
        text: text
    });

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

    let textSourceIdentifier = EDI_FORMATTED_textSourceIdentifier;
    EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_editPosition]); // TODO: dead code?
    INTS[fEDI_didChangeTextDocument_version] = INTS[fEDI_didChangeTextDocument_version] + 1;
    let version = INTS[fEDI_didChangeTextDocument_version];

    let lspObject = {
        absolutePath: textSourceIdentifier,
        version: version,
        arrayOfEditInformation: [] // TODO: the capacity should already be known
    };

    let perEdit_text = EDI_decoder.decode(bytes);

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
        if (EDI_styleBuffer_count !== 0) {
            EDI_styleBuffer_insertBytes(line_start, perEdit_styleBuffer_changes, 0, bytesLength);
        }

        lspObject.arrayOfEditInformation.push({
            startLine: lineI,
            startCharacter: 0,
            endLine: lineI,
            endCharacter: 0,
            text: perEdit_text
        });
        
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

    enqueueLSPNotification(lspObject);

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

    //// TODO: use better formatting
    //// TODO: This handles the line that the small-selection-position resides on?
    //{
    //    let linePos = EDI_ret_getLineBoundaryPositions_raw(SMALL_lineAndColumnIndices_indexLine);
    //    let line = linePos;
    //    let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(SMALL_lineAndColumnIndices_indexLine);
    //    let upperLimitIndexColumn;
    //    if (lastValidIndexColumn > 4) {
    //        upperLimitIndexColumn = 4;
    //    }
    //    else {
    //        upperLimitIndexColumn = lastValidIndexColumn;
    //    }
    //    let seenSpace = false;
    //    let count = 0;
    //    outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
    //        let c = getCharacter(line.start + i);
    //        switch (c) {
    //            case ' ':
    //                seenSpace = true;
    //                count++;
    //                break;
    //            case '\t':
    //                if (!seenSpace) {
    //                    count+= 4;
    //                }
    //                break outer;
    //            default:
    //                break outer;
    //        }
    //    }
//
    //    let smallLinePos = EDI_ret_getLineBoundaryPositions_raw(SMALL_lineAndColumnIndices_indexLine);
    //    if (SMALL_pos > smallLinePos.start) {
    //        if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
    //            INTS[fEDI_cursor_selectionAnchor] -= count;
    //        }
    //        else {
    //            INTS[fEDI_cursor_selectionEnd] -= count;
    //        }
    //    }
//
    //    if (INTS[fEDI_cursor_indexLine] === SMALL_lineAndColumnIndices_indexLine) {
    //        INTS[fEDI_cursor_indexColumn] -= count;
    //    }
    //}

    // TODO: This at a glance seems to not account for when the cursor is small-position-ended and large-position-anchored...
    // ...this is moving the cursor actually, maybe it is fine? but maybe it is logic that could've been done during a loop but instead you made a new one to separately do this?
    // Also, this entire function is terribly written. You seemingly hacked something together; the code doesn't feel self explanatory. Furthermore there are both a lack of comments (given the confusing nature of how this is written), and dead comments.
    //if (INTS[fEDI_cursor_indexLine] !== SMALL_lineAndColumnIndices_indexLine) {
    //    let linePos = EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
    //    let line = linePos;
    //    let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(INTS[fEDI_cursor_indexLine]);
    //    let upperLimitIndexColumn;
    //    if (lastValidIndexColumn > that_four) {
    //        upperLimitIndexColumn = that_four;
    //    }
    //    else {
    //        upperLimitIndexColumn = lastValidIndexColumn;
    //    }
    //    let seenSpace = false;
    //    let count = 0;
    //    outer: for (var i = 0; i < upperLimitIndexColumn; i++) {
    //        let c = getCharacter(line.start + i);
    //        switch (c) {
    //            case ' ':
    //                seenSpace = true;
    //                count++;
    //                break;
    //            case '\t':
    //                if (!seenSpace) {
    //                    count+= 4;
    //                }
    //                break outer;
    //            default:
    //                break outer;
    //        }
    //    }
    //    //let c = EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
    //    // TODO: git blame the below todo and remind them to delete the dead code
    //    // TODO: Delete this dead code / use better formatting
    //    /*if (SMALL_pos > smallLinePos.start) {
    //        if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
    //            INTS[fEDI_cursor_selectionAnchor] -= count;
    //        }
    //        else {
    //            INTS[fEDI_cursor_selectionEnd] -= count;
    //        }
    //    }*/
    //    //if (INTS[fEDI_cursor_indexLine] === LARGE_lineAndColumnIndices.indexLine) {
    //    //    INTS[fEDI_cursor_indexColumn] -= count;
    //    //}
    //}

    let textSourceIdentifier = EDI_FORMATTED_textSourceIdentifier;
    EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_editPosition]); // TODO: dead code?
    INTS[fEDI_didChangeTextDocument_version] = INTS[fEDI_didChangeTextDocument_version] + 1;
    let version = INTS[fEDI_didChangeTextDocument_version];

    let lspObject = {
        absolutePath: textSourceIdentifier,
        version: version,
        arrayOfEditInformation: []
    };

    let mostRecent_decrementedVisualWidthAbsolute = 0;

    for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices_indexLine; lineI--) {
        mostRecent_decrementedVisualWidthAbsolute = 0;
        let innerRemoveCount = 0;
        EDI_ret_getLineBoundaryPositions_raw(lineI);
        const line_start = INTS[fEDI_ret_getLineBoundaryPositions_start];
        const line_end = INTS[fEDI_ret_getLineBoundaryPositions_end];
        let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(lineI);
        let upperLimitIndexColumn;
        if (lastValidIndexColumn > maxVirtualColumnIndex) {
            upperLimitIndexColumn = maxVirtualColumnIndex;
        }
        else {
            upperLimitIndexColumn = lastValidIndexColumn;
        }


        //EDI_ret_getLineAndColumnIndices_raw(largePosition);
        //let largeLineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
        //let largeLineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
//
        //EDI_ret_getIndexFromColumn_RESET(smallLineAndColumnIndices_indexColumn, lineStart, lineEnd);
        //let small_columnVisual = INTS[fEDI_ret_getIndexFromX_visualColumns];
//
        //// TODO: You don't have to RESET here but... this answer is ultimately going to be scrapped for something more correct so it isn't worth the time.
        //EDI_ret_getIndexFromColumn_RESET(largeLineAndColumnIndices_indexColumn, lineStart, lineEnd);
        //let large_columnVisual = INTS[fEDI_ret_getIndexFromX_visualColumns];
//
        //INTS[fEDI_cursor_editLengthVisual] += large_columnVisual - small_columnVisual;
        //mostRecent_decrementedVisualWidthAbsolute = ;

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
        if (EDI_styleBuffer_count !== 0) {
            EDI_styleBuffer_removeAt(line_start, innerRemoveCount);
        }

        lspObject.arrayOfEditInformation.push({
            startLine: lineI,
            startCharacter: 0,
            endLine: lineI,
            endCharacter: innerRemoveCount,
            text: ''
        });

	    EDI_lineEndPositionList_data[lineI] -= decrementBy;

        decrementBy -= innerRemoveCount;
    }

    for (var lineI = startingIndex + 1; lineI < INTS[fEDI_lineEndPositionList_count]; lineI++) {
        EDI_lineEndPositionList_data[lineI] -= ORIGINAL_decrementBy;
    }

    enqueueLSPNotification(lspObject);

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

    let linesInsertedCount = EDI_cursor_EDI_paste_clipboardContent_totalLineEndCount;
    let insertionLength = EDI_cursor_EDI_paste_clipboardContent_string.length;

    let editLengthVisual = 0;

    EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_editPosition]);
    EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_ret_getLineAndColumnIndices_indexLine]);
    EDI_ret_getIndexFromColumn_RESET(INTS[fEDI_cursor_editIndexColumn], INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
    let columnVisual = INTS[fEDI_ret_getIndexFromX_visualColumns];

    EDI_textByteList_insertBytes(INTS[fEDI_cursor_editPosition], EDI_cursor_EDI_paste_clipboardContent_bytes, 0, EDI_cursor_EDI_paste_clipboardContent_bytes.length);
    // TODO: ensure 'EDI_styleBuffer' count has 'INTS[fEDI_cursor_editPosition]' in range / ensure it is equal with 'EDI_textByteList' count/capacity?
    if (EDI_styleBuffer_count !== 0) {
        EDI_styleBuffer_insertBytes(INTS[fEDI_cursor_editPosition], EDI_cursor_EDI_paste_clipboardContent_bytes, 0, EDI_cursor_EDI_paste_clipboardContent_bytes.length);
    }

    for (var i = INTS[fEDI_cursor_editIndexLine] /*+ linesInsertedCount*/; i < INTS[fEDI_lineEndPositionList_count]; i++) {
        EDI_lineEndPositionList_data[i] += insertionLength;
    }

    EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_editPosition]);
    let lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
    let lineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
    let text = content;
    INTS[fEDI_didChangeTextDocument_version] = INTS[fEDI_didChangeTextDocument_version] + 1;
    let version = INTS[fEDI_didChangeTextDocument_version];

    enqueueLSPNotification({
        absolutePath: EDI_FORMATTED_textSourceIdentifier,
        version: version,
        startLine: lineAndColumnIndices_indexLine,
        startCharacter: lineAndColumnIndices_indexColumn,
        endLine: lineAndColumnIndices_indexLine,
        endCharacter: lineAndColumnIndices_indexColumn,
        text: text
    });

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

    let linesInsertedCount = EDI_cursor_EDI_duplication_totalLineEndCount;
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
    if (EDI_styleBuffer_count !== 0) {
        EDI_styleBuffer_insertBytes(INTS[fEDI_cursor_editPosition], new Uint8Array(length), 0, length);
    }

    for (var i = INTS[fEDI_cursor_editIndexLine] /*+ linesInsertedCount*/; i < INTS[fEDI_lineEndPositionList_count]; i++) {
        EDI_lineEndPositionList_data[i] += insertionLength;
    }

    // TODO: you can like reverse them or something

/*
function Aaa() {
    const apple = 2;
    return apple;
}

LineIndex | Visual Width | Line end position
============================================
        0 |           16 |                16
        1 |           20 |                37
        2 |           17 |                55
        3 |            1 |                57
        4 |            0 |                58

====

select it all and then ctrl+d

function Aaa() {
    const apple = 2;
    return apple;
}
function Aaa() {
    const apple = 2;
    return apple;
}


====

OR

function Aaa() {
    constAaa() {
    const apple = 2;
    return apple;
}

duplicate "Aaa() {
    const"

====

*/

    

    EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_editPosition]);
    let lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
    let lineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
    let text = EDI_decoder.decode(EDI_textByteList_bytes.subarray(small, small + length));
    INTS[fEDI_didChangeTextDocument_version] = INTS[fEDI_didChangeTextDocument_version] + 1;
    let version = INTS[fEDI_didChangeTextDocument_version];

    enqueueLSPNotification({
        absolutePath: EDI_FORMATTED_textSourceIdentifier,
        version: version,
        startLine: lineAndColumnIndices_indexLine,
        startCharacter: lineAndColumnIndices_indexColumn,
        endLine: lineAndColumnIndices_indexLine,
        endCharacter: lineAndColumnIndices_indexColumn,
        text: text
    });

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
    if (EDI_styleBuffer_count !== 0) {
        EDI_styleBuffer_removeAt(INTS[fEDI_cursor_editPosition], INTS[fEDI_cursor_editLength_characters]);
    }

    let text = '';
    INTS[fEDI_didChangeTextDocument_version] = INTS[fEDI_didChangeTextDocument_version] + 1;
    let version = INTS[fEDI_didChangeTextDocument_version];

    enqueueLSPNotification({
        absolutePath: EDI_FORMATTED_textSourceIdentifier,
        version: version,
        startLine: startLineAndColumnIndices_indexLine,
        startCharacter: startLineAndColumnIndices_indexColumn,
        endLine: endLineAndColumnIndices_indexLine,
        endCharacter: endLineAndColumnIndices_indexColumn,
        text: text
    });

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
        EDI_clipboard_may_have_changed = true;
    }

    if (true) { // if true to explicitly point out the pattern matching of the above and that this one intentionally will always clear.
        EDI_duplication_may_have_changed = true;
        //EDI_cursor_EDI_duplication_string = null;
        EDI_cursor_EDI_duplication_bytes = null;
        EDI_cursor_EDI_duplication_totalLineEndCount = 0;
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
    EDI_cursor_textInsertionBufferWriteToSpanElement = null;
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
}
//#endregion

//#region ancillary
function enqueueLSPNotification(payload) {
    lspQueue.push(payload);
    processLspQueue(); // Fire-and-forget processing loop
}

async function processLspQueue() {
    if (BYTES[byteisProcessingLspQueue] === 1) return;
    BYTES[byteisProcessingLspQueue] = 1;

    while (lspQueue.length > 0) {
        const item = lspQueue.shift(); // Guarantees strict FIFO order
        
        try {
            if (item.arrayOfEditInformation) {
                await window.myAPI.didChangeTextDocumentNotification_array(
                    item.absolutePath,
                    item.version,
                    item.arrayOfEditInformation
                );
            }
            else {
                await window.myAPI.didChangeTextDocumentNotification(
                    item.absolutePath,
                    item.version,
                    item.startLine,
                    item.startCharacter,
                    item.endLine,
                    item.endCharacter,
                    item.text
                );
            }
        } catch (error) {
            console.error("LSP IPC notification failed:", error);
        }
    }

    BYTES[byteisProcessingLspQueue] = 0;
}

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
 * You may want to update the vertical virtualization boundary prior to actually updating the EDI_lineEndPositionList_
 * Thus this function takes a 'lineCount' which defaults to INTS[fEDI_lineEndPositionList_count] if falsey.
 * @param {number | null | undefined} lineCount In order to permit arbitrarily updating the vertical virtualization boundary, this takes a lineCount. If falsey, then INTS[fEDI_lineEndPositionList_count] is used.
 */
function update_verticalVirtualizationBoundary(lineCount) {
    if (!lineCount) lineCount = INTS[fEDI_lineEndPositionList_count];
    EDI_virtualization_horizontal.style.height = ((lineCount + INTS[fEDI_virtualCount] - 1) * INTS[fEDI_lineHeight]) + 'px';
}

/**
 * EDI_render_do_Scroll() has this function explicitly inlined (duplicated) within the source code.
 */
function update_VirtualIndexLine() {
    // If scrollTop were to cause synchronous layout calculation, then scrollLeft wouldn't have one because it'd already be calculated.
    // and vice versa.
    // thus it is thought you might as well touch scrollLeft too here, if you're going down this path.
    //
    EDI_lastReadNumber_scrollLeft = EDI_scroll_viewport.scrollLeft;
    EDI_lastReadNumber_scrollTop = EDI_scroll_viewport.scrollTop;
    // TODO: This floor logic seems very odd. Because given the previous and the current you can determine it without dividing maybe I think?
    INTS[fEDI_virtualIndexLine] = Math.floor(EDI_lastReadNumber_scrollTop / INTS[fEDI_lineHeight]);
}

function update_virtualCount() {
    INTS[fEDI_virtualCount] = Math.ceil(INTS[fEDI_lastReadNumber_offsetHeight] / INTS[fEDI_lineHeight]);
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
 * If a line has an indentation of 4 space characters, but the user's cursor is positioned after the second space character,
 * then only the first 2 space characters will be used as indentation.
 * 
 * This is intentional, it seems like the more expected behavior in my mind.
 * 
 * Returns the 'endExclusiveIndentationIndexColumn' of the indentation i.e.: "the column index that exclusively ends the indentation.".
 * Sets the state for:
 * - INTS[fEDI_cursor_cached_indentation_string_visualWidth]
 * - EDI_cursor_enterKey_newLinePlusIndentation_byteList
 * - EDI_cursor_cached_indentation_string
 * 
 * Internally uses 'BYTES[byteEDI_cursor_enterKeyEventKind]'.
 */
function EDI_cacheIndentation(originalIndexLine, originalIndexColumn, lastValidIndexColumn) {
    EDI_ret_getLineBoundaryPositions_raw(originalIndexLine);
    const line_start = INTS[fEDI_ret_getLineBoundaryPositions_start];

    let upperLimitIndexColumn = lastValidIndexColumn;
    if (originalIndexColumn < lastValidIndexColumn) {
        upperLimitIndexColumn = originalIndexColumn;
    }

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
                indentation_string_visualWidth += 4 - (indentation_string_visualWidth % 4);
                count++;
                break;
            default:
                break outer;
        }
    }

    INTS[fEDI_cursor_cached_indentation_string_visualWidth] = indentation_string_visualWidth;

    const uint8Array_length = 1 + count; // '1 +' for the '\n'. This might not always exist in the byte array for example if pressing enter key on the 0th index line there is no existing '\n' to copy from the byte array so just always make it.
    EDI_cursor_enterKey_newLinePlusIndentation_byteList = new Uint8Array(uint8Array_length);

    let setOffset = 1;

    switch (BYTES[byteEDI_cursor_enterKeyEventKind]) {
        case EnterKeyEventKind_StartOfLine:
        case EnterKeyEventKind_EndOfLine:
            setOffset = 0;
            EDI_cursor_enterKey_newLinePlusIndentation_byteList[uint8Array_length - 1] = CONST_EDI_ASCII_LINE_FEED;
            break;
        case EnterKeyEventKind_AmongALine:
        case EnterKeyEventKind_EndOfFile:
            EDI_cursor_enterKey_newLinePlusIndentation_byteList[0] = CONST_EDI_ASCII_LINE_FEED;
            break;
        default:
            throw new Error();
    }

    if (count > 0) {
        let subarray = EDI_textByteList_bytes.subarray(line_start, line_start + count);
        EDI_cursor_enterKey_newLinePlusIndentation_byteList.set(subarray, setOffset);
        EDI_cursor_cached_indentation_string = EDI_decoder.decode(subarray);
    }
    else {
        EDI_cursor_cached_indentation_string = '';
    }
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

/**
 * TODO: implement this but by an arbitrary distance
 * 
 * TODO: Try these functions at the limits i.e.: I think you got _last and then ... the ... should be _last or like the one before it or something or both try both.
 */
function EDI_shiftLinesOfText_ToALarger_IndexLine_byOne(ringBufferIndex_last, inclusiveSmallestRingBufferIndexToShift) {
    // TODO: This remove logic for the last line wasn't written with the correct understanding...
    // ...
    // It appears that this logic for 99% of cases is NOT needed.
    // But that if you:
    // - "Were at ringBuffer index zero" (I'm not sure what I'm thinking by this I need to focus on my task at hand but this edge case is being slightly-considered in my mind while typing this)
    //     - I think the correct wording is if you were at 'PREVIOUS(ringBuffer_indexZero)' then you'd be the last line
    //     - i.e.: if 'ringBufferIndex_last === inclusiveSmallestRingBufferIndexToShift'
    // - for some reason only had a virtualization count of '1',
    // you might need to run this logic otherwise an enter key at column index 0 of a line wouldn't show any changes.
    // 
    const local_ArrayFrom_textElement_children_length = INTS[fEDI_ArrayFrom_textElement_children_length];

    const lastDivTextNode = EDI_ringBuffer_text[ringBufferIndex_last].firstChild;
    lastDivTextNode.deleteData(0, lastDivTextNode.length);

    // TODO: I could swear I just saw this run where 'destinationDivTextNode' was 'sourceDivTextSpan' and both i values were 'inclusiveSmallestRingBufferIndexToShift'?
    for (let i = ringBufferIndex_last; i !== inclusiveSmallestRingBufferIndexToShift;) {
        const destinationDivTextNode = EDI_ringBuffer_text[i].firstChild;
        i = (i - 1 + local_ArrayFrom_textElement_children_length) % local_ArrayFrom_textElement_children_length;
        const sourceDivTextSpan = EDI_ringBuffer_text[i].firstChild;
        destinationDivTextNode.replaceData(0, destinationDivTextNode.length, sourceDivTextSpan.data);
        sourceDivTextSpan.deleteData(0, sourceDivTextSpan.length);
    }
}

/**
 * 'smallestRingBufferIndexToReceive' somewhat 'exclusive' in that it doesn't get shifted. It is the smallest line that receives the shift of the next line, and thus all content on this line is lost in the process.
 * 
 * TODO: an idea that you might be able to short circuit if you start shifting 'out of bounds lines of text' into 'out of bounds lines of text'?
 * 
 * TODO: Try these functions at the limits i.e.: I think you got _last and then ... the ... should be _last or like the one before it or something or both try both.
 */
function EDI_shiftLinesOfText_ToASmaller_IndexLine_byDistance(ringBufferIndex_last, smallestRingBufferIndexToReceive, distance, local_virtualIndexLine, local_virtualCount) {

    // TODO: Does 'coalesce assignment' exist, and is it equivalent?
    if (!local_virtualIndexLine) local_virtualIndexLine = INTS[fEDI_virtualIndexLine];
    if (!local_virtualCount) local_virtualCount = INTS[fEDI_virtualCount];

    // TODO: if smallestRingBufferIndexToReceive < 0 throw an error?

    const local_ArrayFrom_textElement_children_length = INTS[fEDI_ArrayFrom_textElement_children_length];

    let breakingPoint = ringBufferIndex_last;
    for (let i = 1 /*starts at one*/; i < distance; i++) {
        breakingPoint = (breakingPoint - 1 + local_ArrayFrom_textElement_children_length) % local_ArrayFrom_textElement_children_length;
    }

    for (let destinationIndex = smallestRingBufferIndexToReceive; destinationIndex !== breakingPoint;) {
        const destinationDivTextNode = EDI_ringBuffer_text[destinationIndex].firstChild;
        let sourceIndex = destinationIndex;
        for (let i = 0; i < distance; i++) {
            sourceIndex = (sourceIndex + 1) % local_ArrayFrom_textElement_children_length;
        }
        destinationDivTextNode.replaceData(0, destinationDivTextNode.length, EDI_ringBuffer_text[sourceIndex].textContent);
        // You don't need to clear 'EDI_ringBuffer_text[sourceIndex].textContent', that's done in the final step of this function
        // when invoking 'EDI_drawLine'.
        if (EDI_gutter_scroll_mover.children[sourceIndex].textContent === '~') {
            const destination_textNode_gutter = EDI_gutter_scroll_mover.children[destinationIndex].firstChild;
            destination_textNode_gutter.replaceData(0, destination_textNode_gutter.length, '~');
        }
        destinationIndex = (destinationIndex + 1) % local_ArrayFrom_textElement_children_length;
    }

    let ringBufferIndex = ringBufferIndex_last;
    for (let i = 0; ; i++) {
        EDI_drawLine(
            (local_virtualIndexLine + local_virtualCount - 1 - i) + distance,
            EDI_gutter_scroll_mover.children[ringBufferIndex],
            EDI_ringBuffer_text[ringBufferIndex],
            (local_virtualIndexLine + local_virtualCount - 1 - i));
        if (ringBufferIndex === breakingPoint) break; // awkward positioning of this break, it seems somewhat necessary but need to take time to read the code further and try to have it moved somewhere more sensible.
        ringBufferIndex = (ringBufferIndex - 1 + local_ArrayFrom_textElement_children_length) % local_ArrayFrom_textElement_children_length;
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
 * If the 'INTS[fEDI_drawn_count_of_digits_longest_line_number] === positiveNumbersOnly_countDigitsLoop(INTS[fEDI_lineEndPositionList_count])'
 * then the function does nothing.
 * 
 * TODO: Track the min and max until length changes and then only 2 operations at worst case than while
 * 
 * @returns a bool indicating whether the gutter was drawn (if 'INTS[fEDI_drawn_count_of_digits_longest_line_number]' has not changed then false is returned because the gutter didn't need to be "re-" drawn)
 * 
 * Dependent UI: EDI_render_request(RenderKind_Cursor_n); EDI_drawHorizontalScrollbar();
 * 
 * You either guarantee the dependent UI to run by invoking them regardless of this function's result 'EDI_drawGutter_Width(); EDI_render_request(RenderKind_Cursor_n); EDI_drawHorizontalScrollbar();'
 * Or you capture the return value to know whether the gutter was "re-" drawn, because if so, you need to invoke 'EDI_render_request(RenderKind_Cursor_n); EDI_drawHorizontalScrollbar();'
 * for the dependent UI.
 * The confusion, if there is any, comes from the dependent UI in some scenarios being required independently of whether drawGutter changes. And at other times they're solely dependent on whether drawGutter changes.
 */
function EDI_drawGutter_Width(lineCount) {
    let digitCountOfLargestLineNumber = positiveNumbersOnly_countDigitsLoop(lineCount);
    if (INTS[fEDI_drawn_count_of_digits_longest_line_number] === digitCountOfLargestLineNumber) return false;

    INTS[fEDI_drawn_count_of_digits_longest_line_number] = digitCountOfLargestLineNumber;

    INTS[fEDI_gutterWidthStyleValue] = Math.ceil(digitCountOfLargestLineNumber * EDI_characterWidth);
    INTS[fEDI_gutterWidthTotal] = INTS[fEDI_gutterWidthStyleValue] + CONST_EDI_gutterPaddingLeft + CONST_EDI_gutterPaddingRight;
    gutterWidthTotal_withPxUnits = `${INTS[fEDI_gutterWidthTotal]}px`;

    let gutterWidth = INTS[fEDI_gutterWidthStyleValue] + 'px';
    EDI_gutter.style.width = gutterWidth;

    EDI_text.style.left = gutterWidthTotal_withPxUnits;
    EDI_scroll_viewport.style.left = gutterWidthTotal_withPxUnits;

    for (let i = 0; i < INTS[fEDI_ArrayFrom_textElement_children_length]/*a 'ArrayFrom_gutter_children_length' would always be equal to the textElement equivalent*/; i++) {
        EDI_ringBuffer_gutter[i].style.width = gutterWidth;
    }

    return true;
}

/**
 * You need to change this logic to know the longest line.
 * Then when the longest line changes or some such likely related to finalization of an edit (not pending edits).
 * then at that point you redraw this.
 */
function EDI_drawHorizontalScrollbar() {
    if (INTS[fEDI_longestLine_length] !== INTS[fEDI_longestLine_length_PreviousValueWhenLastDrewHorizontalScrollbar]) {
        
        INTS[fEDI_longestLine_length_PreviousValueWhenLastDrewHorizontalScrollbar] = INTS[fEDI_longestLine_length];

        INTS[fEDI_contentWidth] = Math.ceil((INTS[fEDI_longestLine_length] + 6/*characterwidth padding?*/) * EDI_characterWidth);

        if ((INTS[fEDI_contentWidth] < (EDI_baseElement.clientWidth - INTS[fEDI_gutterWidthTotal])) && (EDI_baseElement.clientWidth - INTS[fEDI_gutterWidthTotal] > 0)) {
            INTS[fEDI_contentWidth] = Math.floor(EDI_baseElement.clientWidth - INTS[fEDI_gutterWidthTotal]);
        }

        // The scrollViewport currently has a 'left/inset' that places it beyond the gutter. So the gutterWidthTotal being added is not necessary.
        const virtualization_horizontal_style_width_attribute = INTS[fEDI_contentWidth] + 'px';

        EDI_virtualization_horizontal.style.width = virtualization_horizontal_style_width_attribute;

        for (let i = 0; i < INTS[fEDI_ArrayFrom_textElement_children_length]; i++) {
            EDI_ringBuffer_text[i].style.width = virtualization_horizontal_style_width_attribute;
        }

        EDI_cursor_caretRow.style.width = virtualization_horizontal_style_width_attribute;
    }
}

/**
 * @returns 
 */
function EDI_insertGapBufferSpan() {
    walkLineUntilIndexColumn();
    if (w_div === w_divNONE) {
        EDI_cursor_textInsertionBufferWriteToSpanElement = null;
        INTS[fEDI_editret_cursor_gapBufferWriteToSpanElement_SpanTextContentRelativeIndex] = 0;
        return;
    }

    if (INTS[fEDI_w_indexColumn_Goal] == 0) {
        EDI_cursor_textInsertionBufferWriteToSpanElement = w_div;
        INTS[fEDI_editret_cursor_gapBufferWriteToSpanElement_SpanTextContentRelativeIndex] = 0;
    }
    else {
        EDI_cursor_textInsertionBufferWriteToSpanElement = w_div;

        if (INTS[fEDI_w_indexColumn_Goal] === INTS[fEDI_w_indexColumn_Sum] + EDI_cursor_textInsertionBufferWriteToSpanElement.textContent.length) {
            INTS[fEDI_editret_cursor_gapBufferWriteToSpanElement_SpanTextContentRelativeIndex] = EDI_cursor_textInsertionBufferWriteToSpanElement.textContent.length;
        }
        else {
            INTS[fEDI_editret_cursor_gapBufferWriteToSpanElement_SpanTextContentRelativeIndex] = INTS[fEDI_w_indexColumn_SpanTextContentRelative];
        }
    }
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

    switch (editKind) {
        case EditKind_InsertLtr:
            EDI_insertGapBufferSpan();
            break;
    }
}

/**
 * @param {*} shiftKey 
 */
function EDI_preKeyboardMovementSelectionLogic(shiftKey) {
    if (shiftKey) {
        if (!EDI_cursor_hasSelection()) {
            INTS[fEDI_cursor_selectionAnchor] = EDI_getPositionIndex_cursor_raw();
            INTS[fEDI_cursor_selectionIndexAnchorLine] = INTS[fEDI_cursor_indexLine];
            INTS[fEDI_cursor_selectionIndexAnchorColumn] = INTS[fEDI_cursor_indexColumn];
            INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
        }
    }
    else {
        if (EDI_cursor_hasSelection()) {
            INTS[fEDI_cursor_selectionAnchor] = INTS[fEDI_cursor_selectionEnd];
            INTS[fEDI_cursor_selectionIndexAnchorLine] = INTS[fEDI_cursor_selectionIndexEndLine];
            INTS[fEDI_cursor_selectionIndexAnchorColumn] = INTS[fEDI_cursor_selectionIndexEndColumn];
            INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
        }
    }
}

/**
 * @param {*} shiftKey 
 */
function EDI_postKeyboardMovementSelectionLogic(shiftKey) {
    if (shiftKey) {
        INTS[fEDI_cursor_selectionEnd] = EDI_getPositionIndex_cursor_raw();
        INTS[fEDI_cursor_selectionIndexEndLine] = INTS[fEDI_cursor_indexLine];
        INTS[fEDI_cursor_selectionIndexEndColumn] = INTS[fEDI_cursor_indexColumn];
        INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
    }
}
//#endregion

//#region keydown
/**
 * < The browser's event listener engine ignores the return value of event handlers.
 * < If you return a Promise, the browser treats it exactly like returning undefined, true, or a string. It drops the return value on the floor.
 * 
 * TODO: timing issue of async paste and copy
 */
function EDI_onKeyDown(event) {
    switch (event.key) {
        case 'ArrowLeft':
            EDI_onKeyDown_ArrowLeft(event);
            break;
        case 'ArrowDown':
            if (EDI_onKeyDown_ArrowDown(event)) {
                return; // 'EDI_onKeyDown_ArrowDown' returns {boolean} whether invoking function ought to return
            }
            break;
        case 'ArrowUp':
            if (EDI_onKeyDown_ArrowUp(event)) {
                return; // 'EDI_onKeyDown_ArrowUp' returns {boolean} whether invoking function ought to return
            }
            break;
        case 'ArrowRight':
            EDI_onKeyDown_ArrowRight(event);
            break;
        case 'Home':
            if (EDI_onKeyDown_Home(event)) {
                return; // 'EDI_onKeyDown_Home' returns {boolean} whether invoking function ought to return
            }
            break;
        case 'End':
            if (EDI_onKeyDown_End(event)) {
                return; // 'EDI_onKeyDown_End' returns {boolean} whether invoking function ought to return
            }
            break;
        case 'PageDown':
            EDI_onKeyDown_PageDown(event);
            break;
        case 'PageUp':
            EDI_onKeyDown_PageUp(event);
            break;
        case 'Delete':
            EDI_editEvent(EditKind_DeleteLtr, event);
            break;
        case 'Backspace':
            EDI_editEvent(EditKind_BackspaceRtl, event);
            break;
        case 'Escape':
            EDI_finalizeEdit();
            AUTOCOMPLETE_hide();
            break;
        case 'Tab':
            event.preventDefault();
            EDI_editEvent(EditKind_Tab, event);
            break;
        case 'Enter':
            // Enter key relies on cached data that would be cleared, pattern doesn't match on purpose
            EDI_editEvent(EditKind_Enter, event);
            break;
        case 'F12':
            EDI_doEditorGoToDefinitionRequest();
            break;
        default:
            // TODO: Checking for a length of 1 is probably wrong but it'll let me start writing some code
            if (event.key.length === 1) {
                if (event.ctrlKey) {
                    return EDI_onKeyDown_keyLengthEqualsOne_ctrlKey(event);
                }
                else if (event.altKey) {
                    EDI_onKeyDown_keyLengthEqualsOne_altKey(event);
                }
                else {
                    event.preventDefault();
                    EDI_editEvent(EditKind_InsertLtr, event);
                }
            }
            break;
    }
}

function EDI_onKeyDown_ArrowLeft(event) {
    event.preventDefault();
    event.stopPropagation();

    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
        EDI_finalizeEdit();
    }

    if (EDI_cursor_hasSelection() && !event.shiftKey) {
        let small;
        if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
            small = INTS[fEDI_cursor_selectionAnchor];
        }
        else {
            small = INTS[fEDI_cursor_selectionEnd];
        }
        EDI_ret_getLineAndColumnIndices_raw(small); // TODO: Check all of these whether they can be inlined (remove the single stage middle-man variable)
        let lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
        let lineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
        INTS[fEDI_cursor_indexLine] = lineAndColumnIndices_indexLine;
        INTS[fEDI_cursor_indexColumn] = lineAndColumnIndices_indexColumn;
        INTS[fEDI_cursorVisualColumnIndex] = lineAndColumnIndices_indexColumn;
        INTS[fEDI_cursor_selectionAnchor] = INTS[fEDI_cursor_selectionEnd];
        INTS[fEDI_cursor_selectionIndexAnchorLine] = INTS[fEDI_cursor_selectionIndexEndLine];
        INTS[fEDI_cursor_selectionIndexAnchorColumn] = INTS[fEDI_cursor_selectionIndexEndColumn];
    }
    else {
        EDI_preKeyboardMovementSelectionLogic(event.shiftKey);

        if (event.ctrlKey && INTS[fEDI_cursor_indexColumn] > 0) {
            EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
            const lineStart = INTS[fEDI_ret_getLineBoundaryPositions_start]
            const lineEnd = INTS[fEDI_ret_getLineBoundaryPositions_end];

            // TODO: use lineStart variable since it exists?
            let indexPosition = INTS[fEDI_ret_getLineBoundaryPositions_start] + INTS[fEDI_cursor_indexColumn];
            let originalCharacterKind = EDI_getCharacterPrevious_KIND(INTS[fEDI_cursor_indexColumn], indexPosition);
            indexPosition--;
            INTS[fEDI_cursor_indexColumn]--;
            INTS[fEDI_cursorVisualColumnIndex]--;
            let visualCorruption = false;
            visualCorruption = visualCorruption || (originalCharacterKind === CharacterKind_Whitespace && String.fromCharCode(EDI_textByteList_bytes[indexPosition]) === '\t');
            
            while (INTS[fEDI_cursor_indexColumn] > 0) {
                if (EDI_getCharacterPrevious_KIND(INTS[fEDI_cursor_indexColumn], indexPosition) === originalCharacterKind) {
                    indexPosition--;
                    INTS[fEDI_cursor_indexColumn]--;
                    INTS[fEDI_cursorVisualColumnIndex]--;
                    visualCorruption = visualCorruption || (originalCharacterKind === CharacterKind_Whitespace && String.fromCharCode(EDI_textByteList_bytes[indexPosition]) === '\t');
                }
                else {
                    break;
                }
            }

            if (visualCorruption) {
                EDI_ret_getIndexFromColumn_RESET(INTS[fEDI_cursor_indexColumn], lineStart, lineEnd);
                INTS[fEDI_cursorVisualColumnIndex] = INTS[fEDI_ret_getIndexFromX_visualColumns];
            }
        }
        else {
            if (INTS[fEDI_cursor_indexColumn] > 0) {
                INTS[fEDI_cursor_indexColumn]--;
                if (String.fromCharCode(EDI_textByteList_bytes[EDI_getPositionIndex_cursor_raw()]) === '\t') {
                    //INTS[fEDI_cursorVisualColumnIndex] -= (4 - (INTS[fEDI_cursorVisualColumnIndex] % 4)); // (tabLength)
                    EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
                    EDI_ret_getIndexFromColumn_RESET(INTS[fEDI_cursor_indexColumn], INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
                    INTS[fEDI_cursorVisualColumnIndex] = INTS[fEDI_ret_getIndexFromX_visualColumns];
                }
                else {
                    INTS[fEDI_cursorVisualColumnIndex]--;
                }
            }
            else if (INTS[fEDI_cursor_indexLine] > 0) {
                INTS[fEDI_cursor_indexLine]--;
                INTS[fEDI_cursor_indexColumn] = EDI_getLastValidIndexColumn_raw(INTS[fEDI_cursor_indexLine]);
                EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
                INTS[fEDI_cursorVisualColumnIndex] = EDI_getEntireLineVisualWidth(INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
            }
        }
        EDI_postKeyboardMovementSelectionLogic(event.shiftKey);
    }
    INTS[fEDI_cursor_STORED_visualWidth] = INTS[fEDI_cursorVisualColumnIndex];
    EDI_render_request(RenderKind_Cursor_n);
}

/** @returns {boolean} whether invoking function ought to return */
function EDI_onKeyDown_ArrowDown(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.ctrlKey) {
        // TODO: raf or something this scrollBy?
        EDI_scroll_viewport.scrollBy(0, INTS[fEDI_lineHeight]);
    }
    else {
        // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
        if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
            EDI_finalizeEdit();
        }
        EDI_preKeyboardMovementSelectionLogic(event.shiftKey);
        if (INTS[fEDI_cursor_indexLine] < INTS[fEDI_lineEndPositionList_count] - 1) {
            INTS[fEDI_cursor_indexLine]++;
            EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
            EDI_set_indexColumn_and_visualColumn_relativeTo_storedVisualWidth(INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
        }
        EDI_postKeyboardMovementSelectionLogic(event.shiftKey);

        EDI_render_request(RenderKind_Cursor_n);
    }
    return false;
}

/** @returns {boolean} whether invoking function ought to return */
function EDI_onKeyDown_ArrowUp(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.ctrlKey) {
        // TODO: raf or something this scrollBy?
        EDI_scroll_viewport.scrollBy(0, -1 * INTS[fEDI_lineHeight]);
    }
    else {
        // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
        if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
            EDI_finalizeEdit();
        }
        EDI_preKeyboardMovementSelectionLogic(event.shiftKey);
        if (INTS[fEDI_cursor_indexLine] > 0) {
            INTS[fEDI_cursor_indexLine]--;
            EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
            EDI_set_indexColumn_and_visualColumn_relativeTo_storedVisualWidth(INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
        }
        EDI_postKeyboardMovementSelectionLogic(event.shiftKey);
        EDI_render_request(RenderKind_Cursor_n);
    }
    return false;
}

function EDI_onKeyDown_ArrowRight(event) {
    event.preventDefault();
    event.stopPropagation();

    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
        EDI_finalizeEdit();
    }

    if (EDI_cursor_hasSelection() && !event.shiftKey) {
        let large;
        if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
            large = INTS[fEDI_cursor_selectionEnd];
        }
        else {
            large = INTS[fEDI_cursor_selectionAnchor];
        }
        EDI_ret_getLineAndColumnIndices_raw(large);
        let lineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
        let lineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
        INTS[fEDI_cursor_indexLine] = lineAndColumnIndices_indexLine;
        INTS[fEDI_cursor_indexColumn] = lineAndColumnIndices_indexColumn;
        INTS[fEDI_cursorVisualColumnIndex] = lineAndColumnIndices_indexColumn;
        INTS[fEDI_cursor_selectionAnchor] = INTS[fEDI_cursor_selectionEnd];
        INTS[fEDI_cursor_selectionIndexAnchorLine] = INTS[fEDI_cursor_selectionIndexEndLine];
        INTS[fEDI_cursor_selectionIndexAnchorColumn] = INTS[fEDI_cursor_selectionIndexEndColumn];
    }
    else {
        EDI_preKeyboardMovementSelectionLogic(event.shiftKey);
        let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(INTS[fEDI_cursor_indexLine]);
        if (event.ctrlKey && INTS[fEDI_cursor_indexColumn] < lastValidIndexColumn) {
            EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
            const line_end = INTS[fEDI_ret_getLineBoundaryPositions_end];
            let indexPosition = INTS[fEDI_ret_getLineBoundaryPositions_start] + INTS[fEDI_cursor_indexColumn];
            let originalCharacterKind = EDI_getCharacterCurrent_KIND(INTS[fEDI_cursor_indexColumn], indexPosition, line_end);
            if (originalCharacterKind === CharacterKind_Whitespace && String.fromCharCode(EDI_textByteList_bytes[EDI_getPositionIndex_cursor_raw()]) === '\t') {
                INTS[fEDI_cursorVisualColumnIndex] += (4 - (INTS[fEDI_cursorVisualColumnIndex] % 4)); // (tabLength)
            }
            else {
                INTS[fEDI_cursorVisualColumnIndex]++;
            }
            INTS[fEDI_cursor_indexColumn]++;
            indexPosition++;

            while (INTS[fEDI_cursor_indexColumn] < lastValidIndexColumn) {
                if (EDI_getCharacterCurrent_KIND(INTS[fEDI_cursor_indexColumn], indexPosition, line_end) === originalCharacterKind) {
                    if (originalCharacterKind === CharacterKind_Whitespace && String.fromCharCode(EDI_textByteList_bytes[EDI_getPositionIndex_cursor_raw()]) === '\t') {
                        INTS[fEDI_cursorVisualColumnIndex] += (4 - (INTS[fEDI_cursorVisualColumnIndex] % 4)); // (tabLength)
                    }
                    else {
                        INTS[fEDI_cursorVisualColumnIndex]++;
                    }
                    INTS[fEDI_cursor_indexColumn]++;
                    indexPosition++;
                }
                else {
                    break;
                }
            }
        }
        else {
            if (INTS[fEDI_cursor_indexColumn] < lastValidIndexColumn) {
                if (String.fromCharCode(EDI_textByteList_bytes[EDI_getPositionIndex_cursor_raw()]) === '\t') {
                    INTS[fEDI_cursorVisualColumnIndex] += (4 - (INTS[fEDI_cursorVisualColumnIndex] % 4)); // (tabLength)
                }
                else {
                    INTS[fEDI_cursorVisualColumnIndex]++;
                }
                INTS[fEDI_cursor_indexColumn]++;
            }
            else if (INTS[fEDI_cursor_indexLine] < INTS[fEDI_lineEndPositionList_count] - 1) {
                INTS[fEDI_cursor_indexColumn] = 0;
                INTS[fEDI_cursor_indexLine]++;
                INTS[fEDI_cursorVisualColumnIndex] = 0;
            }
        }
        EDI_postKeyboardMovementSelectionLogic(event.shiftKey);
    }
    INTS[fEDI_cursor_STORED_visualWidth] = INTS[fEDI_cursorVisualColumnIndex];
    EDI_render_request(RenderKind_Cursor_n);
}

/** @returns {boolean} whether invoking function ought to return */
function EDI_onKeyDown_Home(event) {
    event.preventDefault();
    event.stopPropagation();

    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
        EDI_finalizeEdit();
    }
    EDI_preKeyboardMovementSelectionLogic(event.shiftKey);
    if (event.ctrlKey) {
        INTS[fEDI_cursor_indexLine] = 0;
        INTS[fEDI_cursor_indexColumn] = 0;
        INTS[fEDI_cursorVisualColumnIndex] = 0;
    }
    else {
        let endExclusiveIndentationIndexColumn = EDI_measureEndExclusiveIndentationIndexColumn();
        if (INTS[fEDI_cursor_indexColumn] === endExclusiveIndentationIndexColumn) {
            INTS[fEDI_cursor_indexColumn] = 0;
            INTS[fEDI_cursorVisualColumnIndex] = 0;
        }
        else {
            INTS[fEDI_cursor_indexColumn] = endExclusiveIndentationIndexColumn;
            INTS[fEDI_cursorVisualColumnIndex] = INTS[fEDI_cursor_cached_indentation_string_visualWidth];
        }
    }
    EDI_postKeyboardMovementSelectionLogic(event.shiftKey);
    INTS[fEDI_cursor_STORED_visualWidth] = INTS[fEDI_cursorVisualColumnIndex];
    EDI_render_request(RenderKind_Cursor_n);
    return false;
}

/** @returns {boolean} whether invoking function ought to return */
function EDI_onKeyDown_End(event) {
    event.preventDefault();
    event.stopPropagation();

    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
        EDI_finalizeEdit();
    }
    EDI_preKeyboardMovementSelectionLogic(event.shiftKey);

    const originalLine = INTS[fEDI_cursor_indexLine];
    const originalColumn = INTS[fEDI_cursor_indexColumn];

    if (event.ctrlKey) {
        INTS[fEDI_cursor_indexLine] = INTS[fEDI_lineEndPositionList_count] - 1;
    }
    INTS[fEDI_cursor_indexColumn] = EDI_getLastValidIndexColumn_raw(INTS[fEDI_cursor_indexLine]);

    // TODO: if 'originalLine === INTS[fEDI_cursor_indexLine]' but 'originalColumn !== INTS[fEDI_cursor_indexColumn]'...
    // ...then you should determine the remaining visual width of the line given your current column prior to moving to the lastValidIndexColumn.
    //
    if (originalLine !== INTS[fEDI_cursor_indexLine] || originalColumn !== INTS[fEDI_cursor_indexColumn]) {
        EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
        INTS[fEDI_cursorVisualColumnIndex] = EDI_getEntireLineVisualWidth(INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
    }

    EDI_postKeyboardMovementSelectionLogic(event.shiftKey);
    INTS[fEDI_cursor_STORED_visualWidth] = INTS[fEDI_cursorVisualColumnIndex];
    EDI_render_request(RenderKind_Cursor_n);
    return false;
}

function EDI_onKeyDown_PageDown(event) {
    event.stopPropagation();
    event.preventDefault();

    if (event.ctrlKey) {
        INTS[fEDI_cursor_indexLine] = INTS[fEDI_virtualIndexLine] + INTS[fEDI_virtualCount];
        if (INTS[fEDI_virtualCount] > 1) {
            // this seems to more commonly have the cursor staying within the viewport rather than overlapping outside.
            INTS[fEDI_cursor_indexLine]--;
        }
        if (INTS[fEDI_cursor_indexLine] >= INTS[fEDI_lineEndPositionList_count]) {
            // TODO: You can't delete EOF can you? i.e.: cursor final position of file then delete?
            INTS[fEDI_cursor_indexLine] = INTS[fEDI_lineEndPositionList_count] - 1;
        }
        INTS[fEDI_cursor_indexColumn] = 0;
        INTS[fEDI_cursorVisualColumnIndex] = 0;
        // TODO: allow someone to select via this keybind, but for now it causes a bad selection if you { 'Ctrl' + 'a' } then use it so I'm clearing any active selection here for now.
        INTS[fEDI_cursor_selectionAnchor] = INTS[fEDI_cursor_selectionEnd];
        EDI_render_request(RenderKind_Cursor_n);
    }
    else {
        EDI_scroll_viewport.scrollBy(0, INTS[fEDI_lineHeight] * INTS[fEDI_virtualCount]);
    }
}

function EDI_onKeyDown_PageUp(event) {
    event.stopPropagation();
    event.preventDefault();

    if (event.ctrlKey) {        
        INTS[fEDI_cursor_indexLine] = INTS[fEDI_virtualIndexLine];
        if (INTS[fEDI_virtualCount] > 1) {
            // this seems to more commonly have the cursor staying within the viewport rather than overlapping outside.
            INTS[fEDI_cursor_indexLine]++;
        }
        if (INTS[fEDI_cursor_indexLine] >= INTS[fEDI_lineEndPositionList_count]) {
            // TODO: You can't delete EOF can you? i.e.: cursor final position of file then delete?
            INTS[fEDI_cursor_indexLine] = INTS[fEDI_lineEndPositionList_count] - 1;
        }
        INTS[fEDI_cursor_indexColumn] = 0;
        INTS[fEDI_cursorVisualColumnIndex] = 0;
        // TODO: allow someone to select via this keybind, but for now it causes a bad selection if you { 'Ctrl' + 'a' } then use it so I'm clearing any active selection here for now.
        INTS[fEDI_cursor_selectionAnchor] = INTS[fEDI_cursor_selectionEnd];
        EDI_render_request(RenderKind_Cursor_n);
    }
    else {
        EDI_scroll_viewport.scrollBy(0, -1 * INTS[fEDI_lineHeight] * INTS[fEDI_virtualCount]);
    }
}

/**
 * Make a list of the reasons why this "is async":
 * - case 'c': (EDI_copySelection)
 * - case 'x': (EDI_copySelection)
 * - case 'v': (window.myAPI.readClipboard)
 * 
 * In otherwords:
 * 
 * TODO:
 * - the tiny details of the ipc calls i.e.: what lines run synchronously
 * - is it enough lines that run synchronously before an await that it "just works"
 * 
 * - EDI_copySelection
 *     - synchronous copy with textarea and 'success = document.execCommand('copy');'
 *     - async copy logic
 *         - you could determine the text to copy immediately I wonder?
 *         - problematic is that you'd need to copy the bytes otherwise you'd be getting a subarray that points at the same data
 *         - so you'd either have to copy the data to another "array"
 *         - or lock the editor UI while the copy is being completed.
 * - window.myAPI.readClipboard
 *     - Solutions:
 *         - The synchronous paste event
 *             - side note you always wondered why they focused a textarea, in part it is from what I understand so you can paste into it and synchronously get the pasted text.
 *             - problematic case is that you can't rebind paste event
 *         - async paste logic
 *             - problematic case is that you need to lock the editor UI while the paste is being completed.
*/
async function EDI_onKeyDown_keyLengthEqualsOne_ctrlKey(event) {
    // TODO: I'm moving 'EDI_movementBasedCacheInvalidation' to the finalize of the respective edits...
    // ...this invocation doesn't have a 'EDI_finalizeEdit();' invocation immediately above it.
    // ...(!!!!this isn't the same comment as the others) THIS ONE SHOULD PROBABLY JUST INVOKE 'EDI_finalizeEdit();' STRAIGHT UP IF EDIT IS NOT NONE
    //
    // Ah you'll have to put it per case cause the paste ctrl+v for example you need to let batch.
    // 
    switch (event.key) {
        case 'c':
            
            event.preventDefault();
            event.stopPropagation();

            EDI_finalizeEdit();
            await EDI_copySelection();
            break;
        case 'x':

            event.preventDefault();
            event.stopPropagation();

            EDI_finalizeEdit();
            await EDI_copySelection();
            EDI_removeSelection();
            EDI_render_request(RenderKind_Cursor_n);
            break;
        case 'v':

            event.preventDefault();
            event.stopPropagation();

            await EDI_read_clipboard();
            EDI_editEvent(EditKind_Paste, event);
            break;
        case 'd':

            event.preventDefault();
            event.stopPropagation();

            EDI_editEvent(EditKind_Duplicate, event);
            break;
        case 'r':

            if (BYTES[byteAUTOCOMPLETE_exists]) {
                AUTOCOMPLETE_events_scroll_render_trailingEdgeDo(EDI_autocomplete_get_filter());
            }

            event.preventDefault();
            event.stopPropagation();
            break;
        case 'a':

            event.preventDefault();
            event.stopPropagation();

            EDI_finalizeEdit();
            INTS[fEDI_cursor_selectionAnchor] = 0;
            INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = 0;
            INTS[fEDI_cursor_selectionEnd] = INTS[fEDI_textByteList_count];
            INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
            EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_cursor_selectionEnd]);
            let selectionEndLineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
            let selectionEndLineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
            INTS[fEDI_cursor_indexLine] = selectionEndLineAndColumnIndices_indexLine;
            INTS[fEDI_cursor_indexColumn] = selectionEndLineAndColumnIndices_indexColumn;
            INTS[fEDI_cursorVisualColumnIndex] = selectionEndLineAndColumnIndices_indexColumn;
            EDI_render_request(RenderKind_Cursor_flag_doNotScrollIntoView);
            break;
        case 'f':

            event.preventDefault();
            event.stopPropagation();

            EDI_findOverlay_showSetter(!get_EDI_findOverlay_show());
            break;
        case 'z':
            //alert('undo');
            break;
        case 'y':
            //alert('redo');
            break;
        case ' ':
            event.preventDefault();
            event.stopPropagation();
            EDI_requestLspComplete();
            break;
    }
}

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

function EDI_onKeyDown_keyLengthEqualsOne_altKey(event) {
    
}
//#endregion

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
    EDI_cursor_edit_flagLineChanged = -1;

    EDI_cursor_EDI_paste_clipboardContent_string = null;
    EDI_cursor_EDI_paste_clipboardContent_bytes = null;
    EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS = null;
    EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths = null;
    EDI_clipboard_may_have_changed = true;

    EDI_duplication_may_have_changed = true;
    //EDI_cursor_EDI_duplication_string = null;
    EDI_cursor_EDI_duplication_bytes = null;
    EDI_cursor_EDI_duplication_totalLineEndCount = 0;
    EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS = null;
    EDI_cursor_EDI_duplication_arrayLineVisualLengths = null;

    INTS[fEDI_editret_cursor_EDI_duplicate_small] = 0;
    INTS[fEDI_editret_cursor_EDI_duplicate_length] = 0;
}

/**
 * This method will NOT "put a cursor on screen". You need to ensure
 * your cursor exists as a child by appendChild'ing to EDTIOR_cursorListElement.
 * This method instead only moves a cursor that ALREADY is being shown on screen.
 * 
 * If the 'cursor' is not EDI_primaryCursor, then the 'NOTscrollCursorIntoView' parameter has no effect.
 * i.e.: only the EDI_primaryCursor will ever be scrolled into view via this method.
 * 
 * @param {boolean} NOTscrollCursorIntoView 
 */
function EDI_drawCursor(NOTscrollCursorIntoView) {
    const newY = INTS[fEDI_cursor_indexLine] * INTS[fEDI_lineHeight];
    const newX = INTS[fEDI_cursorVisualColumnIndex] * EDI_characterWidth;

    if (newY !== INTS[fEDI_cursor_cursorTranslateYValue]) {
        INTS[fEDI_cursor_cursorTranslateYValue] = newY;
        EDI_cursor_caretRow.style.transform = `translateY(${newY}px)`;
    }

    if (newX !== EDI_cursor_cursorTranslateXValue) {
        EDI_cursor_cursorTranslateXValue = newX;
        EDI_cursor_cursorElement.style.transform = `translateX(${newX}px)`;
    }

    EDI_createStyleForSelection();

    if (!NOTscrollCursorIntoView) {
        EDI_scrollCursorIntoView();
    }

    /*if (BYTES[byteEDI_isChecking_cursorBlinkTrailingEdge] === 0) {
        // Why track "isChecking_..." anymore if you're doing this clearTimeout logic?
        // Because the assumption is that I was wrong about how expensive 'clearTimeout' and 'setTimeout' were
        // with respect to when the timeout doesn't end up being executed due to repeatedly setting and cancelling over and over.
        //
        // That is not to say however that my modifications to the UI are not expensive.
        // So I don't want to change more than 1 variable at a time here.
        //
        BYTES[byteEDI_isChecking_cursorBlinkTrailingEdge] = 1;
        EDI_cursor_cursorElement.style.animationPlayState = 'paused';
        const animations = EDI_cursor_cursorElement.getAnimations();
        if (animations.length > 0) {
            animations[0].currentTime = 0; // Instantly snaps the blink track back to 0%, making it 100% visible
        }
    }
    // The question comes down to what each stage of a setTimeout costs.
    // Previously I assumed 'setTimeout' allocated an object somewhere in the JavaScript heap and that it'd trigger JS GC in some way and cause visual jank.
    // Now I know it only allocates an object in C++, and the JavaScript to C++ (or vice versa) interactions are just done via the 'id'.
    // And maybe there is more to it than just an 'id' on the JavaScript side of things but I'm just modifying my assumptions a bit
    // based on new knowledge I've gained and seeing where it leads.
    //
    clearTimeout(INTS[fEDI_cursorBlinkingTrailingEdgeTimeoutId]);
    INTS[fEDI_cursorBlinkingTrailingEdgeTimeoutId] = setTimeout(EDI_cursorBlinkingTrailingEdge, 500);*/

/*
- [ ] Further necessary details:
    - [ ] Preferably if you insert text, then remove text, but the removed text is part of the text that you inserted
          that you'd just modify the "gap buffer" and avoid:
          - insert
          - remove triggers finalize of insert
          - start remove
          - eventually finalize remove
          ============================
          versus
          - insert
          - remove just modifies the inserted text
          - eventually finalize insert
        - [ ] But from an order of implementations I don't necessarily know if it is a good idea for me to concern myself with these details or not.
        - [ ] (i.e.: not yet?)
        - [ ] Thus you get the simple batching of edits 100% correct first
        - [ ] And do the other complex batching later.
*/
}

function EDI_draw_cursor_debug() {
    // TODO: This logic has way too much overhead to be in this function.
    let text = '';

    text += '(' + INTS[fEDI_cursor_indexLine] + ', ' + INTS[fEDI_cursor_indexColumn] + ')';
    
    if (BYTES[byteDIALOG_Settings_editorDebugShowAdjacentCharacters]) {
        //let previous = EDI_getCharacterPrevious(INTS[fEDI_cursor_indexColumn], EDI_getPositionIndex_cursor_raw());
        //if (previous === '\n') previous = '\\n';
        //else if (previous === '\t') previous = '\\t';
        //let current = EDI_getCharacterCurrent(INTS[fEDI_cursor_indexColumn], EDI_getPositionIndex_cursor_raw(), EDI_getLineEnd_pos_raw(INTS[fEDI_cursor_indexLine]));
        //if (current === '\n') current = '\\n';
        //else if (current === '\t') current = '\\t';
        //text += ' | (' + previous + ', ' + current + ')';
        text += 'byteDIALOG_Settings_editorDebugShowAdjacentCharacters_is_not_implemented';
    }

    text += ' | (' + INTS[fEDI_cursorVisualColumnIndex] + ')';
    
    text += ' | (' + INTS[fEDI_cursor_editLength_characters] + ')';

    text += ' | (' + INTS[fEDI_longestLine_indexLine] + ', ' + INTS[fEDI_longestLine_length] + ')';

    const textNode = EDI_debug.firstChild;
    textNode.replaceData(0, textNode.length, text);
}

/**
 * This function only clears both the 'BYTES[byteEDI_cursor_selectionDivExists]' and the HTML associated with the selection NOT the actual selection position properties of the cursor.
 */
function EDI_clearSelectionStyle() {
    let shouldExistSelectionDiv = false;
    if (BYTES[byteEDI_cursor_selectionDivExists] === 1) {
        for (var i = 0; i < EDI_selection.children.length; i++) {
            if (EDI_selection.children[i].id === CONST_EDI_cursor_htmlId) {
                let textSelectionDiv = EDI_selection.children[i];
                if (!shouldExistSelectionDiv) {
                    EDI_selection.removeChild(textSelectionDiv);
                    BYTES[byteEDI_cursor_selectionDivExists] = 0;
                }
                break;
            }
        }
    }
}

/**
 * TODO: This needs to be a ring buffer of its own
 * ...
 * dynamic ring buffer that scales as your selection requires more and more horizontal divs?
 * Otherwise you have the ring buffer sitting around in the background all the time.
 * And if you only select 1 line of text you probably don't want to fill the screen with empty divs foreach line
 * just to select text on a single line.
 * So as you keep selecting you build a larger and larger ring buffer that is capped at max to be the amount of lines that fit the viewport.
 * 
 * As you scroll determine the lines that need to be redrawn
*/
function EDI_createStyleForSelection() {
    if (INTS[fEDI_cursor_DRAWN_selectionAnchor] !== INTS[fEDI_cursor_selectionAnchor] ||
        INTS[fEDI_cursor_DRAWN_selectionEnd] !== INTS[fEDI_cursor_selectionEnd] ||
        INTS[fEDI_cursor_DRAWN_selection_virtualCount] !== INTS[fEDI_virtualCount] ||
        INTS[fEDI_cursor_DRAWN_selection_virtualIndexLine] !== INTS[fEDI_virtualIndexLine] ||
        INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL_DRAWN] !== INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] ||
        INTS[fEDI_cursor_selectionIndexEndColumnVISUAL_DRAWN] !== INTS[fEDI_cursor_selectionIndexEndColumnVISUAL]) {

        INTS[fEDI_cursor_DRAWN_selectionAnchor] = INTS[fEDI_cursor_selectionAnchor];
        INTS[fEDI_cursor_DRAWN_selectionEnd] = INTS[fEDI_cursor_selectionEnd];
        INTS[fEDI_cursor_DRAWN_selection_virtualCount] = INTS[fEDI_virtualCount];
        INTS[fEDI_cursor_DRAWN_selection_virtualIndexLine] = INTS[fEDI_virtualIndexLine];

        INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL_DRAWN] = INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL];
        INTS[fEDI_cursor_selectionIndexEndColumnVISUAL_DRAWN] = INTS[fEDI_cursor_selectionIndexEndColumnVISUAL];

        let shouldExistSelectionDiv = false;
        if (INTS[fEDI_cursor_DRAWN_selectionAnchor] === INTS[fEDI_cursor_DRAWN_selectionEnd]) {
            shouldExistSelectionDiv = false;
        }
        else {
            shouldExistSelectionDiv = true;
        }

        let textSelectionDiv;

        if (BYTES[byteEDI_cursor_selectionDivExists] === 1) {
            for (var i = 0; i < EDI_selection.children.length; i++) {
                if (EDI_selection.children[i].id === CONST_EDI_cursor_htmlId) {
                    textSelectionDiv = EDI_selection.children[i];
                    if (!shouldExistSelectionDiv) {
                        EDI_selection.removeChild(textSelectionDiv);
                        BYTES[byteEDI_cursor_selectionDivExists] = 0;
                    }
                    break;
                }
            }
        }
        else if (shouldExistSelectionDiv) {
            textSelectionDiv = document.createElement('div');
            textSelectionDiv.id = CONST_EDI_cursor_htmlId;
            textSelectionDiv.style.display = 'contents';
            EDI_selection.appendChild(textSelectionDiv);
            BYTES[byteEDI_cursor_selectionDivExists] = 1;
        }

        if (BYTES[byteEDI_cursor_selectionDivExists] === 0) return;

        // TODO: only somewhat simple viewport based virtualization is implemented from what I remember. i.e.: I think the divs are re-used, but every div is redrawn for the viewport, rather than only recalculating the css for the divs that came or left the viewport.

        let start = INTS[fEDI_cursor_selectionAnchor];
        EDI_ret_getLineAndColumnIndices_raw(start);
        let startLineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
        let startLineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
        let startLine = startLineAndColumnIndices_indexLine;
        let startColumn = startLineAndColumnIndices_indexColumn;
        let start_visualColumnStart = INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL];

        let end = INTS[fEDI_cursor_selectionEnd];
        EDI_ret_getLineAndColumnIndices_raw(end);
        let endLineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
        let endLineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
        let INCLUSIVEendLine = endLineAndColumnIndices_indexLine;
        let INCLUSIVEendColumn = endLineAndColumnIndices_indexColumn;
        let end_visualColumnStart = INTS[fEDI_cursor_selectionIndexEndColumnVISUAL];

        // # Virtualization
        if (startLine < INTS[fEDI_virtualIndexLine]) {
            startLine = INTS[fEDI_virtualIndexLine];
            startColumn = 0;
        }
        let lastIndexLineBeingShown = INTS[fEDI_virtualIndexLine] + INTS[fEDI_virtualCount] - 1;
        if (INCLUSIVEendLine > lastIndexLineBeingShown) {
            INCLUSIVEendLine = lastIndexLineBeingShown;
            INCLUSIVEendColumn = EDI_getLastValidIndexColumn_raw(INCLUSIVEendLine);
        }

        if (start > end) {
            let temp = end;
            let tempLine = INCLUSIVEendLine;
            let tempColumn = INCLUSIVEendColumn;
            let tempVisualColumn;
            end = start;
            INCLUSIVEendLine = startLine;
            INCLUSIVEendColumn = startColumn;
            start = temp;
            startLine = tempLine;
            startColumn = tempColumn;

            tempVisualColumn = start_visualColumnStart;
            start_visualColumnStart = end_visualColumnStart;
            end_visualColumnStart = tempVisualColumn;
        }
        //
        // I do not want to fill the screen with display:none divs for when there is a selection to be shown there (I do it all the time but it doesn't seem sensible here).
        // Thus the first step is to ensure there are a matching amount of divs for the selections to apply their style to.
        //
        let selectedLineCount = INCLUSIVEendLine - startLine + 1;
        if (textSelectionDiv.children.length < selectedLineCount) {
            for (let i = textSelectionDiv.children.length; i < selectedLineCount; i++) {
                const div = document.createElement('div');
                div.className = 'EDI_selection';
                div.style.height = EDI_lineHeightStringWithPx;
                div.style.lineHeight = EDI_lineHeightStringWithPx;
                textSelectionDiv.appendChild(div);
            }
        }
        else if (textSelectionDiv.children.length > selectedLineCount) {
            for (let i = selectedLineCount; i < textSelectionDiv.children.length; i++) {
                textSelectionDiv.removeChild(textSelectionDiv.children[i]);
            }
        }

        let lineSelectionDiv;
        let childDivIndex = 0;

        // everything static-ly will "fall at a left of gutterWidthTotal_withPxUnits"...
        // ...but you cannot rely on that as it causes layout shifting, you need to make it clear to the renderering engine.

        /*
        But it just means you have a startLineSelectionWidth of 'startLineEntireVisualWidth - (startColumnVisualOfSelection * charWidth)'
        and the endLineSelectionWidth is 'endColumnVisualOfSelection'.
        */

        if (startLine === INCLUSIVEendLine) {
            lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
            lineSelectionDiv.style.transform = `translate(${start_visualColumnStart * EDI_characterWidth}px, ${INTS[fEDI_lineHeight] * startLine}px)`;
            lineSelectionDiv.style.width = (end_visualColumnStart - start_visualColumnStart) * EDI_characterWidth + 'px';
        }
        else {
            // start line
            lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
            lineSelectionDiv.style.transform = `translate(${start_visualColumnStart * EDI_characterWidth}px, ${INTS[fEDI_lineHeight] * startLine}px)`;
            EDI_ret_getLineBoundaryPositions_raw(startLine);
            let lineVisualWidth = EDI_getEntireLineVisualWidth(INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
            lineSelectionDiv.style.width = (lineVisualWidth + 1 - start_visualColumnStart) * EDI_characterWidth + 'px';

            // between lines
            for (var lineI = startLine + 1; lineI < INCLUSIVEendLine; lineI++) {
                lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
                lineSelectionDiv.style.transform = `translate(0px, ${INTS[fEDI_lineHeight] * lineI}px)`;
                EDI_ret_getLineBoundaryPositions_raw(lineI);
                let lineVisualWidth = EDI_getEntireLineVisualWidth(INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
                lineSelectionDiv.style.width = (lineVisualWidth + 1) * EDI_characterWidth + 'px';
            }

            // end line
            lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
            lineSelectionDiv.style.transform = `translate(0px, ${INTS[fEDI_lineHeight] * INCLUSIVEendLine}px)`;
            lineSelectionDiv.style.width = end_visualColumnStart * EDI_characterWidth + 'px';
        }
    }
}

function EDI_createStyleForSelection_indentMore() {
    let textSelectionDiv;
    if (BYTES[byteEDI_cursor_selectionDivExists] === 1) {
        for (var i = 0; i < EDI_selection.children.length; i++) {
            if (EDI_selection.children[i].id === CONST_EDI_cursor_htmlId) {
                textSelectionDiv = EDI_selection.children[i];
                break;
            }
        }
    }
    else {
        // TODO: Silent error confusing bad idea
        return;
    }

    let extraWidth = 4 * EDI_characterWidth;
    for (let i = 0; i < textSelectionDiv.children.length; i++) {
        let lineSelectionDiv = textSelectionDiv.children[i];
        // TODO: precalculate 'widthNumberValue' outside of this loop.
        let widthNumberValue = parseFloat(lineSelectionDiv.style.width, 10);
        widthNumberValue += extraWidth;
        lineSelectionDiv.style.width = widthNumberValue + 'px';
    }

    INTS[fEDI_cursor_DRAWN_selectionAnchor] = INTS[fEDI_cursor_selectionAnchor];
    INTS[fEDI_cursor_DRAWN_selectionEnd] = INTS[fEDI_cursor_selectionEnd];
}

function EDI_cursorBlinkingTrailingEdge() {
    BYTES[byteEDI_isChecking_cursorBlinkTrailingEdge] = 0;
    // TODO: does modifying animationPlayState benefit from rAF?
    if (BYTES[byteEDI_editorHasFocus]) {
        EDI_cursor_cursorElement.style.animationPlayState = 'running';
    }
    // TODO: (rAF) / it is possible that you paint more than the debug text due to combining that text modification with the same rAF frame...
    // ...that updates something more directly related to the text editor itself (i.e.: if you group this text modification with modifying the 'animationPlayState').
    EDI_draw_cursor_debug();
}

function EDI_scrollCursorIntoView() {
    let scrollX = 0;
    let scrollY = 0;

    const local_lastReadNumber_scrollTop = EDI_lastReadNumber_scrollTop;
    const currentRight = EDI_lastReadNumber_scrollLeft + INTS[fEDI_lastReadNumber_offsetWidth];

    if (INTS[fEDI_cursor_cursorTranslateYValue] < local_lastReadNumber_scrollTop) {
        scrollY = INTS[fEDI_cursor_cursorTranslateYValue] - local_lastReadNumber_scrollTop;
    }
    else if (INTS[fEDI_cursor_cursorTranslateYValue] >= local_lastReadNumber_scrollTop + INTS[fEDI_lastReadNumber_offsetHeight]) {
        // I want to use clientHeight but I don't have any logic for no scrollbar thus single page fitting text might bug out and trigger
        // scrollBy over and over.

        // make the bottom touch then add lineHeight is probably the algorithm to get a perfect fill maybe do lineHeight * 2 skip an event when spamming arrowDown?
        let currentBottom = local_lastReadNumber_scrollTop + INTS[fEDI_lastReadNumber_offsetHeight];
        let changeToMakeBottomTouch = INTS[fEDI_cursor_cursorTranslateYValue] - currentBottom;
        scrollY = changeToMakeBottomTouch + (2 * INTS[fEDI_lineHeight]);
    }

    // Use a 1.5 or 2 pixel tolerance to absorb any browser subpixel rounding discrepancies
    const subpixelTolerance = 2;

    if (EDI_cursor_cursorTranslateXValue < EDI_lastReadNumber_scrollLeft) {
        scrollX = EDI_cursor_cursorTranslateXValue - EDI_lastReadNumber_scrollLeft;
    }
    else if (EDI_cursor_cursorTranslateXValue >= (currentRight - subpixelTolerance)) {
        // I want to use clientWidth but I don't have any logic for no scrollbar thus single page fitting text might bug out and trigger
        // scrollBy over and over.

        // make the right touch then add characterWidth is probably the algorithm to get a perfect fill maybe do characterWidth * 2 skip an event when spamming arrowRight?
        let changeToMakeRightTouch = EDI_cursor_cursorTranslateXValue - currentRight;
        scrollX = changeToMakeRightTouch + (4 * EDI_characterWidth);

        // CRITICAL GUARD FOR ARRAYS: 
        // If the scroll change is negligible, clear it to completely kill infinite scroll spamming.
        if (Math.abs(scrollX) < 1) {
            scrollX = 0;
        }
    }

    // This is asynchronous, this is the bug cause
    // (SPECIFICALLY: the scroll event is async)
    if (scrollX !== 0 || scrollY !== 0) {
        EDI_scroll_viewport.scrollBy(scrollX, scrollY);
    }
}

/**
 * TODO: This is currently just invoked from EDI_render_do_SyntaxHighlighting, so it probably should be moved at some point.
 */
function EDI_render_do_RedrawSelection() {
    // TODO: I don't know why this works the first thing the function invoked does is check whether the selection changed which it didn't so...
    // ...that being said I don't feel well so I didn't actually but in any effort to read the if statement in question I just glanced at it.
    EDI_createStyleForSelection();
}
//#endregion

function EDI_render_do_Resize() {
    EDI_measureBaseElement();

    let remember_virtualCount = INTS[fEDI_virtualCount];
    update_virtualCount();
    if (INTS[fEDI_virtualCount] !== remember_virtualCount) {
        INTS[fEDI_intFalsey_isScrolling] = 0; // Trigger scroll leading edge downstream
        EDI_render_do_Scroll();
    }

    set_EDI_recentBoundingClientRect_isNull_intFalsey(1);
    EDI_drawHorizontalScrollbar();
}

function EDI_onResize() {
    if (INTS[fEDI_onResize_timer] === 0) {
        // TODO: '109' has no meaning behind it...
        // ...TODO: Figure out how to get this to always trigger faster than the 200ms timeout of the scroll trailing edge...
        // ...lest thou receiveth many object allocation from scroll trailing edge. You see cause you see the syntax highlight happening while resizing.
        INTS[fEDI_onResize_timer] = setTimeout(EDI_onResize_startThrottleTimeout_aaa, 109);
    }
}

function EDI_onResize_startThrottleTimeout_aaa() {
    EDI_render_request(RenderKind_Resize);
    INTS[fEDI_onResize_timer] = 0;
}

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
    if (EDI_clipboard_may_have_changed) {
        EDI_clipboard_may_have_changed = false;
        EDI_finalizeEdit();
        EDI_cursor_EDI_paste_clipboardContent_string = await window.myAPI.readClipboard();
        // TODO: what are the possible returned values of 'await window.myAPI.readClipboard();'? Is it nullable?
        EDI_cursor_EDI_paste_clipboardContent_string = EDI_cursor_EDI_paste_clipboardContent_string.replaceAll('\r\n', '\n');
        EDI_cursor_EDI_paste_clipboardContent_bytes = EDI_encoder.encode(EDI_cursor_EDI_paste_clipboardContent_string);
        EDI_cursor_EDI_paste_clipboardContent_totalLineEndCount = countNewlines(EDI_cursor_EDI_paste_clipboardContent_string);
        EDI_cursor_EDI_paste_clipboardContent_arrayLinePositions_OFFSETS = new Array(1 + EDI_cursor_EDI_paste_clipboardContent_totalLineEndCount);
        EDI_cursor_EDI_paste_clipboardContent_arrayLineVisualLengths = new Array(1 + EDI_cursor_EDI_paste_clipboardContent_totalLineEndCount);

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
    if (EDI_duplication_may_have_changed) {
        EDI_duplication_may_have_changed = false;
        
        // Timing don't do this like u did in the other
        //EDI_finalizeEdit();


        //EDI_cursor_EDI_duplication_string = await window.myAPI.readClipboard();
        // TODO: what are the possible returned values of 'await window.myAPI.readClipboard();'? Is it nullable?
        //EDI_cursor_EDI_duplication_string = EDI_cursor_EDI_duplication_string.replaceAll('\r\n', '\n');


        const large = INTS[fEDI_editret_cursor_EDI_duplicate_small] + INTS[fEDI_editret_cursor_EDI_duplicate_length];
        EDI_cursor_EDI_duplication_bytes = EDI_textByteList_bytes.subarray(INTS[fEDI_editret_cursor_EDI_duplicate_small], large);
        //positionIndex = large;

        EDI_cursor_EDI_duplication_totalLineEndCount = countNewlines(EDI_decoder.decode(EDI_cursor_EDI_duplication_bytes));
        EDI_cursor_EDI_duplication_arrayLinePositions_OFFSETS = new Array(1 + EDI_cursor_EDI_duplication_totalLineEndCount);
        EDI_cursor_EDI_duplication_arrayLineVisualLengths = new Array(1 + EDI_cursor_EDI_duplication_totalLineEndCount);

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

/**
 * < Thanks to a browser feature called Event Bubbling, when the mouse enters a tiny token span, the event bubbles up to the parent container
 */
function EDI_mouseOver(e) {
    INTS[fEDI_EDI_mouseOver_event_clientY] = e.clientY;
    INTS[fEDI_EDI_mouseOver_event_clientX] = e.clientX;

    clearTimeout(INTS[fEDI_hoverTimeout]);
    INTS[fEDI_hoverTimeout] = setTimeout(EDI_requestLspHover, 1000);
}

function EDI_mouseLeave() {
    clearTimeout(INTS[fEDI_hoverTimeout]);
    INTS[fEDI_hoverTimeout] = 0;
    EDI_hideTooltip();
}

function EDI_requestLspComplete() {
    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
        EDI_finalizeEdit();
    }
    window.myAPI.editorCompletionRequest(INTS[fEDI_cursor_indexLine], INTS[fEDI_cursor_indexColumn]);
}

function EDI_doEditorGoToDefinitionRequest() {
    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
        EDI_finalizeEdit();
    }
    window.myAPI.editorGoToDefinitionRequest(INTS[fEDI_cursor_indexLine], INTS[fEDI_cursor_indexColumn]);
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
        window.myAPI.editorHoverRequest(indexLine, indexColumn);
    }
}

function EDI_hideTooltip() {
    TOOLTIP_hide();
}

function EDI_onfocus() {
    BYTES[byteEDI_editorHasFocus] = 1;
    EDI_clipboard_may_have_changed = true;
}

function EDI_onblur() {
    BYTES[byteEDI_editorHasFocus] = 0;
    EDI_clipboard_may_have_changed = true;
}

//// Find-All for "EDI_debug_optimization" to find all the commented out logic that was related to this.
//function EDI_debug_optimization(functionNameString) {
//    const status = eval(`%GetOptimizationStatus(${functionNameString})`);
//    console.log(`Optimization Status for ${functionNameString}: ${status}`);
//}

/**
 * TODO: for this function, you need to determine whether you will lex the
 * - [ ] textContent on the span,
 * - [ ] or if you will decode from the bytes again.
 * 
 * I'm going to do
 * - [ ] textContent on the span,
 * 
 * but there is 0 reasoning, understanding, or measurements behind my decision.
 * 
 * ===
 * 
 * TODO: I believe that the 'EDI_drawViewPort_FindTrackedSyntax_StartingIndex' is actually wrong when you have a multiline comment that spans multiple lines and, after the closing of that syntax you on the same line start typing anything that isn't supposed to receive the comment syntax highlighting, you'll find that it erroneously receives the comment syntax highlighting.
 * 
 * ===
 * 
 * TODO: My concern is with a scroll to a larger scrollY, then a scroll to a smaller scrollY
 * such that either scrollY are not equal, and that there is at least a difference of 1 lineHeight between both scrollY to ensure the changes aren't cancelling out.
 * |
 * I think then you'd need to edge check 'INTS[fEDI_ringBuffer_indexZero]' find a hit, loop until you no longer see the not syntax highlighted css class
 * then this tells you to edge check PREVIOUS('INTS[fEDI_ringBuffer_indexZero]') and the remainder of your 'diff' to loop is in reverse.
 * |
 * I'm trying to think about whether the scroll function could leave behind data that indicates to this function
 * whether it is a 'INTS[fEDI_ringBuffer_indexZero]', PREVIOUS('INTS[fEDI_ringBuffer_indexZero]'), or both case without checking the edge divs whether they have the not syntax highlighted css class.
 * 
 * ===
 * 
 * - [ ] TODO: There is something in this method that is decently pointless overhead relating to...:
 *     - An empty line, a line only consisting of whitespace, or a line that is indented.
 *         - ...this one is perhaps less obvious from a non-branching perspective. And perhaps even just adding a conditional branch that avoids invoking 'JS_line_lex' in this case is worthwhile.
 *     - A line that is out of bounds of 'indexLine < INTS[fEDI_lineEndPositionList_count]'
 *         - ...consider separating the loop bounds in some way to remove conditional branches related to 'if (indexLine < INTS[fEDI_lineEndPositionList_count])'
 * 
 * ===
*/
function EDI_render_do_SyntaxHighlighting() {

    //EDI_debug_optimization("EDI_render_do_Scroll"); // Find-All for "EDI_debug_optimization" to find all the commented out logic that was related to this.

    if (EDI_cursor_hasSelection()){
        EDI_render_do_RedrawSelection();
    }

    const local_EDI_ringBuffer_needsSyntaxHighlightingFlags = EDI_ringBuffer_needsSyntaxHighlightingFlags;
    let currentIndexRingBuffer = INTS[fEDI_ringBuffer_indexZero];
    let currentIndexLine = INTS[fEDI_virtualIndexLine];

    const local_EDI_lineEndPositionList_data = EDI_lineEndPositionList_data;
    const local_EDI_lineEndPositionList_count = INTS[fEDI_lineEndPositionList_count];

    // If you intend to use the variables 'lineStart' or 'lineEnd': Important detail to consider: the lines that are >= INTS[fEDI_lineEndPositionList_count] will continually increment lineStart by 1 So if you expect this to accurately represent the EOF position when it is in view, it probably does NOT.
    let lineStart = 0;
    let lineEnd = -1;
    if (currentIndexLine < local_EDI_lineEndPositionList_count && currentIndexLine !== 0) {
        lineEnd = local_EDI_lineEndPositionList_data[currentIndexLine - 1];
    }
    
    const local_ArrayFrom_textElement_children_length = INTS[fEDI_ArrayFrom_textElement_children_length];
    
    for (let i = local_ArrayFrom_textElement_children_length; i >= 0; i--) {

        // TODO: I'm trying to leverage the lines being contiguous and in order;...
        // ...this allows me to simplify the calculations for lineStart and lineEnd...
        // ...but perhaps it would be better just to find the cases of 'local_EDI_ringBuffer_needsSyntaxHighlightingFlags[currentIndexRingBuffer] === 1'...
        // ...and calculate the lineStart and lineEnd the "long way" due to possible skipping?...
        // ...trying to find the first case that is '1' means you cannot just calculate the initial lineStart and lineEnd...
        // ...because a loop is needed now to find the first '1' case...
        // ...thus you'd either have two loops, or add complexity to this loop...
        // ...and neither case seems like a good idea.
        lineStart = lineEnd + 1;
        if (currentIndexLine < local_EDI_lineEndPositionList_count) {
            lineEnd = local_EDI_lineEndPositionList_data[currentIndexLine];
        }
        else {
            lineEnd = lineStart;
        }

        if (local_EDI_ringBuffer_needsSyntaxHighlightingFlags[currentIndexRingBuffer] === 1) {
            local_EDI_ringBuffer_needsSyntaxHighlightingFlags[currentIndexRingBuffer] = 0;
            EDI_syntaxHighlight_parallelArray(EDI_ringBuffer_text[currentIndexRingBuffer], currentIndexRingBuffer, lineStart, lineEnd);
        }

        currentIndexLine++;
        currentIndexRingBuffer++;
        if (currentIndexRingBuffer >= local_ArrayFrom_textElement_children_length) {
            currentIndexRingBuffer = 0;
        }
    }
}

function EDI_syntaxHighlight_parallelArray(div, ringBufferIndexOfDiv, lineStart, lineEnd) {

    const arrayOfRangeObjectsOnLine = EDI_ringBuffer_ringBufferIndex_to_arrayOfRangeObjectsOnLine[ringBufferIndexOfDiv];

    /// This function is manually inlined(-ish) within 'EDI_syntaxHighlight_parallelArray' at the start of the function. (2 of 2)
    let range = arrayOfRangeObjectsOnLine.pop();
    while (range) {
        if (identifierHighlight.delete(range) ||
            keywordHighlight.delete(range) ||
            memberHighlight.delete(range) ||
            keywordControlHighlight.delete(range) ||
            functionHighlight.delete(range) ||
            commentHighlight.delete(range) ||
            stringHighlight.delete(range) ||
            typeHighlight.delete(range)) {
                // literally do nothing
        }
        range = arrayOfRangeObjectsOnLine.pop();
    }
    ///

    const textNode = div.firstChild;

    EDI_rangeInit.startContainer = textNode;
    EDI_rangeInit.endContainer = textNode;

    let start = 0;
    let length = 0;

    let i = lineStart;

    let TRAILINGstyleByteTRAILING = 0;

    // TODO: optimize the loop
    outerWhile: while (true) {
        if (i >= lineEnd) {
            TRAILINGstyleByteTRAILING = 0;
            break;
        }
        if (EDI_styleBuffer[i] !== 0) {
            const originalStyleByte = EDI_styleBuffer[i];
            if (originalStyleByte === undefined) { // out of bounds
                TRAILINGstyleByteTRAILING = 0;
                break;
            }
            start = i - lineStart;
            length = 0;
            while (true) {
                i++;
                length++;
                if (i >= lineEnd) {
                    TRAILINGstyleByteTRAILING = originalStyleByte;
                    break outerWhile;
                }
                if (EDI_styleBuffer[i] !== originalStyleByte) {
                    EDI_rangeInit.startOffset = start;
                    EDI_rangeInit.endOffset = start + length;
                    let range = new StaticRange(EDI_rangeInit);
                    arrayOfRangeObjectsOnLine.push(range);
                    if (originalStyleByte === 1) {
                        stringHighlight.add(range);
                    }
                    else if (originalStyleByte === 2) {
                        commentHighlight.add(range);
                    }
                    else if (originalStyleByte === 3) {
                        keywordHighlight.add(range);
                    }
                    else if (originalStyleByte === 4) {
                        keywordControlHighlight.add(range);
                    }
                    else if (originalStyleByte === 5) {
                        identifierHighlight.add(range);
                    }
                    else if (originalStyleByte === 6) {
                        typeHighlight.add(range);
                    }
                    else if (originalStyleByte === 7) {
                        memberHighlight.add(range);
                    }
                    else if (originalStyleByte === 8) {
                        functionHighlight.add(range);
                    }
                    continue outerWhile;
                }
            }
        }
        i++;
    }

    if (length > 0 && TRAILINGstyleByteTRAILING !== 0) {
        EDI_rangeInit.startOffset = start;
        EDI_rangeInit.endOffset = start + length;
        let range = new StaticRange(EDI_rangeInit);
        arrayOfRangeObjectsOnLine.push(range);
        if (TRAILINGstyleByteTRAILING === 1) {
            stringHighlight.add(range);
        }
        else if (TRAILINGstyleByteTRAILING === 2) {
            commentHighlight.add(range);
        }
        else if (TRAILINGstyleByteTRAILING === 3) {
            keywordHighlight.add(range);
        }
        else if (TRAILINGstyleByteTRAILING === 4) {
            keywordControlHighlight.add(range);
        }
        else if (TRAILINGstyleByteTRAILING === 5) {
            identifierHighlight.add(range);
        }
        else if (TRAILINGstyleByteTRAILING === 6) {
            typeHighlight.add(range);
        }
        else if (TRAILINGstyleByteTRAILING === 7) {
            memberHighlight.add(range);
        }
        else if (TRAILINGstyleByteTRAILING === 8) {
            functionHighlight.add(range);
        }
    }

    EDI_rangeInit.startContainer = null;
    EDI_rangeInit.endContainer = null;
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

function walkLineUntilIndexColumn() {
    // TODO: delete key until you delete a linefeed and join the next line onto your own then press backspace everything breaks.

    // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
    INTS[fEDI_w_ringBufferIndex] = INTS[fEDI_cursor_indexLine] - INTS[fEDI_virtualIndexLine];
    if (INTS[fEDI_w_ringBufferIndex] >= INTS[fEDI_ArrayFrom_textElement_children_length] || INTS[fEDI_w_ringBufferIndex] < 0) INTS[fEDI_w_ringBufferIndex] = -1;
    else INTS[fEDI_w_ringBufferIndex] = (INTS[fEDI_w_ringBufferIndex] + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];
    
    // This is the only time the "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" was stored in a uint32 slot
    // It still throws an error, just elsewhere "downstream". I'll save that for someone else.
    if (INTS[fEDI_w_ringBufferIndex] < 0 || INTS[fEDI_w_ringBufferIndex] === 4294967295) {
        INTS[fEDI_w_indexColumn_Goal] = 0;
        INTS[fEDI_w_indexColumn_Sum] = 0;
        INTS[fEDI_w_indexColumn_SpanTextContentRelative] = 0;
        w_div = w_divNONE;
        //INTS[fEDI_w_ringBufferIndex] = INTS[fEDI_w_ringBufferIndex]; // double assignment but not all that pressing of a matter at the moment I think it reads better to just set it / avoid the temporary 'let' local variable each invocation.
        return;
    }
    
    w_div = EDI_ringBuffer_text[INTS[fEDI_w_ringBufferIndex]];
    let indexColumn_Goal = INTS[fEDI_cursor_indexColumn];
    let indexColumn_Sum = 0;

    if (indexColumn_Goal <= indexColumn_Sum + w_div.textContent.length) {
        // '<=' because end-of-line text insertion (end of line but prior to the line ending itself).
        // The line ending isn't written to the span, it is represented by the encompassing div itself.
        INTS[fEDI_w_indexColumn_Goal] = indexColumn_Goal;
        INTS[fEDI_w_indexColumn_Sum] = indexColumn_Sum;
        INTS[fEDI_w_indexColumn_SpanTextContentRelative] = indexColumn_Goal - indexColumn_Sum;
        //INTS[fEDI_w_ringBufferIndex] = INTS[fEDI_w_ringBufferIndex]; // double assignment but not all that pressing of a matter at the moment I think it reads better to just set it / avoid the temporary 'let' local variable each invocation.
        return;
    }
    else {
        indexColumn_Sum += span.textContent.length;
    }

    // TODO: When the column index is too large, how should this be handled?
    INTS[fEDI_w_indexColumn_Goal] = 0;
    INTS[fEDI_w_indexColumn_Sum] = 0;
    INTS[fEDI_w_indexColumn_SpanTextContentRelative] = 0;
    w_div = w_divNONE;
    // INTS[fEDI_w_ringBufferIndex] = INTS[fEDI_w_ringBufferIndex]; // double assignment but not all that pressing of a matter at the moment I think it reads better to just set it / avoid the temporary 'let' local variable each invocation.
    return;
}

/**
 * Use case: HTML was previously rendered, but the content of the line was modified
 * and logic to more efficiently manipulate the existing HTML is not yet written.
 * 
 * Example modifications:
 * - The same line index had its contents modified.
 * - Visually the line index that virtually appears as that child element is not the same as it previously was
 *   due to various reasons, perhaps a change in scroll position.
 * 
 * Prior to invoking this function ensure the provided elements's innerHTML is empty:
 * - "gutterLineElement.innerHTML = '';"
 * - "divElement.innerHTML = '';"
 * @param {number} indexLine 
 * @param {HTMLElement} gutterLineElement 
 * @param {HTMLElement} divElement 
 */
function EDI_drawLine(indexLine, gutterLineElement, textLineElement, indexLineForGutterLineNumberText) {
    let textNode = gutterLineElement.firstChild;
    if (indexLine >= INTS[fEDI_lineEndPositionList_count]) {
        textNode.replaceData(0, textNode.length, '~');
    }
    else {
        textNode.replaceData(0, textNode.length, `${indexLineForGutterLineNumberText + 1}`);
    }

    EDI_ret_getLineBoundaryPositions_raw(indexLine);
    //JS_line_lex(???----textLineElement, INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end], trackedSyntax_StartingIndex);
    const lineStart = INTS[fEDI_ret_getLineBoundaryPositions_start];
    const lineEnd = INTS[fEDI_ret_getLineBoundaryPositions_end];

    textLineElement.className = 'eT';
    textNode = textLineElement.firstChild;
    textNode.replaceData(0, textNode.length, lineStart === lineEnd ? '' : EDI_decoder.decode(EDI_textByteList_bytes.subarray(lineStart, lineEnd)));

    // TODO: I believe this function deliberately doesn't modify the top so you can "shove whatever text you want into the line?"
}

//#region mousedown
function EDI_onMouseDown(event) {
    // TODO: long term continue reducing the frequency of 'finalizeEdit' for now though you want things to work and not be confusing
    if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
        EDI_finalizeEdit();
    }

    if (BYTES[byteTOOLTIP_exists] === 1) {
        TOOLTIP_hide();
    }

    if (get_EDI_recentBoundingClientRect_isNull_intFalsey() === 1) {
        let boundingClientRect = EDI_baseElement.getBoundingClientRect();
        INTS[fEDI_recentBoundingClientRect_left] = boundingClientRect.left;
        INTS[fEDI_recentBoundingClientRect_top] = boundingClientRect.top;
        set_EDI_recentBoundingClientRect_isNull_intFalsey(0);
    }

    if (event.button === 0) {
        BYTES[byteEDI_mousemove_eventListener_isActive] = 1;
        EDI_baseElement.addEventListener('mousemove', EDI_onMouseMove_WRAPIT);
    }

    let rY = event.clientY - INTS[fEDI_recentBoundingClientRect_top] + EDI_lastReadNumber_scrollTop;
    let rX = event.clientX - INTS[fEDI_recentBoundingClientRect_left] - INTS[fEDI_gutterWidthTotal] + EDI_lastReadNumber_scrollLeft;
    
    let indexLine = Math.floor(rY / INTS[fEDI_lineHeight]);
    let indexColumn = Math.round(rX / EDI_characterWidth);
    let indexColumnVisual = indexColumn;

    if (indexLine < 0) {
        indexLine = 0;
    }

    if (indexColumn < 0) {
        indexColumn = 0;
        indexColumnVisual = indexColumn;
    }

    if (indexLine >= INTS[fEDI_lineEndPositionList_count]) {
        indexLine = INTS[fEDI_lineEndPositionList_count] - 1;
    }

    EDI_ret_getLineBoundaryPositions_raw(indexLine);

    if (INTS[fEDI_cursor_indexLine] === indexLine) {
        if (rX >= EDI_cursor_cursorTranslateXValue) {
            EDI_ret_getIndexFromX_sameLine_newRxIsLarger(rX, INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end], INTS[fEDI_cursor_indexColumn], INTS[fEDI_cursorVisualColumnIndex]);
        }
        else {
            EDI_ret_getIndexFromX_sameLine_newRxIsSmaller(rX, INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_cursor_indexColumn], INTS[fEDI_cursorVisualColumnIndex]);
        }
    }
    else {
        EDI_ret_getIndexFromX_RESET(rX, INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
    }
    indexColumn = INTS[fEDI_ret_getIndexFromX_indexColumn];
    indexColumnVisual = INTS[fEDI_ret_getIndexFromX_visualColumns];

    let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(indexLine);
    if (indexColumn > lastValidIndexColumn) {
        indexColumn = lastValidIndexColumn;
        indexColumnVisual = indexColumn;
    }

    if (rX < -1 * CONST_EDI_gutterPaddingRight) {
        set_EDI_detailRank(3);
        EDI_onMouseDownDetailRankThree(event.button, event.shiftKey, indexLine, indexColumn);
        return;
    }

    if (event.detail % 3 === 0) {
        set_EDI_detailRank(3);
        EDI_onMouseDownDetailRankThree(event.button, event.shiftKey, indexLine, indexColumn);
    }
    else if (event.detail % 2 === 0) {
        set_EDI_detailRank(2);
        EDI_onMouseDownDetailRankTwo(event.button, event.shiftKey, indexLine, indexColumn, indexColumnVisual);
    }
    else {
        set_EDI_detailRank(1);
        EDI_onMouseDownDetailRankOne(event.button, event.shiftKey, indexLine, indexColumn, indexColumnVisual);
    }
}

function EDI_onMouseDownDetailRankOne(event_button, event_shiftKey, indexLineClicked, indexColumnClicked, indexColumnVisual) {

    let selectionPlusContextMenuCase = event_button === 2 && EDI_cursor_hasSelection();

    if (event_shiftKey && !selectionPlusContextMenuCase) {
        if (!EDI_cursor_hasSelection()) {
            INTS[fEDI_cursor_selectionAnchor] = EDI_getPositionIndex_cursor_raw();
            INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = indexColumnVisual;
        }
    }

    if (!selectionPlusContextMenuCase) {
        INTS[fEDI_cursor_indexLine] = indexLineClicked;
        INTS[fEDI_cursor_indexColumn] = indexColumnClicked;
        INTS[fEDI_cursorVisualColumnIndex] = indexColumnVisual;
        INTS[fEDI_cursor_STORED_visualWidth] = indexColumnVisual;
    
        INTS[fEDI_cursor_selectionEnd] = EDI_getPositionIndex_cursor_raw();
        INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];

        if (!event_shiftKey) {
            INTS[fEDI_cursor_selectionAnchor] = INTS[fEDI_cursor_selectionEnd];
            INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
        }
    }

    EDI_render_request(RenderKind_Cursor_n);
}

function EDI_onMouseDownDetailRankTwo(event_button, event_shiftKey, indexLineClicked, indexColumnClicked, indexColumnVisual) {
    if (event_shiftKey) {
        EDI_onMouseDownDetailRankOne(event_button, event_shiftKey, indexLineClicked, indexColumnClicked);
        return;
    }

    INTS[fEDI_cursor_indexLine] = indexLineClicked;
    INTS[fEDI_cursor_indexColumn] = indexColumnClicked;
    INTS[fEDI_cursorVisualColumnIndex] = indexColumnVisual;
    let positionIndex = EDI_getPositionIndex_cursor_raw();
    
    EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
    const line_start = INTS[fEDI_ret_getLineBoundaryPositions_start];
    const line_end = INTS[fEDI_ret_getLineBoundaryPositions_end];

    let leftCharacterKind = EDI_getCharacterPrevious_KIND(INTS[fEDI_cursor_indexColumn], positionIndex);
    let rightCharacterKind = EDI_getCharacterCurrent_KIND(INTS[fEDI_cursor_indexColumn], positionIndex, line_end);

    if (leftCharacterKind === rightCharacterKind) {
        let goalCharacterKind = rightCharacterKind;

        let tempIndexColumn = INTS[fEDI_cursor_indexColumn];
        let tempIndexColumnVisual = INTS[fEDI_cursorVisualColumnIndex];
        let tempPositionIndex = EDI_getPositionIndex_Overload(INTS[fEDI_cursor_indexLine], tempIndexColumn);
        while (tempIndexColumn > 0) {
            tempIndexColumn--;
            tempIndexColumnVisual--; // TODO: if '\t'
            tempPositionIndex--;
            leftCharacterKind = EDI_getCharacterPrevious_KIND(tempIndexColumn, tempPositionIndex);
            if (leftCharacterKind !== goalCharacterKind) {
                INTS[fEDI_cursor_selectionAnchor] = tempPositionIndex;
                INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = tempIndexColumnVisual;
                break;
            }
        }

        let lineLength = line_end - line_start;
        let rightWasFound = false;
        tempIndexColumn = INTS[fEDI_cursor_indexColumn];
        tempIndexColumnVisual = INTS[fEDI_cursorVisualColumnIndex];
        tempPositionIndex = EDI_getPositionIndex_Overload(INTS[fEDI_cursor_indexLine], tempIndexColumn);
        while (tempIndexColumn < lineLength) {
            tempIndexColumn++;
            tempIndexColumnVisual++; // TODO: if '\t'
            tempPositionIndex++;
            rightCharacterKind = EDI_getCharacterCurrent_KIND(tempIndexColumn, tempPositionIndex, line_end);
            if (rightCharacterKind !== goalCharacterKind) {
                INTS[fEDI_cursor_indexColumn] = tempIndexColumn;
                INTS[fEDI_cursor_selectionEnd] = tempPositionIndex;
                INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = tempIndexColumnVisual;
                INTS[fEDI_cursorVisualColumnIndex] = tempIndexColumnVisual;
                rightWasFound = true;
                break;
            }
        }

        if (!rightWasFound) {
            // end of line
            INTS[fEDI_cursor_indexColumn] = tempIndexColumn;
            INTS[fEDI_cursor_selectionEnd] = tempPositionIndex;
            INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = tempIndexColumnVisual;
            INTS[fEDI_cursorVisualColumnIndex] = tempIndexColumnVisual;
        }

        EDI_render_request(RenderKind_Cursor_n);
    }
    else if (leftCharacterKind > rightCharacterKind) {
        let goalCharacterKind = leftCharacterKind;

        let tempIndexColumn = INTS[fEDI_cursor_indexColumn];
        let tempIndexColumnVisual = INTS[fEDI_cursorVisualColumnIndex];
        let originalPositionIndex = EDI_getPositionIndex_Overload(INTS[fEDI_cursor_indexLine], tempIndexColumn);
        let tempPositionIndex = originalPositionIndex;

        while (INTS[fEDI_cursor_indexColumn] > 0) {
            tempIndexColumn--;
            tempIndexColumnVisual--; // TODO: if '\t'
            tempPositionIndex--;
            leftCharacterKind = EDI_getCharacterPrevious_KIND(tempIndexColumn, tempPositionIndex);
            if (leftCharacterKind !== goalCharacterKind) {
                INTS[fEDI_cursor_selectionAnchor] = tempPositionIndex;
                INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = tempIndexColumnVisual;
                break;
            }
        }

        INTS[fEDI_cursor_selectionEnd] = originalPositionIndex;
        INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];

        EDI_render_request(RenderKind_Cursor_n);
    }
    else {
        let goalCharacterKind = rightCharacterKind;

        let positionIndex = EDI_getPositionIndex_Overload(INTS[fEDI_cursor_indexLine], INTS[fEDI_cursor_indexColumn]);
        INTS[fEDI_cursor_selectionAnchor] = positionIndex;
        INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];

        let lineLength = line_end - line_start;
        let rightWasFound = false;

        while (INTS[fEDI_cursor_indexColumn] < lineLength) {
            INTS[fEDI_cursor_indexColumn]++;
            INTS[fEDI_cursorVisualColumnIndex]++;
            positionIndex++;
            rightCharacterKind = EDI_getCharacterCurrent_KIND(INTS[fEDI_cursor_indexColumn], positionIndex, line_end);
            if (rightCharacterKind !== goalCharacterKind) {
                INTS[fEDI_cursor_selectionEnd] = positionIndex;
                INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
                rightWasFound = true;
                break;
            }
        }

        if (!rightWasFound) {
            // end of line
            INTS[fEDI_cursor_selectionEnd] = positionIndex;
            INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
        }

        EDI_render_request(RenderKind_Cursor_n);
    }

    if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
        INTS[fEDI_detail_smallPosition] = INTS[fEDI_cursor_selectionAnchor];
        INTS[fEDI_detail_largePosition] = INTS[fEDI_cursor_selectionEnd];
        INTS[fEDI_detail_smallColumnVisual] = INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL];
        INTS[fEDI_detail_largeColumnVisual] = INTS[fEDI_cursor_selectionIndexEndColumnVISUAL];
    }
    else {
        INTS[fEDI_detail_smallPosition] = INTS[fEDI_cursor_selectionEnd];
        INTS[fEDI_detail_largePosition] = INTS[fEDI_cursor_selectionAnchor];
        INTS[fEDI_detail_smallColumnVisual] = INTS[fEDI_cursor_selectionIndexEndColumnVISUAL];
        INTS[fEDI_detail_largeColumnVisual] = INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL];
    }
}

function EDI_onMouseDownDetailRankThree(event_button, event_shiftKey, indexLineClicked, indexColumnClicked) {
    if (event_shiftKey) {
        EDI_onMouseDownDetailRankOne(event_button, event_shiftKey, indexLineClicked, indexColumnClicked);
        return;
    }

    INTS[fEDI_cursor_indexLine] = indexLineClicked;
    INTS[fEDI_cursor_indexColumn] = indexColumnClicked;
    INTS[fEDI_cursorVisualColumnIndex] = indexColumnClicked;
    
    INTS[fEDI_cursor_selectionAnchor] = EDI_getPositionIndex_Overload(INTS[fEDI_cursor_indexLine], 0);
    INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = 0;
    
    INTS[fEDI_detailRank3OriginLine] = INTS[fEDI_cursor_indexLine];

    if (INTS[fEDI_cursor_indexLine] === INTS[fEDI_lineEndPositionList_count] - 1) {
        EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
        INTS[fEDI_cursor_selectionEnd] = INTS[fEDI_ret_getLineBoundaryPositions_end];
        INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = EDI_getEntireLineVisualWidth(INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
        EDI_render_request(RenderKind_Cursor_n);
    }
    else {
        INTS[fEDI_cursor_indexLine]++;
        INTS[fEDI_cursor_indexColumn] = 0;
        INTS[fEDI_cursorVisualColumnIndex] = 0;
        EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
        INTS[fEDI_cursor_selectionEnd] = INTS[fEDI_ret_getLineBoundaryPositions_start];
        INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
        EDI_render_request(RenderKind_Cursor_n);
    }

    if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
        INTS[fEDI_detail_smallPosition] = INTS[fEDI_cursor_selectionAnchor];
        INTS[fEDI_detail_largePosition] = INTS[fEDI_cursor_selectionEnd];
        INTS[fEDI_detail_smallColumnVisual] = INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL];
        INTS[fEDI_detail_largeColumnVisual] = INTS[fEDI_cursor_selectionIndexEndColumnVISUAL];
    }
    else {
        INTS[fEDI_detail_smallPosition] = INTS[fEDI_cursor_selectionEnd];
        INTS[fEDI_detail_largePosition] = INTS[fEDI_cursor_selectionAnchor];
        INTS[fEDI_detail_smallColumnVisual] = INTS[fEDI_cursor_selectionIndexEndColumnVISUAL];
        INTS[fEDI_detail_largeColumnVisual] = INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL];
    }
}
//#endregion

//#region mousemove
function EDI_onMouseMove_WRAPIT(event) {
    if ((event.buttons & 1) && get_EDI_recentBoundingClientRect_isNull_intFalsey() === 0) {
        // TODO: Consider short circuiting at via event.clientX and clientY by tracking the necessary thresholds for the cursor position to pass rather than the previous and current indices. (you can possibly thereby skip the calculation of the indices entirely for the redundant events).
        // TODO: Is it correct to use the cursor's indexLine and indexColumn directly as a means of determining redundancy? I worry about odd interactions, but I have no proof that such an odd interaction could exist.

        let rX = Math.max(0, event.clientX - INTS[fEDI_recentBoundingClientRect_left] - INTS[fEDI_gutterWidthTotal] + EDI_lastReadNumber_scrollLeft);
        let rY = Math.max(0, event.clientY - INTS[fEDI_recentBoundingClientRect_top] + EDI_lastReadNumber_scrollTop);

        let indexColumn = Math.round(rX / EDI_characterWidth);
        let indexLine = Math.floor(rY / INTS[fEDI_lineHeight]);
        let indexColumnVisual = indexColumn;

        if (indexLine >= INTS[fEDI_lineEndPositionList_count]) {
            indexLine = INTS[fEDI_lineEndPositionList_count] - 1;
        }

        EDI_ret_getLineBoundaryPositions_raw(indexLine);

        if (INTS[fEDI_cursor_indexLine] === indexLine) {
            if (rX >= EDI_cursor_cursorTranslateXValue) {
                EDI_ret_getIndexFromX_sameLine_newRxIsLarger(rX, INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end], INTS[fEDI_cursor_indexColumn], INTS[fEDI_cursorVisualColumnIndex]);
            }
            else {
                EDI_ret_getIndexFromX_sameLine_newRxIsSmaller(rX, INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_cursor_indexColumn], INTS[fEDI_cursorVisualColumnIndex]);
            }
        }
        else {
            EDI_ret_getIndexFromX_RESET(rX, INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
        }
        indexColumn = INTS[fEDI_ret_getIndexFromX_indexColumn];
        indexColumnVisual = INTS[fEDI_ret_getIndexFromX_visualColumns];

        let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(indexLine);
        if (indexColumn > lastValidIndexColumn) {
            indexColumn = lastValidIndexColumn;
        }

        if (INTS[fEDI_cursor_indexLine] === indexLine && INTS[fEDI_cursor_indexColumn] === indexColumn) {
            return;
        }
        
        INTS[fEDI_cursor_indexLine] = indexLine;
        INTS[fEDI_cursor_indexColumn] = indexColumn;
        INTS[fEDI_cursorVisualColumnIndex] = indexColumnVisual;

        if (get_EDI_detailRank() === 3) {
            EDI_onMouseMoveDetailRankThree(indexLine, indexColumn);
        }
        else if (get_EDI_detailRank() === 2) {
            EDI_onMouseMoveDetailRankTwo(indexLine, indexColumn, indexColumnVisual);
        }
        else if (get_EDI_detailRank() === 1) {
            EDI_onMouseMoveDetailRankOne(indexLine, indexColumn, indexColumnVisual);
        }
    }
    else {
        BYTES[byteEDI_mousemove_eventListener_isActive] = 0;
        EDI_baseElement.removeEventListener('mousemove', EDI_onMouseMove_WRAPIT);
    }
}

function EDI_onMouseMoveDetailRankOne(indexLineClicked, indexColumnClicked, indexColumnVisual) {
    // TODO: These two sets the ones to line and column seem redundant weren't these just done by the original EDI_onMouseMove_WRAPIT?
    INTS[fEDI_cursor_indexLine] = indexLineClicked;
    INTS[fEDI_cursor_indexColumn] = indexColumnClicked;
    INTS[fEDI_cursorVisualColumnIndex] = indexColumnVisual;

    INTS[fEDI_cursor_selectionEnd] = EDI_getPositionIndex_cursor_raw();
    INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];

    EDI_render_request(RenderKind_Cursor_flag_doNotScrollIntoView);
}

function EDI_onMouseMoveDetailRankTwo(indexLineClicked, indexColumnClicked, indexColumnVisual) {
    let nextPositionIndex = EDI_getPositionIndex_Overload(indexLineClicked, indexColumnClicked);

    if (nextPositionIndex < INTS[fEDI_detail_smallPosition]) {
        if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
            INTS[fEDI_cursor_selectionAnchor] = INTS[fEDI_detail_largePosition];
            INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = INTS[fEDI_detail_largeColumnVisual];
        }

        INTS[fEDI_cursor_indexLine] = indexLineClicked;
        INTS[fEDI_cursor_indexColumn] = indexColumnClicked;
        INTS[fEDI_cursorVisualColumnIndex] = indexColumnClicked;
        let positionIndex = nextPositionIndex;

        INTS[fEDI_cursor_selectionEnd] = positionIndex;
        INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];

        let goalCharacterKind = EDI_getCharacterCurrent_KIND(INTS[fEDI_cursor_indexColumn], positionIndex, EDI_getLineEnd_pos_raw(INTS[fEDI_cursor_indexLine]));
        let leftWasFound = false;
        let tempPositionIndex = positionIndex;

        while (INTS[fEDI_cursor_indexColumn] > 0) {
            let leftCharacterKind = EDI_getCharacterPrevious_KIND(INTS[fEDI_cursor_indexColumn], tempPositionIndex);
            if (leftCharacterKind !== goalCharacterKind) {
                INTS[fEDI_cursor_selectionEnd] = tempPositionIndex;
                INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
                leftWasFound = true;
                break;
            }
            tempPositionIndex--;
            INTS[fEDI_cursor_indexColumn]--;
            INTS[fEDI_cursorVisualColumnIndex]--;
        }

        if (!leftWasFound) {
            INTS[fEDI_cursor_selectionEnd] = tempPositionIndex;
            INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
        }
    }
    else if (nextPositionIndex > INTS[fEDI_detail_largePosition]) {
        if (INTS[fEDI_cursor_selectionAnchor] > INTS[fEDI_cursor_selectionEnd]) {
            INTS[fEDI_cursor_selectionAnchor] = INTS[fEDI_detail_smallPosition];
            INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = INTS[fEDI_detail_smallColumnVisual];
        }

        INTS[fEDI_cursor_indexLine] = indexLineClicked;
        INTS[fEDI_cursor_indexColumn] = indexColumnClicked;
        INTS[fEDI_cursorVisualColumnIndex] = indexColumnVisual;
        let positionIndex = nextPositionIndex;

        INTS[fEDI_cursor_selectionEnd] = positionIndex;
        INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];

        let leftCharacterKind = EDI_getCharacterPrevious_KIND(INTS[fEDI_cursor_indexColumn], positionIndex);
        let goalCharacterKind = leftCharacterKind;

        EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
        const line_end = INTS[fEDI_ret_getLineBoundaryPositions_end];
        let lineLength = line_end - INTS[fEDI_ret_getLineBoundaryPositions_start];
        let rightWasFound = false;

        let tempPositionIndex = positionIndex;
        while (INTS[fEDI_cursor_indexColumn] < lineLength) {
            let rightCharacterKind = EDI_getCharacterCurrent_KIND(INTS[fEDI_cursor_indexColumn], tempPositionIndex, line_end);
            if (rightCharacterKind !== goalCharacterKind) {
                INTS[fEDI_cursor_selectionEnd] = tempPositionIndex;
                //INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
                rightWasFound = true;
                break;
            }
            tempPositionIndex++;
            INTS[fEDI_cursor_indexColumn]++;
            INTS[fEDI_cursorVisualColumnIndex]++;
            INTS[fEDI_cursor_selectionIndexEndColumnVISUAL]++; // TODO: '\t'
        }

        if (!rightWasFound) {
            // end of line
            INTS[fEDI_cursor_selectionEnd] = tempPositionIndex;
            INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
        }
    }
    else {
        if (INTS[fEDI_cursor_selectionAnchor] > INTS[fEDI_cursor_selectionEnd]) {
            INTS[fEDI_cursor_selectionAnchor] = INTS[fEDI_detail_smallPosition];
            INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = INTS[fEDI_detail_smallColumnVisual];
        }

        EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_detail_largePosition]);
        let largeLineAndColumnIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
        let largeLineAndColumnIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
        INTS[fEDI_cursor_indexLine] = largeLineAndColumnIndices_indexLine;
        INTS[fEDI_cursor_indexColumn] = largeLineAndColumnIndices_indexColumn;
        INTS[fEDI_cursorVisualColumnIndex] = INTS[fEDI_detail_largeColumnVisual];
        INTS[fEDI_cursor_selectionEnd] = INTS[fEDI_detail_largePosition];
        INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
    }

    EDI_render_request(RenderKind_Cursor_flag_doNotScrollIntoView);
}

function EDI_onMouseMoveDetailRankThree(indexLineClicked, indexColumnClicked) {
    // TODO: I remember this being bugged I think it makes sense why. You're checking if the cursor is exactly at the threshold rather than determining if the distance from previous event to this one puts you past the threshold.
    if (indexLineClicked === INTS[fEDI_detailRank3OriginLine]) {
        // TODO: 'cursor.positionIndex' is incorrect there is no such field, but was this referring to the clicked position or the position that the cursor currently is at...
        // ...it is presumed to be the position that the cursor is currently at because it would explain the bug where if you move the cursor somewhere that the mouse move events don't get
        // sent then bring your mouse back into a place where they do you'll snap ahead by some indices and skip the threshold and it visually bugs.
        // You could attach to I think it is window? but then I'm wondering if a race condition could ever occur.
        // so you'd probably want to do both attach to window and protect against large movements that skip the exact threshold when transitioning.
        //
        if (EDI_getPositionIndex_cursor_raw() !== INTS[fEDI_detail_smallPosition]) {
            EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_detail_smallPosition]);
            let smallLineAndColumnPositionIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
            let smallLineAndColumnPositionIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];
            INTS[fEDI_cursor_indexLine] = smallLineAndColumnPositionIndices_indexLine;
            INTS[fEDI_cursor_indexColumn] = smallLineAndColumnPositionIndices_indexColumn;
            INTS[fEDI_cursorVisualColumnIndex] = smallLineAndColumnPositionIndices_indexColumn;
        }

        if (INTS[fEDI_cursor_selectionEnd] !== INTS[fEDI_detail_smallPosition]) {
            INTS[fEDI_cursor_selectionEnd] = INTS[fEDI_detail_smallPosition];
            INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
        }

        if (INTS[fEDI_cursor_selectionAnchor] !== INTS[fEDI_detail_largePosition]) {
            INTS[fEDI_cursor_selectionAnchor] = INTS[fEDI_detail_largePosition];
            INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
        }

        EDI_render_request(RenderKind_Cursor_flag_doNotScrollIntoView);
    }
    else if (indexLineClicked < INTS[fEDI_detailRank3OriginLine]) {
        if (INTS[fEDI_cursor_selectionAnchor] < INTS[fEDI_cursor_selectionEnd]) {
            EDI_ret_getLineAndColumnIndices_raw(INTS[fEDI_detail_smallPosition]);
            let smallLineAndColumnPositionIndices_indexLine = INTS[fEDI_ret_getLineAndColumnIndices_indexLine];
            let smallLineAndColumnPositionIndices_indexColumn = INTS[fEDI_ret_getLineAndColumnIndices_indexColumn];

            INTS[fEDI_cursor_indexLine] = smallLineAndColumnPositionIndices_indexLine;
            INTS[fEDI_cursor_indexColumn] = smallLineAndColumnPositionIndices_indexColumn;
            INTS[fEDI_cursorVisualColumnIndex] = smallLineAndColumnPositionIndices_indexColumn;

            INTS[fEDI_cursor_selectionEnd] = INTS[fEDI_detail_smallPosition];
            INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];

            EDI_render_request(RenderKind_Cursor_flag_doNotScrollIntoView);
        }

        INTS[fEDI_cursor_indexLine] = indexLineClicked;
        INTS[fEDI_cursor_indexColumn] = 0;
        INTS[fEDI_cursorVisualColumnIndex] = 0;

        INTS[fEDI_cursor_selectionEnd] = EDI_getPositionIndex_Overload(indexLineClicked, 0);
        INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];

        EDI_render_request(RenderKind_Cursor_flag_doNotScrollIntoView);
    }
    else if (indexLineClicked > INTS[fEDI_detailRank3OriginLine]) {

        if (INTS[fEDI_cursor_selectionAnchor] !== INTS[fEDI_detail_smallPosition]) {
            INTS[fEDI_cursor_selectionAnchor] = INTS[fEDI_detail_smallPosition];
            INTS[fEDI_cursor_selectionIndexAnchorColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
        }

        INTS[fEDI_cursor_indexLine] = indexLineClicked;
        INTS[fEDI_cursor_indexColumn] = indexColumnClicked;
        INTS[fEDI_cursorVisualColumnIndex] = indexColumnClicked;
        let positionIndex = EDI_getPositionIndex_Overload(indexLineClicked, indexColumnClicked);

        // move to end of line...
        EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
        let lineLength = INTS[fEDI_ret_getLineBoundaryPositions_end] - INTS[fEDI_ret_getLineBoundaryPositions_start];
        positionIndex += lineLength - INTS[fEDI_cursor_indexColumn];

        if (INTS[fEDI_cursor_indexLine] === INTS[fEDI_lineEndPositionList_count] - 1) {
            INTS[fEDI_cursor_indexColumn] = lineLength;
            INTS[fEDI_cursorVisualColumnIndex] = lineLength;
            INTS[fEDI_cursor_selectionEnd] = positionIndex;
            INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
        }
        else {
            // wrap to the next line
            INTS[fEDI_cursor_indexLine]++;
            INTS[fEDI_cursor_indexColumn] = 0;
            INTS[fEDI_cursorVisualColumnIndex] = 0;
            positionIndex++;

            INTS[fEDI_cursor_selectionEnd] = positionIndex;
            INTS[fEDI_cursor_selectionIndexEndColumnVISUAL] = INTS[fEDI_cursorVisualColumnIndex];
        }

        EDI_render_request(RenderKind_Cursor_flag_doNotScrollIntoView);
    }
}
//#endregion

function EDI_onContextMenu() {
    let optionList = [
        MENU_MenuOption_factory(CommandKind_Cut, 'Cut'),
        MENU_MenuOption_factory(CommandKind_Copy, 'Copy'),
        MENU_MenuOption_factory(CommandKind_Paste, 'Paste'),
        MENU_MenuOption_factory(CommandKind_Find, 'Find'),
    ];

    let menuLeft = INTS[fEDI_recentBoundingClientRect_left] + INTS[fEDI_gutterWidthTotal] + EDI_cursor_cursorTranslateXValue - EDI_lastReadNumber_scrollLeft;
    let menuTop = INTS[fEDI_recentBoundingClientRect_top] + INTS[fEDI_cursor_cursorTranslateYValue] + INTS[fEDI_lineHeight] - EDI_lastReadNumber_scrollTop;

    menuSet(optionList, menuLeft, menuTop, EDI_MenuOnClick, /*target*/ null, /*elementToFocusOnCompleted*/ null, /*disableFocusOnCompleted*/ false, /*index*/ 0);
}

function EDI_measureLineHeightAndCharacterWidth() {
    let measureElement = document.createElement('div');
    measureElement.className = 'APP_MEASURE_ELEMENT';
    
    let len = 396;
    measureElement.textContent = 'A'.repeat(len); // Fast text assignment (bypasses HTML parser)

    // AI is saying "// The foolproof way to prevent ALL scrollbars during measurement" is this paragraph of code.
    // The foolproof way to prevent ALL scrollbars during measurement
    const wrapper = document.createElement('div');
    wrapper.className = 'APP_MEASURE_ELEMENT_WRAPPER';

    wrapper.appendChild(measureElement);
    EDI_text.appendChild(wrapper);

    const rect = measureElement.getBoundingClientRect();
    EDI_characterWidth = rect.width / len; // 7.146002258917298
    INTS[fEDI_lineHeight] = Math.ceil(rect.height); // 15

    wrapper.removeChild(measureElement);
    EDI_text.removeChild(wrapper);

    EDI_lineHeightStringWithPx = INTS[fEDI_lineHeight] + 'px';
}

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
    EDI_baseElement.addEventListener('keydown', EDI_onKeyDown);
    EDI_baseElement.addEventListener('mousedown', EDI_onMouseDown);

    EDI_baseElement.addEventListener('contextmenu', EDI_onContextMenu);
    window.addEventListener('resize', EDI_onResize);

    // Attach a single listener to your text container (Event Delegation)
    EDI_baseElement.addEventListener('mouseover', EDI_mouseOver);
    EDI_baseElement.addEventListener('mouseleave', EDI_mouseLeave);
    
    EDI_baseElement.addEventListener('focus', EDI_onfocus);
    EDI_baseElement.addEventListener('blur', EDI_onblur);

    EDI_scroll_viewport.addEventListener('scroll', EDI_scrollViewport_scroll, { passive: true });

    EDI_gutter.addEventListener('wheel', EDI_onWheelGutter, { passive: false /* 'e.preventDefault();' is used*/ });
}

/**
 * TODO: determine whether this 'Option 2' that Google AI mentioned would be superior to the current solution...
 * ...(currently an event listener is added to the gutter that applies the wheel deltas to the scrollViewport).
 * 
 * Option 2: Stretch the scroll viewport to inset: 0 and pad the space
 * 
 * If you want native scrolling everywhere without any JS event listeners, you must make the invisible scroll viewport cover the entire editor window,
 * and instead use padding or margins to push the horizontal scrollbar away from the gutter.
 * 
 * 1. Keep EDI_scroll_viewport at inset: 0 (don't shift its left to 38px).
 * 2. Shift the content inside it instead: Apply margin-left: 38px or left: 38px to your inner spacer element (#EDI_scrollbar_space_generator).
 * 
 * Note: Depending on the OS (especially Windows vs macOS), Option 2 might cause the horizontal scrollbar track to draw underneath your visual canvas or
 * layout weirdly. Option 1 is typically preferred for custom virtualized text editors because it keeps your structural boundaries explicitly separated.
*/
function EDI_onWheelGutter(e) {
    // Prevent page zooming if Ctrl is held, matching default browser behavior
    if (e.ctrlKey) return;

    // 1. If Shift is held and there's no native deltaX, 
    //    use deltaY to drive horizontal scrolling (Linux standard mouse fix)
    if (e.shiftKey && !e.deltaX) {
        EDI_scroll_viewport.scrollLeft += e.deltaY;
    } else {
        // 2. Normal behavior for trackpads and Windows OS-translated events
        EDI_scroll_viewport.scrollTop += e.deltaY;
        EDI_scroll_viewport.scrollLeft += e.deltaX;
    }

    // Prevent the event from bubbling up and doing nothing
    e.preventDefault();
}

//#region findOverlay
function EDI_findOverlay_doSearch() {
	let input = document.getElementById('EDI_findOverlay_input_elementId');
    if (!input || !input.value) return;
    
    let spanCurrent = document.getElementById('EDI_findOverlay_current');
	if (!spanCurrent) return;
	
	let spanTotal = document.getElementById('EDI_findOverlay_total');
	if (!spanTotal) return;
    
    set_EDI_findOverlay_wasSearched(true);

    let searchEncoded = EDI_encoder.encode(input.value);

    EDI_finalizeEdit();

    EDI_findOverlay_searchResultPositionList.clear();

    let offset = 0;
    let posStartOfMatch = 0;

    /** Given the current EDI_primaryCursor position, which match comes next. */
    let nextMatchNumber = -1;
    let nextMatchPos;

    if (EDI_cursor_hasSelection()) {
        let small = INTS[fEDI_cursor_selectionAnchor];
        let large = INTS[fEDI_cursor_selectionEnd];
        if (INTS[fEDI_cursor_selectionAnchor] > INTS[fEDI_cursor_selectionEnd]) {
            small = INTS[fEDI_cursor_selectionEnd];
            large = INTS[fEDI_cursor_selectionAnchor];
        }
        nextMatchPos = small;
    }
    else {
        nextMatchPos = EDI_getPositionIndex_cursor_raw();
    }
    
    if (get_EDI_findOverlay_options_matchWord() && ((searchEncoded[0] >= 97 && searchEncoded[0] <= 122) || (searchEncoded[0] >= 65 && searchEncoded[0] <= 90) || (searchEncoded[0] >= 48 && searchEncoded[0] <= 57) || (searchEncoded[0] === 95))) {
		for (let i = 0; i < INTS[fEDI_textByteList_count]; i++) {
			if ((EDI_textByteList_bytes[i] >= 97 && EDI_textByteList_bytes[i] <= 122) || (EDI_textByteList_bytes[i] >= 65 && EDI_textByteList_bytes[i] <= 90) || (EDI_textByteList_bytes[i] >= 48 && EDI_textByteList_bytes[i] <= 57) || (EDI_textByteList_bytes[i] === 95)) {
				if (EDI_textByteList_bytes[i] === searchEncoded[0]) {
    				while (i < INTS[fEDI_textByteList_count]) { // context switch to checking match
    					if (EDI_textByteList_bytes[i] === searchEncoded[offset]) {
				            if (offset === 0) {
				                posStartOfMatch = i;
				            }
				            offset++;
				            if (offset === searchEncoded.length) { // found "possible match"
				            	if (i + 1 >= INTS[fEDI_textByteList_count] ||
				            		!((EDI_textByteList_bytes[i + 1] >= 97 && EDI_textByteList_bytes[i + 1] <= 122) || (EDI_textByteList_bytes[i + 1] >= 65 && EDI_textByteList_bytes[i + 1] <= 90) || (EDI_textByteList_bytes[i + 1] >= 48 && EDI_textByteList_bytes[i + 1] <= 57) || (EDI_textByteList_bytes[i + 1] === 95))) { // ends on a word, therefore take match
					            		EDI_findOverlay_searchResultPositionList.insert(EDI_findOverlay_searchResultPositionList.count, posStartOfMatch);
                                        if (nextMatchNumber === -1 && posStartOfMatch >= nextMatchPos) {
                                            nextMatchNumber = EDI_findOverlay_searchResultPositionList.count;
                                            nextMatchPos = posStartOfMatch;
                                        }
				                		offset = 0;
				                		break;
				            	}
				            	else { // does NOT end on a word, therefore ignore match
				            		offset = 0;
				            		while (i < INTS[fEDI_textByteList_count]) { // move pos to next NON(letterOrDigit) or EOF
				            			if (!((EDI_textByteList_bytes[i] >= 97 && EDI_textByteList_bytes[i] <= 122) || (EDI_textByteList_bytes[i] >= 65 && EDI_textByteList_bytes[i] <= 90) || (EDI_textByteList_bytes[i] >= 48 && EDI_textByteList_bytes[i] <= 57) || (EDI_textByteList_bytes[i] === 95))) {
				            				i--; // backtrack by one due to outer for loop's incrementation step
				            				break;
				            			}
			            				i++;
				            		}
				                	break;
				            	}
				            }
				            i++;
				        }
				        else {
				            offset = 0;
				            while (i < INTS[fEDI_textByteList_count]) { // move pos to next NON(letterOrDigit) or EOF
		            			if (!((EDI_textByteList_bytes[i] >= 97 && EDI_textByteList_bytes[i] <= 122) || (EDI_textByteList_bytes[i] >= 65 && EDI_textByteList_bytes[i] <= 90) || (EDI_textByteList_bytes[i] >= 48 && EDI_textByteList_bytes[i] <= 57) || (EDI_textByteList_bytes[i] === 95))) {
		            				i--; // backtrack by one due to outer for loop's incrementation step
		            				break;
		            			}
	            				i++;
		            		}
				            break;
				        }
					}
				}
				else {
					while (i < INTS[fEDI_textByteList_count]) { // move pos to next NON(letterOrDigit) or EOF
            			if (!((EDI_textByteList_bytes[i] >= 97 && EDI_textByteList_bytes[i] <= 122) || (EDI_textByteList_bytes[i] >= 65 && EDI_textByteList_bytes[i] <= 90) || (EDI_textByteList_bytes[i] >= 48 && EDI_textByteList_bytes[i] <= 57) || (EDI_textByteList_bytes[i] === 95))) {
            				i--; // backtrack by one due to outer for loop's incrementation step
            				break;
            			}
        				i++;
            		}
				}
			}
			else {
				while (i < INTS[fEDI_textByteList_count]) { // move pos to next letterOrDigit or EOF
        			if ((EDI_textByteList_bytes[i] >= 97 && EDI_textByteList_bytes[i] <= 122) || (EDI_textByteList_bytes[i] >= 65 && EDI_textByteList_bytes[i] <= 90) || (EDI_textByteList_bytes[i] >= 48 && EDI_textByteList_bytes[i] <= 57) || (EDI_textByteList_bytes[i] === 95)) {
        				i--; // backtrack by one due to outer for loop's incrementation step
        				break;
        			}
    				i++;
        		}
			}
	    }
    }
    else {
    	for (let i = 0; i < INTS[fEDI_textByteList_count]; i++) {
	        if (EDI_textByteList_bytes[i] === searchEncoded[offset]) {
	            if (offset === 0) {
	                posStartOfMatch = i;
	            }
	            offset++;
	            if (offset === searchEncoded.length) {
	                EDI_findOverlay_searchResultPositionList.insert(EDI_findOverlay_searchResultPositionList.count, posStartOfMatch);
                    if (nextMatchNumber === -1 && posStartOfMatch >= nextMatchPos) {
                        nextMatchNumber = EDI_findOverlay_searchResultPositionList.count;
                        nextMatchPos = posStartOfMatch;
                    }
	                offset = 0;
	            }
	        }
	        else {
	            // I'm not sure how I like this. It feels wasteful to set this to 0.
	            // But if I check to see if it is 0, that feels even more wasteful.
	            offset = 0;
	        }
	    }
    }

    if (nextMatchNumber === -1) {
        nextMatchNumber = 1;
    }
    spanCurrent.textContent = nextMatchNumber;
    spanTotal.textContent = EDI_findOverlay_searchResultPositionList.count;
}

function EDI_findOverlay_input_onkeydown(event) {
    switch (event.key) {
        case 'Enter':
            EDI_findOverlay_doSearch();
            break;
        case 'Escape':
        	set_EDI_findOverlay_wasSearched(false);
            EDI_findOverlay_showSetter(false);
            EDI_baseElement.focus();
            break;
    }
}

function EDI_findOverlay_input_onblur() {
	if (!get_EDI_findOverlay_wasSearched()) {
		EDI_findOverlay_doSearch();
	}
}

function EDI_findOverlay_input_onchange() {
	set_EDI_findOverlay_wasSearched(false);
}

function EDI_findOverlay_checkboxMatchWord_onchange() {
	// for an onchange event, event.target might always be precise?
	let checkboxMatchWord = document.getElementById('EDI_findOverlay_checkboxMatchWord');
    if (checkboxMatchWord) {
    	set_EDI_findOverlay_options_matchWord(checkboxMatchWord.checked);
    	EDI_findOverlay_doSearch();
    }
}

function EDI_findOverlay_showSetter(showValue) {
    EDI_finalizeEdit();

    if (!get_EDI_findOverlay_show() && showValue) {
        EDI_findOverlay.style.visibility = '';
        EDI_findOverlay_searchResultPositionList = new UInt32List(256);
        
        let input = document.createElement('input');
        input.id = 'EDI_findOverlay_input_elementId';
        // 'change' needs to be the first event added so the 'Enter' keydown happens with proper timing
        input.addEventListener('change', EDI_findOverlay_input_onchange);
        input.addEventListener('keydown', EDI_findOverlay_input_onkeydown);
        input.addEventListener('blur', EDI_findOverlay_input_onblur);
        EDI_findOverlay.appendChild(input);
        
        let divCurrentOfTotal = document.createElement('div');
        let spanBlank = document.createElement('span');
        spanBlank.textContent = '1';
        spanBlank.id = 'EDI_findOverlay_current';
        divCurrentOfTotal.appendChild(spanBlank);
        let spanBlankOf = document.createElement('span');
        spanBlankOf.textContent = ' of ';
        divCurrentOfTotal.appendChild(spanBlankOf);
        let spanBlankOfBlank = document.createElement('span');
        spanBlankOfBlank.textContent = '10';
        spanBlankOfBlank.id = 'EDI_findOverlay_total';
        divCurrentOfTotal.appendChild(spanBlankOfBlank);
        EDI_findOverlay.appendChild(divCurrentOfTotal);
        
        let divPrevNext = document.createElement('div');
        let btnPrev = document.createElement('button');
        btnPrev.textContent = 'prev';
        btnPrev.id = 'EDI_findOverlay_prev';
        btnPrev.style.marginRight = '5px';
        let btnNext = document.createElement('button');
        btnNext.textContent = 'next';
        btnNext.id = 'EDI_findOverlay_next';
        btnPrev.addEventListener('click', EDI_btnPrev_onclick);
        btnNext.addEventListener('click', EDI_btnNext_onclick); 
        divPrevNext.appendChild(btnPrev);
        divPrevNext.appendChild(btnNext);
        EDI_findOverlay.appendChild(divPrevNext);
        
        let divOptions = document.createElement('div');
        let checkboxMatchWord = document.createElement('input');
	    checkboxMatchWord.type = 'checkbox';
	    checkboxMatchWord.id = 'EDI_findOverlay_checkboxMatchWord';
	    checkboxMatchWord.checked = Boolean(get_EDI_findOverlay_options_matchWord());
	    checkboxMatchWord.addEventListener('change', EDI_findOverlay_checkboxMatchWord_onchange);
	    divOptions.appendChild(checkboxMatchWord);
	    let label_for_checkboxMatchWord = document.createElement('label');
	    label_for_checkboxMatchWord.htmlFor = 'EDI_findOverlay_checkboxMatchWord';
	    label_for_checkboxMatchWord.textContent = 'matchWord';
	    divOptions.appendChild(label_for_checkboxMatchWord);
	    EDI_findOverlay.appendChild(divOptions);
        
        if (EDI_cursor_hasSelection()) {
        	EDI_finalizeEdit();
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
            let offset = small;
            let length = large - small;
            if (length <= 256) {
                input.value = EDI_decode_textonly(offset, length);
                EDI_findOverlay_doSearch();
            }
        }
    }
    else if (get_EDI_findOverlay_show() && !showValue) {
        EDI_findOverlay.style.visibility = 'hidden';
        EDI_findOverlay_searchResultPositionList = null;
        let input = document.getElementById('EDI_findOverlay_input_elementId');
        if (input && input.parentElement === EDI_findOverlay) {
        	input.removeEventListener('change', EDI_findOverlay_input_onchange);
            input.removeEventListener('keydown', EDI_findOverlay_input_onkeydown);
            input.removeEventListener('blur', EDI_findOverlay_input_onblur);
            EDI_findOverlay.removeChild(input);
        }
        let btnPrev = document.getElementById('EDI_findOverlay_prev');
        if (btnPrev) {
        	btnPrev.removeEventListener('click', EDI_btnPrev_onclick);
        }
        let btnNext = document.getElementById('EDI_findOverlay_next');
        if (btnNext) {
        	btnNext.removeEventListener('click', EDI_btnNext_onclick);
        }
        let checkboxMatchWord = document.getElementById('EDI_findOverlay_checkboxMatchWord');
        if (checkboxMatchWord) {
        	checkboxMatchWord.removeEventListener('change', EDI_findOverlay_checkboxMatchWord_onchange);
        }
        EDI_findOverlay.innerHTML = '';
    }

    set_EDI_findOverlay_show(showValue);
}

function EDI_btnPrev_onclick(/*event*/) {
	let spanCurrent = document.getElementById('EDI_findOverlay_current');
	if (!spanCurrent) return;
	
	let spanTotal = document.getElementById('EDI_findOverlay_total');
	if (!spanTotal) return;
	
	let current = parseInt(spanCurrent.textContent, 10);
	let total = parseInt(spanTotal.textContent, 10);
	
	if (current && total) {
		current--;
		if (current < 1 || current >= total) {
			if (total > 1) {
				current = total;
			}
			else {
				current = 1;
			}
		}
		spanCurrent.textContent = current;
	}
	else {
		spanCurrent.textContent = 'parseInt not successful?';
	}

    let index = current - 1;
    if (index >= 0 && index < total && index < EDI_findOverlay_searchResultPositionList.count) {
        let pos = EDI_findOverlay_searchResultPositionList.data[index];
        if (pos <= INTS[fEDI_textByteList_count]) {
            EDI_moveCursor_position(pos);
        }
    }
}

function EDI_btnNext_onclick() {
	let spanCurrent = document.getElementById('EDI_findOverlay_current');
	if (!spanCurrent) return;
	
	let spanTotal = document.getElementById('EDI_findOverlay_total');
	if (!spanTotal) return;
	
	let current = parseInt(spanCurrent.textContent, 10);
	let total = parseInt(spanTotal.textContent, 10);
	
	if (current && total) {
		current++;
		if (current > total || current < 1) {
			current = 1;
		}
		spanCurrent.textContent = current;
	}
	else {
		spanCurrent.textContent = 'parseInt not successful?';
	}

    let index = current - 1;
    if (index >= 0 && index < total && index < EDI_findOverlay_searchResultPositionList.count) {
        let pos = EDI_findOverlay_searchResultPositionList.data[index];
        if (pos <= INTS[fEDI_textByteList_count]) {
            EDI_moveCursor_position(pos);
        }
    }
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
    if (index < 0 || index > EDI_styleBuffer_count) {
        throw new RangeError(
            //`Invalid insertion index: index ${index} must be between 0 and current count ${EDI_styleBuffer_count}.`
        );
    }

    EDI_styleBuffer_ensureCapacityForInsertion(index, length);

    if (index !== EDI_styleBuffer_count) {
        EDI_styleBuffer_copyTo(EDI_styleBuffer, index, EDI_styleBuffer, index + length, EDI_styleBuffer_count - index);
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

    EDI_styleBuffer_count += length;
}
/**
 * Does not clear trailing information.
 * 
 * count === 0 immediately returns
 */
function EDI_styleBuffer_removeAt(index, count) {
    if (index > EDI_styleBuffer_count) { throw new Error('removeAt(...): index > EDI_styleBuffer_count'); }
    if (index + count > EDI_styleBuffer_count) { throw new Error('removeAt(...): index + count > EDI_styleBuffer_count'); }
    if (count === 0) { return; }

    if (index + count === EDI_styleBuffer_count) {
        let shiftableCount = EDI_styleBuffer_count - (index + count);
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
            EDI_styleBuffer_count - (index + count));
    }

    EDI_styleBuffer_count -= count;
}
function EDI_styleBuffer_ensureCapacityForInsertion(index, count) {
    // TODO: sparse insertions?
    const requiredCapacity = Math.max(EDI_styleBuffer_count + count, index);
    
    // If we already have enough capacity, do absolutely nothing
    if (requiredCapacity <= EDI_styleBuffer_capacity) {
        return;
    }

    let capacityNew = EDI_styleBuffer_capacity;

    // 1. Scale geometrically by 1.125x (current + current / 8)
    capacityNew = capacityNew + (capacityNew >> 3);

    // 2. Minimum growth step: Ensure it grows by at least 1024 bytes 
    //    so small files don't reallocate on every single keystroke.
    const minGrowth = EDI_styleBuffer_capacity + 1024;
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
    if (capacityNew < EDI_styleBuffer_capacity) {
        throw new Error('ensureCapacityForInsertion(...): Capacity overflowed or went negative');
    }

    // Allocate and copy EXACTLY ONCE
    let bytesNew = new Uint8Array(capacityNew);
    EDI_styleBuffer_copyTo(EDI_styleBuffer, 0, bytesNew, 0, EDI_styleBuffer_count);
    
    // Commit the changes to your global/module state
    EDI_styleBuffer = bytesNew;
    EDI_styleBuffer_capacity = capacityNew;
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
 * 'EDI_lineEndPositionList_UNSAFEinsertUNSAFE' is a "function" that is explicitly inlined in the 'EDI_state_setText_byteArray' function.
 * If you modify this function you may need to find the comments with 'EDI_lineEndPositionList_UNSAFEinsertUNSAFE' and update the explicitly inlined logic.
 * 
 * TODO: ensure all the parameters are encoded, especially because I'm noticing myself forgetting.
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
