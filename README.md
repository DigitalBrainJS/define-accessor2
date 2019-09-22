# define-accessor2
[![Build Status](https://travis-ci.com/DigitalBrainJS/define-accessor2.svg?branch=master)](https://travis-ci.com/DigitalBrainJS/define-accessor2)
[![](https://badgen.net/bundlephobia/min/define-accessor2)](https://unpkg.com/define-accessor2/dist/define-accessor2.umd.js)
[![](https://badgen.net/bundlephobia/minzip/define-accessor2)](https://unpkg.com/define-accessor2/dist/define-accessor2.umd.js)
[![](https://badgen.net/npm/license/define-accessor2)](https://unpkg.com/define-accessor2/dist/define-accessor2.umd.js)
[![](https://badgen.net/github/issues/DigitalBrainJS/define-accessor2)](https://github.com/DigitalBrainJS/define-accessor2/issues)
[![](https://badgen.net/github/stars/DigitalBrainJS/define-accessor2)](https://github.com/DigitalBrainJS/define-accessor2/stargazers)

:star: Define feature-rich accessors/properties for your classes :star:

# Features
- :zap: lazy computed properties - computes the value once on reading
- :zap: cached property - uses a getter only after the value 
has been changed or marked as deprecated using the flush function
- :zap: chaining methods - it can add the chaining methods like get**PropName** and set**PropName** to the object.
- :zap: automatically flushes the getter cache after changing related properties
- virtual property - without private associated property
- supports setting the initial value
- informative exceptions
- no dependencies
- :heavy_check_mark: CDN friendly

## Installation

Install for node.js or browserify using npm/yarn:

``` bash
$ npm install define-property2 --save
```

``` bash
$ yarn add define-property2
```

````javascript 
import {defineAccessor, flush} from 'define-accessor2/esm';
//OR
const {defineAccessor, flush}= require('define-accessor2');   
````
## CDN
Use unpkg.com cdn to get the link to the script/module from the package:
- minified UMD ES5 version (~4kB)
```html
<script src="https://unpkg.com/define-accessor2"></script>
<script>
    const {defineAccessor, flush}= accessor; //accessor is global variable exported by the script
    defineAccessor({}, 'x'); //Note: without "2" at the end
</script>
```
- ESM ES2015 module(~11kB)
```javascript
import {defineProperty} from "https://unpkg.com/define-accessor2/dist/define-accessor2.esm.js"
//or minified version
import {defineProperty} from "https://unpkg.com/define-accessor2/dist/define-accessor2.esm.min.js"
```
## Functional diagram
![Accessor functional diagram](https://github.com/DigitalBrainJS/define-accessor2/raw/master/public/accessor.png)   
## Try it!
https://jsfiddle.net/DigitalBrain/uw01do2m/
## Usage examples
Basic usage:
````javascript
class Skunk{
        constructor(name){
            this[_name]= name;//set value to private property
        }
        sayName(){
            console.log(this[_name]);
        }
    }
    //_name variable contains a symbol that you can use to refer a private property of the object inside the class
    const _name= defineAccessor(Skunk.prototype, 'name');
    const skunk= new Skunk('Stinky');
    //now every skunk instance has a read-only public property 'name' which refers to the private writable value
    console.log(skunk.name); // "Stinky"
    skunk.sayName(); // "Stinky"
````
Writable accessor/property
```javascript
    const user= {};

    defineAccessor(user, 'name', {
        get(propName, privateValue){
            //compute some public prop value
            return privateValue.trim().replace(/\w/, (str)=> str.toUpperCase())
        },
        writable: true, //writable from the public api
        value: '' //initial value
    });

    console.log(user.name); // ""
    user.name= "alex";
    console.log(user.name); // "Alex"
    console.dir(user);
    /*
    Object
        Symbol(@@name): "alex"
        name: (...)
        get name: ƒ ()
        set name: ƒ (newValue)
        __proto__: Object
     */
```
With default getter
````javascript
class Cat{}

    defineAccessor(Cat.prototype, 'name', {
        set(newValue, prop, privateValue){
            console.log('Setter:', newValue, prop, privateValue);
            return newValue.toUpperCase(); //set newValue to the private property this[Symbol(@@name)]
        }
    });

    const cat= new Cat();

    console.log(cat.name); //undefined
    cat.name= 'Lucky'; //Setter: Lucky name undefined
    console.log(cat.name); //LUCKY
    console.dir(cat);
    /*
    Cat
        Symbol(@@name): "LUCKY" //this is a private property used by the public setter&getter
        name: (...) //public property setter&getter
        __proto__: Object
     */
````
Accessor referring
````javascript
    class User{}
    //some property value modifier
    const normalize = (str)=> str.trim().replace(/\w/, (str)=> str.toUpperCase());

    const {name, surname}= defineAccessor(User.prototype, {
        name: {
            set: normalize,
            touches: 'fullName', //flush getter cache of the fullName property on setting
            value: 'Jon' //append a value
        },
        surname: {
            set: normalize,
            touches: 'fullName',
            value: 'Connor'
        },
        fullName: {
            get(prop){
                const value = `${this[name]} ${this[surname]}`;
                console.log(`Getter [${prop}] [${value}]`);
                return value;
            },
            set(newValue){
                ([this.name, this.surname]= (newValue+'').split(/\s+/));
                return true; //flush property cache
            },
            chains: true, //generate&append chains like setFullName(value):this & getFullName()
            cached: true, //cache getter value
            virtual: true// don't create private property like obj[Symbol('@@fullName')]
        }
    });

    const user= new User();
    //Getter [fullName] [Jon Connor]
    console.log(user.fullName); //Jon Connor
    //just return the result from the cache
    console.log(user.fullName); //Jon Connor
    user.name= "dmitriy";
    //Getter [fullName] [Dmitriy Connor]
    console.log(user.fullName); //Dmitriy Connor

    console.dir(user);
/*  User
        Symbol(@@fullName_CACHED): "Dmitriy Connor"
        Symbol(@@name): "Dmitriy"
        fullName: (...)
        name: (...)
        surname: (...)
        __proto__:
            Symbol(@@PROPS): {fullName: Symbol(@@fullName_CACHED)}
            Symbol(@@name): "Jon"
            Symbol(@@surname): "Connor"
            constructor: class User
            fullName: (...)
            getFullName: ƒ ()
            name: (...)
            setFullName: ƒ (value)
            surname: (...)
            get fullName: ƒ ()
            set fullName: ƒ (value)
            get name: ƒ ()
            set name: ƒ (value)
            get surname: ƒ ()
            set surname: ƒ (value)
            __proto__: Object
*/
````
Lazy prop
````javascript
    class SomeClass{}

    defineAccessor(SomeClass.prototype, 'lazyProp', {
        get(){
            return Math.random();
        },
        lazy: true
    });

    const c1= new SomeClass();

    console.log(c1.hasOwnProperty('lazyProp')); // false
    console.log('lazyProp', c1.lazyProp); //0.027590873465141996
    console.log(c1.hasOwnProperty('lazyProp')); // true
    console.dir(c1);
    /*
    SomeClass
        lazyProp: 0.027590873465141996
        __proto__:
            constructor: class SomeClass
            lazyProp: (...)
            get lazyProp: ƒ ()
            set lazyProp: ƒ (value)
            __proto__: Object
     */
````
Chains:
````javascript
    class Duck{}

    defineAccessor(Duck.prototype, {
        name: {
            chains: true,
            writable: true,
            value: ''
        },
        weight: {
            chains: true,
            writable: true,
            value: 0
        }
    });

    const duck= new Duck();

    console.log(duck.name); //''
    duck.setName('Donald').setWeight(10);
    console.log(duck.getName()); //'Donald'
    console.log(duck.getWeight()); //10
````
definition of several accessors at once with same descriptor
````javascript
class Skunk{}

const [_weight, _health]= defineAccessor(Skunk.prototype, ['weight', 'health'], {
        get(prop, privateValue){ // just one getter for all accessors
            console.log(`Getting [${prop}], private value is [${privateValue}]`);
            return privateValue;
        },

        set(newValue, prop, currentValue){
            switch(prop){
                case 'weight':
                    //some code
                    //return newValueToSet;
                    break;
                case 'health':
                    break;
            }
        }
    })
````
## API

### defineAccessor(obj: Object, prop: String|Symbol, [descriptor: Object]): Symbol

  - `obj:Object` target
  - `props:String|Symbol` a key for accessor's property. 
  - `[descriptor: Object]` accessor descriptor
      - `get(prop:String|Symbol, privateValue: Any)` accessor's getter, if undefined- a default getter will be set
      - `set(newValue:Any, prop:String|Symbol, privateValue: Any)` accessor's setter, if undefined and writable option is set- the default setter will be set
      - `writable: Boolean` makes sense when the setter is not defined
      - `cached: Boolean` cache result of the getter until it will be flushed manually by the flush function or some other property touched it
      - `lazy: Boolean` indicates whether the accessor should be a lazy computing property
      - `touches: String|Symbol|Array<String|Symbol>` flush caches of targeted accessors on change. Indicates that the value of the specified accessors depends on this.
      - `value:Any` a value to set
      - `chains:Boolean` generate&append setter&getter chains like setProp(value):this and getProp() to the target object
      - `virtual:Boolean` indicates whether an internal property should be created
      - `configurable: Boolean`
      - `enumerable: Boolean`
  
  **returns** a symbol key of the private property
### defineAccessor(obj: Object, props: Object, [options: Object]): Object
  - `obj:Object` target object
  - `props:Object<Symbol>` properties map
  - `[descriptor: Object]` accessor descriptor
    - `[prefix: String]` add prefix to each string key in the result object
    
   returns Object<String|Symbol>
### defineAccessor(obj: Object, props: Array): Array
  - `obj:Object` target object
  - `props:Array<String|Symbol>` properties key list  
  
  returns Array<String|Symbol>
### `flush(context: Object, propKey: String|Symbol):Boolean` - flush accessor's cache 
  - `obj:Object` target object
  - `propKey:String|Symbol` public accessor's key
  
  **returns** true if flushed successfully
## Contribution
 Feel free to fork, open issues, enhance or create pull requests. 
## License

The MIT License

Copyright (c) 2019 Dmitriy Mozgovoy <robotshara@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
