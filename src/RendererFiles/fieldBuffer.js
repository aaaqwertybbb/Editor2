/*
#################
# Goal of file: #
#################

!!!!
99.9% of code should NEVER be doing what I'm doing here. I thought the idea sounded interesting so I went playing around with it.
!!!!

The 'f' prefix appears a lot in this file. It was to stand for 'field'.
I started with the INTS, then I thought "I can't use 'f' for the "fields" that are stored in the Uint8Array
otherwise I won't at a glace know whether the "const variable" is being used on the correct corresponding array."
So I ended up dropping the 'f' prefix for the Uint8Array even though that array just as much as the Uint32Array is conceptually
a bunch of "fields" in my mind.
i.e.: you'd have some class with fields, but now I'm just shoving them all into this array.

Every variable in javascript is in essence a reference.

Most engines optimize the storage of various primitives,
such that the reference's value is the value of the primitive itself.

They do this by tagging the reference to indicate that it is to be interpreted as a primitive value rather than a pointer.

That all being said.

The Garbage Collector when doing a marking phase of the "mark and sweep" algorithm still needs to
visit the primitive variables in order to confirm that they are tagged as a primitive.

The overhead of checking whether a variable is a primitive, then moving on to the next variable;
is less than that of if it were an object which then would require further visiting of the child nodes.
BUT even though it is less, this overhead is not zero.

This is VERY LIKELY over optimization. I wanted to try it nevertheless.
So, by allocating a Uint*Array, I can create a single reference that the garbage collector needs to check.
It sees that the children of that Uint*Array are primitive values, and thus it doesn't have to visit the children.
Thus 64 number variables, that would've been 64 visits during the marking phase of GC, become just 1 visit.


The next thing I'm doing is referring to these Uint*Array members by name through the use of const fat arrow functions.
I want to avoid the cost of invoking these const fat arrow functions, and remove the cost of their definitions.
The first statement needs to be that a JS engine might actually do what this file does at runtime through
their own inlining, or caching. But I wanted to ensure it occured in a way that felt confidently in control of.

So to have complete control over the inlining of some state I define const fat arrow functions that have an expression body.
I then use babel to replace all invocations of these fat arrow functions as the expression body itself.
Furthermore babel removes the definition of the const fat arrow function from the AST entirely so there is literally 0 overhead,
it is as if I typed the expression body everywhere I typed the fat arrow function when it comes to the end compiled file.
*/

/**
 * having a boolean be a byte isn't ideal, but most engines store them as either 4bytes or 8bytes
 * 
 * primarily the goal is to remove the variable from the marking phase of gc.
 * because the boolean variable could store anything so the gc still has to check that it still stores a primitive
 * and that takes time albeit a small amount of time.
 * 
 * TODO: index 8 is available because 'EDI_onScroll_bool' was removed.
 * 
 * The code does not make local variables such as: 'const bytes = const BYTES',
 * because ES6 modules are expected (and thus module scopes remove the usefulness of making a local variable):
 *     index.html the script tag: 'type="module" src="..."'
 * 
 * Important: use '0' or '1' when assigning to an array entry.
 *     - "When you assign true to an entry in a Uint8Array, JavaScript handles the conversion automatically, but it forces the engine to do extra work at runtime." Google AI
 *     - "passing a boolean directly to a typed array can cause microscopic stutters if it triggers a JIT deoptimization." Google AI
 * LessImportant: '!BYTES[byteEDI_mousemove_eventListener_isActive]' versus 'BYTES[byteEDI_mousemove_eventListener_isActive] === 0'.
 *     - I'm being told by Google AI that these are "equivalent" in terms of performance.
 *     - I read what it said and I more or less agree so I'm not overly pressed to make these changes as much as I was the assignments.
 *     - Essentially some minifiers actually will replace
 *         - 'false' with '!1' and 
 *         - 'true' with '!0'
 *     - i.e.: such an expression is known to be rather performant.
 */
const BYTES = new Uint8Array(53);

/** returns a number, beware '===' */
const get_EDI_detailRank = () => BYTES[0];
const set_EDI_detailRank = (byte) => BYTES[0] = byte;

/** returns a number, beware '===' */
const get_EDI_recentBoundingClientRect_isNull_intFalsey = () => BYTES[1];
const set_EDI_recentBoundingClientRect_isNull_intFalsey = (byte) => BYTES[1] = byte;
set_EDI_recentBoundingClientRect_isNull_intFalsey(1);

/** returns a number, beware '===' */
const get_EDI_findOverlay_show = () => BYTES[2];
const set_EDI_findOverlay_show = (byte) => BYTES[2] = byte;

/**
 * TODO: obsolete
 * 
 * returns a number, beware '==='
 */
const get_EDI_findOverlay_isBeingShownDueToMultiCursorMatching = () => BYTES[3];
const set_EDI_findOverlay_isBeingShownDueToMultiCursorMatching = (byte) => BYTES[3] = byte;

