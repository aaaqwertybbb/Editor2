//__#__
// preprocessor.cjs
import "./fieldBuffer"
//__#__

const DialogKind_None = 0;
const DialogKind_FindAll = 1;
const DialogKind_Settings = 2;
const DialogKind_DocumentSymbol = 3;
const DialogKind_Debug = 4;

const DIALOGrenderKind_None = 0;
const DIALOGrenderKind_Show = 1;
const DIALOGrenderKind_Hide = 2;
const DIALOGrenderKind_DimensionsChanged = 3;

// No onComplete because all of that logic goes in the respective case of 'switch (BYTES[byteDIALOG_currentDialogKind])'.

/**
 * @callback DIALOG_onResizeAction when the dialog is repositioned, the bounding client rect data of the component being displayed within it needs to be invalidated. This is the API to do that.
 */

/**
 * @typedef {Object} DialogRequest
 * @property {number} dialogKind
 * @property {DIALOG_onResizeAction} onResizeAction
 * @property {HTMLElement} elementToFocusOnDialogHideInitiated the HTML element to set focus to after initiating a hide of the "dialog window". The "dialog window" is the overlay in and of itself.
 * @property {boolean} disableFocusOnDialogHideInitiated (see: elementToFocusHideInitiated "dialog window" already exists, and you make a followup request that swaps the component being displayed within, this does NOT initiate a hide of the "dialog window". An action such as clicking the 'x' button is what constitutes initiates a hide of the "dialog window".
 * @property {number} width
 * @property {number} height
 * @property {number} left
 * @property {number} top
 * @property {number} width_DRAWN
 * @property {number} height_DRAWN
 * @property {number} left_DRAWN
 * @property {number} top_DRAWN
 * @property {number} before_X
 * @property {number} before_Y
 */

/**
 * @type {DialogRequest}
 */
let DIALOG_request = null;

function DIALOG_render_request(renderKind) {
    if (BYTES[byteDIALOG_queueHead] !== BYTES[byteDIALOG_queueTail]) {
        const lastAbsoluteIndex = OFFSET_DIALOG + ((BYTES[byteDIALOG_queueTail] - 1) & UI_SLOT_MASK);
        if (MASTER_RENDER_BUFFER[lastAbsoluteIndex] === renderKind) {
            return;
        }
    }

    const absoluteIndex = OFFSET_DIALOG + (BYTES[byteDIALOG_queueTail] & UI_SLOT_MASK);
    MASTER_RENDER_BUFFER[absoluteIndex] = renderKind;
    BYTES[byteDIALOG_queueTail]++;
    
    if (BYTES[byteDIALOG_isRenderPending] === 0) {
        BYTES[byteDIALOG_isRenderPending] = 1;
        requestAnimationFrame(DIALOG_render_do);
    }
}

function DIALOG_render_do() {
    while (BYTES[byteDIALOG_queueHead] !== BYTES[byteDIALOG_queueTail]) {
        // 1. Wrap the virtual pointer to 0-31, then add the base offset
        const absoluteIndex = OFFSET_DIALOG + (BYTES[byteDIALOG_queueHead] & UI_SLOT_MASK);
        const renderKind = MASTER_RENDER_BUFFER[absoluteIndex];
        BYTES[byteDIALOG_queueHead]++; 

        switch (renderKind) {
            case DIALOGrenderKind_Show:
                DIALOG_render_do_Show();
                break;
            case DIALOGrenderKind_Hide:
                DIALOG_render_do_Hide();
                break;
            case DIALOGrenderKind_DimensionsChanged:
                DIALOG_render_do_DimensionsChanged();
                break;
        }
    }
    BYTES[byteDIALOG_isRenderPending] = 0;
}

function DIALOG_render_do_DimensionsChanged() {
    // TODO: getting the dialog element with 'getElementById' each invocation is not ideal.
    let DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    if (DIALOG_request.left_DRAWN !== DIALOG_request.left) {
        DIALOG_request.left_DRAWN = DIALOG_request.left;
        DIALOG_element.style.left = `${DIALOG_request.left_DRAWN}px`;
    }
    if (DIALOG_request.top_DRAWN !== DIALOG_request.top) {
        DIALOG_request.top_DRAWN = DIALOG_request.top;
        DIALOG_element.style.top = `${DIALOG_request.top_DRAWN}px`;
    }
    if (DIALOG_request.width_DRAWN !== DIALOG_request.width) {
        DIALOG_request.width_DRAWN = DIALOG_request.width;
        DIALOG_element.style.width = `${DIALOG_request.width_DRAWN}px`;
    }
    if (DIALOG_request.height_DRAWN !== DIALOG_request.height) {
        DIALOG_request.height_DRAWN = DIALOG_request.height;
        DIALOG_element.style.height = `${DIALOG_request.height_DRAWN}px`;
    }
}

