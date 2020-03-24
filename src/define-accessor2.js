/**
 * @module
 */

// * @alias module:define-accessor2


const {isJoiSchema} = require('./utils');
const types = require('./types');
const {resolvePredicate, decodeType, tagOf}= types;


const {defineProperty, defineProperties} = Object;
const {hasOwnProperty, toString} = Object.prototype;
const UNDEFINED_VALUE = Symbol();
const CHANGED_VALUE = Symbol();
const symbolCachedPropKeys = Symbol('@@cachedPropKeys');
const symbolPrivatePropKeys = Symbol('@@privatePropKeys');
const _validators = Symbol('validators');

const isPlainObject = (obj) => !!obj && toString.call(obj) === '[object Object]';
const validatePropKey = (prop) => {
    const type = typeof prop;
    if (type !== 'string' && type !== 'symbol') {
        throw TypeError(`Prop should be a string or symbol`);
    }
    return type;
};

const resolveTouches = (prop, touches) => {
    const resolved = (() => {
        switch (typeof touches) {
            case 'string':
                return touches.split(/\s+/);
            case 'symbol':
                return [touches];
            case 'object':
                if (Array.isArray(touches)) {
                    return touches;
                }
        }
        throw TypeError(`Invalid touches for ${prop} property`);
    })();

    resolved.forEach((_prop) => {
        validatePropKey(_prop);
        if (_prop === prop) {
            throw Error(`prop [${prop}] touches itself`);
        }
    });

    return resolved;
};

class ValidationError extends Error {
}


