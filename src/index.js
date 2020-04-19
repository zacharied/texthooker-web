const BOTTOM_SCROLL_LEEWAY = 200;
const TIME_BETWEEN_LINES = 200;

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
    $('#counter').text(`${charCount.toLocaleString()}字 / ${lineCount.toLocaleString()}行`);
}

function changeLineDirection(direction) {
    if (options.lineDirection === 'down' && direction === 'up'
        || options.lineDirection === 'up' && direction === 'down') {
        let newBody = $('<div />');	
        $($('#texthooker > p').get().reverse()).each(function(_, e) { newBody.append(e); });
        $('#texthooker').empty().append(newBody.children());
    }

    options.lineDirection = direction;
    $('#line-directions > .choice').removeClass('active');
    $(`#line-directions > .choice[data-direction="${options.lineDirection}"]`)
        .addClass('active');

    $('#texthooker').attr('data-line-direction', direction);

    updateOptionsStorage();
}

function changeFont(font) {
    $('#font-control > .choice')
        .each(function(_, e) { $('body').removeClass(fontClassName($(e).attr('data-font'))) });
    $('body').addClass(fontClassName(font));

    options.activeFont = font;
    $('#font-control > .choice').removeClass('active');
    $(`#font-control > .choice[data-font="${options.activeFont}"]`).addClass('active');

    updateOptionsStorage();
}

function updateOptionsStorage() {
    window.localStorage.setItem('options', JSON.stringify(options));
}

$('#remove-button').on('click', () => {
    // Check whether there are any lines.
    let lines = $('#texthooker > p').length;
    if (lines < 1) return;

    // Get last line.
    let targetElement;
    if (options.lineDirection === 'down') {
        targetElement = $('#texthooker > p:last-child');
    } else if (options.lineDirection === 'up') {
        targetElement = $('#texthooker > p:first-child');
    } else throw new Error('illegal value for lineDirection');

    // Update the counter.
    state.charCount = state.charCount - targetElement.text().length;
    state.lineCount = state.lineCount - 1;
    updateCounter();

    // Remove the last line.
    targetElement.remove();
});

$('#line-directions').on('click', '.choice', function() {
    changeLineDirection($(this).attr('data-direction'));
});

$('#font-control').on('click', '.choice', function() {
    changeFont($(this).attr('data-font'));
});

const observer = new MutationObserver(function(mutationsList, observer) {
    let lineCount = $('#texthooker > p').length;

    if (lineCount - state.lineCount > 0) {
        // Lines getting added too quickly usually indicates some weirdness in the user's clipboard.
        if (new Date().getTime() - state.lastLineTime.getTime() < TIME_BETWEEN_LINES) {
            $('#texthooker > p:last-child').remove();
            return;
        }

        // If it is a new line, do a character count of the line and add it to the running tally.
        let newline = $('#texthooker > p:last-child').html((_, html) => html.replace(/<br>/, '\u2002'));

        // Print the new counts into the counter.
        state.lineCount = lineCount;
        state.charCount += newline.text().length;
        updateCounter();

        if (options.lineDirection === 'up') {
            if ($('#texthooker > p').length > 1) {
                let $para = $('#texthooker > p:last-child');
                let margin = $para.outerHeight(true) - $para.outerHeight(false);
                let xTranslate = $para.outerHeight(false) + (margin / 2);
                $para.remove();
                $('#texthooker > p').animate({
                    top: `+=${xTranslate}px`
                }, { complete: () => {
                    $('#texthooker').prepend($para);
                    $('#texthooker > p').stop().removeAttr('style');
                } });
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

observer.observe(document.getElementById('texthooker'), {
    attributes: false,
    childList: true,
    subtree: true
});

$(document).ready(() => {
    // Set upper margin of text so that it doesn't intersect the bar.
    $('#texthooker').css('margin-top', `+=${$('#container').height()}px`);

    // Initialize counter text.
    updateCounter();

    changeLineDirection(options.lineDirection);
    changeFont(options.activeFont);
});