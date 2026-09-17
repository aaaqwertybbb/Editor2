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
    EXPLORER_init();
    EDI_init();
}

function APP_measureLineHeightAndCharacterWidth() {
    const measureElement = document.createElement('div');
    measureElement.textContent = "0";
    measureElement.style.width = "fit-content";
    measureElement.style.position = 'absolute';
    measureElement.style.visibility = 'hidden';
    measureElement.style.padding = '0';
    measureElement.style.border = 'none';
    measureElement.style.left = '0';
    measureElement.style.top = '0';

    // AI is saying "// The foolproof way to prevent ALL scrollbars during measurement" is this paragraph of code.
    // The foolproof way to prevent ALL scrollbars during measurement
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed'; // Removes it from the normal page layout flow
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.width = '0';        // Forces a tiny container footprint
    wrapper.style.height = '0';       // Forces a tiny container footprint
    wrapper.style.overflow = 'hidden'; // Prevents any layout leaking out or causing scrollbars
    wrapper.style.visibility = 'hidden'; // Keeps it completely invisible to the user

    wrapper.appendChild(measureElement);
    document.body.appendChild(wrapper);

    INTS[fAPP_lineHeight] = Math.ceil(measureElement.getBoundingClientRect().height);

    // This permits me to in 'explorer.js' set the first span of every "tree-view-node" to be the same width, regardless of whether its content is '-', '+', or '' (an empty string).
    // In theory this width calculation and 'INTS[fAPP_lineHeight]' can be done at the same time. But combining the steps could result in confusion or unexpected side effects when trying to modify lineheight or width but then again they do rely on the same css styling so you're already doing this
    measureElement.textContent = "-";
    const minusWidth = Math.ceil(measureElement.getBoundingClientRect().width);
    measureElement.textContent = "+";
    const plusWidth = Math.ceil(measureElement.getBoundingClientRect().width);
    const largerWidth = minusWidth > plusWidth ? minusWidth : plusWidth; // 11
    INTS[fEXPLORER_firstSpanWidthValue] = largerWidth;
    EXPLORER_firstSpanWidth = INTS[fEXPLORER_firstSpanWidthValue] + 'px';

    wrapper.removeChild(measureElement);
    document.body.removeChild(wrapper);

    const root = document.documentElement;
    const computedStyles = window.getComputedStyle(root);
    const appLineHeight = INTS[fAPP_lineHeight] + 'px';
    const propertyName = '--APP-line-height';
    if (computedStyles.getPropertyValue(propertyName) !== appLineHeight) {
        root.style.setProperty(propertyName, appLineHeight);
    }
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
            return DIALOG_show_async(DialogKind_DocumentSymbol, dialog_documentSymbol_onResizeAction);
        case 'textDocument/CustomFullFileLexRequest':
            {
                /*
                The C# code:
                ```csharp
                _psuedoFourFieldTrackedSyntaxList.Add((int)TrackedSyntaxKind.String);
                _psuedoFourFieldTrackedSyntaxList.Add(token.Position.line);
                _psuedoFourFieldTrackedSyntaxList.Add(token.Position.character);
                _psuedoFourFieldTrackedSyntaxList.Add(token.Length);
                ```
                */
                const fieldCount = 4;

                if (data.result.length % fieldCount !== 0) {
                    throw new Error('mismatched field count');
                }

                const data_result = data.result;
                const data_countAbstract = data_result.length / fieldCount;
                const local_EDI_lineEndPositionList_data = EDI_lineEndPositionList_data;
                const local_EDI_lineEndPositionList_count = EDI_lineEndPositionList_count;

                const trackedSyntaxList = EDI_trackedSyntaxList;
                trackedSyntaxList.clear();
                trackedSyntaxList.ensureCapacityForInsertion(0, data_countAbstract);

                // TODO: Don't do this, there likely are existing functions that will do this.
                for (let i = 0; i < data_countAbstract; i++) {
                    const line = data_result[(i * fieldCount) + 1];
                    let lineStart = 0;
                    if (line < local_EDI_lineEndPositionList_count && line !== 0) {
                        lineStart = local_EDI_lineEndPositionList_data[line - 1] + 1;
                    }

                    trackedSyntaxList.insert(
                        trackedSyntaxList.count_abstract,
                        data_result[(i * fieldCount) + 0],             // let trackedSyntaxKind = data_result[(i * fieldCount) + 0];
                        lineStart + data_result[(i * fieldCount) + 2], // let character = data_result[(i * fieldCount) + 2];
                        data_result[(i * fieldCount) + 3]);            // let length = data_result[(i * fieldCount) + 3];
                }
            }
            break;
        case 'textDocument/hover':
            {
                if (!BYTES[byteEDI_mousemove_eventListener_isActive]) {
                    TOOLTIP_show(data.result);
                }
            }
            break;
        case 'textDocument/definition':
            {
                if (data.result) {
                    EDI_moveCursor_indexLine_indexColumn(data.result.range.start.line, /*indexColumn*/ 0)
                }
            }
            break;
        case 'textDocument/completion':
            {
                if (data.result.items) {
                    AUTOCOMPLETE_show(data.result);
                }
            }
            break;
        case 'textDocument/completion_slice':
            {
                // I don't think 'slice' is in LSP specification but I need to start like this cause it is only way I'll get something "initially working".
                //if (data.result.items) {
                //    AUTOCOMPLETE_show(data.result);
                //}
                AUTOCOMPLETE_slice(data.result);
            }
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

async function documentBody_onKeyDown(event) {
    switch (event.key) {
        case 's':
        case 'S':
            if (!event.ctrlKey) return;
            const unvalidatedAbsolutePath = EDI_textSourceIdentifier;
            const rawData = EDI_getFinalizedEditsAndRawSaveFileData();
            if (rawData.uint8arrayTextBytes) {
                event.preventDefault();
                event.stopPropagation();
                return window.myAPI.editorSaveFile(unvalidatedAbsolutePath, rawData.uint8arrayTextBytes, rawData.countOfBytesInUse, rawData.lineEndString, rawData.fileStartsWithBom);
            }
            return;
        case 'F':
            if (!event.ctrlKey) return;
            return DIALOG_show_async(DialogKind_FindAll);
        case 'Escape':
            // TODO: Provide a way to disable the next (body, and useCapture) 'Escape' keypress...
            // ...so a widget can restore focus to the relevant UI rather than
            // the 'EDITOR' when the user presses 'Escape' to "cancel".
            const editor = document.getElementById('EDITOR');
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
                const editor = document.getElementById('EDITOR');
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

async function HEADER_buttonSettings_onClick() {
    return DIALOG_show_async(DialogKind_Settings);
}