function prepareDescriptor(prop, descriptor) {
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

    let {
        touches
    } = descriptor;

    let {
        /**
         * @type ?Function
         * @private
         */
        set = null,
        /**
         * @type ?Function
         * @private
         */
        get = null,
        cached,
        configurable,
        enumerable,
        type,
        validate,
        writable = !!(set || validate || type || touches),
        chains,
        virtual,
        lazy,
        value
    } = descriptor;

    const context= this;

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
        touches= resolveTouches(propName, touches);
    }

    const symbol = virtual ? null : Symbol(`@@${propName}`);
    const symbolCache = cached ? Symbol(`@@${propName}_CACHED`) : null;

    if (value !== undefined && !writable && !symbol) {
        throw Error(`Unable to set init value for read-only virtual accessor ${propName}`);
    }

    const initTarget= (obj)=>{
        if(cached) {
            const cachedKeyStore = hasOwnProperty.call(obj, symbolCachedPropKeys) ?
                obj[symbolCachedPropKeys] : (obj[symbolCachedPropKeys] = Object.create(null));
            cachedKeyStore[prop] = symbolCache;
        }

        if(symbol){
            const privateKeyStore = hasOwnProperty.call(obj, symbolPrivatePropKeys) ?
                obj[symbolPrivatePropKeys] : (obj[symbolPrivatePropKeys] = Object.create(null));
            privateKeyStore[prop] = symbol;
        }

        if (chains) {
            if (!propName) {
                throw Error(`can't create named chain for anonymous symbol property`);
            }
            let chainName = typeof chains === 'string' ?
                chains.trim() : propName.replace(/[^A-Za-z][^-A-Za-z0-9_]*/, '');

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
                        throw Error(length ?
                            `too much arguments [${length}] were passed to [${setterName}] accessor` :
                            `accessor [${setterName}] requires a value`);
                    }
                    return this;
                }
            })
        }
    };

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
            get: function () {
                const value = get.call(this, prop);
                redefine.call(this, value);
                return value;
            },
            set: redefine,
            configurable: true,
            enumerable,
            initTarget
        };
    }

    if (!get && virtual) {
        throw Error(`missing getter for virtual prop [${propName}]`);
    }

    const getter = cached ? function () {
        let value, context = this;

        if (hasOwnProperty.call(context, symbolCache) && (value = context[symbolCache]) !== UNDEFINED_VALUE) {
            return value;
        }

        return (context[symbolCache] = (virtual ? get.call(context, prop) : get.call(context, context[symbol], prop)));
    } : (get ? function () {
        return virtual ? get.call(this, prop) : get.call(this, this[symbol], prop)
    } : function () {
        return this[symbol];
    });

    if (writable && virtual && !set) {
        throw Error(`missing setter for writable virtual prop [${propName}]`);
    }

    if (validate) {
        const type = typeof validate;
        if (type === 'string') {
            const validator = this[_validators][validate];
            if (!validator) {
                throw Error(`Unknown validator (${validate}) for property ${propName}`);
            }

            validate = validator;
        } else if (type === 'object') {
            if (!isJoiSchema(validate)) {
                throw Error(`Unknown validator type for property ${propName}`);
            }

            const schema = validate;

            const assert = schema.$_root.assert;
            validate = (value) => assert(value, schema);
        } else if (type !== 'function') {
            throw TypeError('validate should be a function');
        }

        if (!writable) {
            throw TypeError('validate can be used for writable property only');
        }
    }


    const _validate = validate && function (value) {
        const reject = (reason) => {
            throw new ValidationError(`value (${value}) is not valid for property (${propName})` +
                (reason ? '. Reason: ' + reason : ''));
        };

        try {
            const validationResult = validate.call(this, value, {
                set: (_value) => {
                    value = _value;
                }, reject, prop
            });

            if (validationResult === false) {
                reject(typeof validationResult === 'string' ? validationResult : '');
            }
        } catch (err) {
            if (err.name === 'ValidationError') {
                reject(err.message);
            } else {
                throw err;
            }
        }
    };

    const checkType = type && (() => {
        if (typeof type !== 'string' && !Number.isInteger(type)) {
            throw TypeError('type must be an integer or string[]');
        }

        const predicate = resolvePredicate(type);

        return (value) => {
            if (!predicate(value)) {
                const types = decodeType(type),
                    message = `Property ${propName} accepts ${types.length > 1 ? types.join('|') : types[0]},` +
                        ` but ${tagOf(value)} given`;
                throw TypeError(message);
            }
        }
    })();

    const setter = set ? function (value) {

        checkType && checkType(value);

        if (validate) {
            const returnedValue = _validate.call(this, value);
            if (returnedValue !== undefined) {
                value = returnedValue;
            }
        }

        if (virtual) {
            const cachedFlag = set.call(this, value, prop);

            if (cached || touches) {
                if (cachedFlag !== true && cachedFlag !== false) {
                    throw Error(`setter of the virtual cached prop [${propName}] should return ` +
                        `a bool flag indicating whether the value has been changed inside`);
                }

                if (cachedFlag) {
                    if (cached) {
                        this[symbolCache] = UNDEFINED_VALUE;
                    }
                    touches && context.flushAccessor(this, ...touches);
                }
            } else {
                if (cachedFlag !== undefined) {
                    throw Error(`setter for virtual prop [${propName}] should not return any value`);
                }
            }

        } else {
            const currentValue = this[symbol];
            const newValue = set.call(this, value, currentValue, prop, symbol);

            if (newValue !== currentValue || currentValue!==this[symbol] || newValue === CHANGED_VALUE) {

                if (cached) {
                    this[symbolCache] = UNDEFINED_VALUE;
                }
                this[symbol] = newValue;
                touches && context.flushAccessor(this, ...touches);

                return CHANGED_VALUE;
            }
        }
    } : (writable ? function (newValue) {
        if (newValue !== this[symbol]) {
            checkType && checkType(newValue);

            if (validate) {
                const returnedValue = _validate.call(this, newValue);
                if (returnedValue !== undefined) {
                    newValue = returnedValue;
                }
            }

            if (cached) {
                this[symbolCache] = UNDEFINED_VALUE;
            }
            touches && context.flushAccessor(this, ...touches);

            this[symbol] = newValue;

            return CHANGED_VALUE;
        }

    } : function () {
        throw Error(`unable to rewrite read-only property [${prop}] of ${this}`)
    });

    return {
        symbol,
        symbolCache,
        readonly: !writable,
        get: getter,
        set: setter,
        configurable,
        enumerable,
        initValue: value,
        initTarget
    }
}

function reduceDecorator(decorator){
    return function (arg0, arg1, arg2){
        if(arguments.length===1){
            return decorator(arg0);
        }else{
            const {descriptor, finisher}= decorator.call(this, {
                key: arg1,
                placement: typeof arg0==='function'? 'static' : 'prototype',
                descriptor: arg2
            });
            finisher(arg0.constructor);
            return descriptor;
        }
    }
}


function buildDecorator(arg0, name) {
    const decorator = function (params) {
        return reduceDecorator((decoratorDescriptor)=>{
            const {key, kind, placement, descriptor, initializer} = decoratorDescriptor;

            if (kind !== 'field' && kind !== 'method') {
                throw Error(`${name} decorator can be used for public method or field`);
            }

            const {get, set, enumerable, configurable, initTarget, initValue, symbol} = prepareDescriptor.call(this, key, {
                get: descriptor.get,
                set: descriptor.set,
                value: initializer ? initializer() : undefined,
                enumerable: descriptor.enumerable,
                configurable: descriptor.configurable,
                ...params
            });

            return {
                kind: 'method',
                key,
                placement,
                descriptor: {
                    get,
                    set,
                    configurable,
                    enumerable
                },
                finisher: (target) => {
                    const _target = placement !== 'static' ? target.prototype : target;
                    initTarget(_target);
                    if (initValue !== undefined) {
                        _target[symbol] = initValue;
                    }
                    return target;
                }
            }
        });
    };

    return typeof arg0==='function'? function(params){
        return decorator.call(this, arg0(params));
    } : decorator(arg0);
}

