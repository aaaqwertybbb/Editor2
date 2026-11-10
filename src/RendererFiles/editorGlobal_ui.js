/**
 * !!!!
 * Keep any variables in editorGlobal_edit.js at the top of the file.
 * !!!!
 */

/**
 * 
 * Google AI:
 * ==========
 * Seeing your full EDI_render_do structure changes the landscape completely.
 * Because your queue handles structural document mutations (InsertLtr, BackspaceRtl, Enter, SetText) alongside purely visual updates (Scroll, Cursor_n),
 * you cannot use a simplistic bitmask flag approach. A bitmask would destroy the chronological execution sequence required to keep your text state accurate
 * (e.g., you cannot accidentally process a cursor update before processing the character insertion that created its new position).
 * 
 * However, looking directly at your architecture reveals a major layout thrashing and compounding performance problem lurking within this while loop.
 * 
 * ...
 * 
 * If a user pastes text or hits a hotkey that queues up multiple events (e.g., [RemoveSelection, InsertLtr, Cursor_n, Scroll]),
 * your loop executes them sequentially inside a single frame.
 * 
 * If EDI_render_do_InsertLtr() modifies the DOM (adds or alters text div elements), and then the loop immediately moves to the next item EDI_render_do_Scroll() or EDI_drawCursor() and
 * reads viewport/element dimensions (getBoundingClientRect, offsetTop, scrollLeft), you will cause a massive Layout Thrash.
 * The browser is forced to halt JavaScript execution, calculate the fresh layout for the mutation, and repeat this cycle multiple times inside a single while loop pass.
 * 
 * ...
 * 
 * To keep your sequential integrity but achieve peak V8 execution speed, you should separate your state processing from your visual rendering.
 * 
 * Instead of letting the queue trigger heavy DOM layout mutations and reads interchangeably, split the execution into two localized passes:
 * 
 * 1. Pass 1 (The Loop): Drain the queue to mutate the text model, virtual state buffers, and flag what structural components need visual updates.
 * 2. Pass 2 (The Flush): Apply the concrete layout changes, draw the cursor once, and execute the scroll viewport updates in a strictly controlled, batch-optimized order.
 * 
 * We can use a localized bitmask internally just for the scope of a single frame update. This avoids duplicate visual paints and forces layout-reading actions to wait until layout-mutating actions have settled completely.
 * 
 * ...
 * ==========
 * 
 * ----
 * 
 * The scroll for the editor is extremely high overhead relative to the other scrolling UI in the app.
 * I've moved all the EDI_render_do and EDI_render_do_Scroll bytes to the INTS array
 * so there's one less array to look at.
 * And I've moved the related fEDI constants so that they're all the first entries in the INTS array itself.
 * I have no source for this to be completely honest.
 * I just have always wanted to do it based on intuition alone to see how it feels.
 * I need to actually measure it.
 * For all I know maybe you can read a byte so by forcing it into a uint32 you're making the CPU read more data overall. I have no idea.
 */
