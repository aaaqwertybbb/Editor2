const CommandKind_None = 0;
const CommandKind_Submenu = 1;
const CommandKind_Copy = 2;
const CommandKind_CopyAbsolutePath = 3;
const CommandKind_Cut = 4;
const CommandKind_Paste = 5;
const CommandKind_NewFile_Directory = 6;
const CommandKind_NewFile_File = 7;
const CommandKind_DeleteFile_Directory = 8;
const CommandKind_DeleteFile_File = 9;
const CommandKind_RenameFile_Directory = 10;
const CommandKind_RenameFile_File = 11;
const CommandKind_Find = 12;
const CommandKind_SelectFolder = 13;
const CommandKind_SelectWorkspace = 14;

const MENUrenderKind_None = 0;
const MENUrenderKind_Cursor = 1;
const MENUrenderKind_Set = 2;
const MENUrenderKind_Hide = 3;

/**
 * @callback MENU_OnCompleteAction
 * @param {boolean} isCancelled
 * @param {MenuOption | undefined} menuOption the 'MenuOption' that exists at the 'request.index' or undefined if 'request.index' out of range;
 * @param {MenuRequest} request
 * @returns {Promise}
 */

/**
 * @typedef {Object} MenuOption
 * @property {number} commandKind
 * @property {any} text
 */

/**
 * @typedef {Object} MenuRequest
 * @property {number} left
 * @property {number} top
 * @property {number} recentBoundingClientRectTop
 * @property {MENU_OnCompleteAction} onCompleteAction
 * @property {any} target
 * @property {MenuOption[]} optionList
 * @property {number} index (use this to set the 'initiallySelectedIndex' / see the index of targeted 'MenuOption' within 'optionList')
 * @property {number} ticket
 * @property {HTMLDivElement[]} ArrayFrom_menuOptionList_children
 * @property {HTMLElement} elementToFocusOnCompleted
 * @property {boolean} disableFocusOnCompleted
 */

/** @type {MenuRequest} */
let MENU_request = null;

function MENU_render_request(renderKind) {
    if (BYTES[byteMENU_queueHead] !== BYTES[byteMENU_queueTail]) {
        const lastAbsoluteIndex = OFFSET_MENU + ((BYTES[byteMENU_queueTail] - 1) & UI_SLOT_MASK);
        if (MASTER_RENDER_BUFFER[lastAbsoluteIndex] === renderKind) {
            return;
        }
    }

    const absoluteIndex = OFFSET_MENU + (BYTES[byteMENU_queueTail] & UI_SLOT_MASK);
    MASTER_RENDER_BUFFER[absoluteIndex] = renderKind;
    if (renderKind === MENUrenderKind_Set) INTS[fMENU_renderKind_Set_countOfPendingRequests]++;
    BYTES[byteMENU_queueTail]++;
    
    if (BYTES[byteMENU_isRenderPending] === 0) {
        BYTES[byteMENU_isRenderPending] = 1;
        requestAnimationFrame(MENU_render_do);
    }
}

function MENU_render_do() {
    while (BYTES[byteMENU_queueHead] !== BYTES[byteMENU_queueTail]) {
        // Uses the exact same masking logic, but reads from the higher memory region
        const absoluteIndex = OFFSET_MENU + (BYTES[byteMENU_queueHead] & UI_SLOT_MASK);
        const renderKind = MASTER_RENDER_BUFFER[absoluteIndex];
        BYTES[byteMENU_queueHead]++;

        switch (renderKind) {
            case MENUrenderKind_Cursor:
                MENU_render_do_Cursor();
                break;
            case MENUrenderKind_Set:
                if (INTS[fMENU_renderKind_Set_countOfPendingRequests]-- > 1) break;
                MENU_render_do_Set();
                break;
            case MENUrenderKind_Hide:
                MENU_render_do_Hide();
                break;
        }
    }
    BYTES[byteMENU_isRenderPending] = 0;
}

