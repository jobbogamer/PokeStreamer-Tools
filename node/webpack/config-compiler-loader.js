import json5 from 'json5';
import path from 'path';
import compileConfig from '../common/configCompiler';

export default function (source) {
    let baseConfig = json5.parse(source);
    let self = this;
    if (source === 'config.json') {
        this.addDependency(path.join(this.context, 'common/config.empty.json'));
        this.addDependency(path.join(this.context, baseConfig.advancedConfig));
    }
    
    if (baseConfig.configOverride) {
        switch (baseConfig.configOverride.constructor) {
            case String:
                this.addDependency(path.join(this.context, baseConfig.configOverride));
                break;

            case Array:
                baseConfig.configOverride.forEach(file => self.addDependency(path.join(self.context, file)));
                break;
        }
    } else {
        return JSON.stringify(baseConfig);
    }

    return JSON.stringify(compileConfig(baseConfig));
}