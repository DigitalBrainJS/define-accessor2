const {type, string, number, array} = require("../src/define-accessor2");

class Cat {
    @string
    name = '';
    @type(string | number)
    foo = 123;
    @array
    bar = [];
}

const cat = new Cat();
cat.name = 'Lucky'; // Ok
cat.foo = 123;
cat.foo = '123';
cat.bar = [1, 2, 3];

cat.name = 123; // TypeError: Property name accepts String, but number given
cat.foo = true; // TypeError: Property foo accepts String|Number, but boolean given
cat.bar= {}; //Property bar accepts Array, but object given


