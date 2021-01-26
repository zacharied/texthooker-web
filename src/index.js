const BOTTOM_SCROLL_LEEWAY = 200;
const TIME_BETWEEN_LINES = 200;
const STORAGE_KEY_TEXT = 'texthookerContent';
const LOG_NAME_KEY_PREFIX = 'log_';

const TEXT_SIZE_PX_MIN = 12;
const TEXT_SIZE_PX_MAX = 40;

const $id = id => document.getElementById(id);
const $qs = selector => document.querySelector(selector);
const $qsa = selector => document.querySelectorAll(selector);
const $ce = tagName => document.createElement(tagName);
const $style = (elem, pseudo) => getComputedStyle(elem, pseudo);
Element.prototype.$qs = function(selector) { return this.querySelector(selector) };
Element.prototype.$qsa = function(selector) { return this.querySelectorAll(selector) };

var state = {
    charCount: 0,
    lineCount: 0,
    lastLineTime: new Date(),
    lineStreamStartPoint: -1,
    counterType: 'all',
    sessionLines: 0,
    sessionChars: 0
};

var options = {
    lineDirection: 'down',
    allowVerticalScroll: true,
    activeFont: 'sans',
    shade: 'dark',
    textSize: 40,
    activeLog: null
};

const getLogLines = (logName) => {
    if (logName == null || logName.trim().length === 0)
        return [];
    const lines = window.localStorage.getItem(LOG_NAME_KEY_PREFIX + logName);
    if (lines == null)
        throw new Error(`invalid log "${logName}"`);
    return JSON.parse(lines);
}

var logNames = Object.keys(window.localStorage)
    .filter(k => k.startsWith(LOG_NAME_KEY_PREFIX))
    .map(k => k.substring(LOG_NAME_KEY_PREFIX.length));

if (window.localStorage.getItem('options')) {
    console.log('Restoring previously saved options.');
    let savedOptions = JSON.parse(window.localStorage.getItem('options'));
    for (let [k, v] of Object.entries(savedOptions))
        options[k] = v;
}

const fontClassName = (font) => `font-${font}`;

function populateLines(logName, offset = 0, sessionLine = true) {
    console.log(`Populating log ${logName}`);
    if (logName !== options.activeLog)
        $id('texthooker').innerHTML = "";

    const lines = getLogLines(logName);

    if (state.lineStreamStartPoint < 0)
        state.lineStreamStartPoint = lines.length;

    offset = Math.max(state.lineStreamStartPoint - offset, 0);

    for (let i = state.lineStreamStartPoint - 1; i >= offset; i--)
        addLine(lines[i], true, sessionLine);
    const addedLines = state.lineStreamStartPoint - offset;
    state.lineStreamStartPoint = offset;

    return addedLines;
}

function populateLogNameSelection() {
    // Clear the select
    $id('choose-game').options.length = 0;

    $id('choose-game').options.add($ce('option'));
    if (options.activeLog == null)
        $id('choose-game').options[0].selected = 'selected';

    for (const logName of logNames) {
        let $c = $ce('option');
        $c.text = logName;
        $id('choose-game').add($c);

        if (options.activeLog === logName)
            $id('choose-game').options[$id('choose-game').options.length - 1].selected = 'selected';
    }
}

function changeLineDirection(direction) {
    options.lineDirection = direction;
    $qsa('.choices-line-directions > .choice').forEach(e => e.classList.remove('active'));
    $qsa(`.choices-line-directions > .choice[data-direction="${options.lineDirection}"]`)
        .forEach(e => e.classList.add('active'));

    $id('texthooker').setAttribute('data-line-direction', direction);

    let $verticalScrollControl = $qs('.control-vertical-scroll');
    if (options.lineDirection === 'right' || options.lineDirection === 'left') {
        $verticalScrollControl.style.visibility = 'visible';
    } else {
        $verticalScrollControl.style.visibility = 'collapse';
    }

    updateOptionsStorage();
}

function changeFont(font) {
    $qsa('.choices-fonts > .choice')
        .forEach(e => $id('texthooker').classList.remove(fontClassName(e.getAttribute('data-font'))));

    options.activeFont = font;
    $qsa('.choices-fonts > .choice').forEach(e => e.classList.remove('active'));
    $qsa(`.choices-fonts > .choice[data-font="${options.activeFont}"]`)
        .forEach(e => e.classList.add('active'));
    
    $id('texthooker').classList.add(fontClassName(font));

    updateOptionsStorage();
}

function changeShade(shade) {
    $qsa('.choices-shades > .choice').forEach(e => e.classList.remove('active'));

    options.shade = shade;
    $qs(`.choices-shades > .choice[data-shade="${options.shade}"]`).classList.add('active');
    $qs('body').setAttribute('data-shade', shade);

    updateOptionsStorage();
}

function changeTextSize(size, updateSlider = false) {
    options.textSize = size;

    if (updateSlider)
        $qs('.text-size').valueAsNumber = options.textSize;

    const range = TEXT_SIZE_PX_MAX - TEXT_SIZE_PX_MIN;
    const fontSize = Math.floor(TEXT_SIZE_PX_MIN + range * (options.textSize / 100));
    $id('texthooker').style.fontSize = `${fontSize}pt`;
    $id('text-size-display').textContent = `${fontSize}pt`;

    updateOptionsStorage();
}