function EDI_render_do() {
    // Process everything in the queue until head catches up to tail
    while (INTS[fEDI_queueHead] !== INTS[fEDI_queueTail]) {
        // Read the item at the head and advance the head pointer safely
        const renderKind = EDI_renderKindBuffer[INTS[fEDI_queueHead] & BUFFER_MASK];
        INTS[fEDI_queueHead]++;

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
                EDI_render_do_ResetSyntaxHighlighting();
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
    
    INTS[fEDI_isRenderPending] = 0;
}

/**
 * Google AI:
 * ==========
 * This works beautifully if you get Scroll -> Scroll -> Scroll. The second and third scroll requests are skipped.
 * 
 * However, in a real text editor, browsers fire alternate event streams during continuous scrolling or mouse dragging. For example, you will frequently get a stream of events like this:
 * 
 * Because RenderKind_Cursor breaks the consecutive chain of RenderKind_Scroll items, your check fails to catch the duplicate.
 * Your ring buffer will rapidly fill up with alternating requests (Scroll -> Cursor -> Scroll -> Cursor).
 * When requestAnimationFrame(EDI_render_do) finally executes, it will process a bloated queue containing redundant operations,
 * completely defeating your optimization.
 * 
 * How to achieve absolute optimization
 * 
 * The Bitmask Implementation
 * ==========
 */
function EDI_render_request(renderKind) {
    // Check if the queue is empty
    if (INTS[fEDI_queueHead] !== INTS[fEDI_queueTail]) {
        // Get the last inserted item's index
        const lastIndex = (INTS[fEDI_queueTail] - 1) & BUFFER_MASK;
        // De-duplicate: if it's the same renderKind, skip adding it
        if (EDI_renderKindBuffer[lastIndex] === renderKind) {
            return;
        }
    }

    // Insert the item at the tail and advance the tail pointer
    EDI_renderKindBuffer[INTS[fEDI_queueTail] & BUFFER_MASK] = renderKind;
    INTS[fEDI_queueTail]++;
    
    if (INTS[fEDI_isRenderPending] === 0) {
        INTS[fEDI_isRenderPending] = 1;
        requestAnimationFrame(EDI_render_do);
    }
}

function EDI_resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;

    // 1. Get the real bounding dimensions of your visible viewport frame
    const viewportRect = EDI_viewport.getBoundingClientRect();
    const viewWidth = viewportRect.width;
    const viewHeight = viewportRect.height;

    // Define a fixed layout width for your gutter
    const gutterLayoutWidth = 60;

    // --- 2. CONFIG DIGEST FOR GUTTER CANVAS ---
    const gutterCanvas = EDI_gutter_canvas;
    // Set the CSS display size (how much room it occupies on screen)
    gutterCanvas.style.width = gutterLayoutWidth + 'px';
    gutterCanvas.style.height = viewHeight + 'px';
    // Set the internal hardware drawing resolution (multiplied by DPR)
    gutterCanvas.width = gutterLayoutWidth * dpr;
    gutterCanvas.height = viewHeight * dpr;

    // --- 3. CONFIG DIGEST FOR TEXT CANVAS ---
    const textCanvas = document.getElementById('EDI_text_canvas');
    const textLayoutWidth = viewWidth - gutterLayoutWidth;
    textCanvas.style.width = textLayoutWidth + 'px';
    textCanvas.style.height = viewHeight + 'px';
    textCanvas.width = textLayoutWidth * dpr;
    textCanvas.height = viewHeight * dpr;

    // --- 4. SCALE THE DRAWING CONTEXTS ---
    // This step ensures your drawing coordinates (like fillText X/Y) 
    // remain working in standard layout pixels, while the engine handles the high-DPI pixel math
    const ctxGutter = gutterCanvas.getContext('2d');
    ctxGutter.scale(dpr, dpr);
    // Re-apply your styles here since changing width/height resets canvas states!
    ctxGutter.font = '16px monospace';
    ctxGutter.textBaseline = 'top';
    ctxGutter.fillStyle = '#007036';
    ctxGutter.fillRect(0, 0, gutterCanvas.width, gutterCanvas.height); 
    ctxGutter.fillStyle = '#858585';
    //ctxGutter.;

    const ctxText = textCanvas.getContext('2d');
    ctxText.scale(dpr, dpr);
    ctxText.font = '16px monospace';
    ctxText.textBaseline = 'top';
    ctxText.fillStyle = '#ffffff';
    


    const metrics = ctxGutter.measureText('M'); // 'M' or '1' are great standard height references
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    //console.log('The exact height of the text is:', textHeight);

    const fontHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const linePadding = 6; // Total padding between lines
    INTS[fEDI_lineHeight] = fontHeight + linePadding;



    // The exact pixel width of every single character in a monospace font
    const charWidth = ctxText.measureText('M').width; 
    EDI_characterWidth = charWidth;

    // Run once during setup / font configuration
    //ctx.font = '16px monospace';

    //const metrics = ctx.measureText('M');
    const fontActualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    // If local_lineHeight is 24px and fontActualHeight is 14px, your vertical midpoint padding is 12px

    INTS[fEDI_lastReadNumber_offsetWidth] = Math.floor(EDI_text.offsetWidth);
    INTS[fEDI_lastReadNumber_offsetHeight] = Math.floor(EDI_text.offsetHeight);

    INTS[fEDI_virtualCount] = Math.ceil(INTS[fEDI_lastReadNumber_offsetHeight] / INTS[fEDI_lineHeight]);

    //EDI_character_count_that_fits_view = Math.ceil(INTS[fEDI_lastReadNumber_offsetWidth] / EDI_characterWidth);



    // --- CONFIG DIGEST FOR CURSOR CANVAS ---
    const cursorCanvas = document.getElementById('EDI_cursor_canvas');
    cursorCanvas.style.width = textLayoutWidth + 'px';
    cursorCanvas.style.height = viewHeight + 'px';
    cursorCanvas.width = textLayoutWidth * dpr;
    cursorCanvas.height = viewHeight * dpr;

    const ctxCursor = cursorCanvas.getContext('2d');
    ctxCursor.scale(dpr, dpr);
    
    // Set your editor's cursor color profile
    ctxCursor.fillStyle = '#528bff'; // A nice modern blue cursor, or white (#ffffff)

    EDI_lineStringCache = new Array(INTS[fEDI_virtualCount]);
    EDI_line_NUMBER_StringCache = new Array(INTS[fEDI_virtualCount]);
    INTS[fEDI_ArrayFrom_textElement_children_length] = INTS[fEDI_virtualCount];

    const aaa = INTS[fEDI_virtualCount];
    for (let i = 0; i < aaa; i++) {
        EDI_lineStringCache[i] = {
            // TODO: Maybe pre-allocate 'sourceIndexMap' to something that reduces extreme amounts of initial resizing of the array if that even is a case
            // TODO: Maybe now that you have 'sourceIndexMap: []' you might benefit from caching some in a global pool rather than pooling the current ones in the spans wait this is for the line that's not an issue.
            //     - [ ] you have the 'span' allocation which is text/color that you are re-using the ones that existed within 'spans' array from the previous render.
            //     - [ ] sourceIndexMap is always re-used though?
            //     - [ ] (the spans array is also always re-used)
            //     - [ ] you get this to work for insert and then you're done for the day
            spans: [],
            // TODO: This means if you modify something on a line you gotta modify all this cached information...
            // character index of the tab on the line then the next index is the tabWidth of that specific tab
            //
            // TODO: typed array?
            //
            // TODO: If you have to read this by starting from col 0 and looping then you could just not store the tabWidth and calculate it as needed but that would require modulo operations.
            tab_twoIndices_oneImplicitObject_startCol_tabWidth: []
        };
        //EDI_line_NUMBER_StringCache[i] = 0;
    }
    
    EDI_render_force_fullscreen_redraw();
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

function EDI_render_do_Scroll() {
    const local_lineHeight = INTS[fEDI_lineHeight];
    INTS[fEDI_virtualIndexLine] = EDI_lastReadNumber_scrollTop / local_lineHeight | 0;

    const local_prevVli = INTS[fEDI_ONSCROLLvirtualIndexLine];
    const local_currVli = INTS[fEDI_virtualIndexLine];
    INTS[fEDI_ONSCROLLvirtualIndexLine] = local_currVli;

    if (INTS[fEDI_cursor_editKind] !== EditKind_None) {
        EDI_finalizeEdit();
    }

    let diff = local_currVli - local_prevVli;

    const local_ArrayFrom_textElement_children_length = INTS[fEDI_ArrayFrom_textElement_children_length];
    let new_lowerBound = 0;

    if (diff !== 0) {
        if (diff >= local_ArrayFrom_textElement_children_length || diff <= -local_ArrayFrom_textElement_children_length) {
            new_lowerBound = local_currVli;
            diff = local_ArrayFrom_textElement_children_length; // Bound the loop run to the size of your screen viewport
        }
        else if (diff > 0) {
            new_lowerBound = local_prevVli + local_ArrayFrom_textElement_children_length;
            INTS[fEDI_ringBuffer_indexZero] = (INTS[fEDI_ringBuffer_indexZero] + diff) % local_ArrayFrom_textElement_children_length;
        }
        else {
            new_lowerBound = local_currVli;
            diff *= -1;
            INTS[fEDI_ringBuffer_indexZero] = (INTS[fEDI_ringBuffer_indexZero] - diff + local_ArrayFrom_textElement_children_length) % local_ArrayFrom_textElement_children_length;
        }
    }
    else {
        // If diff is 0 (like a pure horizontal scroll), no newly visible lines need decoding
        new_lowerBound = 0;
        diff = 0;
    }

    const local_EDI_lineEndPositionList_data = EDI_lineEndPositionList_data;
    const local_EDI_lineEndPositionList_count = INTS[fEDI_lineEndPositionList_count];

    // If you intend to use the variables 'new_lineStart' or 'new_lineEnd': Important detail to consider: the lines that are >= INTS[fEDI_lineEndPositionList_count] will continually increment new_lineStart by 1 So if you expect this to accurately represent the EOF position when it is in view, it probably does NOT.
    let new_lineStart = 0;
    let new_lineEnd = -1;
    if (new_lowerBound < local_EDI_lineEndPositionList_count && new_lowerBound !== 0) {
        new_lineEnd = local_EDI_lineEndPositionList_data[new_lowerBound - 1];
    }

    const local_bytes = EDI_textByteList_bytes;
    const local_styles = EDI_styleBuffer; // Your matching parallel array

    const local_EDI_decoder_CUSTOM = EDI_decoder_CUSTOM;

    const ctxText = EDI_text_canvas.getContext('2d');

    const lineCount = INTS[fEDI_lineEndPositionList_count];
    
    const view_startLineIndex = INTS[fEDI_virtualIndexLine];
    const view_upperLineIndexExclusive = view_startLineIndex + INTS[fEDI_virtualCount];

    const topPadding = EDI_textTopPadding;

    const cache = EDI_lineStringCache;
    const cacheNUMBERS = EDI_line_NUMBER_StringCache;
    
    let original_vertical = -(EDI_lastReadNumber_scrollTop % local_lineHeight);
    let vertical = original_vertical;

    const new_loopLimit = new_lowerBound + diff;

    // 3. Let your context handle the scroll natively inside the static window
    const ctxGutter = EDI_gutter_canvas.getContext('2d');

    ctxGutter.clearRect(0, 0, EDI_gutter_canvas.width, EDI_gutter_canvas.height);

    ctxGutter.fillStyle = 'rgb(30, 45, 45)';
    ctxGutter.fillRect(0, 0, EDI_gutter_canvas.width, EDI_gutter_canvas.height); 
    ctxGutter.fillStyle = '#858585';

    ctxText.clearRect(0, 0, EDI_text_canvas.width, EDI_text_canvas.height);

    let ringBufferIndex = INTS[fEDI_ringBuffer_indexZero] - 1;
    
    // Render pure line numbers
    for (let i = view_startLineIndex; i < view_upperLineIndexExclusive; i++) {
        // (faster than modulo given this context)
        ringBufferIndex++;
        if (ringBufferIndex >= local_ArrayFrom_textElement_children_length) {
            ringBufferIndex = 0;
        }

        const lineObject = cache[ringBufferIndex];
        const lineSpans = lineObject.spans;

        if (i >= new_lowerBound && i < new_loopLimit) {
            // THIS WILL CALCULATE THE TEXT OF THE LINENUMBER AND THE LINE OF TEXT ITSELF
            // AND ONLY DO SO FOR THE NEWLY SCROLLED INTO VIEW LINES
                
                const indexLine = i;
                new_lineStart = new_lineEnd + 1;
                if (indexLine < lineCount) {
                    cacheNUMBERS[ringBufferIndex] = String(indexLine + 1);
                    new_lineEnd = local_EDI_lineEndPositionList_data[indexLine];
                } else {
                    cacheNUMBERS[ringBufferIndex] = '~';
                    new_lineEnd = new_lineStart;
                }

                let spanIndex = 0;
                    
                // IF THE LINE CONTAINS CHARACTERS
                if (new_lineStart !== new_lineEnd) {
                    // Execute a single loop invocation for the entire line text data
                    spanIndex = local_EDI_decoder_CUSTOM.decodeLineTokens(
                        new_lineStart,
                        new_lineEnd,
                        lineObject,
                        spanIndex,
                        EDI_tokenColors,
                        local_bytes,
                        local_styles
                    );
                }
                // FIXED BOUNDARY: IF THE LINE IS COMPLETELY EMPTY (0 Bytes)
                else {
                    if (spanIndex < lineSpans.length) {
                        const existingSpan = lineSpans[spanIndex++];
                        existingSpan.text = '';
                        existingSpan.color = EDI_tokenColors[0] || '#ffffff'; // Fallback to standard color
                    }
                    else {
                        lineSpans.push({
                            text: '',
                            color: EDI_tokenColors[0] || '#ffffff' // Fallback to standard color
                        });
                        spanIndex++;
                    }
                }

            lineSpans.length = spanIndex;
        }

        ctxGutter.fillText(cacheNUMBERS[ringBufferIndex], 0, vertical + topPadding);
        
        // TODO: Horizontal virtualization

        // --- 2. DRAW SPANS CONSECUTIVELY USING THE MONOSPACE GRID ---
        // Subtract the horizontal scroll position from your starting x offset
        let currentX = -EDI_lastReadNumber_scrollLeft; // Track the running horizontal offset for the line row
        const yCoord = vertical + topPadding;

        for (let j = 0; j < lineSpans.length; j++) {
            const span = lineSpans[j];
            ctxText.fillStyle = span.color;
            ctxText.fillText(span.text, currentX, yCoord);
            
            // Fast cell tracking: add characters multiplied by character width
            currentX += span.text.length * EDI_characterWidth;

            if (currentX > INTS[fEDI_lastReadNumber_offsetWidth]) {
                break;
            }
        }

        vertical += local_lineHeight;
    }

    // I'm just experimenting because tons of variables are shared.
    //EDI_render_SelectionAndCursor();
    const cursorCanvas = EDI_cursor_canvas;
    const ctx = cursorCanvas.getContext('2d');
    ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

    // --- STEP 1: RENDER SELECTION BOX BACKGROUND SPANS ---
    // (Assuming you track a selection range from anchorLine/Col to focusLine/Col)
    ctx.fillStyle = 'rgba(197, 198, 140, 0.25)'; // Highlight tint color

    if (EDI_cursor_hasSelection()) {
        vertical = original_vertical;
        // (Note: Make sure your EDI_createStyleForSelection utility also takes horizontal scrolling into account when drawing selection backgrounds!)
        EDI_createStyleForSelection(ctx, vertical, local_lineHeight, view_startLineIndex);
    }

    // --- STEP 2: RENDER ACTIVE SOLID CURSOR LINE ---
    ctx.fillStyle = '#f2a72f'; // Solid cursor accent color
    const cursorLine = INTS[fEDI_cursor_indexLine];
    if (cursorLine >= view_startLineIndex && cursorLine < view_upperLineIndexExclusive) {
        const cursorX = (INTS[fEDI_cursorVisualColumnIndex] * EDI_characterWidth) - EDI_lastReadNumber_scrollLeft;
        const cursorY = -(EDI_lastReadNumber_scrollTop % local_lineHeight) + ((cursorLine - view_startLineIndex) * local_lineHeight);
        
        EDI_cursor_cursorTranslateXValue = cursorX;
        ctx.fillRect(cursorX, cursorY, 2, local_lineHeight);
    }
}

function EDI_render_Gutter(ringBufferIndex) {
    const local_lineHeight = INTS[fEDI_lineHeight];

    // 3. Let your context handle the scroll natively inside the static window
    const ctxGutter = EDI_gutter_canvas.getContext('2d');
    ctxGutter.clearRect(0, 0, EDI_gutter_canvas.width, EDI_gutter_canvas.height);

    ctxGutter.fillStyle = 'rgb(30, 45, 45)';
    ctxGutter.fillRect(0, 0, EDI_gutter_canvas.width, EDI_gutter_canvas.height); 
    ctxGutter.fillStyle = '#858585';

    let lineIndex = INTS[fEDI_virtualIndexLine];
    
    // This remainder calculation handles the smooth pixel-by-pixel shift 
    // without moving the physical HTML canvas element!
    let vertical = -(EDI_lastReadNumber_scrollTop % local_lineHeight);

    const lineCount = INTS[fEDI_lineEndPositionList_count];
    const upperLineIndexExclusive = lineIndex + INTS[fEDI_virtualCount];
    const splitIndex = Math.min(upperLineIndexExclusive, lineCount);
    const local_EDI_textTopPadding = EDI_textTopPadding;

    //const original_ringBufferIndex = ringBufferIndex;
    //const local_ArrayFrom_textElement_children_length = INTS[fEDI_ArrayFrom_textElement_children_length];

    // Render pure line numbers
    for (let i = lineIndex; i < splitIndex; i++) {
        //// (faster than modulo given this context)
        //ringBufferIndex++;
        //if (ringBufferIndex >= local_ArrayFrom_textElement_children_length) {
        //    ringBufferIndex = 0;
        //}

        ctxGutter.fillText(i + 1, 0, vertical + local_EDI_textTopPadding);
        vertical += local_lineHeight;
    }

    
    //for (let i = lineIndex; i < splitIndex; i++) {
    //    
    //}

    // Render buffer tildes
    for (let i = splitIndex; i < upperLineIndexExclusive; i++) {
        ctxGutter.fillText('~', 0, vertical + local_EDI_textTopPadding);
        vertical += local_lineHeight;
    }
}

function EDI_render_TextContent(ringBufferIndex, lowerBound, loopLimit, lineStart, lineEnd) {
    const ctxText = EDI_text_canvas.getContext('2d');
    ctxText.clearRect(0, 0, EDI_text_canvas.width, EDI_text_canvas.height);

    const local_lineHeight = INTS[fEDI_lineHeight];
    const lineCount = INTS[fEDI_lineEndPositionList_count];
    
    const startLineIndex = INTS[fEDI_virtualIndexLine];
    const upperLineIndexExclusive = Math.min(startLineIndex + INTS[fEDI_virtualCount], lineCount);

    let viewportY = -(EDI_lastReadNumber_scrollTop % local_lineHeight);
    const topPadding = EDI_textTopPadding;

    const local_EDI_lineEndPositionList_data = EDI_lineEndPositionList_data;
    const local_EDI_decoder_CUSTOM = EDI_decoder_CUSTOM;
    const local_bytes = EDI_textByteList_bytes;
    const local_styles = EDI_styleBuffer; // Your matching parallel array
    const cache = EDI_lineStringCache;

    let virtualIndex = -1;

    const original_ringBufferIndex = ringBufferIndex;
    const local_ArrayFrom_textElement_children_length = INTS[fEDI_ArrayFrom_textElement_children_length];

    // calculate the text of the newly scrolled into view lines
    const local_loopLimit = loopLimit;
    for (let indexLine = lowerBound; indexLine < local_loopLimit; ++indexLine) {
        // (faster than modulo given this context)
        ringBufferIndex++;
        if (ringBufferIndex >= local_ArrayFrom_textElement_children_length) {
            ringBufferIndex = 0;
        }

        lineStart = lineEnd + 1;
        if (indexLine < lineCount) {
            lineEnd = local_EDI_lineEndPositionList_data[indexLine];
        } else {
            lineEnd = lineStart;
        }

        let lineSpans = [];
            
        // IF THE LINE CONTAINS CHARACTERS
        if (lineStart !== lineEnd) {
            let currentTokenStart = lineStart;
            let currentTokenId = local_styles[lineStart];
            let currentLineColumn = 0; 
            const tabSize = 4;

            const pushExpandedToken = (startByte, endByte, tokenId) => {
                const rawStr = local_EDI_decoder_CUSTOM.decodeRange(local_bytes, startByte, endByte);
                //const rawStr = local_EDI_decoder.decode(local_bytes.subarray(startByte, endByte));
                let expandedStr = '';
                for (let charIndex = 0; charIndex < rawStr.length; charIndex++) {
                    const char = rawStr[charIndex];
                    if (char === '\t') {
                        const spacesNeeded = tabSize - (currentLineColumn % tabSize);
                        expandedStr += ' '.repeat(spacesNeeded);
                        currentLineColumn += spacesNeeded;
                    } else {
                        expandedStr += char;
                        currentLineColumn++;
                    }
                }
                lineSpans.push({ text: expandedStr, color: EDI_tokenColors[tokenId] });
            };

            for (let byteIndex = lineStart + 1; byteIndex < lineEnd; byteIndex++) {
                const styleId = local_styles[byteIndex];
                if (styleId !== currentTokenId) {
                    pushExpandedToken(currentTokenStart, byteIndex, currentTokenId);
                    currentTokenStart = byteIndex;
                    currentTokenId = styleId;
                }
            }
            pushExpandedToken(currentTokenStart, lineEnd, currentTokenId);
        }
        // FIXED BOUNDARY: IF THE LINE IS COMPLETELY EMPTY (0 Bytes)
        else {
            lineSpans.push({
                text: '',
                color: EDI_tokenColors[0] || '#ffffff' // Fallback to standard color
            });
        }
        
        cache[ringBufferIndex] = lineSpans; // Properly cached structure!

        //vertical += local_lineHeight;
    }

    lineStart = 0;
    lineEnd = -1;
    if (startLineIndex < lineCount && startLineIndex !== 0) {
        lineEnd = local_EDI_lineEndPositionList_data[startLineIndex - 1];
    }

    ringBufferIndex = INTS[fEDI_ringBuffer_indexZero] - 1;

    for (let i = startLineIndex; i < upperLineIndexExclusive; i++) {
        
        // (faster than modulo given this context)
        ringBufferIndex++;
        if (ringBufferIndex >= local_ArrayFrom_textElement_children_length) {
            ringBufferIndex = 0;
        }

        lineStart = lineEnd + 1;
        if (i < lineCount) {
            lineEnd = local_EDI_lineEndPositionList_data[i];
        } else {
            lineEnd = lineStart;
        }

        // --- 1. RESOLVE TOKEN SLICES FROM THE CACHE ---
        let lineSpans = cache[ringBufferIndex];
        if (lineSpans === undefined) {
            
        }

        // --- 2. DRAW SPANS CONSECUTIVELY USING THE MONOSPACE GRID ---
        let currentX = 0; // Track the running horizontal offset for the line row
        const yCoord = viewportY + topPadding;

        for (let j = 0; j < lineSpans.length; j++) {
            const span = lineSpans[j];
            ctxText.fillStyle = span.color;
            ctxText.fillText(span.text, currentX, yCoord);
            
            // Fast cell tracking: add characters multiplied by character width
            currentX += span.text.length * EDI_characterWidth;
        }

        viewportY += local_lineHeight;
    }
}

function EDI_render_do_Clear() {
    //EDI_drawCursor(/*NOTscrollCursorIntoView*/ false);
    //EDI_clearSelectionStyle();
    // TODO: Clear the ring buffer state?
    // TODO: What does the above todo mean? "TODO: Clear the ring buffer state?"
}

function EDI_render_do_SetText() {
    EDI_render_do_Clear();

    update_verticalVirtualizationBoundary();
    EDI_drawGutter_Width(INTS[fEDI_lineEndPositionList_count]);
    EDI_drawHorizontalScrollbar();
    EDI_render_force_fullscreen_redraw();
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
    //let EDI_on_tab_string = EDI_decoder.decode(EDI_on_tab_bytes);
    let EDI_on_tab_string = '    '; // you need spaces for the UI to render correctly, regardless of if user has tabs or spaces

    // TODO: create 'EDI_on_tab_string' based on the amount of remaining eventCount to be drawn.
    while (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        INTS[fEDI_cursor_edit_eventCount_drawn]++;
        // TODO: For a large viewport you're iterations checking lines that aren't even in view i.e.: consider ctrl+a
        for (var lineI = startingIndex; lineI >= SMALL_lineAndColumnIndices_indexLine; lineI--) {

            // Draw the line to reflect the edit, if it is being currently shown on screen.
            // TODO: Use NEXT if the lines are one after another?
            
            // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
            let ringBufferIndex = lineI - INTS[fEDI_virtualIndexLine];
            if (ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex < 0) ringBufferIndex = -1;
            else ringBufferIndex = (ringBufferIndex + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

            if (ringBufferIndex >= 0) {
                EDI_lineStringCache[ringBufferIndex].spans.unshift({ text: EDI_on_tab_string, color: EDI_tokenColors[0] });
                // TODO: When inserting a '\t' due to on tab being tabs you need to track the col and width in the lineObject...
                // TODO: when inserting ANYTHING you need to update any existing tabs on the line their column position the even indices.
            }
        }

        // # Draw the cursor
        //EDI_createStyleForSelection_indentMore();
    }

    //// 6. Request a canvas redraw layout frame pass to force the changes onto the screen
    EDI_render_request(RenderKind_Scroll);
    //EDI_render_TextContent();
    //EDI_render_Cursor();
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
                let c = String.fromCharCode(EDI_textByteList_bytes[line_start + i]); // TODO: this should be using the bytes themselves no reason to use 'fromCharCode'
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

            let targetSpanIndex = 0;
            let runningColumnIdx = 0;
            let targetSpan = null;
            let relativeIndex = 0;
            let remainingCharacterRemovals = innerRemoveCount;

            // 1. Target the specific line row index where the typing is taking place
            const activeLine = lineI;

            // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
            let ringBufferIndex = activeLine - INTS[fEDI_virtualIndexLine];
            if (ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex < 0) ringBufferIndex = -1;
            else ringBufferIndex = (ringBufferIndex + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];
            if (ringBufferIndex < 0) {
                continue;
            }

            let lineObject = EDI_lineStringCache[ringBufferIndex];
            let lineSpans = lineObject.spans;

            // 2. Determine the column position where the *first character of this edit burst* began
            const editStartColumn = 0;

            // Find the precise column location of the characters we are about to remove right now
            const currentEditColumn = 0;
            let isAtEndOfLine = false;

            // 3. Scan the cached spans to find where currentEditColumn lands
            for (let i = 0; i < lineSpans.length; i++) {
                const span = lineSpans[i];
                const spanLength = span.text.length;

                if (currentEditColumn >= runningColumnIdx && currentEditColumn < runningColumnIdx + spanLength) {
                    targetSpanIndex = i;
                    targetSpan = span;
                    relativeIndex = currentEditColumn - runningColumnIdx;
                    
                    // If the cursor hits exactly between two spans, your rule dictates targeting 
                    // the left span at its trailing length index. We break early to lock onto it.
                    break;
                }
                runningColumnIdx += spanLength;
                if (currentEditColumn === runningColumnIdx && i === lineSpans.length - 1) { // TODO: This if statement isn't well understood. I had 'currentEditColumn === runningColumnIdx' alone until I had a case that needed 'i === lineSpans.length - 1'... TODO: look into this (I just don't have the energy right now).
                    isAtEndOfLine = true;
                }
            }

            if (targetSpan === null) {
                if (!isAtEndOfLine) {
                    throw new Error();
                }
                else {
                    targetSpanIndex = lineSpans.length;

                    // NOTE: is undefined until 'if (isAtEndOfLine)' block runs
                    //targetSpan = lineSpans[targetSpanIndex];

                    relativeIndex = 0;
                }
            }

            while (remainingCharacterRemovals > 0) {
                //INTS[fEDI_cursor_edit_eventCount_drawn] = INTS[fEDI_cursor_edit_eventCount_occurred];
                // you can't do the INTS[fEDI_cursor_edit_eventCount_drawn] immediately cause you need to determine how much of the current span can actually be deleted then move to the next span etc...
                
                if (isAtEndOfLine) {
                    throw new Error();
                }

                // 4. If we successfully isolated the text slice segment inside the cache, modify it
                const possibleCharacterRemovals = targetSpan.text.length - relativeIndex;
                const actualCharacterRemovals = remainingCharacterRemovals <= possibleCharacterRemovals ? remainingCharacterRemovals : possibleCharacterRemovals;

                // TODO: are you missing checks for whether the target span is ''?

                // ...the text inline directly into the string reference inside the cache array frame
                if (actualCharacterRemovals === targetSpan.text.length && lineSpans.length > 1) {
                    lineSpans.splice(targetSpanIndex, 1);
                }
                else {
                    targetSpan.text = targetSpan.text.slice(0, relativeIndex) + targetSpan.text.slice(relativeIndex + actualCharacterRemovals);
                }
                
                remainingCharacterRemovals -= actualCharacterRemovals;

                if (remainingCharacterRemovals > 0) {
                    if (targetSpanIndex < lineSpans.length) {
                        targetSpan = lineSpans[targetSpanIndex];
                        relativeIndex = 0;
                    }
                    else {
                        isAtEndOfLine = true;
                    }
                }
            }
        }

        /////////////////////// P_3
        INTS[fEDI_cursor_DRAWN_selectionAnchor] = INTS[fEDI_cursor_selectionAnchor];
        INTS[fEDI_cursor_DRAWN_selectionEnd] = INTS[fEDI_cursor_selectionEnd];
        /////////////////////// P_3
    }

    // 6. Request a canvas redraw layout frame pass to force the changes onto the screen
    EDI_render_request(RenderKind_Scroll);
    //EDI_render_TextContent();
    //EDI_render_Cursor();
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
            linesInsertedCount = INTS[fEDI_cursor_EDI_duplication_totalLineEndCount];
        }
        else if (INTS[fEDI_cursor_editKind] === EditKind_Paste) {
            INTS[fEDI_cursor_edit_eventCount_drawn]++;
            byteArray = EDI_cursor_EDI_paste_clipboardContent_bytes;
            insert_character_count = EDI_cursor_EDI_paste_clipboardContent_string.length;
            linesInsertedCount = INTS[fEDI_cursor_EDI_paste_clipboardContent_totalLineEndCount];
        }

        // 1. Target the specific line row index where the typing is taking place
        const activeLine = INTS[fEDI_cursor_indexLine];

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let activeLine_ringBufferIndex = activeLine - INTS[fEDI_virtualIndexLine];
        if (activeLine_ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length] || activeLine_ringBufferIndex < 0) activeLine_ringBufferIndex = -1;
        else activeLine_ringBufferIndex = (activeLine_ringBufferIndex + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];
        if (activeLine_ringBufferIndex < 0) { return; } // line is not in viewport

        let lineObject = EDI_lineStringCache[activeLine_ringBufferIndex];
        let lineSpans = lineObject.spans;

        // 2. Determine the column position where the *first character of this edit burst* began
        // We use indexColumn minus the absolute total length of characters typed in this current edit session
        const editStartColumn = INTS[fEDI_cursor_indexColumn];// - INTS[fEDI_cursor_editLength_characters];
        
        // Find the precise column location of the characters we are about to insert right now
        const currentEditColumn = editStartColumn;// + INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue];

        let runningColumnIdx = 0;
        let targetedSpan = null;
        let relativeInsertIndex = 0;

        // 3. Scan the cached spans to find where currentEditColumn lands
        for (let i = 0; i < lineSpans.length; i++) {
            const span = lineSpans[i];
            const spanLength = span.text.length;

            // If the cursor lands completely inside this span, or exactly on its trailing right edge
            if (currentEditColumn >= runningColumnIdx && currentEditColumn <= runningColumnIdx + spanLength) {
                targetedSpan = span;
                relativeInsertIndex = currentEditColumn - runningColumnIdx;
                
                // If the cursor hits exactly between two spans, your rule dictates targeting 
                // the left span at its trailing length index. We break early to lock onto it.
                break;
            }
            runningColumnIdx += spanLength;
        }

        // 4. If we successfully isolated the text slice segment inside the cache, modify it
        if (targetedSpan !== null) {
            //// Decode only the new slice of un-drawn keys typed during this frame frame burst
            //const freshlyTypedString = EDI_decoder.decode(
            //    EDI_cursor_textInsertionBuffer.subarray(
            //        INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue], 
            //        INTS[fEDI_cursor_editLength_characters]
            //    )
            //);
//
            //// Splice the text inline directly into the string reference inside the cache array frame
            //targetedSpan.text = 
            //    targetedSpan.text.slice(0, relativeInsertIndex) + 
            //    freshlyTypedString + 
            //    targetedSpan.text.slice(relativeInsertIndex);
        }

        // 5. Commit the continuation value forward so the next frame knows where to pick up
        INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue] = INTS[fEDI_cursor_editLength_characters];

        
        if (targetedSpan === null) {
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
            targetedSpan: targetedSpan,
            relativeInsertIndex: relativeInsertIndex,
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
                    EDI_duplicate_and_paste_writeWord(wordLength, EDI_decoder.decode(byteArray.subarray(wordStart, wordStart + wordLength)), functionState);
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

    //// 6. Request a canvas redraw layout frame pass to force the changes onto the screen
    EDI_render_request(RenderKind_Scroll);
    //EDI_render_TextContent();
    //EDI_render_Cursor();
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

function EDI_duplicate_and_paste_writeWord(wordLength, word, functionState) {

    //// Decode only the new slice of un-drawn keys typed during this frame frame burst
    //const freshlyTypedString = EDI_decoder.decode(
    //    EDI_cursor_textInsertionBuffer.subarray(
    //        INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue], 
    //        INTS[fEDI_cursor_editLength_characters]
    //    )
    //);
//
    //// Splice the text inline directly into the string reference inside the cache array frame
    functionState.targetedSpan.text = 
        functionState.targetedSpan.text.slice(0, functionState.relativeInsertIndex) + 
        word + 
        functionState.targetedSpan.text.slice(functionState.relativeInsertIndex);

    //targetedSpan.text = ;
    //w_div.firstChild.insertData(INTS[fEDI_w_indexColumn_SpanTextContentRelative], word);

    INTS[fEDI_cursor_indexColumn] += wordLength;
    INTS[fEDI_cursorVisualColumnIndex] += wordLength;
    INTS[fEDI_w_indexColumn_SpanTextContentRelative] += wordLength;
}

function EDI_render_do_TabKey() {
    if (INTS[fEDI_cursor_editKind] !== EditKind_Tab) {
        return;
    }

    if (INTS[fEDI_cursor_edit_eventCount_drawn] >= INTS[fEDI_cursor_edit_eventCount_occurred]) {
        return;
    }

    // You need spaces when updating the cache otherwise they won't render correctly.
    const EDI_on_tab_string = '    ';

    while (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        INTS[fEDI_cursor_edit_eventCount_drawn]++;

        // 1. Target the specific line row index where the typing is taking place
        const activeLine = INTS[fEDI_cursor_indexLine];

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let activeLine_ringBufferIndex = activeLine - INTS[fEDI_virtualIndexLine];
        if (activeLine_ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length] || activeLine_ringBufferIndex < 0) activeLine_ringBufferIndex = -1;
        else activeLine_ringBufferIndex = (activeLine_ringBufferIndex + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];
        if (activeLine_ringBufferIndex < 0) { return; } // line is not in viewport
        
        const lineObject = EDI_lineStringCache[activeLine_ringBufferIndex];
        const lineSpans = lineObject.spans;

        // TODO: When inserting a '\t' due to on tab being tabs you need to track the col and width in the lineObject...

        // 2. Determine the column position where the *first character of this edit burst* began
        // We use indexColumn minus the absolute total length of characters typed in this current edit session
        const editStartColumn = INTS[fEDI_cursor_indexColumn] - INTS[fEDI_cursor_editLength_characters];
        
        // Find the precise column location of the characters we are about to insert right now
        const currentEditColumn = editStartColumn + INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue];

        let runningColumnIdx = 0;
        let targetedSpan = null;
        let relativeInsertIndex = 0;

        // 3. Scan the cached spans to find where currentEditColumn lands
        for (let i = 0; i < lineSpans.length; i++) {
            const span = lineSpans[i];
            const spanLength = span.text.length;

            // If the cursor lands completely inside this span, or exactly on its trailing right edge
            if (currentEditColumn >= runningColumnIdx && currentEditColumn <= runningColumnIdx + spanLength) {
                targetedSpan = span;
                relativeInsertIndex = currentEditColumn - runningColumnIdx;
                
                // If the cursor hits exactly between two spans, your rule dictates targeting 
                // the left span at its trailing length index. We break early to lock onto it.
                break;
            }
            runningColumnIdx += spanLength;
        }

        // 4. If we successfully isolated the text slice segment inside the cache, modify it
        if (targetedSpan !== null) {
            // Decode only the new slice of un-drawn keys typed during this frame frame burst
            const freshlyTypedString = INTS[fEDI_cursor_edit_eventCount_drawn] === 1
                ? (INTS[fEDI_cursor_editLengthVisual] === 4 ? EDI_on_tab_string : ' '.repeat(INTS[fEDI_cursor_editLengthVisual]))
                : EDI_on_tab_string;

            // Splice the text inline directly into the string reference inside the cache array frame
            targetedSpan.text = 
                targetedSpan.text.slice(0, relativeInsertIndex) + 
                freshlyTypedString + 
                targetedSpan.text.slice(relativeInsertIndex);
        }

        // 5. Commit the continuation value forward so the next frame knows where to pick up
        INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue] = INTS[fEDI_cursor_editLength_characters];

        // 6. Request a canvas redraw layout frame pass to force the changes onto the screen
        EDI_render_request(RenderKind_Scroll);
        //EDI_render_TextContent();
        //EDI_render_Cursor();
    }
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

        

        //if (!lineIsPartOfTheCurrentVirtualizedContent) { // "!lineIsPartOfTheCurrentVirtualizedContent"
        //    // hmm is incorrect "nothing to draw", you need to actually draw maybe if the next index is in view
        //    // because you've split the line above it that was out of view?
        //    // TODO: I'm not sure.
        //    return;
        //}

        //if (isASingledOutCase) { throw new Error(); } // "isASingledOutCase case"

        // See comment "Awkward explicit inlining of 'EXPLORER_indexItemTo_ringBufferIndexItem'" for more information.
        let current_ringBufferIndex = INTS[fEDI_cursor_editIndexLine] - INTS[fEDI_virtualIndexLine];
        if (current_ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length] || current_ringBufferIndex < 0) current_ringBufferIndex = -1;
        else current_ringBufferIndex = (current_ringBufferIndex + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];
        if (current_ringBufferIndex < 0) { return; } // TODO: line is not in viewport (for enter key it still needs to be handled maybe probably)

        // See comment "Awkward explicit inlining of 'EXPLORER_indexItemTo_ringBufferIndexItem'" for more information.
        let final_ringBufferIndex = INTS[fEDI_ArrayFrom_textElement_children_length] - 1;
        if (final_ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length] || final_ringBufferIndex < 0) final_ringBufferIndex = -1;
        else final_ringBufferIndex = (final_ringBufferIndex + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];
        if (final_ringBufferIndex < 0) { return; } // ???

        // TODO: EDI_cursor_cached_indentation_string ensure post rewrite that it is in each conditional branch (as of writing this comment I know it isn't)

        if (INTS[fEDI_cursor_editIndexColumn] === 0) { // start of line
            // pending line feeds use them for the line numbers eventually

            let loop_ringBufferIndex = final_ringBufferIndex;
            let final_lineObject = EDI_lineStringCache[final_ringBufferIndex];

            while (true) {
                let previous_ringBufferIndex = loop_ringBufferIndex - 1;
                if (previous_ringBufferIndex < 0) {
                    previous_ringBufferIndex = INTS[fEDI_ArrayFrom_textElement_children_length] - 1;
                }

                //const loop_lineObject = EDI_lineStringCache[loop_ringBufferIndex];
                //const previous_lineObject = EDI_lineStringCache[previous_ringBufferIndex];
//
                //loop_lineObject.tab_twoIndices_oneImplicitObject_startCol_tabWidth = previous_lineObject.tab_twoIndices_oneImplicitObject_startCol_tabWidth;
                //loop_lineObject.spans = previous_lineObject.spans;

                EDI_lineStringCache[loop_ringBufferIndex] = EDI_lineStringCache[previous_ringBufferIndex];

                if (previous_ringBufferIndex === current_ringBufferIndex) {
                    break;
                }

                loop_ringBufferIndex = previous_ringBufferIndex;
            }

            EDI_lineStringCache[current_ringBufferIndex] = final_lineObject;

            const currentLineObject = EDI_lineStringCache[current_ringBufferIndex];
            const currentLineSpans = currentLineObject.spans;
            currentLineObject.tab_twoIndices_oneImplicitObject_startCol_tabWidth.length = 0;
            if (currentLineSpans.length > 0) {
                currentLineSpans.length = 1;
                currentLineSpans[0].text = '';
                currentLineSpans[0].color = EDI_tokenColors[0];
            }
            else {
                currentLineSpans.push({ text: '', color: EDI_tokenColors[0] });
            }
            //EDI_shiftLinesOfText_ToALarger_IndexLine_byOne(ringBufferIndex_last, ringBufferIndex_current);
            //EDI_lineWasInsertedValidateGutter(INTS[fEDI_lineEndPositionList_count] + INTS[fEDI_cursor_editLineFeedCount]);
        }
        else {
            let lastValidIndexColumn = EDI_getLastValidIndexColumn_raw(INTS[fEDI_cursor_editIndexLine]);

            if (lastValidIndexColumn === INTS[fEDI_cursor_editIndexColumn]) { // end of line
                let loop_ringBufferIndex = final_ringBufferIndex;

                let final_lineObject = EDI_lineStringCache[final_ringBufferIndex];

                let next_ringBufferIndex = current_ringBufferIndex + 1;
                if (next_ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length]) {
                    next_ringBufferIndex -= INTS[fEDI_ArrayFrom_textElement_children_length];
                }

                while (loop_ringBufferIndex !== next_ringBufferIndex) {
                    let previous_ringBufferIndex = loop_ringBufferIndex - 1;
                    if (previous_ringBufferIndex < 0) {
                        previous_ringBufferIndex = INTS[fEDI_ArrayFrom_textElement_children_length] - 1;
                    }

                    EDI_lineStringCache[loop_ringBufferIndex] = EDI_lineStringCache[previous_ringBufferIndex];

                    loop_ringBufferIndex = previous_ringBufferIndex;
                }

                EDI_lineStringCache[next_ringBufferIndex] = final_lineObject;

                const nextLineObject = EDI_lineStringCache[next_ringBufferIndex];
                const nextLineSpans = nextLineObject.spans;
                nextLineObject.tab_twoIndices_oneImplicitObject_startCol_tabWidth.length = 0;
                if (nextLineSpans.length > 0) {
                    nextLineSpans.length = 1;
                    nextLineSpans[0].text = '';
                    nextLineSpans[0].color = EDI_tokenColors[0];
                }
                else {
                    nextLineSpans.push({ text: '', color: EDI_tokenColors[0] });
                }
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
                let relativeInsertIndex = 0;

                let targetedSpan = null;
                let targetedSpanIndex = 0;

                // 1. Target the specific line row index where the typing is taking place
                const activeLine = INTS[fEDI_cursor_indexLine];

                const lineObject = EDI_lineStringCache[current_ringBufferIndex];
                const lineSpans = lineObject.spans;

                // TODO: You'll have to determine whether "a tab" within tab_twoIndices_oneImplicitObject_startCol_tabWidth corresponds to the first or last split.

                {
                    if (lineSpans === undefined) {
                        return;
                    }

                    // 2. Determine the column position where the *first character of this edit burst* began
                    // We use indexColumn minus the absolute total length of characters typed in this current edit session
                    const editStartColumn = INTS[fEDI_cursor_indexColumn];// - INTS[fEDI_cursor_editLength_characters];
                    
                    // Find the precise column location of the characters we are about to insert right now
                    const currentEditColumn = editStartColumn;// + INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue];

                    let runningColumnIdx = 0;

                    // 3. Scan the cached spans to find where currentEditColumn lands
                    for (let i = 0; i < lineSpans.length; i++) {
                        const span = lineSpans[i];
                        const spanLength = span.text.length;

                        // If the cursor lands completely inside this span, or exactly on its trailing right edge
                        if (currentEditColumn >= runningColumnIdx && currentEditColumn <= runningColumnIdx + spanLength) {
                            targetedSpan = span;
                            targetedSpanIndex = i;
                            relativeInsertIndex = currentEditColumn - runningColumnIdx;
                            
                            // If the cursor hits exactly between two spans, your rule dictates targeting 
                            // the left span at its trailing length index. We break early to lock onto it.
                            break;
                        }
                        runningColumnIdx += spanLength;
                    }
                }

                let next_ringBufferIndex = current_ringBufferIndex + 1;
                if (next_ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length]) {
                    next_ringBufferIndex -= INTS[fEDI_ArrayFrom_textElement_children_length];
                }

                let final_lineObject = EDI_lineStringCache[final_ringBufferIndex];

                let loop_ringBufferIndex = final_ringBufferIndex;

                while (loop_ringBufferIndex !== next_ringBufferIndex) {
                    let previous_ringBufferIndex = loop_ringBufferIndex - 1;
                    if (previous_ringBufferIndex < 0) {
                        previous_ringBufferIndex = INTS[fEDI_ArrayFrom_textElement_children_length] - 1;
                    }

                    EDI_lineStringCache[loop_ringBufferIndex] = EDI_lineStringCache[previous_ringBufferIndex];

                    loop_ringBufferIndex = previous_ringBufferIndex;
                }

                EDI_lineStringCache[next_ringBufferIndex] = final_lineObject;

                const data = targetedSpan.text;

                let firstText = data.substring(0, relativeInsertIndex);
                let lastText = data.substring(relativeInsertIndex);

                const nextLineObject = EDI_lineStringCache[next_ringBufferIndex];
                const nextLineSpans = nextLineObject.spans;
                nextLineObject.tab_twoIndices_oneImplicitObject_startCol_tabWidth.length = 0;
                if (nextLineSpans.length > 0) {
                    nextLineSpans.length = 1;
                    nextLineSpans[0].text = lastText;
                    nextLineSpans[0].color = targetedSpan.color;
                }
                else {
                    nextLineSpans.push({ text: lastText, color: targetedSpan.color });
                }

                lineSpans[targetedSpanIndex].text = firstText;

                for (let i = lineSpans.length - 1; i > targetedSpanIndex; i--) {
                    nextLineSpans.unshift(lineSpans.pop());
                }

                // move tail to head?
                nextLineSpans.unshift(nextLineSpans.pop());


                // Prior to returning from this function restore the original 'indexLine', and 'indexColumn'. (2 of 2)
                INTS[fEDI_cursor_indexLine] = remember_cursorIndexLine;
                INTS[fEDI_cursor_indexColumn] = remember_cursorIndexColumn;
            }
        }
    }

    // 6. Request a canvas redraw layout frame pass to force the changes onto the screen
    EDI_render_request(RenderKind_Scroll);
    //EDI_render_TextContent();
    //EDI_render_Cursor();
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
    let smallLineSpans = null;
    {
        INTS[fEDI_cursor_indexLine] = smallLineAndColumnIndices_indexLine;
        INTS[fEDI_cursor_indexColumn] = smallLineAndColumnIndices_indexColumn;
        // TODO: this cursorVisualColumnIndex... logic here seems like it can be skipped here so long as you do it once by the end of the function to the correct indices.
        INTS[fEDI_cursorVisualColumnIndex] = smallLineAndColumnIndices_indexColumn;

        EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
        const line_end = INTS[fEDI_ret_getLineBoundaryPositions_end];

        let targetSpanIndex = 0;
        let runningColumnIdx = 0;
        let targetSpan = null;
        let relativeIndex = 0;
        let remainingCharacterRemovals;
        if (largePosition > line_end) {
            remainingCharacterRemovals = line_end - smallPosition;
        }
        else {
            remainingCharacterRemovals = largePosition - smallPosition;
        }

        // 1. Target the specific line row index where the typing is taking place
        const activeLine = INTS[fEDI_cursor_indexLine];

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let activeLine_ringBufferIndex = activeLine - INTS[fEDI_virtualIndexLine];
        if (activeLine_ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length] || activeLine_ringBufferIndex < 0) activeLine_ringBufferIndex = -1;
        else activeLine_ringBufferIndex = (activeLine_ringBufferIndex + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];
        //if (activeLine_ringBufferIndex < 0) { return; } // line is not in viewport
        
        if (activeLine_ringBufferIndex >= 0) { // line IS not in viewport

            let lineObject = EDI_lineStringCache[activeLine_ringBufferIndex];
            let lineSpans = lineObject.spans;
            smallLineSpans = lineSpans;

            // 2. Determine the column position where the *first character of this edit burst* began
            const editStartColumn = INTS[fEDI_cursor_indexColumn];

            // Find the precise column location of the characters we are about to remove right now
            const currentEditColumn = editStartColumn;
            let isAtEndOfLine = false;

            // 3. Scan the cached spans to find where currentEditColumn lands
            for (let i = 0; i < lineSpans.length; i++) {
                const span = lineSpans[i];
                const spanLength = span.text.length;

                if (currentEditColumn >= runningColumnIdx && currentEditColumn < runningColumnIdx + spanLength) {
                    targetSpanIndex = i;
                    targetSpan = span;
                    relativeIndex = currentEditColumn - runningColumnIdx;
                    
                    // If the cursor hits exactly between two spans, your rule dictates targeting 
                    // the left span at its trailing length index. We break early to lock onto it.
                    break;
                }
                runningColumnIdx += spanLength;
                if (currentEditColumn === runningColumnIdx && i === lineSpans.length - 1) { // TODO: This if statement isn't well understood. I had 'currentEditColumn === runningColumnIdx' alone until I had a case that needed 'i === lineSpans.length - 1'... TODO: look into this (I just don't have the energy right now).
                    isAtEndOfLine = true;
                }
            }

            if (targetSpan === null) {
                if (!isAtEndOfLine) {
                    throw new Error();
                }
                else {
                    targetSpanIndex = lineSpans.length;

                    // NOTE: is undefined until 'if (isAtEndOfLine)' block runs
                    //targetSpan = lineSpans[targetSpanIndex];

                    relativeIndex = 0;
                }
            }

            while (remainingCharacterRemovals > 0) {
                //INTS[fEDI_cursor_edit_eventCount_drawn] = INTS[fEDI_cursor_edit_eventCount_occurred];
                // you can't do the INTS[fEDI_cursor_edit_eventCount_drawn] immediately cause you need to determine how much of the current span can actually be deleted then move to the next span etc...
                
                if (isAtEndOfLine) {
                    throw new Error('TODO: hit EOF');
                }

                // 4. If we successfully isolated the text slice segment inside the cache, modify it
                const possibleCharacterRemovals = targetSpan.text.length - relativeIndex;
                const actualCharacterRemovals = remainingCharacterRemovals <= possibleCharacterRemovals ? remainingCharacterRemovals : possibleCharacterRemovals;

                // ...the text inline directly into the string reference inside the cache array frame
                if (actualCharacterRemovals === targetSpan.text.length && lineSpans.length > 1) {
                    lineSpans.splice(targetSpanIndex, 1);
                }
                else {
                    targetSpan.text = targetSpan.text.slice(0, relativeIndex) + targetSpan.text.slice(relativeIndex + actualCharacterRemovals);
                }
                
                // 5. Commit the continuation value forward so the next frame knows where to pick up
                // (this step has a copy in the 'if (isAtEndOfLine)' block, the text is not completely equivalent)
                INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue] += actualCharacterRemovals;
                INTS[fEDI_cursor_edit_eventCount_drawn] += actualCharacterRemovals;
                remainingCharacterRemovals -= actualCharacterRemovals;

                if (remainingCharacterRemovals > 0) {
                    if (targetSpanIndex < lineSpans.length) {
                        targetSpan = lineSpans[targetSpanIndex];
                        relativeIndex = 0;
                    }
                    else {
                        isAtEndOfLine = true;
                    }
                }
            }
        }
    }

    // Remove selection on large position line
    let largeLineSpans = null;
    if (linesRemovedCount > 0) {
        INTS[fEDI_cursor_indexLine] = INTS[fEDI_cursor_indexLine] + linesRemovedCount;
        INTS[fEDI_cursor_indexColumn] = 0;
        // TODO: this cursorVisualColumnIndex... logic here seems like it can be skipped here so long as you do it once by the end of the function to the correct indices.
        INTS[fEDI_cursorVisualColumnIndex] = 0;

        EDI_ret_getLineBoundaryPositions_raw(INTS[fEDI_cursor_indexLine]);
        const line_end = INTS[fEDI_ret_getLineBoundaryPositions_end];

        let targetSpanIndex = 0;
        let runningColumnIdx = 0;
        let targetSpan = null;
        let relativeIndex = 0;
        let remainingCharacterRemovals = largePosition - INTS[fEDI_ret_getLineBoundaryPositions_start];

        // 1. Target the specific line row index where the typing is taking place
        const activeLine = INTS[fEDI_cursor_indexLine];
        let lineSpans = EDI_lineStringCache[activeLine];
        if (lineSpans !== undefined) {
            
            largeLineSpans = lineSpans;

            // 2. Determine the column position where the *first character of this edit burst* began
            const editStartColumn = INTS[fEDI_cursor_indexColumn];

            // Find the precise column location of the characters we are about to remove right now
            const currentEditColumn = editStartColumn;
            let isAtEndOfLine = false;

            // 3. Scan the cached spans to find where currentEditColumn lands
            for (let i = 0; i < lineSpans.length; i++) {
                const span = lineSpans[i];
                const spanLength = span.text.length;

                if (currentEditColumn >= runningColumnIdx && currentEditColumn < runningColumnIdx + spanLength) {
                    targetSpanIndex = i;
                    targetSpan = span;
                    relativeIndex = currentEditColumn - runningColumnIdx;
                    
                    // If the cursor hits exactly between two spans, your rule dictates targeting 
                    // the left span at its trailing length index. We break early to lock onto it.
                    break;
                }
                runningColumnIdx += spanLength;
                if (currentEditColumn === runningColumnIdx && i === lineSpans.length - 1) { // TODO: This if statement isn't well understood. I had 'currentEditColumn === runningColumnIdx' alone until I had a case that needed 'i === lineSpans.length - 1'... TODO: look into this (I just don't have the energy right now).
                    isAtEndOfLine = true;
                }
            }

            if (targetSpan === null) {
                if (!isAtEndOfLine) {
                    throw new Error();
                }
                else {
                    targetSpanIndex = lineSpans.length;

                    // NOTE: is undefined until 'if (isAtEndOfLine)' block runs
                    //targetSpan = lineSpans[targetSpanIndex];

                    relativeIndex = 0;
                }
            }

            while (remainingCharacterRemovals > 0) {
                //INTS[fEDI_cursor_edit_eventCount_drawn] = INTS[fEDI_cursor_edit_eventCount_occurred];
                // you can't do the INTS[fEDI_cursor_edit_eventCount_drawn] immediately cause you need to determine how much of the current span can actually be deleted then move to the next span etc...
                
                if (isAtEndOfLine) {
                    throw new Error('TODO: hit EOF');
                }

                // 4. If we successfully isolated the text slice segment inside the cache, modify it
                const possibleCharacterRemovals = targetSpan.text.length - relativeIndex;
                const actualCharacterRemovals = remainingCharacterRemovals <= possibleCharacterRemovals ? remainingCharacterRemovals : possibleCharacterRemovals;

                // ...the text inline directly into the string reference inside the cache array frame
                if (actualCharacterRemovals === targetSpan.text.length && lineSpans.length > 1) {
                    lineSpans.splice(targetSpanIndex, 1);
                }
                else {
                    targetSpan.text = targetSpan.text.slice(0, relativeIndex) + targetSpan.text.slice(relativeIndex + actualCharacterRemovals);
                }
                
                // 5. Commit the continuation value forward so the next frame knows where to pick up
                // (this step has a copy in the 'if (isAtEndOfLine)' block, the text is not completely equivalent)
                INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue] += actualCharacterRemovals;
                INTS[fEDI_cursor_edit_eventCount_drawn] += actualCharacterRemovals;
                remainingCharacterRemovals -= actualCharacterRemovals;

                if (remainingCharacterRemovals > 0) {
                    if (targetSpanIndex < lineSpans.length) {
                        targetSpan = lineSpans[targetSpanIndex];
                        relativeIndex = 0;
                    }
                    else {
                        isAtEndOfLine = true;
                    }
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

        if (smallLineSpans) {
            if (largeLineSpans) { // - [x] keeping, removing

                // append 'largeLineSpans' to 'smallLineSpans'

                const largeLineSpans_length = largeLineSpans.length;
                const smallLineSpans_length = smallLineSpans.length;

                let isAtEndOfLine = false;
                
                if (largeLineSpans_length === 1 && largeLineSpans[0].text.length === 0) { // (do not append if large line is just an empty string)
                    isAtEndOfLine = true;
                }
                else {
                    
                    if (smallLineSpans.length === 1 && smallLineSpans[0].text.length === 0) {
                        smallLineSpans.length = 0; // Remove the empty string from the small
                        EDI_lineStringCache[smallLineAndColumnIndices_indexLine] = largeLineSpans; // current receives entirety of next's spans.
                        smallLineSpans = largeLineSpans // update the local variable
                    }
                    else {
                        for (let i = 0; i < largeLineSpans_length; i++) {
                            smallLineSpans.push(largeLineSpans[i]);
                        }
                    }
                }
                
                visibleLinesRemovedCount++;
            }
            else { // - [ ] keeping, !removing

            }
        }
        else {
            if (largeLineSpans) { // - [ ] !keeping, removing
                
            }
            else { // - [ ] !keeping, !removing
                
            }
        }
    }

    if (linesRemovedCount > 0) {
        // shift existing cache
        const activeLine = smallLineAndColumnIndices_indexLine;
        const largeLineAndColumnIndices_indexLine = INTS[fEDI_cursor_indexLine] + linesRemovedCount;
        const upperLimit = INTS[fEDI_lineEndPositionList_count] - 1;
        for (let i = 0; i < linesRemovedCount; i++) {
            EDI_lineStringCache[smallLineAndColumnIndices_indexLine + (i + 1)] = EDI_lineStringCache[largeLineAndColumnIndices_indexLine + (i)];
        }
        const EDI_lineStringCache_length = EDI_lineStringCache.length;
        for (let i = largeLineAndColumnIndices_indexLine; i < EDI_lineStringCache_length; i++) {
            EDI_lineStringCache[i] = undefined;
        }
        //EDI_lineStringCache[INTS[fEDI_lineEndPositionList_count]] = undefined;

        //EDI_lineStringCache.splice(smallLineAndColumnIndices_indexLine + 1, linesRemovedCount - 1);
    }

    // Remove middle line(s)
    if (linesRemovedCount > 0) {

        //// See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        //let ringBufferIndex_current = (smallLineAndColumnIndices_indexLine + 1) - INTS[fEDI_virtualIndexLine];
        //if (ringBufferIndex_current >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_current < 0) ringBufferIndex_current = -1;
        //else ringBufferIndex_current = (ringBufferIndex_current + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];
//
        //// See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        //let ringBufferIndex_last = (INTS[fEDI_virtualIndexLine] + INTS[fEDI_virtualCount] - 1) - INTS[fEDI_virtualIndexLine];
        //if (ringBufferIndex_last >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex_last < 0) ringBufferIndex_last = -1;
        //else ringBufferIndex_last = (ringBufferIndex_last + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];

        //// TODO: This will be wrong because you'd need to explicitly redraw the large selection line index.
        //EDI_shiftLinesOfText_ToASmaller_IndexLine_byDistance(ringBufferIndex_last, ringBufferIndex_current, linesRemovedCount);

        if (EDI_drawGutter_Width(INTS[fEDI_lineEndPositionList_count] - linesRemovedCount)) {
            // If true then you need to also draw the dependent UI
            EDI_render_request(RenderKind_Cursor_n);
            EDI_drawHorizontalScrollbar();
        }
    }

    INTS[fEDI_cursor_editLength_characters] = original_edit_length;

    // 6. Request a canvas redraw layout frame pass to force the changes onto the screen
    EDI_render_request(RenderKind_Scroll);
    //EDI_render_TextContent();
    //EDI_render_Cursor();
}

/** TODO: this is nearly identical to backspace, the difference is the check 'if (INTS[fEDI_cursor_editKind] !== EditKind_DeleteLtr)', thus dedupe the logic or no? */
function EDI_render_do_Delete() {
    if (INTS[fEDI_cursor_editKind] !== EditKind_DeleteLtr) {
        return;
    }

    if (INTS[fEDI_cursor_edit_eventCount_drawn] >= INTS[fEDI_cursor_edit_eventCount_occurred]) {
        return;
    }

    let targetSpanIndex = 0;
    let runningColumnIdx = 0;
    let targetSpan = null;
    let relativeIndex = 0;
    let remainingCharacterRemovals = INTS[fEDI_cursor_editLength_characters] - INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue];

    // 1. Target the specific line row index where the typing is taking place
    const activeLine = INTS[fEDI_cursor_indexLine];

    // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
    let activeLine_ringBufferIndex = activeLine - INTS[fEDI_virtualIndexLine];
    if (activeLine_ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length] || activeLine_ringBufferIndex < 0) activeLine_ringBufferIndex = -1;
    else activeLine_ringBufferIndex = (activeLine_ringBufferIndex + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];
    if (activeLine_ringBufferIndex < 0) { return; } // line is not in viewport
    
    let lineObject = EDI_lineStringCache[activeLine_ringBufferIndex];
    let lineSpans = lineObject.spans;

    // 2. Determine the column position where the *first character of this edit burst* began
    const editStartColumn = INTS[fEDI_cursor_indexColumn];

    // Find the precise column location of the characters we are about to remove right now
    const currentEditColumn = editStartColumn;
    let isAtEndOfLine = false;

    // 3. Scan the cached spans to find where currentEditColumn lands
    for (let i = 0; i < lineSpans.length; i++) {
        const span = lineSpans[i];
        const spanLength = span.text.length;

        if (currentEditColumn >= runningColumnIdx && currentEditColumn < runningColumnIdx + spanLength) {
            targetSpanIndex = i;
            targetSpan = span;
            relativeIndex = currentEditColumn - runningColumnIdx;
            
            // If the cursor hits exactly between two spans, your rule dictates targeting 
            // the left span at its trailing length index. We break early to lock onto it.
            break;
        }
        runningColumnIdx += spanLength;
        if (currentEditColumn === runningColumnIdx && i === lineSpans.length - 1) { // TODO: This if statement isn't well understood. I had 'currentEditColumn === runningColumnIdx' alone until I had a case that needed 'i === lineSpans.length - 1'... TODO: look into this (I just don't have the energy right now).
            isAtEndOfLine = true;
        }
    }

    if (targetSpan === null) {
        if (!isAtEndOfLine) {
            throw new Error();
        }
        else {
            targetSpanIndex = lineSpans.length;

            // NOTE: is undefined until 'if (isAtEndOfLine)' block runs
            //targetSpan = lineSpans[targetSpanIndex];

            relativeIndex = 0;
        }
    }

    while (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        //INTS[fEDI_cursor_edit_eventCount_drawn] = INTS[fEDI_cursor_edit_eventCount_occurred];
        // you can't do the INTS[fEDI_cursor_edit_eventCount_drawn] immediately cause you need to determine how much of the current span can actually be deleted then move to the next span etc...
        
        if (isAtEndOfLine) {
            isAtEndOfLine = false;
            if (activeLine < INTS[fEDI_lineEndPositionList_count]) {
                // append 'next line' to 'current line'
                const NEXT_ringBufferIndex = activeLine_ringBufferIndex + 1;
                if (NEXT_ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length]) {
                    NEXT_ringBufferIndex -= INTS[fEDI_ArrayFrom_textElement_children_length];
                }

                const NEXT_lineSpans = EDI_lineStringCache[NEXT_ringBufferIndex];
                const NEXT_lineSpans_length = NEXT_lineSpans.length;
                
                if (NEXT_lineSpans_length === 1 && NEXT_lineSpans[0].text.length === 0) { // (do not append if next line is just an empty string)
                    isAtEndOfLine = true;
                }
                else {
                    
                    if (lineSpans.length === 1 && lineSpans[0].text.length === 0) {
                        lineSpans.length = 0; // Remove the empty string from the current
                        EDI_lineStringCache[activeLine_ringBufferIndex] = NEXT_lineSpans; // current receives entirety of next's spans.
                        lineSpans = NEXT_lineSpans // update the local variable
                        targetSpanIndex = 0; // if initial 'if (targetSpan === null)' then 'targetSpanIndex = lineSpans.length;' so you need to set to 0 here.
                    }
                    else {
                        for (let i = 0; i < NEXT_lineSpans_length; i++) {
                            lineSpans.push(NEXT_lineSpans[i]);
                        }
                    }
                    targetSpan = lineSpans[targetSpanIndex];
                }

                // See comment "Awkward explicit inlining of 'EXPLORER_indexItemTo_ringBufferIndexItem'" for more information.
                let final_ringBufferIndexItem = INTS[fEDI_ArrayFrom_textElement_children_length] - 1;
                if (final_ringBufferIndexItem >= INTS[fEDI_ArrayFrom_textElement_children_length] || final_ringBufferIndexItem < 0) final_ringBufferIndexItem = -1;
                else final_ringBufferIndexItem = (final_ringBufferIndexItem + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_ArrayFrom_textElement_children_length];
                if (final_ringBufferIndexItem < 0) { return; }

                let current_ringBufferIndex = NEXT_ringBufferIndex;
                
                while (current_ringBufferIndex !== final_ringBufferIndexItem) {
                    let srcLineSpansRingBufferIndex = current_ringBufferIndex + 1;
                    if (srcLineSpansRingBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length]) {
                        srcLineSpansRingBufferIndex -= INTS[fEDI_ArrayFrom_textElement_children_length];
                    }

                    lineSpans[current_ringBufferIndex] = lineSpans[srcLineSpansRingBufferIndex];

                    current_ringBufferIndex = srcLineSpansRingBufferIndex;
                }

                // TODO: Tell scroll to recalculate cache for final_ringBufferIndexItem, ..., n for times backspace hit a line end in this function.

                // (copy of 5.) Commit the continuation value forward so the next frame knows where to pick up
                INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue] += 1;
                INTS[fEDI_cursor_edit_eventCount_drawn] += 1;
                remainingCharacterRemovals -= 1;
                
                if (isAtEndOfLine) {
                    continue;
                }
            }
            else {
                throw new Error('TODO: hit EOF');
            }
        }

        // 4. If we successfully isolated the text slice segment inside the cache, modify it
        const possibleCharacterRemovals = targetSpan.text.length - relativeIndex;
        const actualCharacterRemovals = remainingCharacterRemovals <= possibleCharacterRemovals ? remainingCharacterRemovals : possibleCharacterRemovals;

        // ...the text inline directly into the string reference inside the cache array frame
        if (actualCharacterRemovals === targetSpan.text.length && lineSpans.length > 1) {
            lineSpans.splice(targetSpanIndex, 1);
        }
        else {
            targetSpan.text = targetSpan.text.slice(0, relativeIndex) + targetSpan.text.slice(relativeIndex + actualCharacterRemovals);
        }
        
        // 5. Commit the continuation value forward so the next frame knows where to pick up
        // (this step has a copy in the 'if (isAtEndOfLine)' block, the text is not completely equivalent)
        INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue] += actualCharacterRemovals;
        INTS[fEDI_cursor_edit_eventCount_drawn] += actualCharacterRemovals;
        remainingCharacterRemovals -= actualCharacterRemovals;

        if (remainingCharacterRemovals > 0) {
            if (targetSpanIndex < lineSpans.length) {
                targetSpan = lineSpans[targetSpanIndex];
                relativeIndex = 0;
            }
            else {
                isAtEndOfLine = true;
            }
        }
    }

    // 6. Request a canvas redraw layout frame pass to force the changes onto the screen
    EDI_render_request(RenderKind_Scroll);
    //EDI_render_TextContent();
    //EDI_render_Cursor();
}

