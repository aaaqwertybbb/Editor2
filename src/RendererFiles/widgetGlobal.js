const WidgetKind_None = 0;
const WidgetKind_InputText = 1;
const WidgetKind_YesCancel = 2;

const WIDGETrenderKind_None = 0;
const WIDGETrenderKind_Show = 1;
const WIDGETrenderKind_Hide = 2;

/**
 * @callback WIDGET_Callback
 * @param {WidgetResult} result
 * @returns {Promise}
 */

/**
 * @typedef {Object} WidgetRequest
 * @property {any} widgetKind - WidgetKind_...
 * @property {number} left
 * @property {number} top
 * @property {*} placeholder
 * @property {*} value
 * @property {*} target
 * @property {*} elementToFocusOnCompleted
 * @property {*} disableFocusOnCompleted
 * @property {WIDGET_Callback} callback
 * @property {number} ticket
 */

/**
 * @typedef {Object} WidgetResult
 * @property {boolean} isCancelled
 * @property {any} resultData
 * @property {WidgetRequest} request
 */

/** @type {WidgetRequest} */
let WIDGET_request = null;

// You aren't focusing the widget element itself so blur likely won't work.
//WIDGET_element.addEventListener('focusout', () => WIDGET_hide());

function WIDGET_render_request(renderKind) {
    if (BYTES[byteWIDGET_queueHead] !== BYTES[byteWIDGET_queueTail]) {
        const lastAbsoluteIndex = OFFSET_WIDGET + ((BYTES[byteWIDGET_queueTail] - 1) & UI_SLOT_MASK);
        if (MASTER_RENDER_BUFFER[lastAbsoluteIndex] === renderKind) {
            return;
        }
    }

    const absoluteIndex = OFFSET_WIDGET + (BYTES[byteWIDGET_queueTail] & UI_SLOT_MASK);
    MASTER_RENDER_BUFFER[absoluteIndex] = renderKind;
    if (renderKind === WIDGETrenderKind_Show) INTS[fWIDGETrenderKind_Show_countOfPendingRequests]++;
    BYTES[byteWIDGET_queueTail]++;
    
    if (BYTES[byteWIDGET_isRenderPending] === 0) {
        BYTES[byteWIDGET_isRenderPending] = 1;
        requestAnimationFrame(WIDGET_render_do);
    }
}

function WIDGET_render_do() {
    while (BYTES[byteWIDGET_queueHead] !== BYTES[byteWIDGET_queueTail]) {
        // Uses the exact same masking logic, but reads from the higher memory region
        const absoluteIndex = OFFSET_WIDGET + (BYTES[byteWIDGET_queueHead] & UI_SLOT_MASK);
        const renderKind = MASTER_RENDER_BUFFER[absoluteIndex];
        BYTES[byteWIDGET_queueHead]++; 

        switch (renderKind) {
            case WIDGETrenderKind_Show:
                if (INTS[fWIDGETrenderKind_Show_countOfPendingRequests]-- > 1) break;
                WIDGET_render_do_Show();
                break;
            case WIDGETrenderKind_Hide:
                WIDGET_render_do_Hide();
                break;
        }
    }
    BYTES[byteWIDGET_isRenderPending] = 0;
}