function DIALOG_render_do_Show() {
    if (BYTES[byteDIALOG_currentDialogKind] !== DialogKind_None) {
        BYTES[byteDIALOG_HIDE_shouldRestoreFocus] = 1;
        DIALOG_render_do_Hide();
    }

    if (!DIALOG_request.elementToFocusOnDialogHideInitiated) {
        DIALOG_request.elementToFocusOnDialogHideInitiated = document.activeElement;
    }

    let DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) {
        DIALOG_element = document.createElement('div');
        DIALOG_element.id = "DIALOG";
        document.body.appendChild(DIALOG_element);
    }

    DIALOG_createWindow();

    switch (BYTES[byteDIALOG_currentDialogKind]) {
        case DialogKind_FindAll:
            DIALOG_FindAll_Create();
        case DialogKind_Settings:
            DIALOG_Settings_Create();
        case DialogKind_DocumentSymbol:
            DIALOG_DocumentSymbol_Create();
        case DialogKind_Debug:
            DIALOG_Debug_Create();
    }

    BYTES[byteDIALOG_currentDialogKind] = DIALOG_request.dialogKind;
}

function DIALOG_show(dialogKind, onResizeAction, elementToFocusOnDialogHideInitiated) {
    const local_request = {
        dialogKind: dialogKind,
        onResizeAction: onResizeAction,
        elementToFocusOnDialogHideInitiated: elementToFocusOnDialogHideInitiated,
        width: 0,
        height: 0,
        left: 0,
        top: 0,
        width_DRAWN: 0,
        height_DRAWN: 0,
        left_DRAWN: 0,
        top_DRAWN: 0,
        before_X: 0,
        before_Y: 0
    };
    if (DIALOG_request) {
        local_request.width = DIALOG_request.width;
        local_request.height = DIALOG_request.height;
        local_request.left = DIALOG_request.left;
        local_request.top = DIALOG_request.top;
        local_request.width_DRAWN = DIALOG_request.width_DRAWN;
        local_request.height_DRAWN = DIALOG_request.height_DRAWN;
        local_request.left_DRAWN = DIALOG_request.left_DRAWN;
        local_request.top_DRAWN = DIALOG_request.top_DRAWN;
    }
    DIALOG_request = local_request;
    DIALOG_render_request(DIALOGrenderKind_Show);
}

function DIALOG_render_do_Hide() {
    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    switch (BYTES[byteDIALOG_currentDialogKind]) {
        case DialogKind_FindAll:
            DIALOG_FindAll_Delete();
            break;
        case DialogKind_Settings:
            DIALOG_Settings_Delete();
            break;
        case DialogKind_DocumentSymbol:
            DIALOG_DocumentSymbol_Delete();
            break;
        case DialogKind_Debug:
            DIALOG_Debug_Delete();
            break;
    }

    DIALOG_deleteWindow();

    DIALOG_element.remove();
    BYTES[byteDIALOG_currentDialogKind] = DialogKind_None;
}

/**
 * The dialog has completeForm baked into the hide because "completeForm" isn't quite relevant in this dialog scenario
 * TODO: maybe separate it just for pattern's sake.
 * TODO: fix the naming of everything in the app, "hide" is not accurate you are removing that UI element for 99% of the cases that use the word "hide".
 * TODO: That's the word you wanted when thinking about "delete" and "destroy", the word is "remove".
 */
function DIALOG_hide() {
    const local_request = DIALOG_request;
    if (local_request === null) {
        // TODO: Consider adding 'DIALOG_render_request(DIALOGrenderKind_Hide);' here for each respective UI to be safe (but don't end up with render_do_Hide throwing a null exception when the UI isn't there...)?
        DIALOG_render_request(DIALOGrenderKind_Hide);
        return; // TODO: Since you remove the events in DIALOG_hide you shouldn't need this.
    }
    if (!local_request.disableFocusOnDialogHideInitiated && local_request.elementToFocusOnDialogHideInitiated) {
        local_request.elementToFocusOnDialogHideInitiated.focus();
    }
    DIALOG_render_request(DIALOGrenderKind_Hide);
}

