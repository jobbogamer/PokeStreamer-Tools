/* Miscellaneous setup operations pulled into their own file to avoid clutter */
import ws from './websocket';
import getGraveyardName from './graveyard';

// allow for stacked modals -- in particular, if the New Game modal is up and the server disconnects, the reconnecting
// modal will display itself over the new game one
$(document).on('show.bs.modal', '.modal', function(e) {
    let zIndex = 1040 + (10 * $('.modal:visible').length);
    $(this).css('z-index', zIndex);
    setImmediate(() => {
        $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
    });
});

export default function() {
    setInterval(() => $('#graveyardheader').text((_, t) => getGraveyardName(t)), 5 * 60 * 1000);

    // show refresh button once FontAwesome sync i-element has been replaced with the SVG
    $('.btn-refresh').has('svg').removeClass('uninitialized').end()
        .has('i').one('DOMSubtreeModified', function() { $(this).removeClass('uninitialized'); });

    const $dcModal = $('#disconnectedModal');
    $dcModal.on('shown.bs.modal', () => {
        if (ws.connected) {
            $dcModal.modal('hide');
        }
    });

    ws.on('open', () => {
        $dcModal.modal('hide');
    });
    ws.on('close', () => {
        $dcModal.modal('show');
    });

    ws.init();
    
    setTimeout(() => {
        if (!ws.connected) {
            $dcModal.modal('show');
        }
    }, 100);
}