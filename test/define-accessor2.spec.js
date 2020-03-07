const lib =require('../src/define-accessor2');
const {defineAccessor, defineValidator}= lib;
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
        Object.keys(asserts).forEach((type) => {
            const value = asserts[type];
            expect(() => {
                defineAccessor(obj, value, {});
            }).to.throw(TypeError, /prop/i, `Passing [${value}] of [${type}] type doesn't throw`);
        });
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

    it("should create new public prop with string key", function () {
        const obj = {};
        const propName = 'prop';
        defineAccessor(obj, propName, {});
        expect(obj).to.have.property(propName);
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

describe("defineValidator", function () {
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
                    if(type==='object'){
                        debugger;
                    }
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
        Object.entries(fixture).forEach(([_type, values])=> {
            if(type!==type){
                negativeValues.push(...values);
            }
        });
        makeTest(type, positiveValues, negativeValues);
    });

    makeTest('integer', [1], [1.1, NaN, Infinity]);
});

