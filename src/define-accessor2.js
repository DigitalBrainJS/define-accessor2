const {defineProperty} = Reflect || Object;
const {hasOwnProperty, toString} = Object.prototype;
const UNDEFINED_VALUE = Symbol();
const symbolProps = Symbol('@@PROPS');
const isPlainObject = (obj) => !!obj && toString.call(obj) === '[object Object]';
const validatePropKey = (prop) => {
    const type = typeof prop;
    if (type !== 'string' && type !== 'symbol') {
        throw TypeError(`Prop should be a string or symbol`);
    }
    return type;
};

const touch = (obj, touches) => {
    touches.forEach(prop => {
        const props = obj[symbolProps],
            symbolCache = props && props[prop];
        if (symbolCache) {
            obj[symbolCache] = UNDEFINED_VALUE;
        }
    });
};


const prepareAccessor = (obj, prop, descriptor) => {
    const propType = validatePropKey(prop);

    const isSymbolProp = propType === 'symbol';
    if (propType === 'string') {
        if (!(prop = prop.trim())) {
            throw TypeError('prop should be a non-empty string');
        }
    } else if (!isSymbolProp) {
        throw TypeError('expected prop to be a string|symbol');
    }

    if (!isPlainObject(descriptor)) {
        throw TypeError('descriptor should be a plain object');
    }

    const {
        set,
        get,
        cached,
        configurable,
        enumerable,
        writable = !!set,
        chains,
        virtual,
        lazy,
        validate
    } = descriptor;

    let {
        touches
    } = descriptor;

    if (cached && !get) {
        throw Error(`getter is required for cached mode`);
    }

    if (get && typeof get !== 'function') {
        throw Error('get should be a function');
    }

    if (set) {
        if (typeof set !== 'function') {
            throw Error('setter should be a function');
        }

        if (!writable) {
            throw Error(`writable option can not be set to false when setter is defined`)
        }
    }

    const propName = isSymbolProp ? prop.toString().slice(7, -1) : prop;

    if (touches) {
        let type;
        if ((type = typeof touches) !== 'Symbol') {
            if (Array.isArray(touches)) {
                touches.forEach(validatePropKey);
            } else if (type === 'string') {
                touches = touches.split(/\s+/);
                touches.forEach(validatePropKey);
            } else {
                throw TypeError(`touch option should be a string or array`)
            }

            if (touches.some((destProp) => prop === destProp)) {
                throw Error(`prop [${propName}] touches itself`);
            }
        }
    }

    if (lazy) {
        if (!get) {
            throw Error(`getter is required for lazy prop [${propName}]`);
        }

        const redefine = function (value) {
            defineProperty(this, prop, {
                configurable,
                enumerable,
                value
            });
        };

        return {
            descriptor: {
                get: function () {
                    const value = get.call(this, prop);
                    redefine.call(this, value);
                    return value;
                },
                set: redefine,
                configurable: true,
                enumerable
            }
        };
    }

    const propsMap = cached ? hasOwnProperty.call(obj) ? obj[symbolProps] : (obj[symbolProps] = Object.create(obj[symbolProps] || null)) : null;
    const symbol = virtual ? null : Symbol(`@@${propName}`);
    const symbolCache = cached ? Symbol(`@@${propName}_CACHED`) : null;

    if (!get && virtual) {
        throw Error(`missing getter for virtual prop [${propName}]`);
    }

    const getter = cached ? function () {
        let value, context = this;

        if (hasOwnProperty.call(context, symbolCache) && (value = context[symbolCache]) !== UNDEFINED_VALUE) {
            return value;
        }

        return (context[symbolCache] = (virtual ? get.call(context, prop) : get.call(context, prop, context[symbol])));
    } : (get ? function () {
        return virtual ? get.call(this, prop) : get.call(this, prop, this[symbol])
    } : function () {
        return this[symbol];
    });

    if (writable && virtual && !set) {
        throw Error(`missing setter for writable virtual prop [${propName}]`);
    }

    if (validate) {
        if (typeof validate !== 'function') {
            throw TypeError('validate should be a function');
        }

        if (!writable) {
            throw TypeError('validate can be used for writable property only');
        }
    }

    const _validate = validate && function (value) {
        if (validate.call(this, value, prop) === false) {
            throw Error(`value (${value}) is not valid for property (${propName})`);
        }
    };

    const setter = set ? function (value) {
        validate && _validate.call(this, value);

        if (virtual) {
            const cachedFlag = set.call(this, value, prop);

            if (cached || touches) {
                if (cachedFlag !== true && cachedFlag !== false) {
                    throw Error(`setter of the virtual cached prop [${propName}] should return a boolean flag indicating whether the value has been changed inside`);
                }

                if (cachedFlag) {
                    if (cached) {
                        this[symbolCache] = UNDEFINED_VALUE;
                    }
                    touches && touch(this, touches);
                }
            } else {
                if (cachedFlag !== undefined) {
                    throw Error(`setter for virtual prop [${propName}] should not return any value`);
                }
            }

        } else {
            const currentValue = this[symbol];
            const newValue = set.call(this, value, prop, currentValue);

            if (newValue !== currentValue) {

                if (cached) {
                    this[symbolCache] = UNDEFINED_VALUE;
                }
                this[symbol] = newValue;
                touches && touch(this, touches);
            }
        }
    } : (writable ? function (newValue) {
        if (newValue !== this[symbol]) {
            validate && _validate.call(this, newValue);

            if (cached) {
                this[symbolCache] = UNDEFINED_VALUE;
            }
            touches && touch(this, touches);
        }
        this[symbol] = newValue;
    } : function () {
        throw Error(`unable to rewrite read-only property [${prop}] of ${this}`)
    });

    if (chains) {
        if (!propName) {
            throw Error(`can not create named chain for anonymous symbol property`);
        }
        let chainName = typeof chains === 'string' ? chains.trim() : propName.replace(/[^A-Za-z][^-A-Za-z0-9_]*/, '');
        if (!chainName) {
            throw Error(`can't generate chain name for [${prop}] prop`);
        }
        chainName = chainName[0].toUpperCase() + chainName.slice(1);
        defineProperty(obj, 'get' + chainName, {
            configurable,
            enumerable,
            value: getter
        });
        const setterName = 'set' + chainName;
        defineProperty(obj, setterName, {
            configurable,
            enumerable,
            value: function (value) {
                const {length} = arguments;
                if (length === 1) {
                    setter.call(this, value);
                } else {
                    throw Error(length ? `too much arguments [${length}] were passed to [${setterName}] accessor` : `accessor [${setterName}] requires a value`);
                }
                return this;
            }
        })
    }
    if (propsMap) {
        propsMap[prop] = symbolCache;
    }
    return {
        symbol,
        symbolCache,
        writable,
        descriptor: {
            get: getter,
            set: setter,
            configurable,
            enumerable
        }
    }
};