function EDI_render_do_Backspace() {
    if (INTS[fEDI_cursor_editKind] !== EditKind_BackspaceRtl) {
        return;
    }

    if (INTS[fEDI_cursor_edit_eventCount_drawn] >= INTS[fEDI_cursor_edit_eventCount_occurred]) {
        return;
    }

    let targetSpanIndex = 0;
    let runningColumnIdx = 0;
    let targetSpan = null;
    let relativeIndex = 0;
    let remainingCharacterRemovals = INTS[fEDI_cursor_editLength_characters] - INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue];

    // 1. Target the specific line row index where the typing is taking place
    const activeLine = INTS[fEDI_cursor_indexLine];

    // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
    let activeLine_ringBufferIndex = activeLine - INTS[fEDI_virtualIndexLine];
    if (activeLine_ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length] || activeLine_ringBufferIndex < 0) activeLine_ringBufferIndex = -1;
    else activeLine_ringBufferIndex = (activeLine_ringBufferIndex + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];
    if (activeLine_ringBufferIndex < 0) { return; } // line is not in viewport
    
    let lineObject = EDI_lineStringCache[activeLine_ringBufferIndex];
    let lineSpans = lineObject.spans;

    // 2. Determine the column position where the *first character of this edit burst* began
    const editStartColumn = INTS[fEDI_cursor_indexColumn];

    // Find the precise column location of the characters we are about to remove right now
    const currentEditColumn = editStartColumn;
    let isAtEndOfLine = false;

    // 3. Scan the cached spans to find where currentEditColumn lands
    for (let i = 0; i < lineSpans.length; i++) {
        const span = lineSpans[i];
        const spanLength = span.text.length;

        if (currentEditColumn >= runningColumnIdx && currentEditColumn < runningColumnIdx + spanLength) {
            targetSpanIndex = i;
            targetSpan = span;
            relativeIndex = currentEditColumn - runningColumnIdx;
            
            // If the cursor hits exactly between two spans, your rule dictates targeting 
            // the left span at its trailing length index. We break early to lock onto it.
            break;
        }
        runningColumnIdx += spanLength;
        if (currentEditColumn === runningColumnIdx && i === lineSpans.length - 1) { // TODO: This if statement isn't well understood. I had 'currentEditColumn === runningColumnIdx' alone until I had a case that needed 'i === lineSpans.length - 1'... TODO: look into this (I just don't have the energy right now).
            isAtEndOfLine = true;
        }
    }

    if (targetSpan === null) {
        if (!isAtEndOfLine) {
            throw new Error();
        }
        else {
            targetSpanIndex = lineSpans.length;

            // NOTE: is undefined until 'if (isAtEndOfLine)' block runs
            //targetSpan = lineSpans[targetSpanIndex];

            relativeIndex = 0;
        }
    }

    while (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        //INTS[fEDI_cursor_edit_eventCount_drawn] = INTS[fEDI_cursor_edit_eventCount_occurred];
        // you can't do the INTS[fEDI_cursor_edit_eventCount_drawn] immediately cause you need to determine how much of the current span can actually be deleted then move to the next span etc...
        
        if (isAtEndOfLine) {
            isAtEndOfLine = false;
            if (activeLine < INTS[fEDI_lineEndPositionList_count]) {
                // append 'next line' to 'current line'
                const NEXT_ringBufferIndex = activeLine_ringBufferIndex + 1;
                if (NEXT_ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length]) {
                    NEXT_ringBufferIndex -= INTS[fEDI_ArrayFrom_textElement_children_length];
                }

                const NEXT_lineSpans = EDI_lineStringCache[NEXT_ringBufferIndex];
                const NEXT_lineSpans_length = NEXT_lineSpans.length;
                
                if (NEXT_lineSpans_length === 1 && NEXT_lineSpans[0].text.length === 0) { // (do not append if next line is just an empty string)
                    isAtEndOfLine = true;
                }
                else {
                    
                    if (lineSpans.length === 1 && lineSpans[0].text.length === 0) {
                        lineSpans.length = 0; // Remove the empty string from the current
                        EDI_lineStringCache[activeLine_ringBufferIndex] = NEXT_lineSpans; // current receives entirety of next's spans.
                        lineSpans = NEXT_lineSpans // update the local variable
                        targetSpanIndex = 0; // if initial 'if (targetSpan === null)' then 'targetSpanIndex = lineSpans.length;' so you need to set to 0 here.
                    }
                    else {
                        for (let i = 0; i < NEXT_lineSpans_length; i++) {
                            lineSpans.push(NEXT_lineSpans[i]);
                        }
                    }
                    targetSpan = lineSpans[targetSpanIndex];
                }

                // See comment "Awkward explicit inlining of 'EXPLORER_indexItemTo_ringBufferIndexItem'" for more information.
                let final_ringBufferIndexItem = INTS[fEDI_ArrayFrom_textElement_children_length] - 1;
                if (final_ringBufferIndexItem >= INTS[fEDI_ArrayFrom_textElement_children_length] || final_ringBufferIndexItem < 0) final_ringBufferIndexItem = -1;
                else final_ringBufferIndexItem = (final_ringBufferIndexItem + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_ArrayFrom_textElement_children_length];
                if (final_ringBufferIndexItem < 0) { return; }

                let current_ringBufferIndex = NEXT_ringBufferIndex;
                
                while (current_ringBufferIndex !== final_ringBufferIndexItem) {
                    let srcLineSpansRingBufferIndex = current_ringBufferIndex + 1;
                    if (srcLineSpansRingBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length]) {
                        srcLineSpansRingBufferIndex -= INTS[fEDI_ArrayFrom_textElement_children_length];
                    }

                    lineSpans[current_ringBufferIndex] = lineSpans[srcLineSpansRingBufferIndex];

                    current_ringBufferIndex = srcLineSpansRingBufferIndex;
                }

                // TODO: Tell scroll to recalculate cache for final_ringBufferIndexItem, ..., n for times backspace hit a line end in this function.

                // (copy of 5.) Commit the continuation value forward so the next frame knows where to pick up
                INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue] += 1;
                INTS[fEDI_cursor_edit_eventCount_drawn] += 1;
                remainingCharacterRemovals -= 1;
                
                if (isAtEndOfLine) {
                    continue;
                }
            }
            else {
                throw new Error('TODO: hit EOF');
            }
        }

        // 4. If we successfully isolated the text slice segment inside the cache, modify it
        const possibleCharacterRemovals = targetSpan.text.length - relativeIndex;
        const actualCharacterRemovals = remainingCharacterRemovals <= possibleCharacterRemovals ? remainingCharacterRemovals : possibleCharacterRemovals;

        // ...the text inline directly into the string reference inside the cache array frame
        if (actualCharacterRemovals === targetSpan.text.length && lineSpans.length > 1) {
            lineSpans.splice(targetSpanIndex, 1);
        }
        else {
            targetSpan.text = targetSpan.text.slice(0, relativeIndex) + targetSpan.text.slice(relativeIndex + actualCharacterRemovals);
        }
        
        // 5. Commit the continuation value forward so the next frame knows where to pick up
        // (this step has a copy in the 'if (isAtEndOfLine)' block, the text is not completely equivalent)
        INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue] += actualCharacterRemovals;
        INTS[fEDI_cursor_edit_eventCount_drawn] += actualCharacterRemovals;
        remainingCharacterRemovals -= actualCharacterRemovals;

        if (remainingCharacterRemovals > 0) {
            if (targetSpanIndex < lineSpans.length) {
                targetSpan = lineSpans[targetSpanIndex];
                relativeIndex = 0;
            }
            else {
                isAtEndOfLine = true;
            }
        }
    }

    // 6. Request a canvas redraw layout frame pass to force the changes onto the screen
    EDI_render_request(RenderKind_Scroll);
    //EDI_render_TextContent();
    //EDI_render_Cursor();
}