/** returns a number, beware '===' */
const get_EDI_fileStartsWithBom = () => BYTES[4];
const set_EDI_fileStartsWithBom = (byte) => BYTES[4] = byte;

/** returns a number, beware '===' */
const get_EDI_findOverlay_wasSearched = () => BYTES[5];
const set_EDI_findOverlay_wasSearched = (byte) => BYTES[5] = byte;

/** returns a number, beware '===' */
const get_EDI_findOverlay_options_matchWord = () => BYTES[6];
const set_EDI_findOverlay_options_matchWord = (byte) => BYTES[6] = byte;

const byteDIALOG_FindAll_options_matchWord = 7;

const byteDIALOG_Settings_isDark = 8;
BYTES[byteDIALOG_Settings_isDark] = 1;

const byteDIALOG_Settings_trueTabs_falseSpaces = 9;
BYTES[byteDIALOG_Settings_trueTabs_falseSpaces] = 1;

const byteDIALOG_Settings_editorDebugShowAdjacentCharacters = 10;

/** TODO: what is this? */
const byteDIALOG_hasBeenMeasured = 11;

const byteDIALOG_windowExists = 12;

const byteAUTOCOMPLETE_exists = 13;

const byteAUTOCOMPLETE_isRenderPending = 14;

const byteAUTOCOMPLETE_rect_isNull = 15;
BYTES[byteAUTOCOMPLETE_rect_isNull] = 1;

const byteAUTOCOMPLETE_isCheckingTrailingEdge = 16;

const byteAUTOCOMPLETE_scrollIsFetchingData = 17;

const byteWIDGET_isRenderPending = 18;

const byteDIALOG_isRenderPending = 19;

const byteTOOLTIP_isRenderPending = 20;

/**
 * 0 => None
 * 1 => Show
 * 2 => Hide
 */
const byteTOOLTIP_pending_renderKind = 21;

const byteTOOLTIP_exists = 22;

/** TODO: seemingly could be made obsolete sensibly */
const byteDIALOG_currentDialogKind = 23;

const byteMENU_isRenderPending = 24;

const byteWIDGET_WidgetKind_drawn = 25;

// ====
const byteTreeView_byteret_pooledNode_nodeKind = 26;
const byteEDI_byteret_pooledTrackedSyntax_trackedSyntaxKind = 26;
// ====

const byteEDI_cursor_enterKeyEventKind = 27;

const byteEDI_extensionKind = 28;



const byteEDI_isChecking_cursorBlinkTrailingEdge = 29;

const byteEDI_cursor_selectionDivExists = 30;

const byteEDI_onResize_hasTrailingCall = 31;

/** Also is used from 'EDI_render_do_SetText()', and 'EDI_render_do_Resize()', not just 'EDI_render_do_Scroll()' */
const byteisCheckingTrailingEdge = 32;

const byteisProcessingLspQueue = 33;

const byteEDI_isRenderPending = 34;

const byteEDI_mousemove_eventListener_isActive = 35;

const byteEXPLORER_show = 36;
BYTES[byteEXPLORER_show] = 1;

const byteEXPLORER_isRenderPending = 37;

const byteEXPLORER_isCheckingTrailingEdge = 38;

const byteEXPLORER_scrollIsFetchingData = 39;

const byteEXPLORER_boundingClientRect_isValid = 40;

const byteEDI_queueHead = 41;
const byteEDI_queueTail = 42;

const byteAUTOCOMPLETE_queueHead = 43;
const byteAUTOCOMPLETE_queueTail = 44;

const byteDIALOG_queueHead = 45;
const byteDIALOG_queueTail = 46;

const byteEXPLORER_queueHead = 47;
const byteEXPLORER_queueTail = 48;

const byteMENU_queueHead = 49;
const byteMENU_queueTail = 50;

const byteWIDGET_queueHead = 51;
const byteWIDGET_queueTail = 52;

// BYTES[byteEXPLORER_boundingClientRect_isValid]

// TODO: some things to consider when moving from a boolean to BYTES
// - [ ] triple equals
// - [ ] type coercion overhead
// - [ ] Extremely high access BYTES move to the int fields if there would otherwise be both a local reference to the byteFields and intFields if it is sensible.
// - [ ] Move stored enums here if they're <= 255

// inclusive final index is 44

// Choose a power of 2 for the buffer size (e.g., 16, 32, 64).
// 32 is usually plenty for a single animation frame queue.
//const BUFFER_SIZE = 32;
//const BUFFER_MASK = (BUFFER_SIZE - 1);
// TODO: you get `32 - 1` no matter whether you include the parenthesis or not / I don't feel like dealing with this right now.
const BUFFER_SIZE = 32;
const BUFFER_MASK = 31;

const CONST_EDI_ASCII_LINE_FEED = 10;
const CONST_EDI_ASCII_TAB = 9;
const CONST_EDI_ASCII_SPACE = 32;

/////////////////////

const CONST_js_DOUBLEQUOTE_str = '"';
const CONST_js_DOUBLEQUOTE_num = 34;