function define(obj, prop, options = {}) {
    const {
        symbol,
        descriptor,
        writable
    } = prepareAccessor(obj, prop, options);

    defineProperty(obj, prop, descriptor);

    const {value} = options;

    if ('value' in options) {
        if (writable) {
            descriptor.set.call(obj, value);
        } else {
            obj[symbol] = value;
        }
    }

    return symbol;
}

/**
 * @typedef {String|Symbol} PropertyKey
 */

/**
 * Accessor's descriptor.
 * @typedef {Object} AccessorDescriptor
 * @property {Function} [get] accessor getter
 * @property {Function} [set] accessor setter
 * @property {Boolean} [writable]
 * @property {Boolean} [enumerable]
 * @property {Boolean} [configurable]
 * @property {Boolean} [cached]
 * @property {Boolean} [lazy]
 * @property {Boolean} [virtual]
 * @property {Boolean} [chains]
 * @property {PropertyKey|PropertyKey[]} [touches]
 * @property {*} [value]
 */

/**
 * Defines an accessor
 *
 * @param {Object} obj target object
 * @param {PropertyKey} prop  property key
 * @param {AccessorDescriptor} [descriptor]
 * @returns {Symbol}
 * //**
 *
 * @param {Object} obj target object
 * @param {Array.<PropertyKey>} prop  property key
 * @param {AccessorDescriptor} [descriptor]
 * @returns {Array.<Symbol>}
 * //**
 *
 * @param {Object} obj target object
 * @param {Object.<PropertyKey>} prop  property key
 * @param {Object} [options]
 * @param {String} [options.prefix]
 * @returns {Object.<Symbol>}
 */

export function defineAccessor(obj, prop, descriptor = {}) {
    if (typeof prop === 'object') {
        if (Array.isArray(prop)) {
            return prop.map(prop => define(obj, prop, descriptor));
        } else {
            if (descriptor !== undefined && !isPlainObject(descriptor)) {
                throw TypeError(`Options should be a plain object`);
            }

            const {
                prefix
            } = descriptor || {};

            if (prefix && typeof prefix !== 'string') {
                throw TypeError('prefix options should be a string');
            }

            const props = prop;
            return Object.keys(props).reduce((descriptors, prop) => {
                descriptors[(prefix && typeof prop === 'string' ? prefix : '') + prop] = define(obj, prop, props[prop]);
                return descriptors;
            }, {});
        }
    }

    return define(obj, prop, descriptor);
}

/**
 * flush accessor's cache
 * @param obj {Object} target object
 * @param prop {PropertyKey} public accessor's key
 * @returns {boolean} true if flushed successfully
 */

export function flush(obj, prop) {
    const propsMap = obj && obj[symbolProps];
    let cacheKey;

    if (propsMap && (cacheKey = propsMap[prop])) {
        obj[cacheKey] = UNDEFINED_VALUE;
        return true;
    }

    return false;
}