function MENU_render_do_Set() {
    let menuElement = document.getElementById('MENU');
    if (menuElement) {
        menuElement = null; // Superstitiously setting this to null in the name of GC, this is a bad thing to do because here it doesn't have any reason than anxiety and I'm giving into said anxiety and only making it stronger in the long run.
        MENU_render_do_Hide();
    }

    INTS[fMENU_ticketId_drawn] = INTS[fMENU_ticketId_pending];

    menuElement = document.createElement('div');
    menuElement.id = 'MENU';
    menuElement.tabIndex = 0;
    document.body.appendChild(menuElement);

    if (MENU_optionList && MENU_optionList.length > 0) {
        let virtualizationBoundary = document.createElement('div');
        virtualizationBoundary.id = "MENU_virtualizationBoundary";
        let cursor = document.createElement('div');
        cursor.id = "MENU_cursor";
        let optionListElement = document.createElement('div');
        optionListElement.id = "MENU_optionList";
        menuElement.appendChild(virtualizationBoundary);
        menuElement.appendChild(cursor);
        menuElement.appendChild(optionListElement);
        MENU_addEvents();
        for (var i = 0; i < MENU_optionList.length; i++) {
            const entry = MENU_optionList[i];
            const optionElement = document.createElement('div');
            optionElement.className = 'menuOption';
            optionElement.textContent = entry.text;

            if (entry.submenu) {
                optionElement.setAttribute("data-command-kind", CommandKind_Submenu);
                optionElement.textContent += '>';
            }
            else {
                optionElement.setAttribute("data-command-kind", entry.commandKind);
            }

            optionListElement.appendChild(optionElement);
        }

        MENU_ArrayFrom_menuOptionList_children = Array.from(optionListElement.children);
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalLeft = INTS[fMENU_left];
    let finalTop = INTS[fMENU_top];
    //let rect = menuElement.getBoundingClientRect();

    // Check right edge
    //if (rect.right > viewportWidth) {
    if (INTS[fMENU_left] + menuElement.offsetWidth > viewportWidth) {
      finalLeft = viewportWidth - menuElement.offsetWidth - 10; // 10px padding boundary
    }
    // Check left edge (fallback if menu is wider than screen)
    if (finalLeft < 0) finalLeft = 10;

    // Check bottom edge
    //if (rect.bottom > viewportHeight) {
    if (INTS[fMENU_top] + menuElement.offsetHeight > viewportHeight) {
      finalTop = viewportHeight - menuElement.offsetHeight - 10; 
    }
    // Check top edge
    if (finalTop < 0) finalTop = 10;

    // 3. Apply the corrected coordinates
    menuElement.style.left = `${finalLeft}px`;
    menuElement.style.top = `${finalTop}px`;

    if (!INTS[fMENU_SET_index]) {
        INTS[fMENU_SET_index] = 0;
    }
    if (INTS[fMENU_cursorIndex] !== INTS[fMENU_SET_index]) {
        MENU_state_do_Cursor(INTS[fMENU_SET_index]);
    }
    MENU_render_do_Cursor();

    MENU_restoreFocusToElement = document.activeElement;

    if (!BYTES[byteMENU_SET_NOTshouldFocus]) {
        menuElement.focus();
    }
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
//async function WIDGET_show(widgetKind, left, top, placeholder, value, target, elementToFocusOnCompleted, disableFocusOnCompleted, callback) {

async function menuSet(optionList, left, top, onCompleteAction, target, optionList, elementToFocusOnCompleted, disableFocusOnCompleted, initiallySelectedIndex) {

    if (MENU_request) { await MENU_completeForm(true); }

    INTS[fMENU_ticketId_pending] = INTS[fMENU_ticketId_counter]++;

    if (MENU_optionList) {
        await MENU_state_do_hide();
    }

    INTS[fMENU_left] = left;
    INTS[fMENU_top] = top;

    if (index) {
        INTS[fMENU_SET_index] = index;
    }
    else {
        INTS[fMENU_SET_index] = 0; // an '|| 0' check in the preceeding 'if' would fall here anyways.
        // TODO: Is this just 'INTS[fMENU_SET_index] = index ?? 0;'
    }

    MENU_context = context;
    MENU_target = target;

    MENU_optionList = optionList;

    BYTES[byteMENU_NOTshouldFocus] = NOTshouldFocus;

    MENU_recentBoundingClientRectTop = null;

    MENU_render_request(MENUrenderKind_Set);
}

function MENU_render_do_Hide() {
    const menu = document.getElementById('MENU');
    if (!menu) return;

    MENU_removeEvents();
    INTS[fMENU_ticketId_drawn] = 0;
    menu.remove();
}

/**
 * Nobody should invoke this, the goal is that if someone shows a widget they ought to always get a 'WIDGET_completeForm' invocation for their 'WIDGET_request'.
 * If you invoke this you'll silently skip someone's 'WIDGET_request', if there is one.
 */
function MENU_hide() {
    WIDGET_request = null;
    MENU_render_request(MENUrenderKind_Hide);
}

/**
 * @param {*} changingFocusIsReasonable A blur event should not change focus.
 */
function MENU_completeForm(forceIsCancelled, changingFocusIsReasonable) {
    const local_request = MENU_request;
    MENU_hide();
    if (changingFocusIsReasonable && !local_request.disableFocusOnCompleted && local_request.elementToFocusOnCompleted) {
        local_request.elementToFocusOnCompleted.focus();
    }
    if (!forceIsCancelled && local_request.ticket !== INTS[fMENU_ticketId_drawn]) {
        forceIsCancelled = true;
    }
    let menuOption = undefined;
    if (local_request.index > 0 && local_request.index < local_request.optionList.length) {
        menuOption = local_request.optionList[local_request.index];
    }
    local_request.onCompleteAction(forceIsCancelled, menuOption, local_request);
    if (forceIsCancelled) {
        local_request.onCancelAction();
    }
}

function MENU_onMouseMove(event) {
    // then cancel the throttle? That's what you were actually doing with the thing?

    if (!MENU_recentBoundingClientRectTop) {
        MENU_ensure_boundingClientRect();
    }

    let relativeY = event.clientY - (MENU_recentBoundingClientRectTop + 4 /*paddingTop*/);
    let index = Math.floor(relativeY / INTS[fAPP_lineHeight]);
    if (INTS[fMENU_cursorIndex] === index) {
        return;
    }
    
    MENU_setCursorIndex(index);
}

/** mouse move handler has this explicit inlined (duplicated) due to the sheer frequency of its invocation */
function menuGetRelativeMouseEventData(event_clientY) {
    let paddingTop = 4;
    let relativeY = event_clientY - (MENU_recentBoundingClientRectTop + paddingTop);
    return Math.floor(relativeY / INTS[fAPP_lineHeight]);
}

function MENU_addEvents() {
    let menu = document.getElementById('MENU');
    if (!menu) return;
    menu.addEventListener('blur', menuHide); // TODO: should 'once' be used here?
    menu.addEventListener('click', MENU_onclick);
    menu.addEventListener('keydown', MENU_onKeyDown);
    menu.addEventListener('mousemove', MENU_onMouseMove);
}

function MENU_removeEvents() {
    let menu = document.getElementById('MENU');
    if (!menu) return;
    menu.removeEventListener('blur', menuHide); // TODO: should 'once' be used when adding?
    menu.removeEventListener('click', MENU_onclick);
    menu.removeEventListener('keydown', MENU_onKeyDown);
    menu.removeEventListener('mousemove', MENU_onMouseMove);
}

function MENU_onclick(event) {
    MENU_ensure_boundingClientRect();
    let indexClicked = menuGetRelativeMouseEventData(event.clientY);
    MENU_setCursorIndex(MENU_validateCursor(indexClicked));
    MENU_completeForm(false, true);
}

function MENU_render_do_Cursor() {
    const cursorElement = document.getElementById('MENU_cursor');
    if (!cursorElement) return;
    // The menu 'padding-top: 4px'
    cursorElement.style.top = 4 + (INTS[fAPP_lineHeight] * INTS[fMENU_cursorIndex]) + 'px';
}

function MENU_state_do_Cursor(index) {
    if (index >= MENU_ArrayFrom_menuOptionList_children.length)
        index = MENU_ArrayFrom_menuOptionList_children.length - 1;
    
    if (index < 0)
        index = 0;

    INTS[fMENU_cursorIndex] = index;
}

function MENU_setCursorIndex(index) {
    MENU_state_do_Cursor(index);
    MENU_render_request(MENUrenderKind_Cursor);
}

/** TODO: This doesn't work the same way the other validate cursors do? */
function MENU_validateCursor() {
    if (INTS[fMENU_cursorIndex] >= MENU_ArrayFrom_menuOptionList_children.length) {
        if (MENU_ArrayFrom_menuOptionList_children.length > 0) {
            MENU_setCursorIndex(MENU_ArrayFrom_menuOptionList_children.length - 1);
        }
        else {
            MENU_setCursorIndex(0);
        }
        return;
    }
    else if (INTS[fMENU_cursorIndex] < 0) {
        INTS[fMENU_cursorIndex] = 0;
    }
}

function MENU_onKeyDown(event) {
    MENU_validateCursor();
    if (MENU_ArrayFrom_menuOptionList_children.length === 0) return;

    switch (event.key) {
        case 'ArrowDown':
            if (INTS[fMENU_cursorIndex] < MENU_ArrayFrom_menuOptionList_children.length - 1) {
                MENU_setCursorIndex(INTS[fMENU_cursorIndex] + 1);
            }
            break;
        case 'ArrowUp':
            if (INTS[fMENU_cursorIndex] > 0) {
                MENU_setCursorIndex(INTS[fMENU_cursorIndex] - 1);
            }
            break;
        case 'Escape':
            return menuHide(/*shouldRestoreFocus*/ true);
        case 'Enter':
        case ' ':
            return optionOnClick(INTS[fMENU_cursorIndex], MENU_ArrayFrom_menuOptionList_children[INTS[fMENU_cursorIndex]]);
    }
}

function MENU_ensure_boundingClientRect() {
    if (!MENU_recentBoundingClientRectTop) {
        const menuElement = document.getElementById('MENU');
        if (!menuElement) return;
        MENU_recentBoundingClientRectTop = menuElement.getBoundingClientRect().top;
    }
}

/*
TODO:
- [ ] "Rewrite" menuGlobal.js
    - [ ] Too many root references when the menu isn't even being shown.
    - [ ] If you make 1 allocation to create a menu you can avoid the null references at the root level
          when not showing the Menu.
- [ ] "If you lack classes you'll have a nightmare of a time creating instances and refactoring in the future"
    - [ ] The solution is to have all functions that are intended for external interaction to never construct an instance.
    - [ ] They just give data separately and internally the object is made for them
    - [ ] can also make a factory function is needed but sometimes you only end up having the one allocation and no others.
- [ ] Make sure you never absent mindedly modify the objects or you'll create hidden classes.
    - [ ] If it is the correct thing to do that's one thing but don't mindlessly create hidden classes.
- [ ] Remove the obsolete INTS entries that widgetGlobal.js no longer is using.
- [ ] Remove the obsolete INTS entries that menuGlobal.js no longer is using.
- [ ] Move the count and capacity from editorGlobal.js to INTS
    - [ ] EDI_textByteList_count
    - [ ] EDI_textByteList_capacity
    - [ ] EDI_lineEndPositionList_count
    - [ ] EDI_lineEndPositionList_capacity
- [ ] If the initial state is '[]' in attempt to ...
    - [ ] if the array kind is reference entries
    - [ ] have them all share the initial version
    - [ ] provided you can ensure they'll all overwrite themselves by the time they're actually used.
    - [ ] i.e.: the ring buffers, I don't want the variables to ever be seen as something other than an array.
    - [ ] TODO: confirm that this even does anything
    - [ ] TODO: would you have to trigger the array to be marked as containing reference entries by adding at least one reference?
- [ ] Move all the transpiled const to fieldBuffer.js
    - [ ] so you know by just glancing at the `__COMPILEDbundle__.js` whether they've all been transpiled or not.
    - [ ] i.e.: 'const CommandKind_None = 0;', 'const CommandKind_Submenu = 1;'
- [ ] Reduce dialogGlobal.js root level variables to just 1 null or non-null "pattern".
- [ ] TODO: maybe the menu should always be empty, and just be some div that moves left top positions and you can put anything you want in it.
    - [ ] ^This is probably a bad idea, at the least for now it is
- [ ] TODO: submenus
    - [ ] ^This is probably a bad idea, at the least for now it is
    - [ ] when you add this if a submenu is clicked you don't 'onCancelAction'
- [ ] TODO: single click events (not multiple possibility spam)
- [ ] Check all the rAF code, nothing should be async unless there's a really good reason for it and even then could a good enough reason even exist?
- [ ] TODO: menuGlobal.js blur events
- [ ] TODO: widgetGlobal.js blur events
*/



/*switch (local_request.context) {
    case 'EXPLORER':
        EXPLORER_MenuOnClick(indexClicked, elementClicked);
        break;
    case 'EDITOR':
        EDI_MenuOnClick(indexClicked, elementClicked);
        break;
    case 'EXPLORER_pickFolderOrWorkspaceButton':
        EXPLORER_pickFolderOrWorkspaceButton_MenuOnClick(indexClicked, elementClicked);
        break;
}*/