function populateCounterType() {
    const counterTypeText = (state.counterType === 'all') ? '全行' : 'セッション';
    $id('counter-type-selection').textContent = counterTypeText;
}

function updateOptionsStorage() {
    window.localStorage.setItem('options', JSON.stringify(options));
}

$qs('.choices-line-directions').addEventListener('click', ev => {
    if (!ev.target.classList.contains('choice'))
        return;
    changeLineDirection(ev.target.getAttribute('data-direction'));
});

$qs('.choices-fonts').addEventListener('click', ev => {
    if (!ev.target.classList.contains('choice'))
        return;
    changeFont(ev.target.getAttribute('data-font'));
});

$qs('.choices-shades').addEventListener('click', ev => {
    let $choice = ev.target.closest('.choice');
    if ($choice == null)
        return;
    changeShade($choice.getAttribute('data-shade'));
});

$qs('.vertical-scroll-toggle').addEventListener('change', ev => {
    options.allowVerticalScroll = ev.target.checked;
});

$qs('.text-size').addEventListener('input', ev => {
    changeTextSize(ev.target.valueAsNumber);
});

$id('options-button').addEventListener('click', ev => {
    setShowOptionsModal(true);
});

$id('controls-container-close').addEventListener('click', _ => {
    setShowOptionsModal(false);
});

$id('log-create-new').addEventListener('click', _ => {
    const logName = prompt('New log name');

    if (logName == null || logName.trim().length === 0)
        return;
    if (logNames.includes(logName))
        return;

    logNames.push(logName);
    localStorage.setItem(LOG_NAME_KEY_PREFIX + logName, JSON.stringify([]));

    populateLines(options.activeLog, 30);

    options.activeLog = logName;
    updateOptionsStorage();
    populateLogNameSelection();

    populateTextStats();
});

$id('log-edit-name').addEventListener('click', _ => {
    const $select = $id('choose-game');
    const oldLogName = $select.value;
    const oldSelectIndex = $select.options.selectedIndex;

    const logName = prompt('Name for this log', $select.value);

    if (logName == null || logName.trim().length === 0)
        return;
    if (logNames.includes(logName))
        return;

    logNames[oldSelectIndex - 1] = logName;
    const oldLines = localStorage.getItem(LOG_NAME_KEY_PREFIX + oldLogName);
    localStorage.setItem(LOG_NAME_KEY_PREFIX + logName, oldLines);
    localStorage.removeItem(LOG_NAME_KEY_PREFIX + oldLogName);
    options.activeLog = logName;
    updateOptionsStorage();

    populateLogNameSelection();
});

$id('log-remove').addEventListener('click', _ => {
    const $select = $id('choose-game');

    const confirmed = confirm('Are you sure you want to delete this log?');
    if (!confirmed)
        return;

    const logName = $select.value;
    logNames.splice($select.options.selectedIndex - 1, 1);
    localStorage.removeItem(LOG_NAME_KEY_PREFIX + logName);

    populateLines(null);

    options.activeLog = null;
    updateOptionsStorage();
    populateLogNameSelection();

    populateTextStats();
});

$id('counter-type-selection').addEventListener('click', _ => {
    state.counterType = (state.counterType === 'all') ? 'session' : 'all';
    populateCounterType();
    populateTextStats();
});

document.addEventListener('click', ev => {
    if (ev.target.closest('#controls-container') == null && ev.target.id !== 'options-button') {
        setShowOptionsModal(false);
    }
});

// Allow for a vertical scrollwheel to scroll horizontally when in vertical text layouts.
document.scrollingElement.addEventListener('wheel', ev => {
    if ((options.lineDirection === 'left' || options.lineDirection === 'right') && ev.deltaY) {
        // TODO Allow customization.
        ev.currentTarget.scrollLeft += ev.deltaY * 30;
        ev.preventDefault();
    }

    if (options.lineDirection === 'down' && scrollY === 0 && ev.deltaY < 0) {
        const addedLines = populateLines(options.activeLog, 20, false);
        const $prevLastLine = $id('texthooker').childNodes[addedLines];
        const scrollTarget = $prevLastLine.getBoundingClientRect().top - $id('container').clientHeight - parseInt($style($prevLastLine).paddingTop) * 2;
        window.scrollTo(window.scrollX, scrollTarget);
    }
});

function populateTextStats() {
    let lines = 0;
    let chars = 0;

    if (state.counterType === 'all') {
        if (options.activeLog == null) {
            state.charCount = 0;
            state.lineCount = 0;
        } else {
            const lines = getLogLines(options.activeLog);
            state.charCount = lines.reduce((acc, cur) => acc + cur.length, 0);
            state.lineCount = lines.length;
        }

        lines = state.lineCount;
        chars = state.charCount;
    } else {
        lines = state.sessionLines;
        chars = state.sessionChars;
    }

    $id('counter').textContent = `${chars.toLocaleString()}字 / ${lines.toLocaleString()}行`;
}

