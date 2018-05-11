import compileConfig, {dependencies} from '../../../common/configCompiler';

let config = compileConfig(),
    sass = {
        allInOne: config.layout.allInOne,
        nuzlockeEnabled: config.death.nuzlocke,
        applyDeathSpin: config.death.applyDeathSpin,
        ripPrefix: config.death.ripPrefix || '',

        soulLinkEnabled: config.death.nuzlocke && config.soulLink.enabled,
    };

for (let key of Object.keys(config.style)) {
    sass[key] = config.style[key];
}

sass.debug = (process.env.NODE_ENV || 'production').trim() === 'development';

export { 
    sass as default,
    dependencies
};