/**
 * @typedef {Function} SetterFunction
 * @param {any} newValue new value to set
 * @param {any} currentValue current private value
 * @param {PropertyKey} propKey public property key
 * @param {PrivatePropKey} privateKey private property key
 * @returns {any} value to store in the private property
 */

/**
 * @typedef {Function} GetterFunction
 * @param {any} currentValue current private value
 * @param {PropertyKey} propKey public property key
 * @returns {any}
 */

/**
 * @typedef {Function} ValidateFunction
 * @param {any} value value to validate
 * @param {PropertyKey} propKey public property key
 * @returns {Boolean}
 * @throws Error
 */

/**
 * @typedef {String|Symbol} PropertyKey
 */

/**
 * @typedef {Symbol} PrivatePropKey
 */

/**
 * Accessor's descriptor.
 * @typedef {Object} AccessorDescriptor
 * @property {GetterFunction} [get= null] getter function
 * @property {SetterFunction} [set= null] setter function
 * @property {Boolean} [writable= false] if setter is not present indicates whether accessor's value can be set
 * @property {Boolean} [enumerable= false]
 * @property {Boolean} [configurable= false]
 * @property {Boolean} [cached= false] cache getter result until it will be flushed by flushAccessor or other related accessor
 * @property {Boolean} [lazy= false] indicates whether the accessor should be a lazy computing property
 * @property {Boolean} [virtual= false] if true a private property is not created
 * @property {Boolean} [chains= false] create get/set chains for property (like getPropName()/setPropName(value))
 * @property {PropertyKey|PropertyKey[]} [touches= null] a key of accessor whose value depends on this
 * @property {BasicType} [type= null] built-type
 * @property {ValidateFunction} [validate= null] validator function
 * @property {*} [value] value to set after initialization
 */

/**
 * @private
 * @param {Object} context
 * @param {Array} props
 * @param {Function} fn factory
 */

function redefine(context, props, fn) {
    Object.defineProperties(context,
        props.reduce((descriptor, name) => {
            descriptor[name] = {
                value: fn.call(context, context[name], name)
            };
            return descriptor;
        }, {}))
}



/**
 * Library context class
 */

class Context{
    constructor(parentContext= null){
        this[_validators]= Object.create(parentContext);
        redefine(this, protoMethods, (fn) => fn.bind(this));
        Object.entries(types.list).forEach(([type, mask])=>{
            Object.defineProperty(this[type], 'valueOf', {
                value: function(){
                    return mask
                }
            })
        });
    }

    /**
     * Defines a single accessor
     * @param {Object} obj target object
     * @param {PropertyKey} prop  property key
     * @param {AccessorDescriptor} [descriptor]
     * @returns {PrivatePropKey}
     * @alias module:define-accessor2#defineAccessor
     * @example
     * defineAccessor(obj, "age", {
     *     get(){
     *         return 99;
     *     }
     * })
     *//**
     * Defines several accessors with the same descriptor
     * @param {Object} obj target object
     * @param {Array.<PropertyKey>} props  properties list
     * @param {AccessorDescriptor} [descriptor]
     * @returns {Array.<PrivatePropKey>}
     * @alias module:define-accessor2#defineAccessor
     * @example
     * defineAccessor(obj, ["name", "surname"], {
     *     get(privateValue, propKey){
     *         switch(propKey){
     *             case 'name':
     *              return 'John';
     *             case 'surname':
     *              return 'Connor';
     *         }
     *     }
     * })
     *//**
     * Defines several accessors using hash map
     * @param {Object} obj target object
     * @param {Object.<PropertyKey>} props  properties hash map
     * @param {!Object} [options]
     * @param {String} [options.prefix] add prefix for each property key of the returned object
     * @returns {Object.<PrivatePropKey>} object of private properties that refer to the defined accessors
     * @alias module:define-accessor2#defineAccessor
     * @example
     * const {_name, _surname}= defineAccessor(obj, {
     *     name: {
     *         get(){
     *             return 'John';
     *         }
     *     },
     *
     *     surname: {
     *         get(){
     *             return 'Connor';
     *         }
     *     }
     * }, {
     *     prefix: '_'
     * })
     */