function DIALOG_closeButton_onclick() {
    DIALOG_hide();
}

function DIALOG_resize_onmouseenter(event) {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    if (event.buttons & 1) {
        // while resizing you went from one end to the other and it bugged out
        return;
    }

    let resize = document.getElementById('DIALOG_resize');
    if (!resize) return;

    // TODO: cache the bounding client rect
    let dialogBoundingClientRect = DIALOG_element.getBoundingClientRect();

    DIALOG_resize_setCursor(event.clientX, event.clientY, dialogBoundingClientRect, resize);
}

function DIALOG_resize_onmousedown(event) {
    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    let resize = document.getElementById('DIALOG_resize');
    if (!resize) return;

    // TODO: cache the bounding client rect
    let dialogBoundingClientRect = DIALOG_element.getBoundingClientRect();

    DIALOG_resize_setCursor(event.clientX, event.clientY, dialogBoundingClientRect, resize);

    DIALOG_request.before_X = event.clientX;
    DIALOG_request.before_Y = event.clientY;

    DIALOG_request.left = dialogBoundingClientRect.left;
    DIALOG_request.top = dialogBoundingClientRect.top;
    DIALOG_request.width = dialogBoundingClientRect.width;
    DIALOG_request.height = dialogBoundingClientRect.height;
    BYTES[byteDIALOG_hasBeenMeasured] = 1;

    document.body.classList.add('unselectable');
    window.addEventListener('mousemove', DIALOG_resize_body_onmousemove, /*useCapture*/ true);
}

/**
 * does not redraw, only preps the state to be redrawn
 */
function DIALOG_n_resize_calcOnly(diff_Y, clientY) {
    if (diff_Y < 0) {
        let absdiff_Y = Math.abs(diff_Y);
        if (DIALOG_request.top <= CONST_DIALOG_minTop) {
            return; // TODO: ...
        }
        else if (DIALOG_request.top - absdiff_Y < CONST_DIALOG_minTop) {
            clientY += (absdiff_Y - (DIALOG_request.top - CONST_DIALOG_minTop));
            absdiff_Y = DIALOG_request.top - CONST_DIALOG_minTop;
        }
        DIALOG_request.top -= absdiff_Y;
        DIALOG_request.height += absdiff_Y;
        DIALOG_request.before_Y = clientY;
    }
    else {
        let absdiff_Y = Math.abs(diff_Y);
        if (DIALOG_request.height <= CONST_DIALOG_minHeight) {
            return; // TODO: ...
        }
        else if (DIALOG_request.height - absdiff_Y < CONST_DIALOG_minHeight) {
            clientY -= (absdiff_Y - (DIALOG_request.height - CONST_DIALOG_minHeight));
            absdiff_Y = DIALOG_request.height - CONST_DIALOG_minHeight;
        }
        DIALOG_request.height -= absdiff_Y;
        DIALOG_request.top += absdiff_Y;
        DIALOG_request.before_Y = clientY;
    }
}

/** does not redraw, only preps the state to be redrawn */
function DIALOG_e_resize_calcOnly(diff_X, clientX) {
    if (diff_X < 0) {
        let absdiff_X = Math.abs(diff_X);
        if (DIALOG_request.width <= CONST_DIALOG_minWidth) {
            return; // TODO: ...
        }
        else if (DIALOG_request.width - absdiff_X < CONST_DIALOG_minWidth) {
            clientX += (absdiff_X - (DIALOG_request.width - CONST_DIALOG_minWidth));
            absdiff_X = DIALOG_request.width - CONST_DIALOG_minWidth;
        }
        DIALOG_request.width -= absdiff_X;
        DIALOG_request.before_X = clientX;
    }
    else {
        let absdiff_X = Math.abs(diff_X);
        if (DIALOG_request.left + DIALOG_request.width + 8 >= window.innerWidth) {
            return; // TODO: ...
        }
        else if (DIALOG_request.left + DIALOG_request.width + 8 + absdiff_X > window.innerWidth) {
            let DIALOG_maxWidth = window.innerWidth - 8 - DIALOG_request.left;
            clientX -= (absdiff_X - (DIALOG_maxWidth - DIALOG_request.width));
            absdiff_X = DIALOG_maxWidth - DIALOG_request.width;
        }
        DIALOG_request.width += absdiff_X;
        DIALOG_request.before_X = clientX;
    }
}

