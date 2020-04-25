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
    if (options.lineDirection === 'down' && direction === 'up'
        || options.lineDirection === 'up' && direction === 'down') {
        [].slice.call($qsa('#texthooker > p')).reverse()
            .forEach((node, i) => { $id('texthooker').children[i].replaceWith(node); });
    }

    options.lineDirection = direction;
    $qsa('#line-directions > .choice').forEach(e => e.classList.remove('active'));
    $qsa(`#line-directions > .choice[data-direction="${options.lineDirection}"]`)
        .forEach(e => e.classList.add('active'));

    $id('texthooker').setAttribute('data-line-direction', direction);

    updateOptionsStorage();
}

function changeFont(font) {
    $qsa('#font-control > .choice')
        .forEach(e => document.body.classList.remove(fontClassName(e.getAttribute('data-font'))));

    options.activeFont = font;
    $qsa('#font-control > .choice').forEach(e => e.classList.remove('active'));
    $qsa(`#font-control > .choice[data-font="${options.activeFont}"]`)
        .forEach(e => e.classList.add('active'));

    updateOptionsStorage();
}

function updateOptionsStorage() {
    window.localStorage.setItem('options', JSON.stringify(options));
}

$id('remove-button').addEventListener('click', _ => {
    // Check whether there are any lines.
    if ($qsa('#texthooker > p').length < 1) return;

    // Get last line.
    let targetElement;
    if (options.lineDirection === 'down') {
        targetElement = $qs('#texthooker > p:last-child');
    } else if (options.lineDirection === 'up') {
        targetElement = $qs('#texthooker > p:first-child');
    } else throw new Error('illegal value for lineDirection');

    // Update the counter.
    state.charCount = state.charCount - targetElement.textContent.length;
    state.lineCount = state.lineCount - 1;
    updateCounter();

    // Remove the last line.
    targetElement.remove();
});

$id('line-directions').addEventListener('click', ev => {
    changeLineDirection(ev.target.getAttribute('data-direction'));
});

$id('font-control').addEventListener('click', ev => {
    changeFont(ev.target.getAttribute('data-font'));
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

        if (options.lineDirection === 'up') {
            if ($qsa('#texthooker > p').length > 1) {
                let $para = $qs('#texthooker > p:last-child');
                let xTranslate = $para.offsetHeight;
                $para.remove();
                let anim = $id('texthooker').animate([ { transform: `translate(0, ${xTranslate}px)` } ], {
                    duration: 400,
                    easing: 'ease-in-out'
                });
                anim.onfinish = () => { $id('texthooker').prepend($para); };
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