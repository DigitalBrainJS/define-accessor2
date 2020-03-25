/* global describe, it */
const lib =require('../src/define-accessor2');
const {defineAccessor, defineValidator, flushAccessor, privateSymbol}= lib;
const {resolvePredicate, tagOf}=require('../src/types');
const chai=require('chai');
const Joi = require('@hapi/joi');

const {expect} = chai;

const global = new Function("return this")();

describe('defineProperty', function () {
    const asserts = {
        boolean: true,
        number: 1,
        undefined
    };

    it(`should throw if prop is not a string or symbol`, function () {
        const obj = {};
        Object.entries(asserts).forEach(([type, value]) => {
            expect(() => {
                defineAccessor(obj, value, {});
            }).to.throw(TypeError, /prop/i, `Passing [${value}] of [${type}] type doesn't throw`);
        });
    });

    it(`should throw if getter is missing for lazy prop `, function () {
        const obj = {};
        expect(() => {
            defineAccessor(obj, 'x', {
                lazy: true
            });
        }).to.throw(Error, /getter is required for lazy prop/i);
    });

    it(`should throw if prop is empty string`, function () {
        const obj = {};

        expect(() => {
            defineAccessor(obj, '', {});
        }).to.throw(TypeError, /empty/);
    });

    it(`should throw if descriptor in not a plain object`, function () {
        const obj = {};
        const propName = "prop";

        [1, new Date, "", null].forEach((assert) => {
            expect(() => {
                defineAccessor(obj, propName, assert);
            }).to.throw(TypeError, /descriptor/);
        });
    });

    it(`should throw if options is not a plain object`, function () {
        expect(() => {
            defineAccessor({}, {}, new RegExp(''));
        }).to.throw(TypeError, /options should be a plain object/);
    });

    it(`should throw if prefix is not a string`, function () {
        expect(() => {
            defineAccessor({}, {}, {prefix: true});
        }).to.throw(TypeError, /prefix options should be a string/);
    });

    it("should throw if validate is not function|joi schema|known validator name", function () {
        const obj = {};
        const propName = "prop";

        expect(() => {
            defineAccessor(obj, propName, {
                validate: 123
            });
        }).to.throw(Error, /should be a function/, `function`);

        expect(() => {
            defineAccessor(obj, propName, {
                validate: {}
            });
        }).to.throw(Error, /Unknown validator type/);

        expect(() => {
            defineAccessor(obj, propName, {
                validate: "unknown"
            });
        }).to.throw(Error, /Unknown validator/);
    });

    it("should throw when validate attached to non writable property", function () {
        const obj = {};
        const propName = "prop";

        expect(() => {
            defineAccessor(obj, propName, {
                validate: () => {
                },
                writable: false
            });
        }).to.throw(Error, /validate can be used for writable property only/);
    });

    it("should call the setter when assigning a value", function () {
        const obj = {};
        let counter = 0;
        defineAccessor(obj, 'x', {
            set() {
                counter++;
            }
        });
        obj.x=1;
        obj.x=2;
        expect(counter).to.equal(2);
    });

    it("should support a cached virtual property", function () {
        let obj = {};
        let counter = 0;
        let _value= 123;

        defineAccessor(obj, 'x', {
            virtual: true,
            cached: true,
            get(){
                counter++;
                return _value;
            },

            set(value) {
                if (_value !== value) {
                    _value = value;
                    return true;
                }
                return false;
            }
        });

        expect(obj.x).to.equal(123);
        expect(counter).to.equal(1);
        +obj.x;
        expect(counter).to.equal(1);
        obj.x= 456;
        expect(obj.x).to.equal(456);
        expect(counter).to.equal(2);
        obj.x= 456;
        expect(obj.x).to.equal(456);
        expect(counter).to.equal(2);
    });

    it("should throw if setter of a cached virtual property returns not boolean or undefined values", function () {
        const obj = {};
        expect(() => {
            defineAccessor(obj, 'x', {
                virtual: true,
                cached: true,
                get(){

                },
                set(){
                    return {};
                }
            });

            obj.x= 123;
        }).to.throw(Error, /setter for virtual prop 'x' should return true if the value has been changed/);
    });

    it("should throw if setter of not cached virtual property returns not an undefined value", function () {
        const obj = {};
        expect(() => {
            defineAccessor(obj, 'x', {
                virtual: true,
                get(){

                },
                set(){
                    return {};
                }
            });

            obj.x= 123;
        }).to.throw(Error, /setter for virtual prop 'x' should not return any value/);
    });

    it("should support setting initialization value", function () {
        let obj = {};
        defineAccessor(obj, 'x', {
            value: 123
        });
        expect(obj.x).to.equal(123);

        obj = {};
        defineAccessor(obj, 'x', {
            value: 123,
            writable: false
        });
        expect(obj.x).to.equal(123);
    });

    it("should throw if setter assigned to non-writable property", function () {
        const obj= {};
        expect(() => {
            defineAccessor(obj, 'x', {
                writable: false,
                set(){}
            });
        }).to.throw(Error, /writable option can not be set to false when setter is defined/i);
    });

    Object.entries({
        string: 'x',
        symbol: Symbol()
    }).forEach(([type, prop])=>{
        it(`should create a new public prop with ${type} key`, function () {
            const obj = {};
            defineAccessor(obj, prop, {});
            expect(obj).to.have.property(prop);
        });
    });

    it(`should support map of props`, function () {
        const obj = {};
        const prop= 'x';
        const symbolProp= Symbol();
        defineAccessor(obj, {
            [prop]: {},
            [symbolProp]: {}
        });
        expect(obj).to.have.property(prop);
        expect(obj).to.have.property(symbolProp);
    });

    it("should support the definition of multiple properties", function () {
        const obj = {};
        defineAccessor(obj, {
            x: {},
            y: {}
        }, {});
        expect(obj).to.have.property('x');
        expect(obj).to.have.property('y');
    });

    it("should create new public prop with symbol key", function () {
        const obj = {};
        const propName = Symbol();
        defineAccessor(obj, propName, {});
        expect(obj).to.have.property(propName);
    });

    it("should return value from getter", function () {
        const obj = {};
        const propName = "prop";
        let value = {};

        defineAccessor(obj, propName, {
            get: () => value
        });

        expect(obj[propName]).to.equal(value);
    });

    it("should set value using setter", function () {
        const obj = {};
        const propName = "prop";
        let value = {};

        defineAccessor(obj, propName, {
            writable: true
        });

        obj[propName] = value;

        expect(obj[propName]).to.equal(value);
    });

    it("should throw when trying to change a read-only prop", function () {
        const obj = {};
        const propName = "prop";
        let value = {};

        defineAccessor(obj, propName, {
            writable: false
        });

        expect(() => {
            obj[propName] = value;
        }).to.throw(Error, /read-only|rewrite/);
    });

    describe("validation", function () {
        it("should throw when validate function return false", function () {
            const obj = {};
            const propName = "prop";

            defineAccessor(obj, propName, {
                validate: () => false,
                writable: true
            });

            expect(() => {
                obj[propName] = null;
            }).to.throw(Error, /is not valid/);
        });

        it("should support Joi schema", function () {
            const obj = {};
            const propName = "prop";

            defineAccessor(obj, propName, {
                validate: Joi.number(),
                writable: true
            });

            expect(() => {
                obj[propName] = null;
            }).to.throw(Error, /is not valid/);

            expect(() => {
                obj[propName] = 123;
            }).to.not.throw(Error);
        });
    });

    describe("touches", function(){
        const symbol= Symbol('testProperty');
        Object.entries({
            'string': ['x', 'x'],
            'symbol': [symbol, symbol],
            'array': [symbol, [symbol]]
        }).forEach(([type, [prop, ref]])=>{
            it(`should flush cached property by ${type} reference`, function () {
                const obj= {};
                let counter= 0;
                defineAccessor(obj, {
                    [prop]: {
                        get(){
                            counter++;
                        },
                        cached: true
                    },

                    y: {
                        touches: ref
                    }
                });
                +obj[prop];
                +obj[prop];

                expect(counter).to.equal(1);
                obj.y= 1;
                +obj[prop];
                expect(counter).to.equal(2);
            });
        });
    });

    it("should throw if prop touches itself", function () {
        const obj = {};
        const propName = "prop";

        expect(() => {
            defineAccessor(obj, propName, {
                touches: propName
            });
        }).to.throw(Error, /touches itself/);
    });

    it("should throw if invalid touches detected", function () {
        const obj = {};
        const propName = "prop";

        expect(() => {
            defineAccessor(obj, propName, {
                touches: 123
            });
        }).to.throw(Error, /Invalid touches for prop property/);

        expect(() => {
            defineAccessor(obj, propName, {
                touches: [123]
            });
        }).to.throw(Error, /expected prop to be a string|symbol/);
    });

    it("should throw if get is not a function", function () {
        const obj = {};
        const propName = "prop";

        expect(() => {
            defineAccessor(obj, propName, {
                get: 123
            });
        }).to.throw(Error, /get should be a function/);
    });

    it("should throw if get is not a function", function () {
        const obj = {};
        const propName = "prop";

        expect(() => {
            defineAccessor(obj, propName, {
                set: 123
            });
        }).to.throw(Error, /set should be a function/);
    });

    it("should throw if value was set to read-only virtual property", function () {
        const obj = {};
        const propName = "prop";

        expect(() => {
            defineAccessor(obj, propName, {
                writable: false,
                virtual: true,
                value: 123
            });
        }).to.throw(Error, /Unable to set init value for read-only virtual accessor/);
    });

    it("should throw if setter missing for writable virtual property", function () {
        expect(() => {
            defineAccessor({}, 'x', {
                get(){},
                writable: true,
                virtual: true
            });
        }).to.throw(Error, /missing setter for writable virtual prop/);
    });

    describe("in cached mode", function () {
        it("should throw if no getter were passed", function () {
            const obj = {};
            const propName = "prop";

            expect(() => {
                defineAccessor(obj, propName, {
                    cached: true
                });
            }).to.throw();
        });

        it("should invoke getter in cached mode only once", function () {
            const obj = {};
            const propName = "prop";
            let counter = 0;

            defineAccessor(obj, propName, {
                cached: true,
                get: () => {
                    counter++;
                }
            });

            global.temp = obj[propName];

            expect(counter).to.equal(1)
        });

/*        it("should flushed when relative accessor changed", function () {
            const obj = {};
            let counter= 0;

            defineAccessor(obj, {
                x: {
                    get(){
                        counter++;
                    },
                    cached: true
                },
                y: {
                    touches: "x"
                }
            });

            +obj.x;
            +obj.x;

            expect(counter).to.equal(1);
            obj.y= 1;
            +obj.x;
            expect(counter).to.equal(2);
        });*/
    });

    describe("with chains option", function () {
        it("should support chains creating", function () {
            const obj = {};

            defineAccessor(obj, 'prop', {
                chains: true
            });

            expect(obj).to.have.property('getProp');
            expect(obj).to.have.property('setProp');
        });

        it("should support value setting", function () {
            const obj = {};
            const value = 'bar';

            const prop = defineAccessor(obj, 'prop', {
                chains: true,
                writable: true
            });

            obj.setProp(value);
            expect(obj[prop]).to.equal(value);
        });

        it("should support value getting", function () {
            const obj = {};
            const value = 'foo';

            const prop = defineAccessor(obj, 'prop', {
                chains: true,
                writable: true
            });

            obj.prop = value;

            expect(obj.getProp()).to.equal(obj[prop]);
        });
    });

    describe("with virtual option", function () {
        it("should not create a private prop", function () {
            const obj = {};

            defineAccessor(obj, 'prop', {
                virtual: true,
                get: () => 'value'
            });

            expect(Object.getOwnPropertySymbols(obj).length).to.equal(0);
        });

        it("should throw if getter is not set", function () {
            const obj = {};

            expect(() => {
                defineAccessor(obj, 'prop', {
                    virtual: true
                });
            }).to.throw(Error, /getter/);
        });
    });

    describe("definition of several accessors at once", function () {
        it("should return an array of private keys (symbols) if an array of props were given as second argument", function () {
            const obj = {};
            const keys = ["one", "two"];

            const result = defineAccessor(obj, keys);

            expect(result).to.be.an('array');
            expect(result.every(symbol => typeof symbol === "symbol")).to.be.true;
        });

        it("should return an object of private keys (symbols) if an object of descriptors were given as second argument", function () {
            const obj = {};

            const result = defineAccessor(obj, {
                one: {},
                two: {}
            });

            expect(result).to.be.an('object');
            expect(Object.keys(result).every(key => typeof key === "string")).to.be.true;
            expect(Object.keys(result).every(key => typeof result[key] === "symbol")).to.be.true;
        });

        it("should support prefix for keys in the result object", function () {
            const obj = {};

            const props = {
                one: {},
                two: {}
            };

            const prefix = "_";

            const result = defineAccessor(obj, props, {
                prefix
            });

            expect(result).to.be.an('object');
            const resultKeys = Object.keys(result);
            expect(Object.keys(props).every(originalKey => resultKeys.includes(prefix + originalKey))).to.be.true;
        })
    });
});

