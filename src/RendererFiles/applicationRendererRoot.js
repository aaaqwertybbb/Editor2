init();

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

    const root = document.documentElement;
    const appLineHeight = INTS[fAPP_lineHeight] + 'px';
    const propertyName = '--APP-line-height';
    root.style.setProperty(propertyName, appLineHeight);
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
            EDI_styleBuffer_count = EDI_styleBuffer.length;
            EDI_styleBuffer_capacity = EDI_styleBuffer.length;
            break;
        case 'textDocument/hover':
            if (BYTES[byteEDI_mousemove_eventListener_isActive] === 0) {
                TOOLTIP_show(data.result);
            }
            break;
        case 'textDocument/definition':
            if (data.result) {
                EDI_moveCursor_indexLine_indexColumn(data.result.range.start.line, /*indexColumn*/ 0)
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
