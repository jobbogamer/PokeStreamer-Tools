import config from '../../config.json';
import Nuzlocke from './nuzlocke';
import Soullink from './soulLink';
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
        
        this.slChangeId = -2;
        this.$soulLinkImg = $slot.find('.soul-linked > img');
        this.$soulLinkLevel = $slot.find('.sl-level');
        this.$soulLinkSpecies = $slot.find('.sl-species');
        this.$soulLinkNickname = $slot.find('.sl-nickname');
        
        this.$images = $slot.find('img');
        
        if (ALL_IN_ONE) {
            this.eventSource = Slot.eventSource;
        } else {
            this.eventSource = new EventSource(`http://slot${slot}.${API_BASE_URL}/slot/${slot}`);
        }
        
        this.eventSource.addEventListener('message', this.updateSlot.bind(this), false);
    }
    
    close() {
        if (this.eventSource.readyState !== 2) {
            this.eventSource.close();
        }
    }
    
    updateSlot(e) {
        let val = JSON.parse(e.data);
        if (!val) { 
            return; 
        }
        
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
            $allText,
            $soulLinkImg,
            $images,
        } = this;
        
        if (val === 'reset') {
            this.changeId = -2;
            this.lastValue = null;
            $allText.resetText();
            $allText.find('.scaled').children().unwrap('.scaled');
            $nickname.removeClass('no-nickname');
            $images.removeAttr('src');
            $slot.removeClass('dead');
        } else if (this.slot !== val.slot) {
            return;
        }
        
        $allText.resetText();
        $allText.find('.scaled').children().unwrap('.scaled');
        
        if (!val.pokemon) {
            $slot.removeClass('dead');
            $images.removeAttr('src');
            this.lastValue = val;
            return;
        }
        
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
        } else {
            $slot.removeClass('dead');
        }
        
        if (Nuzlocke.enabled) {
            if (pkmn.dead) {
                this.setDeathMessages();
                if (!$images.is('.death-wrapper > img')) {
                    $images.wrap('<div class="death-wrapper">');
                }
                
                if (this.pokemonJustDied(pkmn)) {
                    Nuzlocke.playDeathSound();
                }
            } else {
                $images.unwrap('.death-wrapper');
                $slot.removeClass('dead');
                $deathMessages.resetText();
            }
        }
        
        if (Soullink.enabled) {
            if (!pkmn.linkedImg) {
                $soulLinkImg.removeAttr('src');
                $img.closest('.img-wrapper').addClass('invalid');
            } else {
                $soulLinkImg.attr('src', pkmn.linkedImg);
                $img.closest('.img-wrapper').removeClass('invalid');
            }
        }
        
        $allText.parent().scaleToFit();
        
        this.lastValue = val;
    }
    
    pokemonJustDied(n) {
        let c = this.lastValue && this.lastValue.pokemon;
        return c && !c.dead && c.pid === n.pid;
    }
    
    setDeathMessages() {
        if (!config.soulLink.enabled) {
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

if (ALL_IN_ONE) {
    Slot.eventSource = new EventSource(`http://${API_BASE_URL}/slot/all`);
}