'use strict';

const {defineProperty} = Reflect || Object;
const {hasOwnProperty, toString} = Object.prototype;
const UNDEFINED_VALUE = Symbol();

const isPlainObject= (obj)=> !!obj && toString.call(obj)==='[object Object]';

const define= (obj, prop, descriptor)=> {
    const propType = typeof prop;

    const isSymbolProp = propType === 'symbol';
    if (propType === 'string') {
        if (!(prop = prop.trim())) {
            throw TypeError('Prop can not be an empty string');
        }
    } else if (!isSymbolProp) {
        throw TypeError('Expected prop to be a string|symbol');
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
        value,
        writable = !!set,
        chains,
        virtual,
        lazy
    } = descriptor;

    if (cached && !get) {
        throw Error(`Getter is required for cached mode`);
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

    if (lazy) {

        if (!get) {
            throw Error(`Getter is required for lazy prop [${propName}]`);
        }

        const redefine = (value) => defineProperty(this, prop, {
            configurable,
            enumerable,
            value
        });

        defineProperty(obj, prop, {
            get: function () {
                const value = get.call(this);
                redefine.call(obj, value);
                return value;
            },
            set: redefine,
            configurable: true,
            enumerable
        });

        return;
    }

    const symbolCache = cached ? Symbol(`@@${propName}_CACHED`) : null;
    const symbol = virtual ? null : Symbol(`@@${propName}`);

    if (!get && virtual) {
        throw Error(`Missing getter for virtual prop [${propName}]`);
    }

    const getter = cached ? function () {
        let value;

        if (hasOwnProperty.call(this, symbolCache) && (value = this[symbolCache]) !== UNDEFINED_VALUE) {
            return value;
        }

        return (this[symbolCache] = virtual ? get.call(this, prop) : get.call(this, prop, this[symbol]));
    } : (get ? function () {
        return virtual ? get.call(this, prop) : get.call(this, prop, this[symbol])
    } : function () {
        return this[symbol];
    });

    if (writable && virtual && !set) {
        throw Error(`Missing setter for writable virtual prop [${propName}]`);
    }

    const setter = set ? function (value) {
        if (virtual) {
            const cachedFlag = set.call(this, value, prop);

            if (cached) {
                if (cachedFlag !== true && cachedFlag !== false) {
                    throw Error(`Setter of virtual cached prop [${propName}] should return a boolean flag indicating whether the value has been changed inside`);
                }

                if (cachedFlag) {
                    this[symbolCache] = UNDEFINED_VALUE;
                }
            } else {
                if (cachedFlag !== undefined) {
                    throw Error(`Setter for virtual prop [${propName}] should not return any value`);
                }
            }

        } else {
            const currentValue = this[symbol];
            const newValue = set.call(this, value, prop, currentValue);
            console.log(currentValue);
            if (newValue !== currentValue) {
                if (cached) {
                    this[symbolCache] = UNDEFINED_VALUE;
                }
                this[symbol] = newValue;
            }
        }
    } : (writable ? function (newValue) {
        this[symbol] = newValue;
    } : function () {
        throw Error(`Unable to rewrite read-only property [${prop}] of ${this}`)
    });

    defineProperty(obj, prop, {
        get: getter,
        set: setter,
        configurable,
        enumerable
    });

    if ('value' in descriptor) {
        if (writable) {
            obj[prop] = value;
        } else {
            obj[symbol] = value;
        }
    }

    if (chains) {

        if (!propName) {
            throw Error(`Can not create named chain for anonymous symbol property`);
        }

        let chainName = typeof chains === 'string' ? chains.trim() : propName.replace(/[^A-Za-z][^-A-Za-z0-9_]*/, '');

        if (!chainName) {
            throw Error(`Can not generate chain name for [${prop}] prop`);
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

    const flush = function (context) {
        (context || obj)[symbolCache] = UNDEFINED_VALUE;
    };

    return {
        flush,
        private: symbol,
        set(value, context) {
            (context || obj)[prop] = value;
        }
    }
};

function defineAccessor(obj, prop, descriptor = {}) {
    if(prop && typeof prop==='object'){
        const descriptors= {};
        const propsMap= prop;
        Object.keys(propsMap).forEach(prop => {
            descriptors[prop] = define(obj, prop, propsMap[prop]);
        });
        return descriptors;
    }

    return define(obj, prop, descriptor);
}

export {defineAccessor};
