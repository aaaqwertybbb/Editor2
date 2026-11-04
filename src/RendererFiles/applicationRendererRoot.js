init();

let APP_lineHeightStringWithPx = '';

let shouldUseCSharpToSaveFileWhenPossible = false;

/**
 * Connect to the single threaded C# console app (custom language server)
 * 
 * TODO: You need to be careful about a congested websocket buffer...
 * ...you say you want to remove the async logic because TCP will...
 * ...guarantee byte delivery in order...
 * ...and single threaded server means each message is only ever handled in order...
 * ...you perhaps need to coallesce or flush or etc... just keep this in mind.
 */
const socket = new WebSocket('ws://127.0.0.1:8080');

// Crucial for performance and byte-array replication
socket.binaryType = 'arraybuffer'; 

//socket.onopen = () => {
//    console.log('Connected to C# backend');
//};

socket.onmessage = (event) => {
    let view;
  
    if (typeof event.data === 'string' && event.data.length > 0) {
        if (mostRecent_kind === 3) {
            EDI_moveCursor_position(Number(event.data));
        }
        else if (mostRecent_kind === 4) {
            DIALOG_Debug_Refresh(JSON.parse(event.data));
        }
        else {
            // If the server sent it as text, convert text to a Uint8Array
            view = Uint8Array.fromBase64(event.data);
            EDI_styleBuffer = view;
            INTS[fEDI_styleBuffer_count] = EDI_styleBuffer.length;
            INTS[fEDI_styleBuffer_capacity] = EDI_styleBuffer.length;
            //view = new TextEncoder().encode(event.data);
            //EDI_styleBuffer = view;
        }
    } else if (event.data instanceof ArrayBuffer) {
        // If it's a true binary buffer
        view = new Uint8Array(event.data);
    }
};

let send_buffer = new Uint8Array(256);

let send_id = 0;

let mostRecent_kind = 0;

// Example function to send your transaction buffer
function sendTransaction_MessageKind_string(messageString) {
    if (socket.readyState !== WebSocket.OPEN) { throw new Exception('socket.readyState !== WebSocket.OPEN'); }

    if (messageString.length > send_buffer.length) { throw new Exception('messageString.length > send_buffer.length'); }

    mostRecent_kind = 1;

    let index = 0;

    send_buffer[0] = '1'.charCodeAt(0);
    send_buffer[1] = '_'.charCodeAt(0);

    index += 2;

    // TODO: measure byte length of a string without encode
    const aaa = EDI_encoder.encode(send_buffer.length);
    const byteLengthString = aaa.length + '';

    const writtenAaa = EDI_encoder.encodeInto(byteLengthString, send_buffer.subarray(index, send_buffer.length));

    index += writtenAaa.written;

    send_buffer[index] = '_'.charCodeAt(0);
    index += 1;

    const writtenBbb = EDI_encoder.encodeInto(messageString, send_buffer.subarray(index, send_buffer.length));

    index += writtenBbb.written;

    // High Performance Slice: Create a zero-allocation window/view over just the written bytes
    // .subarray() does NOT copy memory; it just shifts the byte pointer window
    const viewToSend = send_buffer.subarray(0, index);

    socket.send(viewToSend); // Sends raw binary data
}

/** TODO: This is likely to have a race condition issue because Anything other than sending the exact same bytes that the editor read from the OS is likely to have a race condition issue */
function sendTransaction_MessageKind_textDocument_didOpen(filePath) {
    if (socket.readyState !== WebSocket.OPEN) { throw new Exception('socket.readyState !== WebSocket.OPEN'); }

    if (filePath.length > send_buffer.length) { throw new Exception('filePath.length > send_buffer.length'); }

    mostRecent_kind = 2;

    let index = 0;

    send_buffer[0] = '2'.charCodeAt(0);
    send_buffer[1] = '_'.charCodeAt(0);

    index += 2;

    // TODO: measure byte length of a string without encode
    const aaa = EDI_encoder.encode(filePath);
    const byteLengthString = aaa.length + '';

    const writtenAaa = EDI_encoder.encodeInto(byteLengthString, send_buffer.subarray(index, send_buffer.length));

    index += writtenAaa.written;

    send_buffer[index] = '_'.charCodeAt(0);
    index += 1;

    const writtenBbb = EDI_encoder.encodeInto(filePath, send_buffer.subarray(index, send_buffer.length));

    index += writtenBbb.written;

    // High Performance Slice: Create a zero-allocation window/view over just the written bytes
    // .subarray() does NOT copy memory; it just shifts the byte pointer window
    const viewToSend = send_buffer.subarray(0, index);

    socket.send(viewToSend); // Sends raw binary data
}