const CONST_js_SINGLEQUOTE_str = '\'';
const CONST_js_SINGLEQUOTE_num = 39;

const CONST_js_BACKTICK_str = '`';
const CONST_js_BACKTICK_num = 96;

const CONST_js_FORWARDSLASH_str = '/';
const CONST_js_FORWARDSLASH_num = 47;

const CONST_js_BACKSLASH_str = '\\';
const CONST_js_BACKSLASH_num = 92;

const CONST_js_ASTERISK_str = '*';
const CONST_js_ASTERISK_num = 42;

const CONST_js_LINEFEED_str = '\n';
const CONST_js_LINEFEED_num = 10;

const CONST_js_OPENPARENTHESIS_str = '(';
const CONST_js_OPENPARENTHESIS_num = 40;

const CONST_js_CLOSEPARENTHESIS_str = ')';
const CONST_js_CLOSEPARENTHESIS_num = 41;

const CONST_js_PERIOD_str = '.';
const CONST_js_PERIOD_num = 46;

const CONST_js_EQUALS_str = '=';
const CONST_js_EQUALS_num = 61;

const CONST_js_OPENBRACKET_str = '[';
const CONST_js_OPENBRACKET_num = 60;

const CONST_js_CLOSEBRACKET_str = ']';
const CONST_js_CLOSEBRACKET_num = 62;

const CONST_js_BANG_str = '!';
const CONST_js_BANG_num = 33;

const CONST_js_PLUS_str = '+';
const CONST_js_PLUS_num = 43;

const CONST_js_MINUS_str = '-';
const CONST_js_MINUS_num = 45;

const CONST_js_STAR_str = '*';
const CONST_js_STAR_num = 42;

const CONST_js_PERCENT_str = '%';
const CONST_js_PERCENT_num = 37;

const CONST_js_AMPERSAND_str = '&';
const CONST_js_AMPERSAND_num = 38;

const CONST_js_PIPE_str = '|';
const CONST_js_PIPE_num = 24;

const CONST_js_QUESTIONMARK_str = '?';
const CONST_js_QUESTIONMARK_num = 63;

const CONST_js_CARET_str = '^';
const CONST_js_CARET_num = 94;

// Well I know exactly why it is here I just... I'm afraid of commitment. And I've made a lot of decisions today so the idea of making one more just causes anxiety so I'm settling for commenting it out for now you know hwat I mean?
//const CONST_js_COLON_num = 58;

const CONST_EDI_gutterPaddingLeft = 3;
const CONST_EDI_gutterPaddingRight = 6;

const CONST_DIALOG_minTop = 8;
const CONST_DIALOG_minLeft = 8;
const CONST_DIALOG_minHeight = 100;
const CONST_DIALOG_minWidth = 100;

/** Pixels */
const CONST_EXPLORER_offsetPerDepth = 8;

// Google AI'd the bit logic
// Configuration matching our table above
const CONST_EXPLORER_KEY_BITS = 12;

// TODO: Consider using these (need to add them to babel plugin if you do)
//const CONST_EXPLORER_isExpandedText = '-';
//const CONST_EXPLORER_NOTisExpandedText = '+';
//const CONST_EXPLORER_cannotBeExpandedText = '';

/**
 * I'm not sure how large I want this, what matters is that I just have a size of anything for the time being, then can change this constant later.
 */
const CONST_EDI_cursor_GAP_BUFFER_CAPACITY = 32;

const CONST_AUTOCOMPLETE_topPadding = 4;

const CONST_EDI_cursor_htmlId = "EDI_cursor-1";


////////////////////////////
////////////////////////////
////////////////////////////

/**
 * unsigned int32 array
 * TODO: Rename to 'UINTS'?
 * 
 * The code does not make local variables such as: 'const ints = const INTS',
 * because ES6 modules are expected (and thus module scopes remove the usefulness of making a local variable):
 *     index.html the script tag: 'type="module" src="..."'
 */
const INTS = new Uint32Array(145);

const fEDI_lineHeight = 0;
INTS[fEDI_lineHeight] = 20;

/** The first line of text that you should see shown in the UI given the current scrollTop */
const fEDI_virtualIndexLine = 1;

/** The value of 'EDI_baseElement.scrollTop' at the most recent scroll event that occurred */
const fEDI_lastReadNumber_scrollTop = 2;

const fEDI_ONSCROLLvirtualIndexLine = 3;
//throw new Error('-1');
// This set used to be -1 to indicate a non existent value, 500 "seems to work" but a proof of it being an equivalent solution has not thoroughly been thought out, only a sort of "yeah that probably works" kinda vibe.
INTS[fEDI_ONSCROLLvirtualIndexLine] = 500;

/** Also is used from 'EDI_render_do_SetText()', and 'EDI_render_do_Resize()', not just 'EDI_render_do_Scroll()' */
const fEDI_scrollEndDeadline = 4;

const fEDI_virtualCount = 5;

const fEDI_ONSCROLLvirtualCount = 6;
INTS[fEDI_ONSCROLLvirtualCount] = 0;