/** does not redraw, only preps the state to be redrawn */
function DIALOG_s_resize_calcOnly(diff_Y, clientY) {
    if (diff_Y < 0) {
        let absdiff_Y = Math.abs(diff_Y);
        if (DIALOG_request.height <= CONST_DIALOG_minHeight) {
            return; // TODO: ...
        }
        else if (DIALOG_request.height - absdiff_Y < CONST_DIALOG_minHeight) {
            // tighten in the other direction because overshoot
            clientY += (absdiff_Y - (DIALOG_request.height - CONST_DIALOG_minHeight));
            absdiff_Y = DIALOG_request.height - CONST_DIALOG_minHeight;
        }
        DIALOG_request.height -= absdiff_Y;
        DIALOG_request.before_Y = clientY;
    }
    else {
        let absdiff_Y = Math.abs(diff_Y);
        if (DIALOG_request.top + 8 + DIALOG_request.height >= window.innerHeight) {
            return; // TODO: ...
        }
        else if (DIALOG_request.top + 8 + DIALOG_request.height + absdiff_Y > window.innerHeight) {
            // tighten in the other direction because overshoot
            // -8 is the hardcoded pixel size that the resize element overhangs the dialog.
            let DIALOG_maxHeight = window.innerHeight - 8 - DIALOG_request.top;
            clientY -= (absdiff_Y - (DIALOG_maxHeight - DIALOG_request.height));
            absdiff_Y = DIALOG_maxHeight - DIALOG_request.height;
        }
        DIALOG_request.height += absdiff_Y;
        DIALOG_request.before_Y = clientY;
    }
}

/** does not redraw, only preps the state to be redrawn */
function DIALOG_w_resize_calcOnly(diff_X, clientX) {
    if (diff_X < 0) {
        let absdiff_X = Math.abs(diff_X);
        if (DIALOG_request.left <= CONST_DIALOG_minLeft) {
            return; // TODO: ...
        }
        else if (DIALOG_request.left - absdiff_X < CONST_DIALOG_minLeft) {
            clientX += (absdiff_X - (DIALOG_request.left - CONST_DIALOG_minLeft));
            absdiff_X = DIALOG_request.left - CONST_DIALOG_minLeft;
        }
        DIALOG_request.width += absdiff_X;
        DIALOG_request.left -= absdiff_X;
        DIALOG_request.before_X = clientX;
    }
    else {
        let absdiff_X = Math.abs(diff_X);
        if (DIALOG_request.width <= CONST_DIALOG_minWidth) {
            return; // TODO: ...
        }
        else if (DIALOG_request.width - absdiff_X < CONST_DIALOG_minWidth) {
            clientX += (absdiff_X - (DIALOG_request.width - CONST_DIALOG_minWidth));
            absdiff_X = DIALOG_request.width - CONST_DIALOG_minWidth;
        }
        DIALOG_request.width -= absdiff_X;
        DIALOG_request.left += absdiff_X;
        DIALOG_request.before_X = clientX;
    }
}