describe("privateSymbol", function () {
    it(`should retrieve the private accessor symbol assigned to the accessor`, function () {
        const obj = {};

        const symbol= defineAccessor(obj, 'x');

        expect(privateSymbol(obj, 'x')).to.equal(symbol);
    });
});

describe("flushAccessor", function () {
    it(`should return true if flushed successfully`, function () {
        const obj = {};

        defineAccessor(obj, 'x', {
            get(){},
            cached: true
        });

        expect(flushAccessor(obj, 'x')).to.equal(true);
    });

    it(`should return false if not flushed successfully`, function () {
        const obj = {};

        defineAccessor(obj, {
            x: {
                get() {},
                cached: false
            }
        });

        expect(flushAccessor(obj, 'x')).to.equal(false);

        defineAccessor(obj, {
            y: {
                get() {},
                cached: true
            }
        });

        expect(flushAccessor(obj, 'x')).to.equal(false);
    });
});

describe("defineValidator", function () {
    it("should throw if name is not string a-z, A-Z, 0-9", function () {
        expect(()=> defineValidator('!custom', (value) => value === 'test')).to.throw('validator name');
    });

    it("should throw if predicate is not a function", function () {
        expect(()=> defineValidator('custom', 1)).to.throw('validator must be a function');
    });

    it("should define a custom validator", function () {
        const obj = {};

        defineValidator('custom', (value) => value === 'test');

        defineAccessor(obj, 'x', {
            validator: 'custom'
        })
    });

    it("should define multiple validators", function () {
        const obj = {};

        defineValidator({
            validator1: ()=> true,
            validator2: ()=> true
        });

        defineAccessor(obj, 'x', {
            validator: 'validator1',
        });

        defineAccessor(obj, 'y', {
            validator: 'validator2',
        })
    });
});

