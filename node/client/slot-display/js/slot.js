import config from 'config.json';
import Nuzlocke from './nuzlocke';
import Soullink from './soulLink';
import '../../jQuery.extensions';

export default class Slot {
    constructor(slot, $slot) {
        this.slot = slot;
        this.lastValue = null;
        this.$slot = $slot;
        this.changeId = -2;
        this.$img = $slot.find('.main > img');
        this.$wrapper = this.$img.closest('.img-wrapper');
        this.$level = $slot.find('.level');
        this.$species = $slot.find('.species');
        this.$nickname = $slot.find('.nickname');
        this.$deathMessage1 = $slot.find('.deathMessage1');
        this.$deathMessage2 = $slot.find('.deathMessage2');
        this.$deathMessage3 = $slot.find('.deathMessage3');
        this.$deathMessages = $slot.find('.deathMessage1, .deathMessage2, .deathMessage3');
        this.$pkmnText = $slot.find('.level, .species, .nickname, .deathMessage1, .deathMessage2, .deathMessage3');
        
        if (config.soulLink.enabled) {
            this.slChangeId = -2;
            this.$soulLinkImg = $slot.find('.soul-linked > img');
            this.$soulLinkWrapper = this.$soulLinkImg.closest('.img-wrapper');
            this.$soulLinkLevel = $slot.find('.sl-level');
            this.$soulLinkSpecies = $slot.find('.sl-species');
            this.$soulLinkNickname = $slot.find('.sl-nickname');
            this.$slText = $slot.find('.sl-level, .sl-species, .sl-nickname');
        }
        
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
            $wrapper,
            $level,
            $species,
            $nickname,
            $deathMessage1,
            $deathMessage2,
            $deathMessage3,
            $deathMessages,
            $pkmnText,
            $soulLinkImg,
            $soulLinkWrapper,
            $images,
            $soulLinkLevel,
            $soulLinkSpecies,
            $soulLinkNickname,
            $slText,
        } = this;

        let $allText = $pkmnText.add($slText);
        
        if (val === 'reset') {
            this.changeId = -2;
            this.lastValue = null;
            $allText.add($slText).resetText();
            $nickname.removeClass('no-nickname');
            Slot.clearAuras($wrapper.add($soulLinkWrapper));
            $images.removeAttr('src');
            $slot.removeClass('dead');
            return;
        } else if (this.slot !== val.slot) {
            return;
        }
        
        if (val.pokemon && val.pokemon.isVoid) {
            if (this.lastValue && this.lastValue.pokemon) {
                $slot.addClass('void');
                Slot.clearAuras($wrapper.add($soulLinkWrapper));
                $img.wrap('<div class="void-wrapper">');
                setTimeout(() => {
                    this.lastValue = null;
                    $allText.resetText();
                    if (val.pokemon.emptyLinkImage) {
                        $images.attr('src', val.pokemon.emptyLinkImage);
                    } else {
                        $images.removeAttr('src');
                    }
                    $img.unwrap();
                    $slot.removeClass('void');
                }, 2000);
                return;
            }

            if (val.pokemon.emptyLinkImage) {
                $images.attr('src', val.pokemon.emptyLinkImage).closest('.img-wrapper').addClass('invalid');
            } else {
                $images.removeAttr('src');
            }
            
            return;
        }
        
        $pkmnText.resetText();
        
        if (!val.pokemon) {
            $slText.resetText();
            $slot.removeClass('dead');
            $images.removeAttr('src');
            Slot.clearAuras($wrapper.add($soulLinkWrapper));
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

        Slot.setAura($wrapper, 'critical', pkmn.isCritical);
        Slot.setAura($wrapper, 'fully-trained', pkmn.isFullyTrained);
        
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
            if (!pkmn.link || pkmn.link.isEmpty) {
                if (pkmn.emptyLinkImage) {
                    $soulLinkImg.attr('src', pkmn.emptyLinkImage);
                } else {
                    $soulLinkImg.removeAttr('src');
                }
                
                $slText.resetText();
                $img.closest('.img-wrapper').addClass('invalid');
                Slot.clearAuras($soulLinkWrapper);
            } else {
                let link = pkmn.link;
                $soulLinkImg.attr('src', link.img);
                $img.closest('.img-wrapper').removeClass('invalid');

                $soulLinkLevel.text(link.level);
                $soulLinkNickname.text(link.nickname || pkmn.speciesName);
                $soulLinkSpecies.text(link.speciesName);

                Slot.setAura($soulLinkWrapper, 'critical', link.isCritical);
                Slot.setAura($soulLinkWrapper, 'fully-trained', link.isFullyTrained);
            }
        }
        
        $pkmnText.parent().scaleToFit();
        
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

    static setAura($wrapper, auraName, val) {
        if (val) {
            $wrapper.addClass(auraName);
        } else {
            $wrapper.removeClass(auraName);
        }
    }

    static clearAuras($wrapper) {
        $wrapper.removeClass('critical fully-trained');
    }
}

if (ALL_IN_ONE) {
    Slot.eventSource = new EventSource(`http://${API_BASE_URL}/slot/all`);
}