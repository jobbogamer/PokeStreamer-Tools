import config from '../../config.json';
import Nuzlocke from './nuzlocke';
import './jQuery.extensions';

export default class Slot {
    constructor(slot, $slot) {
        this.slot = slot;
        this.lastValue = null;
        this.$slot = $(`.slot.slot-${slot}`);
        this.changeId = -2;
        this.$img = $slot.find('.main > img');
        this.$level = $slot.find('.level');
        this.$species = $slot.find('.species');
        this.$nickname = $slot.find('.nickname');
        this.$deathMessage1 = $slot.find('.deathMessage1');
        this.$deathMessage2 = $slot.find('.deathMessage2');
        this.$deathMessage3 = $slot.find('.deathMessage3');
        this.$deathMessages = $slot.find('.deathMessage1, .deathMessage2, .deathMessage3');
        this.$allText = $slot.find('.level, .species, .nickname, .deathMessage1, .deathMessage2, .deathMessage3');
        
        this.eventSource = config.layout.allInOne ? Slot.eventSource : new EventSource(`/slot/${slot}`);
        this.eventSource.addEventListener('message', this.updateSlot.bind(this), false);
    }

    close() {
        if (this.eventSource.readyState !== 2) {
            this.eventSource.close();
        }
    }
    
    updateSlot(e) {
        let val = JSON.parse(e.data);

        if (val.constructor === Array) {
            for (let v of val) {
                this.updateSlot({ data: JSON.stringify(v) });
            }

            return;
        }
        
        let {
            lastValue,
            $slot,
            $img,
            $level,
            $species,
            $nickname,
            $deathMessage1,
            $deathMessage2,
            $deathMessage3,
            $deathMessages,
            $allText
        } = this;

        if (val === 'reset') {
            this.changeId = -2;
            this.lastValue = null;
            $allText.resetText();
            $allText.find('.scaled').children().unwrap('.scaled');
            $nickname.removeClass('no-nickname');
            $img.removeAttr('src');
            $slot.removeClass('dead');
        } else if (this.changeId < parseInt(val.changeId) && this.slot === val.slot) {
            this.changeId = parseInt(val.changeId);
            $allText.resetText();
            $allText.find('.scaled').children().unwrap('.scaled');

            let pkmn = val.pokemon;
            $level.text(pkmn.level === 0 ? '' : pkmn.level);
            $species.text(pkmn.speciesName);
            $nickname.text(pkmn.nickname || pkmn.speciesName);
            if (!pkmn.nickname) {
                $nickname.addClass('no-nickname');
            } else {
                $nickname.removeClass('no-nickname');
            }

            $img.attr('src', pkmn.img);
            
            if (pkmn.dead) {
                $slot.addClass('dead');
                
                if (Nuzlocke.enabled) {
                    this.setDeathMessages();

                    if (this.pokemonJustDied(pkmn)) {
                        Nuzlocke.playDeathSound();
                    }
                }
            } else {
                $slot.removeClass('dead');
                $deathMessages.resetText();
            }

            this.lastValue = val;
            $allText.parent().scaleToFit();
        }
    }

    pokemonJustDied(n) {
        let c = this.lastValue;
        return c && 
            !c.dead &&
            c.slot === n.slot &&
            c.level === n.level &&
            c.nickname === n.nickname &&
            c.species === n.species;
    }

    setDeathMessages() {
        if (!Nuzlocke.soulLink.enabled) {
            for (let i = 0; i < 3; i++) {
                let msg = Nuzlocke.deathMessages[i];
                if (msg) {
                    this.setDeathMessage(i + 1, msg);
                }
            }
        }
    }

    setDeathMessage(i, msg) {
        let $dm = this[`$deathMessage${i}`];
        $dm.parent().children('.level, .species, .nickname').text('');
        $dm.text(msg);        
    }
}

if (config.layout.allInOne) {
    Slot.eventSource = new EventSource('/api/slot/all');
}