     defineAccessor(obj, arg1, arg2 = {}) {
         const descriptors = {};

         const buildDescriptor = (prop, options = {}) => {
             const descriptor= prepareDescriptor.call(this, prop, options);
             descriptors[prop] = descriptor;
             descriptor.initTarget(obj);
             return descriptor.symbol;
         };

         const initProps = () => {
             defineProperties(obj, descriptors);
             Object.entries(descriptors).forEach(([prop, {initValue, symbol, readonly}]) => {
                 if (initValue !== undefined) {
                     if (readonly) {
                         this[symbol] = initValue;
                     } else {
                         this[prop] = initValue;
                     }
                 }
             });
         };

        let result;

        if (typeof arg1 === 'object') {
            if (Array.isArray(arg1)) {
                result= arg1.map(prop => buildDescriptor(prop, arg2));
            } else {
                if (arg2 !== undefined && !isPlainObject(arg2)) {
                    throw TypeError(`Options should be a plain object`);
                }

                const {
                    prefix= ''
                } = arg2 || {};

                if (prefix && typeof prefix !== 'string') {
                    throw TypeError('prefix options should be a string');
                }

                const props= Object.keys(arg1).concat(Object.getOwnPropertySymbols(arg1));
                result= props.reduce((descriptors, prop) => {
                    descriptors[typeof prop === 'string'? prefix + prop : prop] = buildDescriptor(prop, arg1[prop]);
                    return descriptors;
                }, {});
            }
        }else{
            result=  buildDescriptor(arg1, arg2);
        }

        initProps();

        return result;
    }

    /**
     * flush accessor's cache
     * @param obj {Object} target object
     * @param props {...PropertyKey} public accessor's key
     * @returns {boolean} true if flushed successfully
     * @alias module:define-accessor2#flushAccessor
     * @example
     * defineAccessor(obj, "hash", {
     *     get(){
     *         return calcObjectSHA(this);
     *     }
     * })
     * flushAccessor(obj, 'hash')
     */