function setShowOptionsModal(show) {
    const $overlay = $id('modal-overlay');
    const $controls = $id('controls-container');

    if (show === true) {
        $overlay.classList.add('c-overlay--visible');
        $controls.classList.add('o-modal--visible');
    } else {
        $overlay.classList.remove('c-overlay--visible');
        $controls.classList.remove('o-modal--visible');
    }
}

function onLogSelected(select) {
    const newLog = select.options[select.selectedIndex].value;

    state.lineStreamStartPoint = -1;
    populateLines(newLog, 30, false);
    options.activeLog = newLog;
    updateOptionsStorage();

    populateTextStats();
}

function onDeleteLineClicked(deleteButtonNode) {
    const $parent = deleteButtonNode.parentNode;
    const $lineList = $parent.parentNode;

    state.charCount -= deleteButtonNode.parentNode.$qs('.line-contents').textContent.length;
    state.lineCount -= 1;
    populateTextStats();

    const index = state.lineStreamStartPoint + Array.prototype.slice.call($lineList.children).indexOf($parent);
    if (options.activeLog != null) {
        const keyName = LOG_NAME_KEY_PREFIX + options.activeLog;
        let savedLines = JSON.parse(window.localStorage.getItem(keyName));
        savedLines.splice(index, 1);
        window.localStorage.setItem(keyName, JSON.stringify(savedLines));
    }

    deleteButtonNode.parentNode.remove();
}

/** Adds a new text line element to the end of the texthooker output. */
function addLine(lineText, prepend = false, sessionLine = true) {
    let $newline = $id('tmpl-added-line').content.cloneNode(true).children[0];
    let $newlineText = $newline.$qs('.line-contents');
    $newlineText.innerHTML = lineText.replace(/<br>/, '\u2002');
    $newlineText.textContent = $newlineText.textContent.trim();

    if (prepend)
        $id('texthooker').prepend($newline);
    else
        $id('texthooker').appendChild($newline);

    if (sessionLine) {
        state.sessionLines += 1;
        state.sessionChars += $newline.$qs('.line-contents').textContent.length;
    }

    // Print the new counts into the counter.
    if (!prepend) {
        state.lineCount = $qsa('#texthooker > .texthooker-line').length;
        state.charCount += $newline.$qs('.line-contents').textContent.length;
        populateTextStats();
    }
}

const observer = new MutationObserver(function(mutationsList, observer) {
    // Check if a 'p' node was added.
    if (mutationsList.filter(record => {
        for (let node of record.addedNodes)
            if (node.tagName === 'P')
                return true;
    }).length === 0) {
        return;
    }

    // Lines getting added too quickly usually indicates some weirdness in the user's clipboard.
    if (new Date().getTime() - state.lastLineTime.getTime() < TIME_BETWEEN_LINES) {
        $qs('#texthooker > p:last-child').remove();
        return;
    }

    let $inserted = $qs('#texthooker > p:last-child');
    const lineText = $inserted.textContent;
    addLine(lineText);
    $inserted.remove();

    if (options.lineDirection === 'down') {
        window.scrollTo(0, document.body.scrollHeight);
    } else if (options.lineDirection === 'right') {
        window.scrollTo(document.body.scrollWidth, 0);
    }

    state.lastLineTime = new Date();

    // Save to local storage.
    if (options.activeLog != null) {
        const keyName = LOG_NAME_KEY_PREFIX + options.activeLog;
        let savedLines = JSON.parse(window.localStorage.getItem(keyName));
        if (savedLines == null)
            savedLines = [];
        savedLines.push(lineText);
        window.localStorage.setItem(keyName, JSON.stringify(savedLines));
    }

    populateTextStats();
});

observer.observe($id('texthooker'), {
    attributes: false,
    childList: true,
    subtree: true
});

const bodyObserver = new MutationObserver(function(mutationsList, observer) {
    if (mutationsList.filter(record => {
        for (let node of record.addedNodes)
            if (node.tagName === 'P')
                return true;
    }).length === 0) {
        return;
    }

    let $inserted = $qs('body > p:last-child');
    const $newElement = document.createElement('P');
    $newElement.textContent = $inserted.textContent;
    $id('texthooker').appendChild($newElement);
    $inserted.remove();
});

bodyObserver.observe(document.body, { 
    childList: true,
    subtree: false
});

document.onreadystatechange = ev => {
    if (document.readyState !== 'complete')
        return;

    // Set upper margin of text so that it doesn't intersect the bar.
    let $hooktext = $id('texthooker');
    $hooktext.style.marginTop = `${$id('container').clientHeight + parseInt($style($hooktext).marginTop)}px`;

    // Set up custom log selection.
    populateLogNameSelection();

    // Initialize counter text.
    populateTextStats();
    populateCounterType();

    changeLineDirection(options.lineDirection);
    changeFont(options.activeFont);
    changeShade(options.shade);
    changeTextSize(options.textSize, true);
    $qs('.vertical-scroll-toggle').checked = options.allowVerticalScroll;

    if (options.activeLog != null) {
        populateLines(options.activeLog, 30, false);
        populateTextStats();
    }
};
