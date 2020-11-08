const BOTTOM_SCROLL_LEEWAY = 200;
const TIME_BETWEEN_LINES = 200;
const STORAGE_KEY_TEXT = 'texthookerContent';
const LOG_NAME_KEY_PREFIX = 'log_';

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
};

var options = {
    lineDirection: 'down',
    allowVerticalScroll: true,
    activeFont: 'sans',
    shade: 'dark',
    activeLog: null
};

const getLogLines = (logName) => {
    if (logName.trim().length === 0)
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

function populateLines(logName) {
    const lines = getLogLines(logName);

    $id('texthooker').innerHTML = "";

    for (let line of lines)
        addLine(line);

    updateCounter();
}

function addLogName(logName) {
    let $c = $ce('option');
    $c.text = logName;
    $id('choose-game').add($c);
}

function populateLogNameSelection() {
    for (const logName of logNames) {
        addLogName(logName);
        if (options.activeLog === logName)
            $id('choose-game').options[$id('choose-game').options.length - 1].selected = 'selected';
    }
}

function updateCounter(charCount = state.charCount, lineCount = state.lineCount) {
    $id('counter').textContent = `${charCount.toLocaleString()}字 / ${lineCount.toLocaleString()}行`;
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

function updateOptionsStorage() {
    window.localStorage.setItem('options', JSON.stringify(options));
}

$id('remove-button').addEventListener('click', _ => {
    // Check whether there are any lines.
    if ($qsa('#texthooker > .texthooker-line').length < 1) return;

    // Get last line.
    let targetElement = $qs('#texthooker > .texthooker-line:last-child');

    // Update the counter.
    state.charCount = state.charCount - targetElement.$qs('.line-contents').textContent.length;
    state.lineCount = state.lineCount - 1;
    updateCounter();

    // Remove the last line.
    targetElement.remove();
});

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

// TODO Fix this hack somehow.
var origMarginLeft = null;
$id('options-button').addEventListener('click', ev => {
    let $controls = $id('controls-container');
    let $button = $id('options-button');
    $controls.style.visibility = 'visible';
    $controls.style.left = `${window.scrollX + $button.getBoundingClientRect().left + $button.offsetWidth / 2 - $controls.getBoundingClientRect().width / 2}px`;
    if (parseInt($controls.style.left) < 0) {
        let diff = -parseInt($controls.style.left) + parseInt($style($controls).paddingLeft);
        $controls.style.left = `${parseInt($controls.style.left) + diff}px`;
        let $afterStyle = getComputedStyle($controls, ':after');

        // TODO Fix this awfulness.
        if (!origMarginLeft)
            origMarginLeft = parseInt($afterStyle.getPropertyValue('margin-left'));
        let $tempStyle = document.head.appendChild($ce('style'));
        $tempStyle.innerHTML = `#controls-container:after { margin-left: ${origMarginLeft - diff}px }`;
    }
    $controls.style.top = `${window.scrollY + $button.getBoundingClientRect().top + $id('container').clientHeight + (origMarginLeft ? -origMarginLeft : 0)}px`;
});

document.addEventListener('click', ev => {
    if (ev.target.closest('#controls-container') == null && ev.target.id !== 'options-button') {
        $id('controls-container').style.visibility = 'collapse';
    }
});

// Allow for a vertical scrollwheel to scroll horizontally when in vertical text layouts.
document.scrollingElement.addEventListener('wheel', ev => {
    if ((options.lineDirection === 'left' || options.lineDirection === 'right') && ev.deltaY) {
        // TODO Allow customization.
        ev.currentTarget.scrollLeft += ev.deltaY * 30;
        ev.preventDefault();
    }
});

function onAddLogClick() {
    const logName = prompt('New log name');

    if (logName.trim().length === 0)
        return;
    if (logNames.includes(logName))
        return;

    logNames.push(logName);
    addLogName(logName);
    localStorage.setItem(LOG_NAME_KEY_PREFIX + logName, JSON.stringify([]));
}

function onLogSelected(select) {
    options.activeLog = select.options[select.selectedIndex].value;
    updateOptionsStorage();
    populateLines(options.activeLog);
}

function onDeleteLineClicked(deleteButtonNode) {
    state.charCount -= deleteButtonNode.parentNode.$qs('.line-contents').textContent.length;
    state.lineCount -= 1;
    updateCounter();
    deleteButtonNode.parentNode.remove();
}

/** Adds a new text line element to the end of the texthooker output. */
function addLine(lineText) {
    let $newline = $id('tmpl-added-line').content.cloneNode(true).children[0];
    let $newlineText = $newline.$qs('.line-contents');
    $newlineText.innerHTML = lineText.replace(/<br>/, '\u2002');
    $newlineText.textContent = $newlineText.textContent.trim();
    $id('texthooker').appendChild($newline);

    // Print the new counts into the counter.
    state.lineCount = $qsa('#texthooker > .texthooker-line').length;
    state.charCount += $newline.$qs('.line-contents').textContent.length;
    updateCounter();
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

    if ($qs('#texthooker > p') == null)
        return;

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
});

observer.observe($id('texthooker'), {
    attributes: false,
    childList: true,
    subtree: true
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
    updateCounter();

    changeLineDirection(options.lineDirection);
    changeFont(options.activeFont);
    changeShade(options.shade);
    $qs('.vertical-scroll-toggle').checked = options.allowVerticalScroll;

    if (options.activeLog != null)
        populateLines(options.activeLog);
};