function WIDGET_render_do_Show() {

    let WIDGET_element = document.getElementById('WIDGET');
    if (BYTES[byteWIDGET_WidgetKind_drawn] !== WidgetKind_None) {
        WIDGET_element = null;
        // You don't have to invoke 'WIDGET_state_do_Hide' because there was a 1 to 1 overwrite of all the state due to the 'WIDGET_show' invocation which triggered this function.
        BYTES[byteWIDGET_shouldRestoreFocus] = 0; // going to show a different widget so don't bother with focus here
        WIDGET_render_do_Hide();
    }

    if (!WIDGET_element) {
        WIDGET_element = document.createElement('div');
        WIDGET_element.id = 'WIDGET';
        document.body.appendChild(WIDGET_element);
    }

    BYTES[byteWIDGET_WidgetKind_drawn] = WIDGET_request.widgetKind;

    if (!WIDGET_request.elementToFocusOnCompleted) {
        WIDGET_request.elementToFocusOnCompleted = document.activeElement;
    }
    
    // TODO: Move this to after the '..._Create()' invocations
    INTS[fWIDGET_ticketId_drawn] = WIDGET_request.ticket;

    switch (BYTES[byteWIDGET_WidgetKind_drawn]) {
        case WidgetKind_InputText:
            WidgetKind_InputText_Create();
            break;
        case WidgetKind_YesCancel:
            WidgetKind_YesCancel_Create();
            break;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalLeft = WIDGET_request.left;
    let finalTop = WIDGET_request.top;
    //let rect = WIDGET_element.getBoundingClientRect();

    // Check right edge
    //if (rect.right > viewportWidth) {
    if (WIDGET_request.left + WIDGET_element.offsetWidth > viewportWidth) {
      finalLeft = viewportWidth - WIDGET_element.offsetWidth - 10; // 10px padding boundary
    }
    // Check left edge (fallback if menu is wider than screen)
    if (finalLeft < 0) finalLeft = 10;

    // Check bottom edge
    //if (rect.bottom > viewportHeight) {
    if (WIDGET_request.top + WIDGET_element.offsetHeight > viewportHeight) {
      finalTop = viewportHeight - WIDGET_element.offsetHeight - 10; 
    }
    // Check top edge
    if (finalTop < 0) finalTop = 10;

    // 3. Apply the corrected coordinates
    WIDGET_element.style.left = `${finalLeft}px`;
    WIDGET_element.style.top = `${finalTop}px`;
}

/**
 * Two consecutive invocations of this function will result in the first invocation's 'callback' being invoked with the cancelled state.
 * Whether the first invocation's rAF request triggered or not has no impact on things.
 * - If it was triggered the cancelled state is still passed to the first invocation's 'callback'.
 * - If it was NOT triggered, then the rAF request that relates to the first invocation in particular is skipped.
 * 
 * @param {number} widgetKind 'get_WidgetKind_%()'
 * @param {number} left 
 * @param {number} top 
 * @param {string} placeholder if the corresponding widget has a corresponding placeholder attribute this string will be provided as the attribute's value. This is stored in the variable 'WIDGET_request.placeholder'.
 * @param {string | object} value if the corresponding widget has a value attribute and this is expectedly a 'string' then this will be provided as the attribute's value. This is stored in the variable 'WIDGET_request.value'.
 * @param {object} target this is stored in the variable 'WIDGET_target'.
 * @param {WIDGET_Callback} callback this is invoked when the widget is either submitted or cancelled.
 */
async function WIDGET_show(widgetKind, left, top, placeholder, value, target, elementToFocusOnCompleted, disableFocusOnCompleted, callback) {
    if (WIDGET_request) { await WIDGET_completeForm(true); }

    WIDGET_request = {
        widgetKind: widgetKind,
        left: left,
        top: top,
        placeholder: placeholder,
        value: value,
        target: target,
        elementToFocusOnCompleted: elementToFocusOnCompleted,
        disableFocusOnCompleted: disableFocusOnCompleted,
        callback: callback,
        ticket: INTS[fWIDGET_ticketId_counter]++
    };

    WIDGET_render_request(WIDGETrenderKind_Show);
}

function WIDGET_render_do_Hide() {
    const WIDGET_element = document.getElementById('WIDGET');

    switch (BYTES[byteWIDGET_WidgetKind_drawn]) {
        case WidgetKind_InputText:
            WidgetKind_InputText_Delete(WIDGET_element);
            break;
        case WidgetKind_YesCancel:
            WidgetKind_YesCancel_Delete(WIDGET_element);
            break;
    }
    BYTES[byteWIDGET_WidgetKind_drawn] = WidgetKind_None;
    INTS[fWIDGET_ticketId_drawn] = 0;
    WIDGET_element.remove();
}

/**
 * Nobody should invoke this, the goal is that if someone shows a widget they ought to always get a 'WIDGET_completeForm' invocation for their 'WIDGET_request'.
 * If you invoke this you'll silently skip someone's 'WIDGET_request', if there is one.
 */
function WIDGET_hide() {
    WIDGET_request = null; // In case someone skips a 'WIDGET_completeForm', this null setting is done here.
    WIDGET_render_request(WIDGETrenderKind_Hide);
}

/**
 * TODO: I think you meant to remove 90% of this comment at some point (as of writing this you'd keep '...A blur event should not change focus.' (the final line) only.)
 * 
 * resultObject is of the pattern {isCancelled:isCancelled, value:input.value}.
 * 
 * This function will perform any generalized widget validation.
 * At the moment the validation relates to whether the currently displayed UI is up to date with the show/hide function invocations.
 * 
 * This function is used for the UI event handlers.
 * Any internal "completion" due to for example invoking 'hide' when a UI" is being shown skips this function.
 * If anyone desires to in the future change this such that the internal "completion" uses this function, take care because 'INTS[fWIDGET_ticketId_pending] === INTS[fWIDGET_ticketId_drawn]'
 * isn't quite as sensible when dealing with internal "completion" that needs to cancel the previous UI.
 * 
 * @param {*} changingFocusIsReasonable A blur event should not change focus.
 */
function WIDGET_completeForm(forceIsCancelled, changingFocusIsReasonable, resultData) {
    const local_request = WIDGET_request;
    WIDGET_hide();
    if (changingFocusIsReasonable && !local_request.disableFocusOnCompleted && local_request.elementToFocusOnCompleted) {
        local_request.elementToFocusOnCompleted.focus();
    }
    if (local_request.callback) {
        if (!forceIsCancelled && local_request.ticket !== INTS[fWIDGET_ticketId_drawn]) {
            forceIsCancelled = true;
        }
        if (resultData === null) {
            switch (local_request.widgetKind) {
                case WidgetKind_InputText:
                    resultData = WidgetKind_InputText_GetResultData();
                    break;
                case WidgetKind_YesCancel:
                    resultData = WidgetKind_YesCancel_GetResultData();
                    break;
            }
        }
        return local_request.callback({
            isCancelled: forceIsCancelled,
            resultData: resultData,
            request: local_request
        });
    }
}

////

function WidgetKind_InputText_Create() {

    const WIDGET_element = document.getElementById('WIDGET');

    let input = document.createElement('input');
    input.type = "text";
    input.id = 'WIDGET_inputText';
    if (WIDGET_request.placeholder || WIDGET_request.placeholder === '') {
        input.placeholder = WIDGET_request.placeholder;
    }

    // TODO: "typeof value === 'string'" is not a bulletproof solution for checking whether the value is a string.
    // TODO: Extremely undocumented behavior in relation to the ways of using 'WIDGET_request.value'.
    //
    if ((WIDGET_request.value || WIDGET_request.value === '') && (typeof WIDGET_request.value === 'string')) {
        input.value = WIDGET_request.value;
    }

    input.addEventListener('keydown', WidgetKind_InputText_onkeydown_input);
    WIDGET_element.appendChild(input);
    input.focus();
}

function WidgetKind_InputText_Delete(WIDGET_element) {
    let input = document.getElementById('WIDGET_inputText');
    input.removeEventListener('keydown', WidgetKind_InputText_onkeydown_input);
}

function WidgetKind_InputText_GetResultData() {
    let input = document.getElementById('WIDGET_inputText');
    return input.value;
}

async function WidgetKind_InputText_onkeydown_input(event) {
    event.stopPropagation();
    if (event.key === 'Enter' || event.key === 'Escape') {
        let isCancelled = event.key === 'Enter' ? false : true;
        await WIDGET_completeForm(isCancelled, true, null);
    }
}

////

function WidgetKind_YesCancel_Create() {

    const WIDGET_element = document.getElementById('WIDGET');

    let topDivElement = document.createElement('div');
    if (WIDGET_request.placeholder || WIDGET_request.placeholder === '') {
        topDivElement.textContent = WIDGET_request.placeholder;
    }

    let bottomDivElement = document.createElement('div');
    let yesButtonElement = document.createElement('button');
    yesButtonElement.textContent = 'Yes';
    yesButtonElement.id = 'WIDGET_YesCancel_yes';
    yesButtonElement.addEventListener('click', WidgetKind_YesCancel_onclick_yes);
    bottomDivElement.appendChild(yesButtonElement);
    let cancelButtonElement = document.createElement('button');
    cancelButtonElement.textContent = 'Cancel';
    cancelButtonElement.id = 'WIDGET_YesCancel_cancel';
    cancelButtonElement.addEventListener('click', WidgetKind_YesCancel_onclick_cancel);
    bottomDivElement.appendChild(cancelButtonElement);

    WIDGET_element.appendChild(topDivElement);
    WIDGET_element.appendChild(bottomDivElement);
    yesButtonElement.focus();
}

function WidgetKind_YesCancel_Delete(WIDGET_element) {
    let yesButtonElement = document.getElementById('WIDGET_YesCancel_yes');
    yesButtonElement.removeEventListener('click', WidgetKind_YesCancel_onclick_yes);
    let cancelButtonElement = document.getElementById('WIDGET_YesCancel_cancel');
    cancelButtonElement.removeEventListener('click', WidgetKind_YesCancel_onclick_cancel);
}

function WidgetKind_YesCancel_GetResultData() {
    return null;
}

async function WidgetKind_YesCancel_onclick_yes() {
    await WIDGET_completeForm(false, true, 'Yes');
}

async function WidgetKind_YesCancel_onclick_cancel() {
    await WIDGET_completeForm(true, 'Cancel');
}
