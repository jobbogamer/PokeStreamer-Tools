function ValidateArgument() {}

ValidateArgument.int = function(arg, argName, msg) {
    msg = msg || `Argument '${argName}' must be an integer.  Found ${JSON.stringify(arg)}.`;

    if (isNaN(arg) || !Number.isInteger(parseFloat(arg))) {
        throw new Error(msg);
    }

    return parseInt(arg);
};

ValidateArgument.intOrEmpty = function(arg, argName, msg) {
    if (arg === undefined || arg === null) {
        return arg;
    }

    return ValidateArgument.int.apply(arguments);
};

ValidateArgument.boundedInt = function(arg, argName, min, max, msg) {
    arg = ValidateArgument.int(arg, argName, msg);
    msg = msg || `Argument '${argName}' must be an integer between ${min} and ${max}.  Found '${arg}'.`;
    if (arg < min || arg > max) {
        throw new Error(msg);
    }

    return arg;
};

ValidateArgument.boundedIntOrEmpty = function(arg, argName, min, max, msg) {
    if (arg === undefined || arg === null) {
        return arg;
    }

    return ValidateArgument.boundedInt.apply(arguments);
}

ValidateArgument.hasValue = function(arg, argName, msg) {
    msg = msg || `Argument '${argName}' must be defined and not null.  Found '${arg}'.`;
    if (arg === undefined || arg === null) {
        throw new Error(msg);
    }

    return arg;
};

ValidateArgument.bool = function(arg, argName, msg) {
    ValidateArgument.hasValue(arg);

    msg = msg || `Argument '${argName}' must be a valid boolean.  Found '${arg}'.`;
    if (typeof arg === 'string') {
        switch (arg.toLocaleLowerCase()) {
            case 'true':
                return true;
            case 'false':
                return false;
            default:
                throw new Error(msg);
        }
    } else if (arg.constructor === Number) {
        return !!arg;
    } else if (arg.constructor === Boolean) {
        return arg;
    } else {
        throw new Error(msg);
    }
};

ValidateArgument.boolOrUndefinedFalse = function(arg, argName, msg) {
    arg = arg === undefined ? false : ValidateArgument.bool.apply(arguments);
};

export default ValidateArgument;