/** TODO: obsolete */
const fEDI_findOverlay_isBeingShownDueToMultiCursorMatching_originMatchNumber = 7;

const fEDI_drawn_count_of_digits_longest_line_number = 8;

const fEDI_detail_smallPosition = 9;

const fEDI_detail_largePosition = 10;

const fEDI_detailRank3OriginLine = 11;

/**
 * Pixels.
 * 
 * The gutter width changes far more frequently than the line height.
 * That is why the gutter width is a JavaScript variable, and the styles are updated from JavaScript.
 * 
 * Whereas the line height is a css variable (and thus could cause layout for the entire application whenever it changes).
 */
const fEDI_gutterWidthStyleValue = 12;
INTS[fEDI_gutterWidthStyleValue] = 32;

/**
 * This is the sum of the 'fEDI_gutterWidthStyleValue()' in addition to paddig
 * consider 'gutterWidthTotal_withPxUnits'
 */
const fEDI_gutterWidthTotal = 13;
/** WARNING: This will not set 'gutterWidthTotal_withPxUnits' and thus is somewhat prone to a mistake at some point. */
INTS[fEDI_gutterWidthTotal] = 32;

const fEDI_didChangeTextDocument_version = 14;

const fEDI_longestLine_indexLine = 15;

const fEDI_longestLine_length = 16;

/**
 * The fEDI_contentWidth() is calculated via Math.ceil(someVar * otherVar) so this is faster to check whether content width will change rather than the multiplication and ceil.
 */
const fEDI_longestLine_length_PreviousValueWhenLastDrewHorizontalScrollbar = 17;

const fEDI_contentWidth = 18;

const fEDI_indent_SMALL_lineAndColumnIndices_indexLine = 19;

const fEDI_indent_startingIndex = 20;

const fEDI_recentBoundingClientRect_left = 21;

const fEDI_recentBoundingClientRect_top = 22;

// ====
const fTreeView_poolret_pooledNode_key = 23;
const fEDI_poolret_pooledTrackedSyntax_start = 23;

const fTreeView_poolret_pooledNode_depth = 24;
const fEDI_poolret_pooledTrackedSyntax_length = 24;
// ====

/**
 * Also is used from 'EDI_render_do_SetText()', and 'EDI_render_do_Resize()', not just 'EDI_render_do_Scroll()'
 * 
 * I'm gonna store this in the int32 array so that the editor scroll render function can access it from the already existing local reference of INTS.
 */
const fEDI_intFalsey_isScrolling = 25;

/**
 * I'm gonna store this in the int32 array so that the editor scroll render function can access it from the already existing local reference of INTS.
 */
const fEDI_cursor_editKind = 26;

const fEDI_cursor_indexLine = 27;
const fEDI_cursor_indexColumn = 28;

/**
 * When moving cursor vertically, if the current column index cannot be matched due to the upcoming line being too short,
 * then this will allow a later vertical movement to a line that is long enough to match the original column rather than the minimized one.
 */
const fEDI_cursor_STORED_visualWidth = 29;

const fEDI_cursor_cursorTranslateYValue = 30;
const fEDI_cursor_cursorTranslateXValue = 31;

const fEDI_cursor_selectionAnchor = 32;
const fEDI_cursor_selectionEnd = 33;

const fEDI_cursor_selectionIndexAnchorLine = 34;
const fEDI_cursor_selectionIndexAnchorColumn = 35;

const fEDI_cursor_selectionIndexEndLine = 36;
const fEDI_cursor_selectionIndexEndColumn = 37;

const fEDI_cursor_DRAWN_selectionAnchor = 38;
const fEDI_cursor_DRAWN_selectionEnd = 39;

const fEDI_cursor_DRAWN_selection_virtualIndexLine = 40;
const fEDI_cursor_DRAWN_selection_virtualCount = 41;

const fEDI_cursor_editLength = 42;
const fEDI_cursor_editPosition = 43;
const fEDI_cursor_editIndexLine = 44;
const fEDI_cursor_editIndexColumn = 45;
/**
 * the amount of characters that UI has changed with respect to the pending edit
 * per 'EDI_render_do', if the displacement is not the editLength then you know you need to "draw more of this edit" on the UI.
 * 
 * The awkward name is to avoid re-using similar words that already are used in other fields on this class.
 */
const fEDI_cursor_editRenderedDisplacement = 46;
/** TODO: perhaps you could determine this some other way, but tracking it for the moment is easiest and necessary if I'm to not give up on getting an initial solution to work, given my current mood and etc... */
const fEDI_cursor_editRenderedDisplacement_INDEX_LINE_OFFSET = 47;
const fEDI_cursor_END_editIndexLine = 48;
const fEDI_cursor_END_editIndexColumn = 49;
const fEDI_cursor_gapBufferCount = 50;

