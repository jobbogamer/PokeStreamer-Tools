import '../jQuery.extensions';
import config from 'config.json';

if (config.nuzlocke.enabled) {
    require('./sass/index.scss');
    require('./js/manager');
} else {
    require('./sass/disabled.scss');
}