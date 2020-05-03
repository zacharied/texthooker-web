const BOTTOM_SCROLL_LEEWAY = 200;
const TIME_BETWEEN_LINES = 200;

const $id = id => document.getElementById(id);
const $qs = selector => document.querySelector(selector);
const $qsa = selector => document.querySelectorAll(selector);
const $ce = tagName => document.createElement(tagName);
const $style = elem => getComputedStyle(elem);
Element.prototype.$qs = function(selector) { return this.querySelector(selector) };
Element.prototype.$qsa = function(selector) { return this.querySelectorAll(selector) };

var state = {
    charCount: 0,
    lineCount: 0,
    lastLineTime: new Date(),
};

var options = {
    lineDirection: 'down',
    activeFont: 'sans'
};

if (window.localStorage.getItem('options')) {
    console.log('Restoring previously saved options.');
    let savedOptions = JSON.parse(window.localStorage.getItem('options'));
    for (let [k, v] of Object.entries(savedOptions))
        options[k] = v;
}

const fontClassName = (font) => `font-${font}`;

function updateCounter(charCount = state.charCount, lineCount = state.lineCount) {
    $id('counter').textContent = `${charCount.toLocaleString()}字 / ${lineCount.toLocaleString()}行`;
}

function changeLineDirection(direction) {
    options.lineDirection = direction;
    $qsa('.choices-line-directions > .choice').forEach(e => e.classList.remove('active'));
    $qsa(`.choices-line-directions > .choice[data-direction="${options.lineDirection}"]`)
        .forEach(e => e.classList.add('active'));

    $id('texthooker').setAttribute('data-line-direction', direction);

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

function updateOptionsStorage() {
    window.localStorage.setItem('options', JSON.stringify(options));
}

$id('remove-button').addEventListener('click', _ => {
    // Check whether there are any lines.
    if ($qsa('#texthooker > p').length < 1) return;

    // Get last line.
    let targetElement = $qs('#texthooker > p:last-child');

    // Update the counter.
    state.charCount = state.charCount - targetElement.textContent.length;
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

$id('options-button').addEventListener('click', ev => {
    let $controls = $id('controls-container');
    let $button = $id('options-button');
    $controls.style.display = 'inline';
    $controls.style.left = `${window.scrollX + $button.getBoundingClientRect().left + $button.offsetWidth / 2 - $controls.getBoundingClientRect().width / 2}px`;
    $controls.style.top = `${window.scrollY + $button.getBoundingClientRect().top + $id('container').clientHeight}px`;
});

document.addEventListener('click', ev => {
    if (ev.target.closest('#controls-container') == null && ev.target.id !== 'options-button') {
        $id('controls-container').style.display = 'none';
    }
});

const observer = new MutationObserver(function(mutationsList, observer) {
    let lineCount = $qsa('#texthooker > p').length;

    if (lineCount - state.lineCount > 0) {
        // Lines getting added too quickly usually indicates some weirdness in the user's clipboard.
        if (new Date().getTime() - state.lastLineTime.getTime() < TIME_BETWEEN_LINES) {
            $qs('#texthooker > p:last-child').remove();
            return;
        }

        // If it is a new line, do a character count of the line and add it to the running tally.
        let newline = $qs('#texthooker > p:last-child');
        newline.innerHTML = newline.innerHTML.replace(/<br>/, '\u2002');

        // Print the new counts into the counter.
        state.lineCount = lineCount;
        state.charCount += newline.textContent.length;
        updateCounter();

        // Animate addition of the new element.
        if (!document.hidden) {
            if (options.lineDirection === 'up') {
                if ($qsa('#texthooker > p').length > 1) {
                    // Remove the element to hide it while we scroll the text downwards, then append it back to "show" it.
                    let $newElem = $qs('#texthooker > p:last-child');
                    let translate = $newElem.offsetHeight;
                    $newElem.remove();
                    let anim = $id('texthooker').animate([ { transform: `translate(0, ${translate}px)` } ], {
                        duration: 400,
                        easing: 'ease-in-out'
                    });
                    anim.onfinish = () => { $id('texthooker').append($newElem); };
                }
            } else if (options.lineDirection === 'down') {
                // Some obscene browser shit because making sense is for dweebs
                let b = document.body;
                let offset = b.scrollHeight - b.offsetHeight;
                let scrollPos = (b.scrollTop + offset);
                let scrollBottom = (b.scrollHeight - (b.clientHeight + offset));

                // If we are at the bottom, go to the bottom again.
                if (scrollPos >= scrollBottom - BOTTOM_SCROLL_LEEWAY) {
                    window.scrollTo(0, document.body.scrollHeight);
                }
            }
        }

        state.lastLineTime = new Date();
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

    // Initialize counter text.
    updateCounter();

    changeLineDirection(options.lineDirection);
    changeFont(options.activeFont);
};