/**
 * TODO: probably is sensible to use this for the enter key too but I'm firstly adding it for the sake of backspace so
 * I don't have to waste time looping over the removed text to find the line end positions that are being removed.
 * (I could do some kind of other tracking but I chose not to for no particular reason, well I think I chose this one out of laziness and that the other solutions long term like a
 *  list at the editor level 1 of them that is shared among all cursors is probably better or something.)
 * 
 * ========
 * 
 * TODO: Cursor should store this as -1 to signify false,
 * and then it is a number 0 to ... the offset in the pending line end position list
 * and then you have another number too separately that says the length of line endings that this cursor contributed to modifying.
 */
const fEDI_cursor_editLineFeedCount = 51;


// TODO: Avoid re-using these locally after getting the w result (i.e.: avoid re-using over and over in a loop or something, probably make a local variable if accessed enough).
// TODO: Verify and update all the previously -1 cases
const fEDI_w_indexColumn_Goal = 52;
const fEDI_w_indexColumn_Sum = 53;

/**
 * TODO: isn't this just the column index now that there's just a single div?
 * 
 * TODO: MAYBEo-b-s-o-l-e-t-eMAYBE
 */
const fEDI_w_indexColumn_SpanTextContentRelative = 54;

// TODO: This -1
const fEDI_w_ringBufferIndex = 55;

// And this -1
const fEDI_ringBuffer_indexZero = 56;

/** The value of 'EDI_baseElement.scrollLeft' at the most recent scroll event that occurred */
const fEDI_lastReadNumber_scrollLeft = 57;

// just floor these on init / resize and set the style so if they want resize they have to explicit and it is non decimal?
const fEDI_lastReadNumber_offsetHeight = 58;

const fEDI_lastReadNumber_offsetWidth = 59;

/** TODO: Rename to 'fEDI_ringBuffer_length' */
const fEDI_ArrayFrom_textElement_children_length = 60;

const fEDI_EDI_mouseOver_event_clientY = 61;

const fEDI_EDI_mouseOver_event_clientX = 62;

const fEDI_EDI_cursorBlinkLastTimestamp = 63;

/**
 * TODO: This seems to be obsolete
 * 
 * 'EDI_init' and 'EDI_drawHorizontalScrollbar' related
 */
const fEDI_DRAWN_NUMBER_EDI_horizontal_scrollbar_style_left = 64;

/** TODO: What happens when you overflow 'INTS[fEDI_prevVli]' does it overflow such that you're the correct diff? */
const fEDI_prevVli = 65;
/** TODO: What happens when you overflow 'INTS[fEDI_prevVli]' does it overflow such that you're the correct diff? */
const fEDI_currVli = 66;

const fEDI_onResize_timer = 67;

const fEDI_hoverTimeout = 68;

// ====
/** 'ret_' will overwrite one another do not mix the function invocations without having read the values first */
const fEDI_ret_getLineAndColumnIndices_indexLine = 69;
/** 'ret_' will overwrite one another do not mix the function invocations without having read the values first */
const fEDI_ret_getLineBoundaryPositions_start = 69;
/** 'ret_' will overwrite one another do not mix the function invocations without having read the values first */
const fEDI_ret_getIndexFromX_indexColumn = 69;

/** 'ret_' will overwrite one another do not mix the function invocations without having read the values first */
const fEDI_ret_getLineAndColumnIndices_indexColumn = 70;
/** 'ret_' will overwrite one another do not mix the function invocations without having read the values first */
const fEDI_ret_getLineBoundaryPositions_end = 70;
/** 'ret_' will overwrite one another do not mix the function invocations without having read the values first */
const fEDI_ret_getIndexFromX_visualColumns = 70;
// ====

const fEDI_cursorVisualColumnIndex = 71;

/** TODO: I don't think you've ever actually used this, you only are setting it, obsolete? */
const fEDI_cursorVisualColumnIndex_relativeToThisLineIndex = 72;

const fEDI_ontab_visualWidth_perCharacter = 73;

const fEDI_cursor_selectionIndexAnchorColumnVISUAL = 74;
const fEDI_cursor_selectionIndexEndColumnVISUAL = 75;

const fEDI_cursor_selectionIndexAnchorColumnVISUAL_DRAWN = 76;
const fEDI_cursor_selectionIndexEndColumnVISUAL_DRAWN = 77;

const fEDI_detail_smallColumnVisual = 78;
const fEDI_detail_largeColumnVisual = 79;

const fEDI_cursor_cached_indentation_string_visualWidth = 80;

const fEDI_cursor_editLengthVisual = 81;

const fEDI_textByteList_capacity = 82;
const fEDI_textByteList_count = 83;

const fEDI_lineEndPositionList_capacity = 84;
const fEDI_lineEndPositionList_count = 85;

// ====
/** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
const fEDI_editret_cursor_EDI_duplicate_small = 86;
/** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
const fEDI_editret_RemoveSelection_smallPosition = 86;
/** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
const fEDI_editret_indentLess_startingLinePos_end = 86;
/** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
const fEDI_editret_cursor_gapBufferWriteToSpanElement_SpanTextContentRelativeIndex = 86;

/** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
const fEDI_editret_cursor_EDI_duplicate_length = 87;
/** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
const fEDI_editret_RemoveSelection_largePosition = 87;

/** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
const fEDI_editret_RemoveSelection_smallLineAndColumnIndices_small_indexLine = 88;
/** 'editret_' will overwrite one another do not mix the function invocations without having read the values first */
const fEDI_editret_RemoveSelection_smallLineAndColumnIndices_small_indexColumn = 88;
// ====