function EDI_render_do_InsertLtr() {
    if (INTS[fEDI_cursor_editKind] !== EditKind_InsertLtr) {
        return;
    }
    if (INTS[fEDI_cursor_edit_eventCount_drawn] < INTS[fEDI_cursor_edit_eventCount_occurred]) {
        INTS[fEDI_cursor_edit_eventCount_drawn] = INTS[fEDI_cursor_edit_eventCount_occurred];

        // See comment "Awkward explicit inlining of 'EDI_indexLineTo_ringBufferIndex'" for more information.
        let ringBufferIndex = INTS[fEDI_cursor_indexLine] - INTS[fEDI_virtualIndexLine];
        if (ringBufferIndex >= INTS[fEDI_ArrayFrom_textElement_children_length] || ringBufferIndex < 0) ringBufferIndex = -1;
        else ringBufferIndex = (ringBufferIndex + INTS[fEDI_ringBuffer_indexZero]) % INTS[fEDI_virtualCount];
        if (ringBufferIndex < 0) { return; } // line is not in viewport
        const lineObject = EDI_lineStringCache[ringBufferIndex];
        const lineSpans = lineObject.spans;

        // 2. Determine the column position where the *first character of this edit burst* began
        // We use indexColumn minus the absolute total length of characters typed in this current edit session
        const editStartColumn = INTS[fEDI_cursor_indexColumn] - INTS[fEDI_cursor_editLength_characters];
        
        // Find the precise column location of the characters we are about to insert right now
        const currentEditColumn = editStartColumn + INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue];

        let runningColumnIdx = 0;
        let targetedSpan = null;
        let relativeInsertIndex = 0;

        let nextTabIndex = 0;
        let nextTabCol = -1;

        /**
         * 
         * none of this matters? you have a visual column index of 4?
         */

        // 3. Scan the cached spans to find where currentEditColumn lands
        for (let i = 0; i < lineSpans.length; i++) {
            const span = lineSpans[i];
            const spanLength = span.text.length;

            // If the cursor lands completely inside this span, or exactly on its trailing right edge
            if (currentEditColumn >= runningColumnIdx && currentEditColumn <= runningColumnIdx + spanLength) {
                targetedSpan = span;
                relativeInsertIndex = currentEditColumn - runningColumnIdx;
                
                // If the cursor hits exactly between two spans, your rule dictates targeting 
                // the left span at its trailing length index. We break early to lock onto it.
                break;
            }
            runningColumnIdx += spanLength;
        }

        // 4. If we successfully isolated the text slice segment inside the cache, modify it
        if (targetedSpan !== null) {
            // Decode only the new slice of un-drawn keys typed during this frame frame burst
            const freshlyTypedString = EDI_decoder.decode(
                EDI_cursor_textInsertionBuffer.subarray(
                    INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue], 
                    INTS[fEDI_cursor_editLength_characters]
                )
            );

            // Splice the text inline directly into the string reference inside the cache array frame
            targetedSpan.text = 
                targetedSpan.text.slice(0, relativeInsertIndex) + 
                freshlyTypedString + 
                targetedSpan.text.slice(relativeInsertIndex);
        }

        // 5. Commit the continuation value forward so the next frame knows where to pick up
        INTS[fEDI_cursor_edit_eventCount_drawingStateContinuationValue] = INTS[fEDI_cursor_editLength_characters];

        //// 6. Request a canvas redraw layout frame pass to force the changes onto the screen
        EDI_render_request(RenderKind_Scroll);
        //EDI_render_TextContent();
        //EDI_render_Cursor();
    }
}


