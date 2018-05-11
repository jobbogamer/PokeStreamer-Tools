import Config from './config';
import args from './args';

const ERROR = 'error',
    ERROR_IGNORE = 'error-ignore',
    WARNING = 'warning',
    INFO = 'info',
    LOG = 'log';

class AssertionResult {
    constructor(isValid, message, severity) {
        this.isValid = isValid;
        this.message = message;
        this.severity = severity || WARNING;
    }
}

class Assertion {
    constructor(test, message, severity) {
        this.test = test;
        this.message = message;
        this.severity = severity || WARNING;
    }

    get result() {
        if (!this.test.call(Config)) {
            return new AssertionResult(false, this.message, this.severity);
        } else {
            return new AssertionResult(true);
        }
    }
}

const Validations = {
    soulLink: {
        genSupported: new Assertion(c => !c.death.nuzlocke || !c.soulLink.enabled || c.generation === 4,
            `Currently only gen IV games are supported with Soul Link.  Found ${c.generation}.`, ERROR),
        nuzlockeDisabled: new Assertion(c => !c.soulLink.enabled || c.death.nuzlocke,
            `SoulLink was enabled but Nuzlocke was disabled.  Ignoring Soul Link.`),
        soulLinkSoundWithManualLinking: 
            new Assertion(c => !c.soulLink.enabled || c.soulLink.linking.method !== 'manual' || !c.soulLink.deathSound.enabled,
                `SoulLink deathSounds aren't available with manual linking method.`, LOG),
        discordLinkingEnabled: new Assertion(c => !c.soulLink.enabled || c.soulLink.linking.method === 'manual',
            `Currently only manual soullinking is supported.  Found: ${c.soulLink.linking.method}`, ERROR)
    },
    style: {
        nonTransparentBackground: new Assertion(c => 
                args.isDebug || !c.style['%body'].background || c.style['%body'].background === 'transparent',
            `%body background is not 'transparent'`),
    },
    layout: {
        gen45nickname: new Assertion(c => {
            if (c.generation === 3) {
                return true;
            }

            for (let [k, v] of Object.entries(c.layout)) {
                if (k.find('Elements') !== -1) {
                    if (v.contains('nickname') || v.contains('sl-nickname')) {
                        return false;
                    }
                }
            }

            return true;
        }, `Currently only gen 3 supports nicknames.`, ERROR),
    }
};

function validateConfig(prev, next) {
    validateConfigInner();
}

function validateConfigInner(validationSet, validationSetName) {
    if (!validationSet) {
        console.info('Validating config...');
    }

    validationSet = validationSet || Validations;
    validationSetName = validationSetName ? validationSetName + '-' : '';
    
    for (let [name, validation] of Object.entries(validationSet)) {
        name = validationSetName + name;
        if (validation instanceof Assertion) {
            let result = validation.result;
            if (!result.isValid) {
                let msg = `${result.severity}: Config failed ${name} validation: ${result.message}`;
                switch (result.severity) {
                    case ERROR:
                        throw new Error(msg);

                    case ERROR_IGNORE:
                        console.error(msg);
                        break;

                    case INFO:
                        console.info(msg);
                        break;

                    case LOG:
                        console.log(msg);
                        break;

                    case WARN:
                    default:
                        console.warn(msg);
                        break;
                }
            }
        } else {
            validateConfig(validation, validationSetName);
        }
    }
}

validateConfigInner();
Config.on('update', validateConfig);