describe("type system", function () {
    const fixture= {
        "Undefined": [undefined],
        "Boolean": [true, false],
        "Number": [1],
        "NaN": [NaN],
        "Infinity": [Infinity],
        "String": [""],
        "Function": [()=>{}, function(){}, async ()=>{}, function *(){}],
        "Symbol": [Symbol()],
        "Null": [null],
        "Object": [{}],
        "Array": [[]],
        "Date": [new Date()],
        "RegExp": [/\s/],
        "Set": new Set(),
        "Map": new Map(),
        "Error": [new Error()],
        "Promise": [Promise.resolve()],
    };

    if (lib.TYPE_BIGINT) {
        fixture["BigInt"] = new Function('', 'return [1n]')();
    }

    const makeTest= (type, positiveValues, negativeValues)=>{
        describe(`${type} predicate`, function () {
            const predicate = resolvePredicate(type);

            it(`should return true if value is a type of ${type}`, () => {
                positiveValues.forEach(value => {
                    expect(predicate(value), `value ${tagOf(value)} is not type of ${type}`).to.be.true;
                });
            });
            if(negativeValues) {
                it(`should return false if value is not a type of ${type}`, () => {
                    negativeValues.forEach(value => {
                        expect(predicate(value), `value ${tagOf(value)} is type of ${type}`).to.be.false;
                    });
                });
            }
        });
    };

    Object.entries(fixture).forEach(([type, positiveValues])=>{
        const negativeValues= [];
        Object.entries(fixture).forEach(([, values])=> {
            if(type!==type){
                negativeValues.push(...values);
            }
        });
        makeTest(type, positiveValues, negativeValues);
    });

    makeTest('integer', [1], [1.1, NaN, Infinity]);
});

const importTests= (name, tests)=>{
    describe(name, function () {
        Object.entries(tests).forEach(([label, test]) => {
            it(label, test);
        });
    });
};

describe('decorators', function () {
    importTests('legacy', require('./decorators.legacy.build.spec.js'));

    importTests('current', require('./decorators.build.spec.js'));
});