function DIALOG_resize_body_onmousemove(event) {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    let resize = document.getElementById('DIALOG_resize');
    if (!resize) return;

    if (event.buttons & 1) {
        // TODO: I literally can't even right now with this empty if statement
    }
    else {
        document.body.classList.remove('unselectable');
        window.removeEventListener('mousemove', DIALOG_resize_body_onmousemove, /*useCapture*/ true);
        if (DIALOG_request.onResizeAction) DIALOG_request.onResizeAction();
        return;
    }

    let diff_X = event.clientX - DIALOG_request.before_X;
    let diff_Y = event.clientY - DIALOG_request.before_Y;

    if (diff_Y > -1 && diff_Y < 1) diff_Y = 0;
    if (diff_X > -1 && diff_X < 1) diff_X = 0;

    if (diff_X === 0 && diff_Y === 0) {
        return;
    }

    let clientX = event.clientX;
    let clientY = event.clientY;

    switch (resize.style.cursor) {
        case 'nw-resize':
            DIALOG_n_resize_calcOnly(diff_Y, clientY);
            DIALOG_w_resize_calcOnly(diff_X, clientX);
            break;
        case 'w-resize':
            DIALOG_w_resize_calcOnly(diff_X, clientX);
            break;
        case 'sw-resize':
            DIALOG_s_resize_calcOnly(diff_Y, clientY);
            DIALOG_w_resize_calcOnly(diff_X, clientX);
            break;
        case 'n-resize':
            DIALOG_n_resize_calcOnly(diff_Y, clientY);
            break;
        case 's-resize':
            DIALOG_s_resize_calcOnly(diff_Y, clientY);
            break;
        case 'ne-resize':
            DIALOG_n_resize_calcOnly(diff_Y, clientY);
            DIALOG_e_resize_calcOnly(diff_X, clientX);
            break;
        case 'e-resize':
            DIALOG_e_resize_calcOnly(diff_X, clientX);
            break;
        case 'se-resize':
            DIALOG_s_resize_calcOnly(diff_Y, clientY);
            DIALOG_e_resize_calcOnly(diff_X, clientX);
            break;
        default:
            return;
    }

    DIALOG_render_request(DIALOGrenderKind_DimensionsChanged);
}

function DIALOG_resize_setCursor(clientX, clientY, dialogBoundingClientRect, resize) {
    let rX = clientX - dialogBoundingClientRect.left;
    let rY = clientY - dialogBoundingClientRect.top;
    // left to right
    //     top to bottom
    if (rX < 0) {
        if (rY < 0) {
            resize.style.cursor = 'nw-resize';
        }
        else if (clientY < dialogBoundingClientRect.top + dialogBoundingClientRect.height) {
            resize.style.cursor = 'w-resize';
        }
        else {
            resize.style.cursor = 'sw-resize';
        }
    }
    else if (clientX < dialogBoundingClientRect.left + dialogBoundingClientRect.width) {
        if (rY < 0) {
            resize.style.cursor = 'n-resize';
        }
        else if (clientY < dialogBoundingClientRect.top + dialogBoundingClientRect.height) {
            //resize.style.cursor = 'ns-resize';
        }
        else {
            resize.style.cursor = 's-resize';
        }
    }
    else {
        if (rY < 0) {
            resize.style.cursor = 'ne-resize';
        }
        else if (clientY < dialogBoundingClientRect.top + dialogBoundingClientRect.height) {
            resize.style.cursor = 'e-resize';
        }
        else {
            resize.style.cursor = 'se-resize';
        }
    }
}

/**
 * TODO: This code doesn't work properly
 * 
 * This is the wellknown JS window object: 'window.addEventListener...' not to be confused with what I call the "window" of the dialog.
 */
function DIALOG_window_onresize() {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    if (!BYTES[byteDIALOG_hasBeenMeasured]) return;

    // Max width and min width depend on the left/top so they need to come first.
    if (DIALOG_request.left <= CONST_DIALOG_minLeft) {
        DIALOG_request.left = CONST_DIALOG_minLeft;
        DIALOG_element.style.left = DIALOG_request.left + 'px';
    }
    if (DIALOG_request.top <= CONST_DIALOG_minTop) {
        DIALOG_request.top = CONST_DIALOG_minTop;
        DIALOG_element.style.top = DIALOG_request.top + 'px';
    }

    if (DIALOG_request.height <= CONST_DIALOG_minHeight) {
        DIALOG_request.height = CONST_DIALOG_minHeight;
        DIALOG_element.style.height = DIALOG_request.height + 'px';
    }
    else if (DIALOG_request.height + DIALOG_request.top + 8 >= window.innerHeight) {
        DIALOG_request.height = window.innerHeight - 8 - DIALOG_request.top;
        DIALOG_element.style.height = DIALOG_request.height + 'px';
    }

    if (DIALOG_request.width <= CONST_DIALOG_minWidth) {
        DIALOG_request.width = CONST_DIALOG_minWidth;
        DIALOG_element.style.width = DIALOG_request.width + 'px';
    }	
    else if (DIALOG_request.left + DIALOG_request.width + 8 >= window.innerWidth) {
        DIALOG_request.width = window.innerWidth - 8 - DIALOG_request.left;
        DIALOG_element.style.width = DIALOG_request.width + 'px';
    }
}

