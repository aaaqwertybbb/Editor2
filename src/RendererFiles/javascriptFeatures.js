//__#__
// preprocessor.cjs
import "./fieldBuffer"
//__#__

const keywordHighlight = new Highlight();
CSS.highlights.set("js-keywords", keywordHighlight);
const keywordControlHighlight = new Highlight();
CSS.highlights.set("js-keywords-control", keywordControlHighlight);
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

/**
 * TODO: rename the 'trackedSyntaxExhausted' variable because it makes me anxious that I will manifest that state of being into reality whenever I read the variable name.
 */
function JS_line_lex(div, ringBufferIndexOfDiv, trackedSyntax_I, lineStart) {
    // 3. V8 Hidden Optimization Trick: textContent Hardcoding.
    // Do this ONCE before entering the scanner engine
    //const sourceText = String(div.children[0].textContent); 

    const divSpanTextContent = String(div.children[0].textContent);
    let divSpanTextContentLength = divSpanTextContent.length;

    const textNode = div.children[0].firstChild;

    let substart = 0;
    
    let pos = 0;

    let className;

    let createTrackedSyntaxFlag = false;
    let createDoLexFlag = false;
    // I keep reading this variable name and it makes me extremely anxious
    // I'm worried that by calling the variable this that I will become exhausted by nature of having named the variable that
    // and that like saying the variable in my mind is making me exhausted.
    let trackedSyntaxExhausted = false;

    let subend = divSpanTextContentLength;

    while (pos < divSpanTextContentLength) {
        if (createDoLexFlag) {

            while (pos < subend) {

// > I have an upsetting switch statement that checks for non-digits, then within that a switch statement that has all the outer cases however additionally has 0,1...9
// 
// < ...
// < Instead of duplicating your entire keyword switch block inside an inner nesting, you can cleanly solve this by separating your scanner logic into two steps:
// < The Initial Character Check (the gatekeeper) and The Loop (the collector).
// < ...

// not doing this right now though tired

                switch (divSpanTextContent[pos]) {
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
                        let wordstart = pos;

                        // you don't know if a word is a keyword until you've read the keyword.
                        // so until that point you're tracking it along with all the other text/whitespace on the line
                        // and planning to make everything just a single span.

                        let charIntSum = 0;

                        outer: while (pos < subend) {
                            switch (divSpanTextContent[pos]) {
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
                                    charIntSum = ((charIntSum << 5) - charIntSum) + divSpanTextContent.charCodeAt(pos);
                                    pos++;

                                    /*
                                    < perfect hashing on a closed set
                                    < ...

                                    This isn't actually unique btw it is unique across this closed set*
                                    I realize it was saying that

                                    And then it wants me to allocate a string to compare against a hardcoded version of the keyword.
                                    I feel like I'm just super decision making out'd right now
                                    every little detail of this just feels far more stressful to think about

> do you remember this too? '2. Manual Character Validation vs. V8 Monomorphism'

< Yes, absolutely. That was the core engine-level optimization we discussed right after fixing the hash calculation.
<
< We were targeting how V8 (the engine behind Chrome and Node.js) optimizes your JavaScript code under the hood.
< Specifically, we analyzed why writing a manual character-by-character validation loop for'
< the fallback verification was actually slower than just using a native string check due to how V8 handles monomorphism and inline caches (ICs).
<
< ...
< Why Native Strings Win: V8 Monomorphism
< 
< While the manual code looks lean, it defeats V8's internal optimizations. Here is exactly why we decided to drop manual validation and use a standard string comparison:
<
< 1. V8 String Interning: V8 keeps a hidden internal table of "interned strings" for all constants in your source code.
< The literal string "const" in your validation check === "const" is already allocated once when your engine boots up.
< It lives permanently in V8's "Old Space" memory heap and is never garbage collected.
<
< 2. Monomorphic Inline Caches: When you pull a substring out of your buffer and compare it to a string literal,
< V8 creates a monomorphic (single-shape) optimized code path.
< If the comparison operation always receives the same hidden class of string shapes,
< V8 optimizes the comparison down to raw assembly instructions that execute instantly
< 
< 3. The Sliced String Optimization: When you slice or substring text in modern JS engines,
< V8 often doesn't actually copy the characters. Instead, it creates a SlicedString object,
< which is just a tiny pointer pointing directly to your original divSpanTextContent string buffer with a start and length property.
< The actual comparison happens via highly optimized C++ memory operations inside the engine, beating manual JS loops every single time

> should I include the check on wordLength?

< Yes, adding a word length check is a massive performance win
                                    */

                                    break;
                                default:
                                    break outer;
                            }
                        }
                        // heuristic for possible keyword is comparing char int sum:
                        //
                        // const
                        // c 99
                        // o 111
                        // n 110
                        // s 115
                        // t 116
                        //
                        // 551
                        // 
                        // TODO: These 'divSpanTextContent.substring(wordstart, pos) ===' perhaps look wasteful at a glance...
                        // ...but it is solely with the goal of cheap confirmation that the text is truly the keyword, rather than some other identifier.
                        // The 'charIntSum' TODO: rename the variable to reflect the hashing logic...
                        // the variable is only distinct among the set of keywords.
                        // Thus you get a simple switch but you still gotta verify that you don't have a false positive due to all the other possible non-keyword identifiers.
                        // 
                        // "Why Native Strings Win: V8 Monomorphism"
                        // 'Monomorphic Inline Caches:'... raw assembly instructions that execute instantly
                        //

                        //
                        // I need to look into this more.
                        // I do believe that the short term "time taken to compare" is lower.
                        // but you later on have this massive GC hit that causes staggering in the UI.
                        // 


                        let wordlength = pos - wordstart;
                        className = 'eI';
                        switch (charIntSum) {
                            case 94844771: // const
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'const') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case 107035: // let
                                if (wordlength === 3 && divSpanTextContent.substring(wordstart, pos) === 'let') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case 1380938712: // function
                                if (wordlength === 8 && divSpanTextContent.substring(wordstart, pos) === 'function') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case 3357: // if
                                if (wordlength === 2 && divSpanTextContent.substring(wordstart, pos) === 'if') {
                                        className = 'eKC';
                                        break;
                                }
                                break;
                            case 115131: // try
                                if (wordlength === 3 && divSpanTextContent.substring(wordstart, pos) === 'try') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case 101577: // for
                                if (wordlength === 3 && divSpanTextContent.substring(wordstart, pos) === 'for') {
                                        className = 'eKC';
                                        break;
                                }
                                break;
                            case 116519: // var
                                if (wordlength === 3 && divSpanTextContent.substring(wordstart, pos) === 'var') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case 94432955: // catch
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'catch') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case -934396624: // return
                                if (wordlength === 6 && divSpanTextContent.substring(wordstart, pos) === 'return') {
                                        className = 'eKC';
                                        break;
                                }
                                break;
                            case -889473228: // switch
                                if (wordlength === 6 && divSpanTextContent.substring(wordstart, pos) === 'switch') {
                                        className = 'eKC';
                                        break;
                                }
                                break;
                            case 3046192: // case
                                if (wordlength === 4 && divSpanTextContent.substring(wordstart, pos) === 'case') {
                                        className = 'eKC';
                                        break;
                                }
                                break;
                            case 93127292: // async
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'async') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case 3116345: // else
                                if (wordlength === 4 && divSpanTextContent.substring(wordstart, pos) === 'else') {
                                        className = 'eKC';
                                        break;
                                }
                                break;
                            case 1544803905: // default
                                if (wordlength === 7 && divSpanTextContent.substring(wordstart, pos) === 'default') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case 110339814: // throw
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'throw') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case 108960: // new
                                if (wordlength === 3 && divSpanTextContent.substring(wordstart, pos) === 'new') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case 93223254: // await
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'await') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case 94742904: // class
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'class') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case -1588406278: // constructor
                                if (wordlength === 11 && divSpanTextContent.substring(wordstart, pos) === 'constructor') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case -1184795739: // import
                                if (wordlength === 6 && divSpanTextContent.substring(wordstart, pos) === 'import') {
                                        className = 'eKC';
                                        break;
                                }
                                break;
                            case 3151786: // from
                                if (wordlength === 4 && divSpanTextContent.substring(wordstart, pos) === 'from') {
                                        className = 'eKC';
                                        break;
                                }
                                break;
                            case -1289153612: // export
                                if (wordlength === 6 && divSpanTextContent.substring(wordstart, pos) === 'export') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case 3559070: // this
                                if (wordlength === 4 && divSpanTextContent.substring(wordstart, pos) === 'this') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case 113101617: // while
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'while') {
                                        className = 'eKC';
                                        break;
                                }
                                break;
                            case 94001407: // break
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'break') {
                                        className = 'eKC';
                                        break;
                                }
                                break;
                            case -567202649: // continue
                                if (wordlength === 8 && divSpanTextContent.substring(wordstart, pos) === 'continue') {
                                        className = 'eKC';
                                        break;
                                }
                                break;
                            case 3569038: // true
                                if (wordlength === 4 && divSpanTextContent.substring(wordstart, pos) === 'true') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case 97196323: // false
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'false') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            case 3392903: // null
                                if (wordlength === 4 && divSpanTextContent.substring(wordstart, pos) === 'null') {
                                        className = 'eK';
                                        break;
                                }
                                break;
                            default:
                                break;
                        }
                        if (className) { // TODO: There always is a class now you can remove this branching?
                            // is done when there IS a valid match, in order to write out any pending text that came prior to the keyword.
                            if (substart < wordstart) {
                                substart = wordstart; // TODO: Always do this just so you remove the branching?
                            }

                            const range = new Range();
                            range.setStart(textNode, substart);
                            range.setEnd(textNode, substart + wordlength);

                            if (className === 'eI') {
                                if (divSpanTextContent[pos] === '(') {
                                    functionHighlight.add(range);
                                }
                                else if (substart > 0 && divSpanTextContent[substart - 1] === '.') {
                                    memberHighlight.add(range);
                                }
                                else if (divSpanTextContent[pos] === ':') {
                                    memberHighlight.add(range);
                                }
                                else {
                                    identifierHighlight.add(range);
                                }
                            }
                            else if (className === 'eK') {
                                keywordHighlight.add(range);
                            }
                            else if (className === 'eKC') {
                                keywordControlHighlight.add(range);
                            }
                            substart += wordlength; // goes here or there? (1 of 2)
                        }
                        //substart += wordlength; // goes here or there? (2 of 2)
                        continue;
                    case CONST_js_FORWARDSLASH_str:
                        if (divSpanTextContent[pos + 1] === CONST_js_FORWARDSLASH_str) {

                            if (substart < pos) {
                                substart = pos;
                            }

                            // lex_comment_singleLine(...)

                            // The current character is the first forward slash of the 'two consecutive ones' that represent the start of a single line comment.
                            // "changing" this to guarantee at least 1 read means you can continue after the invocation returns (for the while loop)
                            // All in all, this already was guaranteed to read at least 1 since the while loop's condition in this method
                            // This change is moreso a matter of anxiety and me not wanting to deal with this at the moment so I need to see the explicit read here so I can sleep at night for the time being until my stress levels are lower.
                            pos++;
                            while (pos < subend) {
                                if (divSpanTextContent[pos] === CONST_js_LINEFEED_str) {
                                    break;
                                }
                                pos++;
                            }

                            // TODO: I think checking this is redundant because you guaranteed at least one increment?
                            if (substart < pos) {
                                const range = new Range();
                                range.setStart(textNode, substart);
                                range.setEnd(textNode, substart = pos);
                                commentHighlight.add(range);
                            }

                            continue;
                        }
                        else if (divSpanTextContent[pos + 1] === CONST_js_ASTERISK_str) {
                            if (substart < pos) { // write any text that came prior, and on the same line.
                                substart = pos;
                            }

                            // Move past the 'forwardslash and asterisk'
                            pos += 2;

                            // I'm starting this at 2 because 0 would bug (-1 + 1 === 0)
                            // but then I just don't want to deal with this so I need to go 1,
                            // then like I'm tired and I don't want to deal with this so I'll just go to 2 and surely nothing bad can happen
                            // but in reality I probably only need to start at 1 (or start of other ticket variables + 2 or something idk I don't wanna deal with this right now).
                            let ticketSource = 2;
                            let ticketAsterisk = -1;
                            let ticketForwardSlash = -1;
                            outer: while (pos < subend) {
                                switch (divSpanTextContent[pos]) {
                                    case CONST_js_ASTERISK_str:
                                        ticketAsterisk = ticketSource++;
                                        break;
                                    case CONST_js_FORWARDSLASH_str:
                                        ticketForwardSlash = ticketSource++;
                                        break;
                                    case CONST_js_LINEFEED_str:
                                        ticketSource++;
                                        break outer; // this actually is because 'switch (divSpanTextContent[pos])' was reading undefined, this 'outer' is doing nothing I imagine. The fix was to use the correct subend for tracked syntax
                                    default:
                                        ticketSource++;
                                        break;
                                }
                                pos++;
                                if (ticketAsterisk + 1 === ticketForwardSlash) {
                                    break;
                                }
                            }

                            const range = new Range();
                            range.setStart(textNode, substart);
                            range.setEnd(textNode, substart = pos);
                            commentHighlight.add(range);

                            continue;
                        }

                        // TODO: Remove this break because it was confusing, you gotta make sure it continues, but this actually just never gets hit because the previous branches end with continue.
                        break;
                    case CONST_js_DOUBLEQUOTE_str:
                        if (substart < pos) {
                            substart = pos;
                        }
                        // This code is somewhat a duplication of 'function lex_string(...)'
                        //
                        // likely what started the string is the same as the terminator, so you need to move ahead one position before starting the loop.
                        pos++;
                        outer: while (pos < subend) {
                            switch (divSpanTextContent[pos]) {
                                case CONST_js_DOUBLEQUOTE_str:
                                    pos++;
                                    break outer;
                                case CONST_js_BACKSLASH_str:
                                    pos++;
                                    if (pos < subend) {
                                        pos++; // skip the escaped character provided that the file didn't end after the original backslash
                                    }
                                    continue /*outer*/;
                                default:
                                    pos++;
                                    break;
                            }
                        }

                        const range = new Range();
                        range.setStart(textNode, substart);
                        range.setEnd(textNode, substart = pos);
                        stringHighlight.add(range);
                        continue;
                    case CONST_js_SINGLEQUOTE_str:
                        if (substart < pos) {
                            substart = pos;
                        }
                        // This code is somewhat a duplication of 'function lex_string(...)'
                        //
                        // likely what started the string is the same as the terminator, so you need to move ahead one position before starting the loop.
                        pos++;
                        outer: while (pos < subend) {
                            switch (divSpanTextContent[pos]) {
                                case CONST_js_SINGLEQUOTE_str:
                                    pos++;
                                    break outer;
                                case CONST_js_BACKSLASH_str:
                                    pos++;
                                    if (pos < subend) {
                                        pos++; // skip the escaped character provided that the file didn't end after the original backslash
                                    }
                                    continue /*outer*/;
                                default:
                                    pos++;
                                    break;
                            }
                        }

                        const range2 = new Range();
                        range2.setStart(textNode, substart);
                        range2.setEnd(textNode, substart = pos);
                        stringHighlight.add(range2);
                        
                        continue;
                    case CONST_js_BACKTICK_str:
                        if (substart < pos) {
                            substart = pos;
                        }
                        // This code is somewhat a duplication of 'function lex_string(...)'
                        //
                        // likely what started the string is the same as the terminator, so you need to move ahead one position before starting the loop.
                        pos++;
                        outer: while (pos < subend) {
                            switch (divSpanTextContent[pos]) {
                                case CONST_js_BACKTICK_str:
                                    pos++;
                                    break outer;
                                case CONST_js_BACKSLASH_str:
                                    pos++;
                                    if (pos < subend) {
                                        pos++; // skip the escaped character provided that the file didn't end after the original backslash
                                    }
                                    continue /*outer*/;
                                default:
                                    pos++;
                                    break;
                            }
                        }

                        const range3 = new Range();
                        range3.setStart(textNode, substart);
                        range3.setEnd(textNode, substart = pos);
                        stringHighlight.add(range3);

                        continue;
                }
                pos++;
            }

            // TODO: Consider the final pos? Is this gonna bug? I don't think it will.
            if (substart < pos && pos !== 0) {
                substart = pos;
            }

            if (!trackedSyntaxExhausted) {
                createDoLexFlag = false;
                createTrackedSyntaxFlag = true;
            }
        }
        else if (createTrackedSyntaxFlag) {
            
            createTrackedSyntaxFlag = false;

            let trackedSyntaxEnd = INTS[fEDI_pooledTrackedSyntax_start] + INTS[fEDI_pooledTrackedSyntax_length];
            const r_trackedSyntaxEnd = trackedSyntaxEnd - lineStart;
            subend = r_trackedSyntaxEnd > divSpanTextContentLength ? divSpanTextContentLength : r_trackedSyntaxEnd;
            
            let length = subend - substart;
            if (length <= 0) {
                trackedSyntax_I++;
                continue;
            }
            const range = new Range();
            range.setStart(textNode, substart);
            range.setEnd(textNode, subend);
            substart += length;
            subend = divSpanTextContentLength;
            pos += length;
            switch (BYTES[byteEDI_pooledTrackedSyntax_trackedSyntaxKind]) {
                case TrackedSyntaxKind_Comment:
                    commentHighlight.add(range);
                    break;
                case TrackedSyntaxKind_String:
                    stringHighlight.add(range);
                    break;
                default:
                    break;
            }
        }
        else {
            
            if (trackedSyntax_I >= EDI_trackedSyntaxList.count_abstract) {
                createDoLexFlag = true;
                trackedSyntaxExhausted = true;
                subend = divSpanTextContentLength;
                continue;
            }

            EDI_trackedSyntaxList.getElementAt(trackedSyntax_I);

            if (substart >= divSpanTextContentLength) {
                createDoLexFlag = true;
                trackedSyntaxExhausted = true;
                subend = divSpanTextContentLength;
                continue;
            }

            if (INTS[fEDI_pooledTrackedSyntax_start] >= lineStart + divSpanTextContentLength) {
                createDoLexFlag = true;
                trackedSyntaxExhausted = true;
                subend = divSpanTextContentLength;
                continue;
            }

            if (INTS[fEDI_pooledTrackedSyntax_start] + INTS[fEDI_pooledTrackedSyntax_length] < lineStart) {
                trackedSyntax_I++;
                continue;
            }

            if (INTS[fEDI_pooledTrackedSyntax_start] > lineStart + substart) {
                createDoLexFlag = true;
                trackedSyntaxExhausted = false;
                const r_trackedSyntaxStart = INTS[fEDI_pooledTrackedSyntax_start] - lineStart;
                if (r_trackedSyntaxStart < divSpanTextContentLength) {
                    subend = r_trackedSyntaxStart;
                }
                else {
                    subend = divSpanTextContentLength;
                }
                continue;
            }

            {
                createTrackedSyntaxFlag = true;
                continue;
            }
        }
    }

    return trackedSyntax_I;
}
