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

    menuElement = document.createElement('div');
    menuElement.id = 'MENU';
    menuElement.tabIndex = 0;
    document.body.appendChild(menuElement);

    let cursor = document.createElement('div');
    cursor.id = "MENU_cursor";
    let optionListElement = document.createElement('div');
    optionListElement.id = "MENU_optionList";
    menuElement.appendChild(cursor);
    menuElement.appendChild(optionListElement);
    MENU_addEvents();
    for (var i = 0; i < MENU_request.optionList.length; i++) {
        const entry = MENU_request.optionList[i];
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

    MENU_request.ArrayFrom_menuOptionList_children = Array.from(optionListElement.children);

    if (!MENU_request.elementToFocusOnCompleted) {
        MENU_request.elementToFocusOnCompleted = document.activeElement;
    }
    
    INTS[fMENU_ticketId_drawn] = MENU_request.ticket;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalLeft = MENU_request.left;
    let finalTop = MENU_request.top;
    //let rect = menuElement.getBoundingClientRect();

    // Check right edge
    //if (rect.right > viewportWidth) {
    if (MENU_request.left + menuElement.offsetWidth > viewportWidth) {
      finalLeft = viewportWidth - menuElement.offsetWidth - 10; // 10px padding boundary
    }
    // Check left edge (fallback if menu is wider than screen)
    if (finalLeft < 0) finalLeft = 10;

    // Check bottom edge
    //if (rect.bottom > viewportHeight) {
    if (MENU_request.top + menuElement.offsetHeight > viewportHeight) {
      finalTop = viewportHeight - menuElement.offsetHeight - 10; 
    }
    // Check top edge
    if (finalTop < 0) finalTop = 10;

    // 3. Apply the corrected coordinates
    menuElement.style.left = `${finalLeft}px`;
    menuElement.style.top = `${finalTop}px`;

    MENU_state_do_Cursor(MENU_request.index);
    MENU_render_do_Cursor();

    menuElement.focus();
}

/**
 * @param {MenuOption[]} optionList 
 * @param {number} left 
 * @param {number} top 
 * @param {MENU_OnCompleteAction} onCompleteAction 
 * @param {any} target 
 * @param {HTMLElement} elementToFocusOnCompleted 
 * @param {boolean} disableFocusOnCompleted 
 * @param {number} index (use this to set the "initiallySelectedIndex", the MenuOption within 'optionList' that should start as the initially selected MenuOption.)
 */
function menuSet(optionList, left, top, onCompleteAction, target, elementToFocusOnCompleted, disableFocusOnCompleted, index) {
    if (MENU_request) { MENU_completeForm(true); }

    if (!optionList || optionList.length <= 0) {
        throw new Exception('!optionList || optionList.length <= 0');
    }

    MENU_request = {
        left: left,
        top: top,
        recentBoundingClientRectTop: top,
        onCompleteAction: onCompleteAction,
        target: target,
        optionList: optionList,
        index: index ?? 0,
        ticket: INTS[fMENU_ticketId_counter]++,
        ArrayFrom_menuOptionList_children: null,
        elementToFocusOnCompleted: elementToFocusOnCompleted,
        disableFocusOnCompleted: disableFocusOnCompleted
    };

    MENU_render_request(MENUrenderKind_Set);
}

function MENU_render_do_Hide() {
    const menu = document.getElementById('MENU');
    if (!menu) return;

    INTS[fMENU_ticketId_drawn] = 0;
    menu.remove();
}

/**
 * Nobody should invoke this, the goal is that if someone shows a menu they ought to always get a 'MENU_completeForm' invocation for their 'MENU_request'.
 * If you invoke this you'll silently skip someone's 'MENU_request', if there is one.
 */
function MENU_hide() {
    MENU_request = null;
    MENU_removeEvents();
    MENU_render_request(MENUrenderKind_Hide);
}
// gotta unload groceries and etc... so it just not gonna work for a second (didn't mean to push)
/**
 * @param {*} changingFocusIsReasonable A blur event should not change focus.
 */
function MENU_completeForm(forceIsCancelled, changingFocusIsReasonable) {
    const local_request = MENU_request;
    if (local_request === null) {
        return; // TODO: If you remove the events in MENU_hide you shouldn't need this.
    }
    MENU_hide();
    if (changingFocusIsReasonable && !local_request.disableFocusOnCompleted && local_request.elementToFocusOnCompleted) {
        local_request.elementToFocusOnCompleted.focus();
    }
    if (!forceIsCancelled && local_request.ticket !== INTS[fMENU_ticketId_drawn]) {
        forceIsCancelled = true;
    }
    let menuOption = undefined;
    if (local_request.index >= 0 && local_request.index < local_request.optionList.length) {
        menuOption = local_request.optionList[local_request.index];
    }
    local_request.onCompleteAction(forceIsCancelled, menuOption, local_request);
}