// I don't think 'slice' is in LSP specification but I need to start like this cause it is only way I'll get something "initially working".
/** TODO: This isn't used only set */
const fAUTOCOMPLETE_items_slice_start = 89;
/** TODO: This isn't used only set */
const fAUTOCOMPLETE_items_slice_end = 90;
const fAUTOCOMPLETE_items_totalLength = 91;

const fAUTOCOMPLETE_cursorIndex = 92;

const fAUTOCOMPLETE_rectHeight = 93;
const fAUTOCOMPLETE_rectLeft = 94;
/** TODO: This isn't used only set, but it probably will be used for mouse events just that they're not written yet? */
const fAUTOCOMPLETE_rectTop = 95;

const fAUTOCOMPLETE_sliceVirtualIndex_SLICE = 96;
const fAUTOCOMPLETE_sliceVirtualCount_SLICE = 97;
const fAUTOCOMPLETE_sliceRingBufferIndexZero_SLICE = 98;

const fAUTOCOMPLETE_virtualCount = 99;
const fAUTOCOMPLETE_virtualIndex = 100;
const fAUTOCOMPLETE_ringBufferIndexZero = 101;

const fAUTOCOMPLETE_scrollTop = 102;

const fAUTOCOMPLETE_scrollEndDeadline = 103;

const fAUTOCOMPLETE_WIDTH_NODE_DRAWN_NUMBER_IN_CH_UNITS_NO_PADDING = 104;
INTS[fAUTOCOMPLETE_WIDTH_NODE_DRAWN_NUMBER_IN_CH_UNITS_NO_PADDING] = 2;

/**
 * This value ought to be an int (no decimal places) due to its high frequency usage in drawing UI,
 * and visually this having decimal places being of little to no value to the user when you could just ceil whatever height measurement you get.
 * 
 * TODO: (speculation) I've never liked saying "line height" I believe that deals with the vertical alignment of text within some container is "line height" a good wording.
 * */
const fAPP_lineHeight = 105;
INTS[fAUTOCOMPLETE_WIDTH_NODE_DRAWN_NUMBER_IN_CH_UNITS_NO_PADDING] = 20;

/**
 * start it at 1 because you thought about starting it at 0 then using a prefix incrementation to ensure the 0 state is never used as a means of detecting an empty state
 * but if someone changes the code and moves it to postfix incrementation then everything breaks so why even take that risk when you can just start at 1
 * then if they go from postfix to prefix then you simply miss out on the number 1 and the first ticketId is 2 who cares...
 * 
 * ticketId because you're standing in line at the deli in the supermarket and you've grabbed from the machine a paper that has your number on it
 * and you're waiting for your number to be called so you can get the turkey
 * 
 * > "what is it called when you are in line at a deli and they have a machine that prints a paper with a number on it"
 * 
 * < It is called a take-a-number system or a queue management system. It uses a ticket dispenser to give out paper numbers so people can wait in order without standing in a tight line.
 * 
 * okay yeah it is a ticket dispenser we're good
 */
const fWIDGET_ticketId_counter = 106;
INTS[fWIDGET_ticketId_counter] = 1;

const fWIDGET_ticketId_drawn = 107;

const fWIDGETrenderKind_Show_countOfPendingRequests = 108;

const fMENU_ticketId_counter = 109;
INTS[fMENU_ticketId_counter] = 1;

const fMENU_ticketId_drawn = 110;

const fMENU_renderKind_Set_countOfPendingRequests = 111;



/**
 * TODO: This is approaching the point of being obsolete
 * 
 * 8 or the measured value
 */
const fEXPLORER_firstSpanWidthValue = 112;
INTS[fEXPLORER_firstSpanWidthValue] = 8;

const fEXPLORER_menuOptionX = 113;
const fEXPLORER_menuOptionY = 114;

const fEXPLORER_lastReadNumber_offsetWidth = 115;

/** TODO: this is not being used, only set, but it is surprising shouldn't this be used to get the virtual count? */
const fEXPLORER_lastReadNumber_offsetHeight = 116;

const fEXPLORER_cursorTranslateYNumber = 117;

const fEXPLORER_itemHeightTotal = 118;

/** Consider the existence of such methods as 'state_cursor_setIndex' before mutating state directly */
const fEXPLORER_cursorIndex = 119;

const fEXPLORER_virtualIndex_ofScrollTop = 120;

/** Hacky: Must initialize to a number other than 0 or else nothing renders. */
const fEXPLORER_virtualCount = 121;
INTS[fEXPLORER_virtualCount] = 1;

