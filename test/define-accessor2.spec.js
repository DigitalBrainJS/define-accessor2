import defineAccessor from "../dist/define-accessor2.esm";
import chai from "chai";

const {expect} = chai;

const global = new Function("return this")();

describe("defineProperty", function () {
    const asserts = {
        boolean: true,
        number: 1,
        undefined
    };

    it(`should throw if prop is not a string or symbol`, function () {
        const obj = {};
        Object.keys(asserts).forEach((type) => {
            const value= asserts[type];
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
            expect(obj[prop.privateKey]).to.equal(value);
        });

        it("should support value getting", function () {
            const obj = {};
            const value = 'foo';

            const prop = defineAccessor(obj, 'prop', {
                chains: true,
                writable: true
            });

            obj.prop = value;

            expect(obj.getProp()).to.equal(obj[prop.privateKey]);
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

    /*describe("decorator", function () {
        it("should not create a private prop", function () {
            class Class{
                constructor(){

                }

                get x(){
                    return 123;
                }
            }

            defineAccessor(obj, 'prop', {
                virtual: true,
                get: () => 'value'
            });

            expect(Object.getOwnPropertySymbols(obj).length).to.equal(0);
        });
    });*/


});