function sendTransaction_MessageKind_textDocument_definition(positionIndex) {
    if (socket.readyState !== WebSocket.OPEN) { throw new Exception('socket.readyState !== WebSocket.OPEN'); }

    if (false && filePath.length > send_buffer.length) { throw new Exception('filePath.length > send_buffer.length'); }

    mostRecent_kind = 3;

    let index = 0;

    send_buffer[0] = '3'.charCodeAt(0);
    send_buffer[1] = '_'.charCodeAt(0);

    index += 2;

    var positionIndexString = positionIndex + '';

    // TODO: measure bytes that represent number digits without string
    const aaa = EDI_encoder.encode(positionIndexString);
    const byteLengthString = aaa.length + '';

    const writtenAaa = EDI_encoder.encodeInto(byteLengthString, send_buffer.subarray(index, send_buffer.length));

    index += writtenAaa.written;

    send_buffer[index] = '_'.charCodeAt(0);
    index += 1;

    const writtenBbb = EDI_encoder.encodeInto(positionIndexString, send_buffer.subarray(index, send_buffer.length));

    index += writtenBbb.written;

    // High Performance Slice: Create a zero-allocation window/view over just the written bytes
    // .subarray() does NOT copy memory; it just shifts the byte pointer window
    const viewToSend = send_buffer.subarray(0, index);

    socket.send(viewToSend); // Sends raw binary data
}

function sendTransaction_MessageKind_custom_editorGetNodesAdjacentToCursor(positionIndex) {
    if (socket.readyState !== WebSocket.OPEN) { throw new Exception('socket.readyState !== WebSocket.OPEN'); }

    if (false && filePath.length > send_buffer.length) { throw new Exception('filePath.length > send_buffer.length'); }

    mostRecent_kind = 4;

    let index = 0;

    send_buffer[0] = '4'.charCodeAt(0);
    send_buffer[1] = '_'.charCodeAt(0);

    index += 2;

    var positionIndexString = positionIndex + '';

    // TODO: measure bytes that represent number digits without string
    const aaa = EDI_encoder.encode(positionIndexString);
    const byteLengthString = aaa.length + '';

    const writtenAaa = EDI_encoder.encodeInto(byteLengthString, send_buffer.subarray(index, send_buffer.length));

    index += writtenAaa.written;

    send_buffer[index] = '_'.charCodeAt(0);
    index += 1;

    const writtenBbb = EDI_encoder.encodeInto(positionIndexString, send_buffer.subarray(index, send_buffer.length));

    index += writtenBbb.written;

    // High Performance Slice: Create a zero-allocation window/view over just the written bytes
    // .subarray() does NOT copy memory; it just shifts the byte pointer window
    const viewToSend = send_buffer.subarray(0, index);

    socket.send(viewToSend); // Sends raw binary data
}

function sendTransaction_MessageKind_custom_saveFile() {
    if (socket.readyState !== WebSocket.OPEN) { throw new Exception('socket.readyState !== WebSocket.OPEN'); }

    if (false && filePath.length > send_buffer.length) { throw new Exception('filePath.length > send_buffer.length'); }

    mostRecent_kind = 5;

    let index = 0;

    send_buffer[0] = '5'.charCodeAt(0);
    send_buffer[1] = '_'.charCodeAt(0);

    index += 2;

    //var positionIndexString = positionIndex + '';
//
    //// TODO: measure bytes that represent number digits without string
    //const aaa = EDI_encoder.encode(positionIndexString);
    //const byteLengthString = aaa.length + '';
//
    //const writtenAaa = EDI_encoder.encodeInto(byteLengthString, send_buffer.subarray(index, send_buffer.length));
//
    //index += writtenAaa.written;
//
    //send_buffer[index] = '_'.charCodeAt(0);
    //index += 1;
//
    //const writtenBbb = EDI_encoder.encodeInto(positionIndexString, send_buffer.subarray(index, send_buffer.length));
//
    //index += writtenBbb.written;

    // High Performance Slice: Create a zero-allocation window/view over just the written bytes
    // .subarray() does NOT copy memory; it just shifts the byte pointer window
    const viewToSend = send_buffer.subarray(0, index);

    socket.send(viewToSend); // Sends raw binary data
}

// Goal is to use the same wording as LSP where possible for clarity of communication.
const MessageKind_string = 1;
const MessageKind_textDocument_didOpen = 2;
const MessageKind_textDocument_definition = 3;
const MessageKind_custom_editorGetNodesAdjacentToCursor = 4;
const MessageKind_custom_saveFile = 5;

// The save can actually be done from the C# code.
// (from whichever it is more sensible to do from I mean)
// (cause I presume the UI would have the most overhead and that C# would recover from the GC overhead of a save much faster.)

