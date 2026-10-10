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
    const divSpanTextContent = String(div.textContent);
    const divSpanTextContentLength = divSpanTextContent.length;
    const textNode = div.firstChild;

    let pos = 0;
    let substart = 0;
    let subend = divSpanTextContentLength;

    // 0 => identifier
    // 1 => keyword
    // 2 => keywordControl
    let className_flag = 0;

    let createTrackedSyntaxFlag = false;
    let createDoLexFlag = false;
    let trackedSyntaxExhausted = false;

    let range = new Range();

    while (pos < divSpanTextContentLength) {
        if (createDoLexFlag) {
            while (pos < subend) {
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
                                    break;
                                default:
                                    break outer;
                            }
                        }

                        let wordlength = pos - wordstart;
                        className_flag = 0;
                        switch (charIntSum) {
                            case 94844771: // const
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'const') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case 107035: // let
                                if (wordlength === 3 && divSpanTextContent.substring(wordstart, pos) === 'let') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case 1380938712: // function
                                if (wordlength === 8 && divSpanTextContent.substring(wordstart, pos) === 'function') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case 3357: // if
                                if (wordlength === 2 && divSpanTextContent.substring(wordstart, pos) === 'if') {
                                    className_flag = 2;
                                    break;
                                }
                                break;
                            case 115131: // try
                                if (wordlength === 3 && divSpanTextContent.substring(wordstart, pos) === 'try') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case 101577: // for
                                if (wordlength === 3 && divSpanTextContent.substring(wordstart, pos) === 'for') {
                                    className_flag = 2;
                                    break;
                                }
                                break;
                            case 116519: // var
                                if (wordlength === 3 && divSpanTextContent.substring(wordstart, pos) === 'var') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case 94432955: // catch
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'catch') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case -934396624: // return
                                if (wordlength === 6 && divSpanTextContent.substring(wordstart, pos) === 'return') {
                                    className_flag = 2;
                                    break;
                                }
                                break;
                            case -889473228: // switch
                                if (wordlength === 6 && divSpanTextContent.substring(wordstart, pos) === 'switch') {
                                    className_flag = 2;
                                    break;
                                }
                                break;
                            case 3046192: // case
                                if (wordlength === 4 && divSpanTextContent.substring(wordstart, pos) === 'case') {
                                    className_flag = 2;
                                    break;
                                }
                                break;
                            case 93127292: // async
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'async') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case 3116345: // else
                                if (wordlength === 4 && divSpanTextContent.substring(wordstart, pos) === 'else') {
                                    className_flag = 2;
                                    break;
                                }
                                break;
                            case 1544803905: // default
                                if (wordlength === 7 && divSpanTextContent.substring(wordstart, pos) === 'default') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case 110339814: // throw
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'throw') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case 108960: // new
                                if (wordlength === 3 && divSpanTextContent.substring(wordstart, pos) === 'new') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case 93223254: // await
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'await') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case 94742904: // class
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'class') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case -1588406278: // constructor
                                if (wordlength === 11 && divSpanTextContent.substring(wordstart, pos) === 'constructor') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case -1184795739: // import
                                if (wordlength === 6 && divSpanTextContent.substring(wordstart, pos) === 'import') {
                                    className_flag = 2;
                                    break;
                                }
                                break;
                            case 3151786: // from
                                if (wordlength === 4 && divSpanTextContent.substring(wordstart, pos) === 'from') {
                                    className_flag = 2;
                                    break;
                                }
                                break;
                            case -1289153612: // export
                                if (wordlength === 6 && divSpanTextContent.substring(wordstart, pos) === 'export') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case 3559070: // this
                                if (wordlength === 4 && divSpanTextContent.substring(wordstart, pos) === 'this') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case 113101617: // while
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'while') {
                                    className_flag = 2;
                                    break;
                                }
                                break;
                            case 94001407: // break
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'break') {
                                    className_flag = 2;
                                    break;
                                }
                                break;
                            case -567202649: // continue
                                if (wordlength === 8 && divSpanTextContent.substring(wordstart, pos) === 'continue') {
                                    className_flag = 2;
                                    break;
                                }
                                break;
                            case 3569038: // true
                                if (wordlength === 4 && divSpanTextContent.substring(wordstart, pos) === 'true') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case 97196323: // false
                                if (wordlength === 5 && divSpanTextContent.substring(wordstart, pos) === 'false') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            case 3392903: // null
                                if (wordlength === 4 && divSpanTextContent.substring(wordstart, pos) === 'null') {
                                    className_flag = 1;
                                    break;
                                }
                                break;
                            default:
                                break;
                        }

                        if (substart < wordstart) {
                            substart = wordstart; // TODO: Always do this just so you remove the branching?
                        }

                        range = new Range();
                        range.setStart(textNode, substart);
                        range.setEnd(textNode, substart + wordlength);

                        if (className_flag === 0) {
                            if (divSpanTextContent[pos] === '(') {
                                EDI_ringBuffer_mapHighlights[ringBufferIndexOfDiv].push(range);
                                functionHighlight.add(range);
                            }
                            else if (substart > 0 && divSpanTextContent[substart - 1] === '.') {
                                EDI_ringBuffer_mapHighlights[ringBufferIndexOfDiv].push(range);
                                memberHighlight.add(range);
                            }
                            else if (divSpanTextContent[pos] === ':') {
                                EDI_ringBuffer_mapHighlights[ringBufferIndexOfDiv].push(range);
                                memberHighlight.add(range);
                            }
                            else {
                                EDI_ringBuffer_mapHighlights[ringBufferIndexOfDiv].push(range);
                                identifierHighlight.add(range);
                            }
                        }
                        else if (className_flag === 1) {
                            EDI_ringBuffer_mapHighlights[ringBufferIndexOfDiv].push(range);
                            keywordHighlight.add(range);
                        }
                        else if (className_flag === 2) {
                            EDI_ringBuffer_mapHighlights[ringBufferIndexOfDiv].push(range);
                            keywordControlHighlight.add(range);
                        }
                        substart += wordlength;
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
                                range = new Range();
                                range.setStart(textNode, substart);
                                range.setEnd(textNode, substart = pos);
                                EDI_ringBuffer_mapHighlights[ringBufferIndexOfDiv].push(range);
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

                            range = new Range();
                            range.setStart(textNode, substart);
                            range.setEnd(textNode, substart = pos);
                            EDI_ringBuffer_mapHighlights[ringBufferIndexOfDiv].push(range);
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

                        range = new Range();
                        range.setStart(textNode, substart);
                        range.setEnd(textNode, substart = pos);
                        EDI_ringBuffer_mapHighlights[ringBufferIndexOfDiv].push(range);
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

                        range = new Range();
                        range.setStart(textNode, substart);
                        range.setEnd(textNode, substart = pos);
                        EDI_ringBuffer_mapHighlights[ringBufferIndexOfDiv].push(range);
                        stringHighlight.add(range);
                        
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

                        range = new Range();
                        range.setStart(textNode, substart);
                        range.setEnd(textNode, substart = pos);
                        EDI_ringBuffer_mapHighlights[ringBufferIndexOfDiv].push(range);
                        stringHighlight.add(range);

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

            let trackedSyntaxEnd = INTS[fEDI_poolret_pooledTrackedSyntax_start] + INTS[fEDI_poolret_pooledTrackedSyntax_length];
            const r_trackedSyntaxEnd = trackedSyntaxEnd - lineStart;
            subend = r_trackedSyntaxEnd > divSpanTextContentLength ? divSpanTextContentLength : r_trackedSyntaxEnd;
            
            let length = subend - substart;
            if (length <= 0) {
                trackedSyntax_I++;
                continue;
            }
            range = new Range();
            range.setStart(textNode, substart);
            range.setEnd(textNode, subend);
            substart += length;
            subend = divSpanTextContentLength;
            pos += length;
            switch (BYTES[byteEDI_byteret_pooledTrackedSyntax_trackedSyntaxKind]) {
                case TrackedSyntaxKind_Comment:
                    EDI_ringBuffer_mapHighlights[ringBufferIndexOfDiv].push(range);
                    commentHighlight.add(range);
                    break;
                case TrackedSyntaxKind_String:
                    EDI_ringBuffer_mapHighlights[ringBufferIndexOfDiv].push(range);
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

            if (INTS[fEDI_poolret_pooledTrackedSyntax_start] >= lineStart + divSpanTextContentLength) {
                createDoLexFlag = true;
                trackedSyntaxExhausted = true;
                subend = divSpanTextContentLength;
                continue;
            }

            if (INTS[fEDI_poolret_pooledTrackedSyntax_start] + INTS[fEDI_poolret_pooledTrackedSyntax_length] < lineStart) {
                trackedSyntax_I++;
                continue;
            }

            if (INTS[fEDI_poolret_pooledTrackedSyntax_start] > lineStart + substart) {
                createDoLexFlag = true;
                trackedSyntaxExhausted = false;
                const r_trackedSyntaxStart = INTS[fEDI_poolret_pooledTrackedSyntax_start] - lineStart;
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