const fEXPLORER_ONSCROLLvirtualIndex = 122;
const fEXPLORER_ONSCROLLvirtualCount = 123;

const fEXPLORER_lastReadNumber_scrollLeft = 124;
const fEXPLORER_lastReadNumber_scrollTop = 125;

const fEXPLORER_ringBufferIndexZero = 126;

const fEXPLORER_ringBuffer_length = 127;

const fEXPLORER_start = 128;

const fEXPLORER_length = 129;

const fEXPLORER_onePositiveDiff_twoNegativeDiff_orThreeFullScreen = 130;

const fEXPLORER_caseThreeOrigin = 131;

/** TODO: what height should this start at? applicationRendererRoot.ts will eventually run initialization logic that actually does the measuring. */
const fEXPLORER_itemHeightNumber = 132;
INTS[fEXPLORER_itemHeightNumber] = 20;

const fEXPLORER_SET_ITEMS_itemHeightNumber = 133;

const fEXPLORER_WIDTH_NODE_DRAWN_NUMBER_IN_CH_UNITS_NO_PADDING = 134;

const fEXPLORER_LARGEST_DEPTH_SEEN_NOT_THE_CSS_JUST_THE_DEPTH = 135;

const fEXPLORER_scrollEndDeadline = 136;

const fEXPLORER_scrollFetchData_virtualIndex = 137;

const fEXPLORER_scrollFetchData_virtualCount = 138;

const fEXPLORER_scrollFetchData_ringBufferIndexZero = 139;

const fEXPLORER_pullData_array_count = 140;

const fEXPLORER_pullData_result_count = 141;

const fEXPLORER_boundingClientRect_height = 142;
const fEXPLORER_boundingClientRect_left = 143;
const fEXPLORER_boundingClientRect_top = 144;





// INTS[fEDI_textByteList_capacity]



// TODO: if (!MENU_SET_index) { MENU_SET_index = 0; }



// for the ringBufferIndexZero etc... consider using max value?
// Although it might "just work" because you're using locals which would become negative?
// TODO: figure it out



const EDI_baseElement = document.getElementById('EDITOR');

const EDI_scroll_viewport = EDI_baseElement.children[0];
const EDI_virtualization_horizontal = EDI_baseElement.children[0].children[0];
const EDI_gutter = EDI_baseElement.children[1];
const EDI_gutter_scroll_mover = EDI_baseElement.children[1].children[0];
const EDI_text = EDI_baseElement.children[2].children[0];
const EDI_selection = EDI_baseElement.children[2].children[0].children[0];
const EDI_cursorListElement = EDI_baseElement.children[2].children[0].children[1];
//const EDI_horizontal_scrollbar = EDI_baseElement.children[1].children[0];
//const EDI_horizontal_scrollbar_virtualization_boundary = EDI_baseElement.children[1].children[0].children[0];

/**
 * If you have an extension listed here, it is expected that the "function to invoke" exists.
 * As of right now any patterns to naming the function that gets invoked are tentative.
 * But I am not checking whether JS_full_lex or JS_line_lex exist, I'm just switching on ExtensionKind and presuming that function exists.
 */
const ExtensionKind_None = 0;
const ExtensionKind_JavaScript = 1;

/**
 * DeleteLtr and BackspaceRtl are both forms of removing text,
 * their edits are stored the same (i.e.: both in "the form of a delete" keypress)
 * The kind delete/backspace tells you how to restore the cursor when doing a ctrl+z and etc...?
 */
const EditKind_None = 0;
const EditKind_InsertLtr = 1;
const EditKind_DeleteLtr = 2;
const EditKind_BackspaceRtl = 3;
const EditKind_RemoveTextNoBatching = 4;
const EditKind_Tab = 5;
const EditKind_IndentMore = 6;
const EditKind_IndentLess = 7;
const EditKind_Enter = 8;
const EditKind_Paste = 9;
const EditKind_Duplicate = 10;

/**
 * TODO: Long term this likely should be removed and all enter key logic reduced into an insertion but this will help in the time being.
 * TODO: There's tons of '0' checks rather than using 'EnterKeyEventKind_None' that I'm seeing throughout the code...
 */
const EnterKeyEventKind_None = 0;
const EnterKeyEventKind_StartOfLine = 1;
const EnterKeyEventKind_AmongALine = 3;
const EnterKeyEventKind_EndOfLine = 4;
const EnterKeyEventKind_EndOfFile = 6;

/**
 * Do not change the order/values of these, they are used in equality comparisons, the larger the number says when double clicking between a character and a punctuation
 * whoever has larger number gets selected then the selection continues while the same kind is being read.
 * 
 * TODO: Bug only 1 character selected when punctuation then letterOrDigit click between them the letterOrDigit is more than 1 contiguous only 1 selected.
 */
const CharacterKind_None = 0;
const CharacterKind_Whitespace = 1;
const CharacterKind_Punctuation = 2;
const CharacterKind_LetterOrDigit = 3;

