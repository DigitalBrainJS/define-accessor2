const lib = require('../src/define-accessor2');
const {lazy, cached, accessor, type, validate, touches} = lib;
const chai = require('chai');
const {expect} = chai;

module.exports = {
    "should support lazy decorator": function () {
        let counter = 0;
        const Class = class {
            @lazy
            get x() {
                return counter++;
            }
        };

        const obj = new Class();

        +obj.x;
        +obj.x;

        expect(counter).to.equal(1);
    },

    "should support cached & touches decorators": function () {
        let counter = 0;
        const Class = class {
            @cached
            get x() {
                return counter++;
            }

            @touches('x')
            get y() {
            }
        };

        const obj = new Class();

        +obj.x;
        +obj.x;

        expect(counter).to.equal(1);

        obj.y = 1;
        +obj.x;

        expect(counter).to.equal(2);

    },

    "should support type decorator": function () {
        const Class = class {
            @type('string')
            get x() {
            }
        };

        const obj = new Class();

        expect(() => {
            obj.x = 123;
        }).to.throw(Error, /Property x accepts String, but number given/);

        expect(() => {
            obj.x = "123";
        }).to.not.throw();
    },

    "should support validate decorator": function () {
        const Class = class {
            @validate(isFinite)
            get x() {
            }
        };

        const obj = new Class();

        expect(() => {
            obj.x = Infinity;
        }).to.throw(Error, 'value (Infinity) is not valid for property (x)');

        expect(() => {
            obj.x = 123;
        }).to.not.throw();
    },

    "should support accessor decorator": function () {
        let counter = 0;
        const Class = class {
            @accessor({
                get: () => {
                    counter++;
                }
            })
            set x(v) {
            }
        };

        const obj = new Class();

        +obj.x;
        +obj.x;

        expect(counter).to.equal(2);
    }
};