function MENU_onMouseMove(event) {
    // then cancel the throttle? That's what you were actually doing with the thing?

    //if (!MENU_request.recentBoundingClientRectTop) {
    //    MENU_ensure_boundingClientRect();
    //}

    let relativeY = event.clientY - (MENU_request.recentBoundingClientRectTop + 4 /*paddingTop*/);
    let index = Math.floor(relativeY / INTS[fAPP_lineHeight]);
    if (MENU_request.index === index) {
        return;
    }
    
    MENU_setCursorIndex(index);
}

/** mouse move handler has this explicit inlined (duplicated) due to the sheer frequency of its invocation */
function menuGetRelativeMouseEventData(event_clientY) {
    let paddingTop = 4;
    let relativeY = event_clientY - (MENU_request.recentBoundingClientRectTop + paddingTop);
    return Math.floor(relativeY / INTS[fAPP_lineHeight]);
}

function MENU_addEvents() {
    let menu = document.getElementById('MENU');
    if (!menu) return;
    menu.addEventListener('blur', MENU_hide); // TODO: should 'once' be used here?
    menu.addEventListener('click', MENU_onclick);
    menu.addEventListener('keydown', MENU_onKeyDown);
    menu.addEventListener('mousemove', MENU_onMouseMove);
}

function MENU_removeEvents() {
    let menu = document.getElementById('MENU');
    if (!menu) return;
    menu.removeEventListener('blur', MENU_hide); // TODO: should 'once' be used when adding?
    menu.removeEventListener('click', MENU_onclick);
    menu.removeEventListener('keydown', MENU_onKeyDown);
    menu.removeEventListener('mousemove', MENU_onMouseMove);
}

function MENU_onclick(event) {
    MENU_ensure_boundingClientRect();
    let indexClicked = menuGetRelativeMouseEventData(event.clientY);
    MENU_setCursorIndex(indexClicked);
    //MENU_validateCursor();
    MENU_completeForm(false, true);
}

function MENU_render_do_Cursor() {
    const cursorElement = document.getElementById('MENU_cursor');
    if (!cursorElement || MENU_request === null) return;
    // The menu 'padding-top: 4px'
    cursorElement.style.top = 4 + (INTS[fAPP_lineHeight] * MENU_request.index) + 'px';
}

function MENU_state_do_Cursor(index) {
    if (index >= MENU_request.ArrayFrom_menuOptionList_children.length)
        index = MENU_request.ArrayFrom_menuOptionList_children.length - 1;
    
    if (index < 0)
        index = 0;

    MENU_request.index = index;
}

function MENU_setCursorIndex(index) {
    MENU_state_do_Cursor(index);
    MENU_render_request(MENUrenderKind_Cursor);
}

/** TODO: This doesn't work the same way the other validate cursors do? */
function MENU_validateCursor() {
    if (MENU_request.index >= MENU_request.ArrayFrom_menuOptionList_children.length) {
        if (MENU_request.ArrayFrom_menuOptionList_children.length > 0) {
            MENU_setCursorIndex(MENU_request.ArrayFrom_menuOptionList_children.length - 1);
        }
        else {
            MENU_setCursorIndex(0);
        }
        return;
    }
    else if (MENU_request.index < 0) {
        MENU_request.index = 0;
    }
}

function MENU_onKeyDown(event) {
    MENU_validateCursor();
    if (MENU_request.ArrayFrom_menuOptionList_children.length === 0) return;

    switch (event.key) {
        case 'ArrowDown':
            if (MENU_request.index < MENU_request.ArrayFrom_menuOptionList_children.length - 1) {
                MENU_setCursorIndex(MENU_request.index + 1);
            }
            break;
        case 'ArrowUp':
            if (MENU_request.index > 0) {
                MENU_setCursorIndex(MENU_request.index - 1);
            }
            break;
        case 'Escape':
            MENU_hide(/*shouldRestoreFocus*/ true);
        case 'Enter':
        case ' ':
            MENU_completeForm(false, true);
    }
}

/** TODO: fix this and uncomment the invocations, 'if (!MENU_request.recentBoundingClientRectTop)' is non sensical (0 is a valid top etc...) */
function MENU_ensure_boundingClientRect() {
    if (!MENU_request.recentBoundingClientRectTop) {
        const menuElement = document.getElementById('MENU');
        if (!menuElement) return;
        MENU_request.recentBoundingClientRectTop = menuElement.getBoundingClientRect().top;
    }
}

/**
 * @param {number} commandKind
 * @param {any} text
 * @returns {MenuOption} menuOption
 */
function MENU_MenuOption_factory(commandKind, text) {
    return {
        commandKind: commandKind,
        text: text
    };
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