function MAIN_encodeMessageObject(messageKind, messageObject) {
	let content = JSON.stringify(messageObject);
	let spacing = '\r\n\r\n';
	return `Content-Length: ${content.length}${spacing}${content}\n`;
}

function init() {
    document
        .getElementById('HEADER_buttonSettings')
        .addEventListener('click', HEADER_buttonSettings_onClick);

    window.myAPI.onMessage(window_myAPI_onMessage);

    const EDI_gotoF_button = document.getElementById('EDI_gotoF');
    EDI_gotoF_button.addEventListener('click', window.myAPI.editorDocumentSymbolsRequest);
    document.body.addEventListener('keydown', documentBody_onKeyDown);

    requestAnimationFrame(APP_render_init);
}

/**
 * TODO: "Nothing stops you" from interacting with the UI thus it is possible to do things pre-initialization? TODO: Don't let this be the case?
 */
function APP_render_init() {
    APP_measureLineHeightAndCharacterWidth();
    EDI_init();
}

function APP_measureLineHeightAndCharacterWidth() {
    const measureElement = document.createElement('div');
    measureElement.className = 'APP_MEASURE_ELEMENT';
    const textNode = document.createTextNode('');
    measureElement.appendChild(textNode);

    // AI is saying "// The foolproof way to prevent ALL scrollbars during measurement" is this paragraph of code.
    // The foolproof way to prevent ALL scrollbars during measurement
    const wrapper = document.createElement('div');
    wrapper.className = 'APP_MEASURE_ELEMENT_WRAPPER';

    wrapper.appendChild(measureElement);
    document.body.appendChild(wrapper);
    
    textNode.replaceData(0, textNode.length, "-"); // This permits me to in 'explorer.js' set the first span of every "tree-view-node" to be the same width, regardless of whether its content is '-', '+', or '' (an empty string). (1 of 2)
    let rect = measureElement.getBoundingClientRect();
    // line height is read here
    INTS[fAPP_lineHeight] = Math.ceil(rect.height); // get line height too while I'm here.
    const minusWidth = Math.ceil(rect.width);
    
    textNode.replaceData(0, textNode.length, "+"); // This permits me to in 'explorer.js' set the first span of every "tree-view-node" to be the same width, regardless of whether its content is '-', '+', or '' (an empty string). (2 of 2)
    rect = measureElement.getBoundingClientRect();
    const plusWidth = Math.ceil(rect.width);
    const largerWidth = minusWidth > plusWidth ? minusWidth : plusWidth; // 11
    INTS[fEXPLORER_firstSpanWidthValue] = largerWidth;
    EXPLORER_firstSpanWidth = INTS[fEXPLORER_firstSpanWidthValue] + 'px';

    wrapper.removeChild(measureElement);
    document.body.removeChild(wrapper);

    APP_lineHeightStringWithPx = INTS[fAPP_lineHeight] + 'px';
}

async function window_myAPI_onMessage(data) {
    switch (data.method) {
        case 'textDocument/documentSymbol':
            EDI_documentSymbolResult = data.result;
            if (!EDI_listComponent) {
                EDI_listComponent = new ListComponent();
            }
            EDI_listComponent.setItems(INTS[fAPP_lineHeight], INTS[fAPP_lineHeight] + 'px',
                EDI_listComponent_drawItemAction,
                EDI_listComponent_onkeydownAction,
                EDI_listComponent_getItemsCountFunc);
            DIALOG_show(DialogKind_DocumentSymbol, dialog_documentSymbol_onResizeAction, null);
        case 'textDocument/CustomFullFileLexRequest':
            EDI_styleBuffer = Uint8Array.fromBase64(data.result);
            INTS[fEDI_styleBuffer_count] = EDI_styleBuffer.length;
            INTS[fEDI_styleBuffer_capacity] = EDI_styleBuffer.length;
            break;
        case 'textDocument/CustomEditorGetNodesAdjacentToCursorFromLspRequest':
            DIALOG_Debug_Refresh(data.result);
            break;
        case 'textDocument/hover':
            if (BYTES[byteEDI_mousemove_eventListener_isActive] === 0) {
                TOOLTIP_show(data.result);
            }
            break;
        case 'textDocument/definition':
            if (data.result) {
                if (INTS[fEDI_cursor_indexLine] !== data.result.range.start.line && INTS[fEDI_cursor_indexColumn] !== data.result.range.start.character) {
                    INTS[fEDI_priorToLastJump_indexLine] = INTS[fEDI_cursor_indexLine];
                    INTS[fEDI_priorToLastJump_indexColumn] = INTS[fEDI_cursor_indexColumn];
                    EDI_moveCursor_indexLine_indexColumn(data.result.range.start.line, /*indexColumn*/ data.result.range.start.character);
                }
            }
            break;
        case 'textDocument/completion':
            if (data.result.items) {
                AUTOCOMPLETE_show(data.result);
            }
            break;
        case 'textDocument/completion_slice':
            // I don't think 'slice' is in LSP specification but I need to start like this cause it is only way I'll get something "initially working".
            //if (data.result.items) {
            //    AUTOCOMPLETE_show(data.result);
            //}
            AUTOCOMPLETE_slice(data.result);
            break;
        case 'textDocument/CustomEditorVerifyLspTextAgainstEditorTextRequest':
            alert('copied to clipboard the text that the language server thinks it is');
            break;
        case 'window/showMessage':
            alert(`${data.result.type}: ${data.result.message}`);
            break;
    }
}

