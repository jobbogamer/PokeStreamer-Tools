import ws from './websocket';

let $ngModal = $('#newGameModal'),
    $confirmBtn = $('#confirmNewGameButton'),
    $errorMsg = $ngModal.find('.error-msg'),
    newGameTimeout; // used for when the server disconnects while the modal is open

$('.btn-new-game').click(() => {
    $ngModal.modal('show');
});

$ngModal.on('hidden.bs.modal', () => {
    $errorMsg.addClass('d-none');
});

function stopHide(e) {
    e.preventDefault();
}

function enableModal(enable, close) {
    if (enable) {
        $ngModal.find('button').enable();
        $ngModal.off('hide.bs.modal', stopHide);
        if (close) {
            $ngModal.modal('close');
        }
    } else {
        $ngModal.find('button').disable();
        $ngModal.on('hide.bs.modal', stopHide);
    }
}

$confirmBtn.click(() => {
    enableModal(false, false);
    $errorMsg.addClass('d-none');

    newGameTimeout = setTimeout(() => {
        enableModal(true, false);
        $errorMsg.removeClass('d-none');
    }, 2000);

    ws.send(JSON.stringify({ messageType: 'new-game' }));
});

ws.on('message', e => {
    let msg = JSON.parse(e.data);
    if (msg.messageType === 'new-game') {
        enableModal(true, true);
    }
});