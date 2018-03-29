import '../jQuery.extensions';
import config from 'config.json';

if (config.nuzlocke.enabled && config.soulLink.enabled) {
    require('./sass/index.scss');
    require('./js/soullink-manager');
} else {
    require('./sass/soullink-disabled.scss');
} 
