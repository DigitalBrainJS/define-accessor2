const {type, string, number} = require("../src/define-accessor2");

class Cat {
    @string
    name = '';
    @type(string|number)
    foo= 123;
}

const cat = new Cat();
cat.name = 'Lucky'; // Ok
cat.foo= 123;
cat.foo= '123';

cat.foo= true; // TypeError: Property foo accepts String|Number, but boolean given
cat.name = 123; // TypeError: Property name accepts String, but number given
