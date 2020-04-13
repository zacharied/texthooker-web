const BOTTOM_SCROLL_LEEWAY = 200;
const TIME_BETWEEN_LINES = 200;

var state = {
    charCount: 0,
    lineCount: 0,
    lastLineTime: new Date(),
    lineDirection: 'down'
};

function updateCounter(charCount = state.charCount, lineCount = state.lineCount) {
    $('#counter').text(`${charCount.toLocaleString()}字 / ${lineCount.toLocaleString()}行`);
}

function changeLineDirection(direction) {
    if (state.lineDirection === direction) return;

    if (state.lineDirection === 'down' && direction === 'up'
        || state.lineDirection === 'up' && direction === 'down') {
        let newBody = $('<div />');	
        $($('#texthooker > p').get().reverse()).each(function(_, e) { newBody.append(e); });
        $('#texthooker').empty().append(newBody.children());
    }

    state.lineDirection = direction;
    $('#line-directions > .line-direction-choice').removeClass('active');
    $(`#line-directions > .line-direction-choice[data-direction="${state.lineDirection}"]`)
        .addClass('active');
}

$('#remove-button').on('click', () => {
    // Check whether there are any lines.
    let lines = $('#texthooker > p').length;
    if (lines < 1) return;

    // Get last line.
    let targetElement;
    if (state.lineDirection === 'down') {
        targetElement = $('#texthooker > p:last-child');
    } else if (state.lineDirection === 'up') {
        targetElement = $('#texthooker > p:first-child');
    } else throw new Error('illegal value for lineDirection');

    // Update the counter.
    state.charCount = state.charCount - targetElement.text().length;
    state.lineCount = state.lineCount - 1;
    updateCounter();

    // Remove the last line.
    targetElement.remove();
});

$('#line-directions').on('click', '.line-direction-choice', function() {
    changeLineDirection($(this).attr('data-direction'));
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

        if (state.lineDirection === 'up') {
            $('#texthooker > p:last-child').remove().prependTo('#texthooker');
        } else if (state.lineDirection === 'down') {
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

        // Update the active line class.
        $('#texthooker > p').removeClass('active-line');
        if (state.lineDirection === 'up') {
            $('#texthooker > p:first-child').addClass('active-line');
        } else if (state.lineDirection === 'down') {
            $('#texthooker > p:last-child').addClass('active-line');
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
    // Initialize counter text.
    updateCounter();

    // Set active text direction indicator.
    $(`#line-directions > .line-direction-choice[data-direction="${state.lineDirection}"]`)
        .addClass('active');
});