function DIALOG_toolbar_body_onmousemove(event) {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    let resize = document.getElementById('DIALOG_resize');
    if (!resize) return;

    if (event.buttons & 1) {
        // TODO: I literally can't even right now with this empty if statement
    }
    else {
        document.body.classList.remove('unselectable');
        window.removeEventListener('mousemove', DIALOG_toolbar_body_onmousemove, /*useCapture*/ true);
        if (DIALOG_request.onResizeAction) DIALOG_request.onResizeAction();
        return;
    }

    let diff_X = event.clientX - DIALOG_request.before_X;
    let diff_Y = event.clientY - DIALOG_request.before_Y;

    if (diff_Y > -1 && diff_Y < 1) diff_Y = 0;
    if (diff_X > -1 && diff_X < 1) diff_X = 0;

    if (diff_X === 0 && diff_Y === 0) {
        return;
    }

    let clientX = event.clientX;
    let clientY = event.clientY;

    if (diff_X < 0) {
        let absdiff_X = Math.abs(diff_X);
        if (DIALOG_request.left <= CONST_DIALOG_minLeft) {
            //return; // TODO: ...
        }
        else if (DIALOG_request.left - absdiff_X < CONST_DIALOG_minLeft) {
            clientX += (absdiff_X - (DIALOG_request.left - CONST_DIALOG_minLeft));
            absdiff_X = DIALOG_request.left - CONST_DIALOG_minLeft;

            DIALOG_request.left -= absdiff_X;
            DIALOG_request.before_X = clientX;
            DIALOG_render_request(DIALOGrenderKind_DimensionsChanged);
        }
        else {
            DIALOG_request.left -= absdiff_X;
            DIALOG_request.before_X = clientX;
            DIALOG_render_request(DIALOGrenderKind_DimensionsChanged);
        }
    }
    else if (diff_X > 0) {
        let absdiff_X = Math.abs(diff_X);
        if (DIALOG_request.left + DIALOG_request.width + 8 >= window.innerWidth) {
            //return; // TODO: ...
        }
        else if (DIALOG_request.left + DIALOG_request.width + 8 + absdiff_X > window.innerWidth) {
            let DIALOG_maxLeft = window.innerWidth - 8 - DIALOG_request.width;
            clientX -= (absdiff_X - (DIALOG_maxLeft - DIALOG_request.left));
            absdiff_X = DIALOG_maxLeft - DIALOG_request.left;

            DIALOG_request.left += absdiff_X;
            DIALOG_request.before_X = clientX;
            DIALOG_render_request(DIALOGrenderKind_DimensionsChanged);
        }
        else {
            DIALOG_request.left += absdiff_X;
            DIALOG_request.before_X = clientX;
            DIALOG_render_request(DIALOGrenderKind_DimensionsChanged);
        }
    }

    if (diff_Y < 0) {
        let absdiff_Y = Math.abs(diff_Y);
        if (DIALOG_request.top <= CONST_DIALOG_minTop) {
            //return; // TODO: ...
        }
        else if (DIALOG_request.top - absdiff_Y < CONST_DIALOG_minTop) {
            clientY += (absdiff_Y - (DIALOG_request.top - CONST_DIALOG_minTop));
            absdiff_Y = DIALOG_request.top - CONST_DIALOG_minTop;
            
            DIALOG_request.top -= absdiff_Y;
            DIALOG_request.before_Y = clientY;
            DIALOG_render_request(DIALOGrenderKind_DimensionsChanged);
        }
        else {
            DIALOG_request.top -= absdiff_Y;
            DIALOG_request.before_Y = clientY;
            DIALOG_render_request(DIALOGrenderKind_DimensionsChanged);
        }
    }
    else if (diff_Y > 0) {
        let absdiff_Y = Math.abs(diff_Y);
        if (DIALOG_request.top + 8 + DIALOG_request.height >= window.innerHeight) {
            //return; // TODO: ...
        }
        else if (DIALOG_request.top + 8 + DIALOG_request.height + absdiff_Y > window.innerHeight) {
            let DIALOG_maxTop = window.innerHeight - 8 - DIALOG_request.height;
            clientY -= (absdiff_Y - (DIALOG_maxTop - DIALOG_request.top));
            absdiff_Y = DIALOG_maxTop - DIALOG_request.top;
            
            DIALOG_request.top += absdiff_Y;
            DIALOG_request.before_Y = clientY;
            DIALOG_render_request(DIALOGrenderKind_DimensionsChanged);
        }
        else {
            DIALOG_request.top += absdiff_Y;
            DIALOG_request.before_Y = clientY;
            DIALOG_render_request(DIALOGrenderKind_DimensionsChanged);
        }
    }
}

