import './sass/index.scss';
import Nuzlocke from './js/nuzlocke';
import Slot from './js/slot';
import config from '../config.json';

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

let slots = [];

(function () {
    let $err = $('#err'),
        $body = $('body');
    
    if (Nuzlocke) {
        $body.addClass('nuzlocke');
    }
    
    if (!window.EventSource) {
        $err.text('Browser does not support long running AJAX connections');
        return;
    }
    
    if (!config.layout.allInOne) {
        let slot = getParameterByName('slot');
        
        if (slot == null) { // using == rather than === allows it to handle the undefined case
            let $slotBtns = $('#slotBtns');
            $slotBtns.append('<h3>Select a slot</h3>');
            
            for (let i = 1; i <= NUM_SLOTS; i++) {
                $slotBtns.append(`<a href="?slot=${i}">Slot ${i}</a>`);
            }
        }
        else {
            slot = parseInt(slot);
            if (isNaN(slot) || slot < 1 || slot > NUM_SLOTS) {
                $err.text('Invalid slot value.  Url query string must be ?slot=#, where # is between 1 and 6.');
            }
        }
        
        let $slot = $('.slot').addClass(`slot-${slot}`);
        slots.push(new Slot(slot, $slot));
    } else {
        for (let i = 1; i <= NUM_SLOTS; i++) {
            slots.push(new Slot(i, $(`.slot.slot-${i}`)));
        }
    }

    window.onbeforeunload = function () { 
        for (let s of slots) {
            s.close();
        }
    };
})();