    flushAccessor(obj, ...props) {
        const propsMap = obj && obj[symbolCachedPropKeys];

        if (propsMap) {
            let i = props.length;
            while (i-- > 0) {
                const cacheKey = propsMap[props[i]];
                if (cacheKey) {
                    obj[cacheKey] = UNDEFINED_VALUE;
                } else {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * retrieve the private accessor symbol assigned to the accessor
     * @param {Object} obj
     * @param {PropertyKey} prop
     * @returns {Symbol|null}
     * @alias module:define-accessor2#privateSymbol
     */

    privateSymbol(obj, prop){
        return obj[symbolPrivatePropKeys][prop] || null;
    }

    /**
     * @typedef {Function} ValidatorPredicate
     * @param {any} value - value to test
     * @returns {Boolean}
     */

    /**
     * Defines a new validator in the current library context
     * @param {String} name validator's name
     * @param {ValidatorPredicate} fn validator predicate function
     * @returns {this}
     * @alias module:define-accessor2#defineValidator
     * @example
     * const validator = require('validator');
     * defineValidator('email', validator.isEmail);
     *//**
     * Defines a new validator in the current library context
     * @param {{ValidatorPredicate}} validators
     * @alias module:define-accessor2#defineValidator
     * @example
     * const validator = require('validator');
     * defineValidator({
     *  email: validator.isEmail,
     *  ip: validator.isIP
     * });
     */

    defineValidator(arg0, arg1) {
        const define = (name, fn) => {
            name = name.trim();

            if (!/^\w+$/gi.test(name)) {
                throw Error('validator name can consist of a-z, A-Z, 0-9 and _ charters ')
            }
            if (typeof fn !== 'function') {
                throw TypeError('validator must be a function');
            }
            this[_validators][name] = fn;
        };

        if (arguments.length === 1) {
            Object.entries(arg0).forEach(([name, fn]) => {
                if(typeof fn==='function') {
                    define(name, fn)
                }
            });
        } else {
            define(arg0, arg1);
        }
    }

    /**
     * Basic type.
     * @typedef {Number|String} BasicType
     */

    /**
     * @typedef {Function} AssertionFunction
     * @param {Any} value value to test
     * @return {Boolean} false if test failed
     */

    /**
     * resolve predicate for type
     * @name Context#resolvePredicate
     * @type {Function}
     * @param {BasicType} type
     * @returns {AssertionFunction} assertion function
     * @alias module:define-accessor2#resolvePredicate
     */

    /**
     * creates a new library context
     * @alias module:define-accessor2#newContext
     * @returns {Context}
     * @example
     * const {defineAccessor, flushAccessor, defineValidator}= require('define-accessor2').newContext()
     * //define custom validators for the current and inherited from the current contexts only
     * defineValidator({
     *     even: (value)=> typeof value && value % 2===0,
     *     odd: (value)=> typeof value && Math.abs(value % 2)===1,
     * });
     */

    newContext(){
        return new Context(this);
    }

    /**
     * accessor decorator
     * @param accessorDescriptor
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#accessor
     * @example
     * class Person{
     *     @accessor({
     *         set: (value)=> value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
     *     })
     *     fullName='';
     *
     *     firstName= 'John';
     *     lastName= 'John Doe';
     * }
     *//**
     * @param {Function} [get] - getter function, can be omitted
     * @param {Function} [set] - setter function, can be omitted
     * @param {AccessorDescriptor} [accessorDescriptor] - accessor descriptor
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#accessor
     * @example
     * class Person{
     *     @accessor(null, (value)=> value.charAt(0).toUpperCase() + value.slice(1).toLowerCase())
     *     fullName='';
     *
     *     firstName= 'John';
     *     lastName= 'John Doe';
     * }
     */

    accessor(accessorDescriptor){} // eslint-disable-line no-unused-vars

    /**
     * lazy decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#lazy
     */

    lazy(){}

    /**
     * cached decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#cached
     */

    cached(){}

    /**
     * cached decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#chains
     */

    chains(){}

    /**
     * type decorator
     * @param {BasicType} type
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#type
     */

    type(type){} // eslint-disable-line no-unused-vars

    /**
     * validate decorator
     * @param {BasicType} validator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#validate
     */

    validate(validator){} // eslint-disable-line no-unused-vars

    /**
     * touches decorator
     * @param {PropertyKey|PropertyKey[]} props
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#touches
     */

    touches(props){} // eslint-disable-line no-unused-vars

    /**
     * Undefined decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#undefined
     */

    undefined(){}

    /**
     * Null decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#null
     */

    null(){}

    /**
     * Boolean decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#boolean
     */

    boolean(){}

    /**
     * Number decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#number
     */

    number(){}

    /**
     * string decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#string
     */

    string(){}

    /**
     * Function decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#function
     */

    function(){}

    /**
     * Object decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#object
     */

    object(){}

    /**
     * Symbol decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#symbol
     */

    symbol(){}

    /**
     * BigInt decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#bigint
     */

    bigint(){}

    /**
     * Array decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#array
     */

    /**
     * Integer decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#integer
     */

    integer(){}

    array(){}

    /**
     * Infinity decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#infinity
     */

    infinity(){}

    /**
     * NaN decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#nan
     */

    nan(){}

    /**
     * Date decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#date
     */

    date(){}

    /**
     * Promise decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#promise
     */

    promise(){}

    /**
     * RegExp decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#regexp
     */

    regexp(){}

    /**
     * Error decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#error
     */

    error(){}

    /**
     * Set decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#set
     */

    set(){}

    /**
     * Map decorator
     * @returns {MethodDecorator}
     * @alias module:define-accessor2#map
     */

    map(){}
}

const {prototype}= Context;

const decorators= {
    lazy: {lazy: true},
    cached: {cached: true},
    chains: {chains: true},
    type: (type)=> ({type}),
    validate: (validate)=> ({validate}),
    touches: (props)=> ({touches: props}),
    accessor: (...args)=> {
        const paramList= ['get', 'set'];
        const computed= {};
        const lastIndex= args.length - 1;

        args.forEach((param, i) => {
            if (typeof param === 'object') {
                if (i !== lastIndex) {
                    throw Error(`options object must be the last argument, but found at index ${i}`);
                }
                Object.assign(computed, param);
            } else {
                if (i > paramList.length - 1) {
                    throw Error(`Unknown parameter at index ${i}`);
                }
                computed[paramList[i]] = param;
            }
        });
        return computed;
    },
};


Object.keys(types.list).forEach(type=>{
    decorators[type]= {type}
});

Object.entries(decorators).forEach(([name, value])=>{
    Object.defineProperty(prototype, name, {
        value: buildDecorator(value, name),
        configurable: true
    })
});

Object.defineProperties(prototype, Object.entries(types).reduce((descriptors, [prop, value]) => {
    descriptors[prop] = {
        value
    };
    return descriptors;
}, {}));

const protoMethods= Object.getOwnPropertyNames(prototype).filter((prop)=> typeof prototype[prop]==='function');

/**
 * The default library context. Call context.newContext() to
 * return a new context inherited from the current.
 * This allows you to create an isolated library scope, which does not affect any others in case of defining a custom validator.
 */

module.exports= new Context();