function DIALOG_toolbar_onmousedown(event) {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    let resize = document.getElementById('DIALOG_toolbar');
    if (!resize) return;

    // TODO: cache the bounding client rect
    let dialogBoundingClientRect = DIALOG_element.getBoundingClientRect();

    DIALOG_request.before_X = event.clientX;
    DIALOG_request.before_Y = event.clientY;

    DIALOG_request.left = dialogBoundingClientRect.left;
    DIALOG_request.top = dialogBoundingClientRect.top;
    DIALOG_request.width = dialogBoundingClientRect.width;
    DIALOG_request.height = dialogBoundingClientRect.height;
    BYTES[byteDIALOG_hasBeenMeasured] = 1;

    document.body.classList.add('unselectable');
    window.addEventListener('mousemove', DIALOG_toolbar_body_onmousemove, /*useCapture*/ true);
}

/**
 * Window is the title bar, maximize, minimize, close etc...
 */
function DIALOG_createWindow() {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    // TODO: Might want to check if the HTML element exists instead.
    if (BYTES[byteDIALOG_windowExists]) return;
    BYTES[byteDIALOG_windowExists] = 1;

    let toolbar = document.createElement('div');
    toolbar.id = 'DIALOG_toolbar';
    let body = document.createElement('div');
    body.id = 'DIALOG_body';
    let resize = document.createElement('div');
    resize.id = 'DIALOG_resize';

    toolbar.addEventListener('mousedown', DIALOG_toolbar_onmousedown);

    resize.addEventListener('mouseenter', DIALOG_resize_onmouseenter);
    resize.addEventListener('mousedown', DIALOG_resize_onmousedown);
    window.addEventListener('resize', DIALOG_window_onresize);

    DIALOG_element.appendChild(resize);
    DIALOG_element.appendChild(toolbar);
    DIALOG_element.appendChild(body);

    // TODO: You have to actually make sure the text fits
    toolbar.textContent = BYTES[byteDIALOG_currentDialogKind];

    let closeButton = document.createElement('button');
    closeButton.textContent = 'x';
    closeButton.id = 'DIALOG_closeButton';

    closeButton.addEventListener('click', DIALOG_closeButton_onclick);

    toolbar.appendChild(closeButton);

    closeButton.focus();
}

/**
 * Window is the title bar, maximize, minimize, close etc...
 */
function DIALOG_deleteWindow() {

    const DIALOG_element = document.getElementById('DIALOG');
    if (!DIALOG_element) return;

    // TODO: Might want to check if the HTML element exists instead.
    if (!BYTES[byteDIALOG_windowExists]) return;
    // TODO: Perhaps move these respective sets to the end of their functions.
    // This way them being set as a certain value reflects that the entirety of their respective code had been ran but then again... idk
    BYTES[byteDIALOG_windowExists] = 0;

    DIALOG_request.left = 0;
    DIALOG_request.top = 0;
    DIALOG_request.width = 0;
    DIALOG_request.height = 0;
    DIALOG_request.before_X = 0;
    DIALOG_request.before_Y = 0;

    let toolbar = document.getElementById('DIALOG_toolbar');
    toolbar.removeEventListener('mousedown', DIALOG_toolbar_onmousedown);

    document.body.classList.remove('unselectable');
    window.removeEventListener('mousemove', DIALOG_resize_body_onmousemove, /*useCapture*/ true);
    window.removeEventListener('mousemove', DIALOG_toolbar_body_onmousemove, /*useCapture*/ true);
    // TODO: Why would you invoke this here????
    if (DIALOG_request.onResizeAction) DIALOG_request.onResizeAction();

    window.removeEventListener('resize', DIALOG_window_onresize);

    let resize = document.getElementById('DIALOG_resize');
    resize.removeEventListener('mouseenter', DIALOG_resize_onmouseenter);
    resize.removeEventListener('mousedown', DIALOG_resize_onmousedown);

    let closeButton = document.getElementById('DIALOG_closeButton');
    closeButton.removeEventListener('click', DIALOG_closeButton_onclick);
}