function EDI_listComponent_getItemsCountFunc() {
    if (EDI_documentSymbolResult) {
        return EDI_documentSymbolResult.length;
    }
    else {
        return 0;
    }
}

function EDI_listComponent_onkeydownAction(div, index) {
    if (index === -1) {
        // TODO: if (index === -1)
    }
    else {
        // TODO: Ensure that json parsing the title like this is a safe way of doing things
        const startPosition = JSON.parse(div.title);
        EDI_moveCursor_indexLine_indexColumn(startPosition.line, startPosition.character);
    }
}

function EDI_listComponent_drawItemAction(div, index) {
    if (index === -1) {
        div.textContent = '';
        div.title = '';
        div.style.display = 'none';
    }
    else {
        let item = EDI_documentSymbolResult[index];
        div.textContent = item.name;
        div.title = JSON.stringify(item.range.start);
        div.style.display = '';
    }
}

function dialog_documentSymbol_onResizeAction() {
    if (EDI_listComponent) {
        EDI_listComponent.boundingClientRect_isValid = false;
        // TODO: You should probably be using 'event_scroll_WRAPIT'?
        EDI_listComponent.LIST_render_do_Scroll();
    }
}

async function documentBody_onKeyDown_saveFileAs(rawData) {
    const result = await window.myAPI.editorSaveFileAs(rawData.uint8arrayTextBytes, rawData.countOfBytesInUse, rawData.lineEndString, rawData.fileStartsWithBom);
    if (result.success) {
        EDI_textSourceIdentifier = result.absolutePath;
        EDI_FORMATTED_textSourceIdentifier = result.formattedAbsolutePath;
    }
}

function documentBody_onKeyDown(event) {
    switch (event.key) {
        case 's':
        case 'S':
            if (!event.ctrlKey) return;

            const unvalidatedAbsolutePath = EDI_textSourceIdentifier;
            const rawData = EDI_getFinalizedEditsAndRawSaveFileData();

            if (rawData.uint8arrayTextBytes) {
                event.preventDefault();
                event.stopPropagation();
                if (unvalidatedAbsolutePath === null) {
                    documentBody_onKeyDown_saveFileAs(rawData);
                }
                else if (shouldUseCSharpToSaveFileWhenPossible) {
                    sendTransaction_MessageKind_custom_saveFile();
                }
                else {
                    window.myAPI.editorSaveFile(unvalidatedAbsolutePath, rawData.uint8arrayTextBytes, rawData.countOfBytesInUse, rawData.lineEndString, rawData.fileStartsWithBom);
                }
            }
            return;
        case 'F':
            if (!event.ctrlKey) return;
            DIALOG_show(DialogKind_FindAll, null, null);
        case 'Escape':
            const editor = document.getElementById('EDITOR_inner_container');
            if (editor) {
                editor.focus();
            }
            return;
        case 'e':
            if (event.altKey) {
                EXPLORER_setShow(true);
                const EXPLORER_Element = document.getElementById('EXPLORER');
                if (EXPLORER_Element.children.length === 1) {
                    EXPLORER_Element.children[0].focus();
                }
            }
            return;
        case 'E':
            if (event.altKey && event.shiftKey) {
                const editor = document.getElementById('EDITOR_inner_container');
                if (editor) {
                    editor.focus();
                    EXPLORER_setShow(false);
                }
            }
            return;
        case 'd':
            if (event.altKey) {
                const dialogCloseButton = document.getElementById('DIALOG_closeButton');
                if (dialogCloseButton) {
                    dialogCloseButton.focus();
                }
            }
            return;
        case 'h':
            if (event.altKey) {
                const settingsButton = document.getElementById('HEADER_buttonSettings');
                if (settingsButton) {
                    settingsButton.focus();
                }
            }
            return;
    }
}

function HEADER_buttonSettings_onClick() {
    DIALOG_show(DialogKind_Settings, null, null);
}