function theNew_walkLineUntilIndexColumn() {
    let lineSpans = EDI_lineStringCache[i];
    if (lineSpans === undefined) {

    }
    //if () {
//
    //}
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
 * 
 * This function is sketchy but if you invoke EDI_render_do_Scroll immediately-soon after you'll probably be fine.
 * Cause this would mean you changed the virtual index but you never redrew the UI yet. But if you draw the UI in the same frame/etc... you're probably good.
 * This function is good for the sake of forcing a full screen redraw.
 */
function EDI_render_force_fullscreen_redraw() {
    INTS[fEDI_virtualIndexLine] = (EDI_lastReadNumber_scrollTop / INTS[fEDI_lineHeight]) | 0; // By bit operator or'ing with 0 you "cast" the number to a signed 32-bit integer (Int32).
    INTS[fEDI_ONSCROLLvirtualIndexLine] = INTS[fEDI_virtualIndexLine] + INTS[fEDI_virtualCount];
    EDI_render_do_Scroll();
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
    //let digitCountOfLargestLineNumber = positiveNumbersOnly_countDigitsLoop(lineCount);
    //if (INTS[fEDI_drawn_count_of_digits_longest_line_number] === digitCountOfLargestLineNumber) return false;
//
    //INTS[fEDI_drawn_count_of_digits_longest_line_number] = digitCountOfLargestLineNumber;
//
    //INTS[fEDI_gutterWidthStyleValue] = Math.ceil(digitCountOfLargestLineNumber * EDI_characterWidth);
    //INTS[fEDI_gutterWidthTotal] = INTS[fEDI_gutterWidthStyleValue] + CONST_EDI_gutterPaddingLeft + CONST_EDI_gutterPaddingRight;
    //gutterWidthTotal_withPxUnits = `${INTS[fEDI_gutterWidthTotal]}px`;
//
    //let gutterWidth = INTS[fEDI_gutterWidthStyleValue] + 'px';
    //EDI_gutter.style.width = gutterWidth;
//
    //EDI_text.style.left = gutterWidthTotal_withPxUnits;
    //EDI_scroll_viewport.style.left = gutterWidthTotal_withPxUnits;
//
    //for (let i = 0; i < INTS[fEDI_ArrayFrom_textElement_children_length]/*a 'ArrayFrom_gutter_children_length' would always be equal to the textElement equivalent*/; i++) {
    //    EDI_ringBuffer_gutter[i].style.width = gutterWidth;
    //}
//
    //return true;
}

/**
 * You need to change this logic to know the longest line.
 * Then when the longest line changes or some such likely related to finalization of an edit (not pending edits).
 * then at that point you redraw this.
 * 
 * This is not dependent on the gutter width?
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

        //for (let i = 0; i < INTS[fEDI_ArrayFrom_textElement_children_length]; i++) {
        //    EDI_ringBuffer_text[i].style.width = virtualization_horizontal_style_width_attribute;
        //}

        //EDI_cursor_caretRow.style.width = virtualization_horizontal_style_width_attribute;
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

function EDI_render_SelectionAndCursor() {
    const canvas = EDI_cursor_canvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const local_lineHeight = INTS[fEDI_lineHeight];
    const startLineIndex = INTS[fEDI_virtualIndexLine];
    const upperLineIndexExclusive = startLineIndex + INTS[fEDI_virtualCount];
    
    let viewportY = -(EDI_lastReadNumber_scrollTop % local_lineHeight);

    // --- STEP 1: RENDER SELECTION BOX BACKGROUND SPANS ---
    // (Assuming you track a selection range from anchorLine/Col to focusLine/Col)
    ctx.fillStyle = 'rgba(197, 198, 140, 0.25)'; // Highlight tint color

    if (EDI_cursor_hasSelection()) {
        EDI_createStyleForSelection(ctx, viewportY, local_lineHeight, startLineIndex);
    }

    // --- STEP 2: RENDER ACTIVE SOLID CURSOR LINE ---
    ctx.fillStyle = '#f2a72f'; // Solid cursor accent color
    const cursorLine = INTS[fEDI_cursor_indexLine];
    if (cursorLine >= startLineIndex && cursorLine < upperLineIndexExclusive) {
        const cursorX = INTS[fEDI_cursorVisualColumnIndex] * EDI_characterWidth;
        const cursorY = -(EDI_lastReadNumber_scrollTop % local_lineHeight) + ((cursorLine - startLineIndex) * local_lineHeight);
        
        EDI_cursor_cursorTranslateXValue = cursorX;
        ctx.fillRect(cursorX, cursorY, 2, local_lineHeight);
    }
}

function EDI_createStyleForSelection(ctx, viewportY, local_lineHeight, firstVirtualIndexLine) {
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

    /*
    But it just means you have a startLineSelectionWidth of 'startLineEntireVisualWidth - (startColumnVisualOfSelection * charWidth)'
    and the endLineSelectionWidth is 'endColumnVisualOfSelection'.
    */


    if (startLine > firstVirtualIndexLine) {
        viewportY += (local_lineHeight * (startLine - firstVirtualIndexLine));
    }


    if (startLine === INCLUSIVEendLine) {
        //lineSelectionDiv.style.transform = `translate(${start_visualColumnStart * EDI_characterWidth}px, ${INTS[fEDI_lineHeight] * startLine}px)`;
        //lineSelectionDiv.style.width = (end_visualColumnStart - start_visualColumnStart) * EDI_characterWidth + 'px';


        const selStartCol = start_visualColumnStart;
        const selEndCol = end_visualColumnStart;
        //
        // Fast Monospace Layout Math: Multiply columns directly by character width!
        const x = selStartCol * EDI_characterWidth;
        const width = (selEndCol - selStartCol) * EDI_characterWidth;
        //
        // Draw a background highlighting block behind the text positions
        ctx.fillRect(x, viewportY, width, local_lineHeight);


        viewportY += local_lineHeight;
    }
    else {
        {
        // start line
        //lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
        //lineSelectionDiv.style.transform = `translate(${start_visualColumnStart * EDI_characterWidth}px, ${INTS[fEDI_lineHeight] * startLine}px)`;
        EDI_ret_getLineBoundaryPositions_raw(startLine);
        let lineVisualWidth = EDI_getEntireLineVisualWidth(INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
        
        const selStartCol = start_visualColumnStart;
        const selEndCol = lineVisualWidth;
        //
        // Fast Monospace Layout Math: Multiply columns directly by character width!
        const x = selStartCol * EDI_characterWidth;
        const width = (selEndCol - selStartCol) * EDI_characterWidth;
        //
        // Draw a background highlighting block behind the text positions
        ctx.fillRect(x, viewportY, width, local_lineHeight);

        //lineSelectionDiv.style.width = (lineVisualWidth + 1 - start_visualColumnStart) * EDI_characterWidth + 'px';
        viewportY += local_lineHeight;
        }

        // between lines
        for (var lineI = startLine + 1; lineI < INCLUSIVEendLine; lineI++) {
            //lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
            //lineSelectionDiv.style.transform = `translate(0px, ${INTS[fEDI_lineHeight] * lineI}px)`;
            EDI_ret_getLineBoundaryPositions_raw(lineI);
            let lineVisualWidth = EDI_getEntireLineVisualWidth(INTS[fEDI_ret_getLineBoundaryPositions_start], INTS[fEDI_ret_getLineBoundaryPositions_end]);
            //lineSelectionDiv.style.width = (lineVisualWidth + 1) * EDI_characterWidth + 'px';

            const selStartCol = 0;
            const selEndCol = lineVisualWidth;
            //
            // Fast Monospace Layout Math: Multiply columns directly by character width!
            const x = selStartCol * EDI_characterWidth;
            const width = (selEndCol - selStartCol) * EDI_characterWidth;
            //
            // Draw a background highlighting block behind the text positions
            ctx.fillRect(x, viewportY, width, local_lineHeight);

            viewportY += local_lineHeight;
        }

        {
        // end line
        //lineSelectionDiv = textSelectionDiv.children[childDivIndex++];
        //lineSelectionDiv.style.transform = `translate(0px, ${INTS[fEDI_lineHeight] * INCLUSIVEendLine}px)`;
        //lineSelectionDiv.style.width = end_visualColumnStart * EDI_characterWidth + 'px';


        const selStartCol = 0;
        const selEndCol = end_visualColumnStart;
        //
        // Fast Monospace Layout Math: Multiply columns directly by character width!
        const x = selStartCol * EDI_characterWidth;
        const width = (selEndCol - selStartCol) * EDI_characterWidth;
        //
        // Draw a background highlighting block behind the text positions
        ctx.fillRect(x, viewportY, width, local_lineHeight);


        viewportY += local_lineHeight;
        }
    }
}

/**
 * This method will NOT "put a cursor on screen". You need to ensure
 * your cursor exists as a child by appendChild'ing to EDTIOR_cursorListElement.
 * This method instead only moves a cursor that ALREADY is being shown on screen.
 * 
 * If the 'cursor' is not EDI_primaryCursor, then the 'NOTscrollCursorIntoView' parameter has no effect.
 * i.e.: only the EDI_primaryCursor will ever be scrolled into view via this method.
 * 
 * This is not dependent on the gutter width?
 * 
 * @param {boolean} NOTscrollCursorIntoView 
 */
function EDI_drawCursor(NOTscrollCursorIntoView) {
    const newY = INTS[fEDI_cursor_indexLine] * INTS[fEDI_lineHeight];
    const newX = INTS[fEDI_cursorVisualColumnIndex] * EDI_characterWidth;

    EDI_scrollCursorIntoView();
    EDI_render_SelectionAndCursor();
    

    //if (newY !== INTS[fEDI_cursor_cursorTranslateYValue]) {
    //    INTS[fEDI_cursor_cursorTranslateYValue] = newY;
    //    EDI_cursor_caretRow.style.transform = `translateY(${newY}px)`;
    //}

    //if (newX !== EDI_cursor_cursorTranslateXValue) {
    //    EDI_cursor_cursorTranslateXValue = newX;
    //    EDI_cursor_cursorElement.style.transform = `translateX(${newX}px)`;
    //}

    //EDI_createStyleForSelection();

    //if (!NOTscrollCursorIntoView) {
    //    EDI_scrollCursorIntoView();
    //}

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
    }*/
    // The question comes down to what each stage of a setTimeout costs.
    // Previously I assumed 'setTimeout' allocated an object somewhere in the JavaScript heap and that it'd trigger JS GC in some way and cause visual jank.
    // Now I know it only allocates an object in C++, and the JavaScript to C++ (or vice versa) interactions are just done via the 'id'.
    // And maybe there is more to it than just an 'id' on the JavaScript side of things but I'm just modifying my assumptions a bit
    // based on new knowledge I've gained and seeing where it leads.
    //
    //clearTimeout(INTS[fEDI_cursorBlinkingTrailingEdgeTimeoutId]);
    //INTS[fEDI_cursorBlinkingTrailingEdgeTimeoutId] = setTimeout(EDI_cursorBlinkingTrailingEdge, 500);

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

function EDI_scrollCursorIntoView() {
    const scrollContainer = EDI_scroll_viewport;
    
    // 1. Get the viewport's current physical layout dimensions
    const viewportWidth = scrollContainer.clientWidth;
    const viewportHeight = scrollContainer.clientHeight;
    
    // Account for your gutter spacing layout allocation
    const gutterWidth = 60; 
    const usableWidth = viewportWidth - gutterWidth;

    // 2. Fetch your current cursor structural position data
    const cursorLine = INTS[fEDI_cursor_indexLine];
    const cursorCol = INTS[fEDI_cursor_indexColumn];
    const local_lineHeight = INTS[fEDI_lineHeight];

    // 3. Compute the cursor's absolute layout coordinates inside the full document space
    const absoluteX = cursorCol * EDI_characterWidth;
    const absoluteY = cursorLine * local_lineHeight;

    // Fetch where the scroll window is currently positioned
    let newScrollTop = scrollContainer.scrollTop;
    let newScrollLeft = scrollContainer.scrollLeft;

    // --- VERTICAL BOUNDS EVALUATION (Y-Axis) ---
    // If the cursor is above the top visible edge, scroll up to snap it to the top
    if (absoluteY < newScrollTop) {
        newScrollTop = absoluteY;
    } 
    // If the cursor is below the bottom visible edge, scroll down to bring it into view
    else if (absoluteY + local_lineHeight > newScrollTop + viewportHeight) {
        newScrollTop = absoluteY + local_lineHeight - viewportHeight;
    }

    // --- HORIZONTAL BOUNDS EVALUATION (X-Axis) ---
    // If the cursor is hidden behind the left gutter line, shift view left
    if (absoluteX < newScrollLeft) {
        newScrollLeft = absoluteX;
    } 
    // If the cursor is past the right screen border edge, shift view right
    else if (absoluteX + EDI_characterWidth > newScrollLeft + usableWidth) {
        newScrollLeft = absoluteX + EDI_characterWidth - usableWidth;
    }

    // 4. Update the native DOM properties only if a change actually occurred
    if (scrollContainer.scrollTop !== newScrollTop) {
        scrollContainer.scrollTop = newScrollTop;
    }
    if (scrollContainer.scrollLeft !== newScrollLeft) {
        scrollContainer.scrollLeft = newScrollLeft;
    }
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

function EDI_render_do_Resize() {
    EDI_resizeCanvases();
    set_EDI_recentBoundingClientRect_isNull_intFalsey(1);
    //EDI_render_do_Scroll();
    

    //INTS[fEDI_longestLine_length_PreviousValueWhenLastDrewHorizontalScrollbar] = 1; // necessary for the first render, otherwise the if statement sees 0 !== 0.
    //EDI_drawHorizontalScrollbar();

    //let remember_virtualCount = INTS[fEDI_virtualCount]; // for the first render this is 0 and thus it hits
    //INTS[fEDI_virtualCount] = Math.ceil(INTS[fEDI_lastReadNumber_offsetHeight] / INTS[fEDI_lineHeight]);
    //if (INTS[fEDI_virtualCount] !== remember_virtualCount) {
    //    // TODO: This only needs to grow or shrink (NOT recreate entirely)
    //    EDI_render_do_CreateViewport();
    //    // TODO: This gets ran twice when starting the app redundantly. (here and the setText for the empty null filename)
    //    // TODO: This only needs to draw the newly came into view lines (a prior necessity is 'EDI_render_do_CreateViewport' to grow / shrink first)
    //    EDI_render_force_fullscreen_redraw();
    //}
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
    else if (event.button === 3) {
        EDI_moveCursor_indexLine_indexColumn(INTS[fEDI_priorToLastJump_indexLine], INTS[fEDI_priorToLastJump_indexColumn]);
        return;
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
            EDI_doEditorGoToDefinitionRequest(event.ctrlKey);
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
        case '-':
            event.preventDefault();
            event.stopPropagation();
            EDI_moveCursor_indexLine_indexColumn(INTS[fEDI_priorToLastJump_indexLine], INTS[fEDI_priorToLastJump_indexColumn]);
            break;
    }
}

function EDI_onKeyDown_keyLengthEqualsOne_altKey(event) {
    
}
//#endregion

function EDI_render_do_ResetSyntaxHighlighting() {
    const EDI_lineStringCache_length = EDI_lineStringCache.length;
    for (let i = 0; i < EDI_lineStringCache_length; i++) {
        const lineObject = EDI_lineStringCache[i];
        lineObject.spans.length = 0;
        lineObject.tab_twoIndices_oneImplicitObject_startCol_tabWidth.length = 0;
    }
    EDI_render_force_fullscreen_redraw();
}