// see editorGlobal.js:
// > const count_of_wellknown_renderKinds = ...;
//
// RenderKind_Cursor_n is to say
// renderKind - (count_of_wellknown_renderKinds - 1) => render the cursor at cursorList[result];
// ...
// maybe I'll change this to be the id of the cursor at some point cause I'm not sure if it holds up with cursor movement possibly changing their order in the list.
// but for now...
const RenderKind_None = 0;
const RenderKind_Scroll = 1;
const RenderKind_Resize = 2;
const RenderKind_InsertLtr = 3;
const RenderKind_TabKey = 4;
const RenderKind_IndentMore = 5;
const RenderKind_IndentLess = 6;
const RenderKind_BackspaceRtl = 7;
const RenderKind_DeleteLtr = 8;
const RenderKind_RemoveSelection = 9;
const RenderKind_Enter = 10;
const RenderKind_DuplicateOrPaste = 11;
const RenderKind_Clear = 12;
const RenderKind_SetText = 13;
const RenderKind_CreateViewport = 14;
const RenderKind_SyntaxHighlighting = 15;
/** non-primaryCursors won't scroll into view, */
const RenderKind_Cursor_flag_scrollIntoViewExplicit = 16;
/** To have a cursor not scroll into view add request this render immediately after the 'RenderKind_Cursor_n'. */
const RenderKind_Cursor_flag_doNotScrollIntoView = 17;
/** Add the index of the cursor */
const RenderKind_Cursor_n = 18;

//const UI_SLOT_SIZE = 32;
/**
 * // TODO: you get `32 - 1` no matter whether you include the parenthesis or not / I don't feel like dealing with this right now.
 * // UI_SLOT_SIZE - 1 // 31 (binary: 00011111)
 */
const UI_SLOT_MASK = 31; // UI_SLOT_SIZE - 1 // 31 (binary: 00011111)

/**
 * Master allocation (e.g., 64 bytes total for two subsystems)
 * 
 * TODO: If you queue more than 32 renderKinds in a single frame you're gonna lose information. (remedy this?) see 'UI_SLOT_MASK = 31'
 */
const MASTER_RENDER_BUFFER = new Uint8Array(160 /* const MASTER_BUFFER_SIZE = 160; */);

// Define the unique byte offset where each UI's memory space begins
const OFFSET_DIALOG      = 0;  // Slots 0 to 31
const OFFSET_EXPLORER = 32; // Slots 32 to 63
const OFFSET_AUTOCOMPLETE = 64; // Slots 64 to 95
const OFFSET_WIDGET = 96; // Slots 96 to 127
const OFFSET_MENU = 128; // Slots 128 to 159


// TODO: '..._EDI_indent_ORIGINAL_indentBy()' is no longer in use














// TODO: probably can be made obsolete these various
// ```
// const fEDI_editret_RemoveSelection_smallPosition = 71;
// const fEDI_editret_RemoveSelection_largePosition = 72;
// ```
//
// if only one edit can exist at a time you only the count of int32 required for the edit which requires the most of them.
// and then you can share the int32 entries.
//
// tbh the same is kinda true for things like:
// const fEDI_ret_getLineBoundaryPositions_start = 88;
// const fEDI_ret_getLineBoundaryPositions_end = 89;
//
// you only need as many int32 as necessary for the largest amount of "return values" from a function.
// this means you'd have to immediately read them though so just think about it.
// maybe functions with low frequency invocations can share the same int32 entries or something.


/**
 * TODO: This comment was attached to the obsolete fDIALOG_width... int32's and may or may not be useful or meaningful I only glanced at it TODO: read the comment and decide.
 * 
 * defaults to viewport size then getBoundingClientRect says the exact pixels upon trying to resize
 * need to track resizes and store the useragent width/height by the onmousedown and then on resize get proportion and update left top width height.
 * 
 * 
 * 
 * 
 * TODO: This comment... determine if is meaningful / move it to the dialogGlobal.js if it is meaningful etc...
 * 
 * // TODO: Are 'fDIALOG_before_X' and 'fDIALOG_before_Y' actually doing anything?...
 * // ...When it comes to their after counterparts 'fDIALOG_after_X' and 'fDIALOG_after_Y'...
 * // ...it is believed that the counterparts are doing nothing, so also check the before.
 * 
 * 
 * 
 * 
 * TODO: This comment... determine if is meaningful / move it to the dialogGlobal.js if it is meaningful etc...
 * 
 * // TODO: What does 'fDIALOG_after_X' and 'fDIALOG_after_Y' even get used for? It seems they always only get set to 0 over and over and do nothing?
 * 
 * 
 */


// ============
// ============
// ============








// ============
// ============
// ============





// ============
// ============
// ============







// ============
// ============
// ============






/**
 * TODO: This comment was on both variables what was it referring to?
 * 
 * // same comment that pertains to EDI_cursor_EDI_paste_clipboardContent is somewhat relevant here
 * 
 * const fEDI_editret_cursor_EDI_duplicate_small = 99;
 * const fEDI_editret_cursor_EDI_duplicate_length = 100;
 */

