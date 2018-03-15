import json5 from 'json5';
import path from 'path';
import compileConfig from '../common/configCompiler';

export default function (source) {
    let baseConfig = json5.parse(source);
    if (baseConfig.configOverride) {
        switch (baseConfig.configOverride.constructor) {
            case String:
                this.addDependency(path.join(this.context, baseConfig.configOverride));
                break;

            case Array:
                base.configOverride.foreach(file => path.join(this.context, this.addDependency(file)));
                break;
        }
    } else {
        return JSON.stringify(baseConfig);
    }

    return JSON.stringify(compileConfig(baseConfig));
}