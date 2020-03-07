const {global, flatObject} = require("./utils");
const {defineProperties} = Object;
const {toString} = Object.prototype;

let typesCount = 0,
    invalidMask;

//eslint-disable-next-line no-bitwise
const isValidMask = (mask) => !(mask & invalidMask);

const api = {
    TYPE_ANY: -1,
    isValidMask
};

const allocTypeMask = () => {
    if (typesCount > 31) {
        throw Error("Out of bit pool")
    }
    invalidMask = -1 << (typesCount + 1);
    return 1 << typesCount++;
};

const predicates = flatObject();
const cacheType2Mask = flatObject();
const cacheMask2Type = flatObject();
const cacheMask2TypeL = flatObject();
const cacheTypeList = [];
const cacheTypeListL = [];
const pattern2TagL = flatObject();
const cacheIndex2Predicate = [];


const {POSITIVE_INFINITY, NEGATIVE_INFINITY} = Number;

const cachePattern = (pattern, precache) => {
    const tag = precache ? "[object " + pattern + "]" : pattern.slice(8, -1).replace(/\s/g, ''),
        tagL = tag.toLowerCase();

    pattern2TagL[pattern] = tagL;

    return [tag, tagL];
};

const registerPredicate = (type, predicate, options = {}) => {
    const typeL = type.toLowerCase();

    const {
        tag = true,
        scope = {}
    } = typeof options === "number" ? {tag: options} : options;

    predicate = typeof predicate === 'string' ? new Function(Object.keys(scope).join(','), `return (v)=>${predicate}`)
        .apply(Function, Object.values(scope)) : predicate
    ;

    const props = {
        ["is" + type]: {
            value: predicate,
            enumerable: true
        }
    };

    const mask = allocTypeMask();
    cacheType2Mask[type] = mask;
    cacheType2Mask[typeL] = mask;
    cacheMask2Type[mask] = type;
    cacheMask2TypeL[mask] = typeL;

    props["TYPE_" + type.toUpperCase()] = {
        value: mask,
        enumerable: true
    };

    predicates[type] = predicate;
    cacheTypeList.push(type);
    cacheTypeListL.push(typeL);
    cacheIndex2Predicate.push(predicate);

    defineProperties(api, props);

    tag && cachePattern(tag === true ? type : tag);
};

const globalConstructors = [];

registerPredicate("Undefined", (value) => value === undefined);

registerPredicate("Null", (value) => value === null);

const defineNativeType= (name)=> registerPredicate(name, `typeof v==='${name.toLowerCase()}'`);

["Boolean", "Function", "String", "Symbol"].map(defineNativeType);

try{
    new Function('', 'return 1n')();
    defineNativeType("BigInt");
}catch(e){}

registerPredicate("NaN", (thing) => thing !== thing);

registerPredicate("Integer", Number.isInteger);

registerPredicate("Infinity", (value) => value === NEGATIVE_INFINITY || value === POSITIVE_INFINITY);

registerPredicate("Number", (value) => Number.isFinite(value));

registerPredicate("Array", Array.isArray);

"Error,Date,RegExp,Map,Set,Promise".split(",").forEach(function (type) {
    const constructor = global[type];
    globalConstructors.push(constructor);
    registerPredicate(type, (thing) => thing instanceof constructor);
});


const isPseudoObjectType = (() => {
    const tests = globalConstructors.slice(1).map((constructor) => {
        return `value instanceof ${constructor.name}`;
    });
    return new Function('isArray', `return (value)=>isArray(value)&&${tests.join('||')}`)(Array.isArray);
})();

registerPredicate("Object",
    (thing) => typeof thing === 'object' && thing !== null && !isPseudoObjectType(thing)
);

const {
    TYPE_ANY,
} = api;

const resolvePredicate = (type) => {
    const predicates = [];

    if (typeof type === 'string') {
        type = resolveType(type);
    }
    if (type === TYPE_ANY) {
        return () => true;
    }

    for (let i = 0; i < typesCount; i++) {
        if (type & (1 << i)) {
            predicates.push(cacheIndex2Predicate[i]);
        }
    }


    const count = predicates.length;

    if (count === 1) {
        return predicates[0];
    }

    return (value) => {
        let i = count;
        while (i-- > 0) {
            if (predicates[i](value)) return true;
        }
        return false;
    }
};

const resolveType = (rawType) => {
    const arr = rawType.split('|');
    let i = arr.length;
    let resolvedType = 0;
    while (i-- > 0) {
        const type = arr[i].trim();
        const mask = cacheType2Mask[type];
        if (mask === TYPE_ANY) {
            return TYPE_ANY;
        }
        if (!mask) {
            throw Error(`Unknown type ${type}`);
        }
        resolvedType |= mask;
    }
    return resolvedType;
};

const decodeType = (type, lowerCase) => {
    if (typeof type === 'string') {
        type = resolveType(type);
    }

    if (type === TYPE_ANY) return [lowerCase ? "any" : "Any"];

    let arr = [];

    const maskCache = (lowerCase ? cacheMask2TypeL : cacheMask2Type)[type];

    if (maskCache) return [maskCache];

    let registry = lowerCase ? cacheTypeListL : cacheTypeList;

    for (let i = 0; i < typesCount; i++) {
        if (type & (1 << i)) {
            arr.push(registry[i]);
        }
    }

    return arr;
};

const tagOf = (thing) => {
    if (thing === undefined) return "undefined";
    if (thing === null) return "null";
    if (thing !== thing) return "nan";
    const pattern = toString.call(thing);
    return pattern2TagL[pattern] || cachePattern(pattern)[1];
};


module.exports = Object.assign(api, {
    TYPES_COUNT: typesCount,
    tagOf,
    resolveType,
    resolvePredicate,
    decodeType
});
