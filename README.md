# define-accessor2
[![Build Status](https://travis-ci.com/DigitalBrainJS/define-accessor2.svg?branch=master)](https://travis-ci.com/DigitalBrainJS/define-accessor2)
[![](https://badgen.net/npm/license/define-accessor2)](https://unpkg.com/define-accessor2/dist/define-accessor2.umd.js)
[![Coverage Status](https://coveralls.io/repos/github/DigitalBrainJS/define-accessor2/badge.svg?branch=master)](https://coveralls.io/github/DigitalBrainJS/define-accessor2?branch=master)
[![](https://badgen.net/github/issues/DigitalBrainJS/define-accessor2)](https://github.com/DigitalBrainJS/define-accessor2/issues)
[![](https://badgen.net/github/stars/DigitalBrainJS/define-accessor2)](https://github.com/DigitalBrainJS/define-accessor2/stargazers)

:star: Define feature-rich properties using decorators or plain functions. An extended version of Object.defineProperty :star:

# Features
- no dependencies
- supports decorators for methods and class properties
- supports legacy and current draft of decorator specification
- lazy properties
- cached properties - cache the value returned by the accessor getter. Cached value can be flushed later
- validation hook
- Joi validation out of the box
- built-in basic type system (see [Built-in types](#built-in-types))
- automatically flushes getter cache after changing related properties
- defining custom validators
- isolated contexts to define validators in a local scope
- chaining methods - can create chaining methods like get**PropName** and set**PropName**
- type predicates (isNumber, isNull etc)

## Installation

Install for node.js using npm/yarn:

``` bash
$ npm install define-property2 --save
```

``` bash
$ yarn add define-property2
```

````javascript
const {defineAccessor, flushAccessor}= require('define-accessor2');
````
## Playground

1) Clone `https://github.com/DigitalBrainJS/define-accessor2.git` repo
2) Open `sandbox/sandbox.js` file with a basic example of using library decorators
3) Run this file using `npm run sandbox` command to watch the result

## Usage examples

A basic example of using library decorators (with plugin-proposal-decorators and plugin-proposal-class-properties babel plugins):
````javascript
const {type, string, number} = require("define-accessor2");

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

````
More complex:
````javascript
const {type, cached, touches, validate, accessor, defineValidator, string}= require('define-accessor2');
const hash = require('object-hash');
const validator= require('validator');
const Joi= require('@hapi/joi');

//import all methods as validators predicates
defineValidator(validator);

class Model{
    // cached value
    @cached
    get sha(){
        console.log('calc sha');
        return hash(this);
    }
    // this prop affects 'sha' prop
    @touches('sha')
    @string
    name= 'anonymous';

    @touches('sha')
    @type('number|string')
    foo= 30;
    // configure all the necessary accessor features in one decorator (recommended way)
    @accessor({
        touches: 'sha',
        validate: 'isEmail'
    })
    email= '';
    // Joi validator can be used out of the box for complex properties validation
    @validate(Joi.array().items(Joi.string()))
    labels= [];
}

const model= new Model();

console.log(model.name); // 'anonymous'
console.log(model.sha); // calc sha
console.log(model.sha); // just return the cached value
model.name= 'admin';
console.log(model.sha); // calc sha
model.email= 'admin@google.com';
console.log(model.sha);
model.foo= true;
model.labels= ['123'];
````
Just using plain functions without any decorators
````javascript
     const {defineAccessor, TYPE_NUMBER, TYPE_STRING}= require('define-accessor2');
     const obj= {};

     defineAccessor(obj, 'someProp', {
         type: 'string|number'
     });
     //or using type bit mask
     defineAccessor(obj, 'someProp', {
         type: TYPE_STRING|TYPE_NUMBER
     });
````
Validate with Joi:
````javascript
     const {defineAccessor}= require('define-accessor2');
     const Joi = require('@hapi/joi');
     const user= {};

     defineAccessor(user, 'age', {
        validate: Joi.number().integer().min(0).max(100),
        set(newValue, prevValue){
            //do some work
            return newValue; //set newValue to the property age
        }
     });

    user.age= 30; //ok, now age= 30
    user.age= 150; //ValidationError: value (150) is not valid for property (age). Reason: "value" must be less than or equal to 100
````
Custom validator:
````javascript
     //import library and create new context for a local validator definition
     const {defineAccessor, defineValidator}= require('define-accessor2').newContext();
     const validator= require('validator');
     const model= {};

    defineValidator({
        mongoId: validator.isMongoId
    });

    defineAccessor(model, 'id', {
        validate: 'mongoId'
    });
````
````javascript
const {defineAccessor, flushAccessor}= require('define-accessor2');
const hash = require('object-hash');

const obj= {};

const normalize = (str)=> str.replace(/^\w/, (str)=> str.toUpperCase());

const {_name}= defineAccessor(obj, {
    hash: {
        get(){
            return hash(this);
        },
        cached: true
    },
    name: {
        validate(value, {reject, set}){
            typeof value!=='string' && reject('must be a string');
            value= value.trim();
            !/^[a-zA-Z]+$/.test(value) && reject('only a-zA-Z allowed');
            value.length<=3 && reject('length should be greater than 3');
            set(value);
        },
        set: normalize,
        touches: ['hash'],
        value: 'Jon'
    },

    email: {
        validate: validator.isEmail
    }

}, {prefix: '_'})

````

## Functional diagram
![Accessor functional diagram](https://github.com/DigitalBrainJS/define-accessor2/raw/master/public/accessor.png)

## API

<a name="module_define-accessor2"></a>

## define-accessor2

* [define-accessor2](#module_define-accessor2)
    * [module.exports](#exp_module_define-accessor2--module.exports) ⏏
        * _instance_
            * [.defineAccessor(obj, prop, [descriptor])](#module_define-accessor2--module.exports+defineAccessor) ⇒ <code>PrivatePropKey</code>
            * [.defineAccessor(obj, props, [descriptor])](#module_define-accessor2--module.exports+defineAccessor) ⇒ <code>Array.&lt;PrivatePropKey&gt;</code>
            * [.defineAccessor(obj, props, [options])](#module_define-accessor2--module.exports+defineAccessor) ⇒ <code>Object.&lt;PrivatePropKey&gt;</code>
            * [.flushAccessor(obj, ...props)](#module_define-accessor2--module.exports+flushAccessor) ⇒ <code>boolean</code>
            * [.privateSymbol(obj, prop)](#module_define-accessor2--module.exports+privateSymbol) ⇒ <code>Symbol</code> \| <code>null</code>
            * [.defineValidator(name, fn)](#module_define-accessor2--module.exports+defineValidator) ⇒ <code>this</code>
            * [.defineValidator(validators)](#module_define-accessor2--module.exports+defineValidator)
            * [.newContext()](#module_define-accessor2--module.exports+newContext) ⇒ <code>Context</code>
            * [.accessor(accessorDescriptor)](#module_define-accessor2--module.exports+accessor) ⇒ <code>MethodDecorator</code>
            * [.accessor([get], [set], [accessorDescriptor])](#module_define-accessor2--module.exports+accessor) ⇒ <code>MethodDecorator</code>
            * [.lazy()](#module_define-accessor2--module.exports+lazy) ⇒ <code>MethodDecorator</code>
            * [.cached()](#module_define-accessor2--module.exports+cached) ⇒ <code>MethodDecorator</code>
            * [.chains()](#module_define-accessor2--module.exports+chains) ⇒ <code>MethodDecorator</code>
            * [.type(type)](#module_define-accessor2--module.exports+type) ⇒ <code>MethodDecorator</code>
            * [.validate(validator)](#module_define-accessor2--module.exports+validate) ⇒ <code>MethodDecorator</code>
            * [.touches(props)](#module_define-accessor2--module.exports+touches) ⇒ <code>MethodDecorator</code>
            * [.undefined()](#module_define-accessor2--module.exports+undefined) ⇒ <code>MethodDecorator</code>
            * [.null()](#module_define-accessor2--module.exports+null) ⇒ <code>MethodDecorator</code>
            * [.boolean()](#module_define-accessor2--module.exports+boolean) ⇒ <code>MethodDecorator</code>
            * [.number()](#module_define-accessor2--module.exports+number) ⇒ <code>MethodDecorator</code>
            * [.string()](#module_define-accessor2--module.exports+string) ⇒ <code>MethodDecorator</code>
            * [.function()](#module_define-accessor2--module.exports+function) ⇒ <code>MethodDecorator</code>
            * [.object()](#module_define-accessor2--module.exports+object) ⇒ <code>MethodDecorator</code>
            * [.symbol()](#module_define-accessor2--module.exports+symbol) ⇒ <code>MethodDecorator</code>
            * [.bigint()](#module_define-accessor2--module.exports+bigint) ⇒ <code>MethodDecorator</code>
            * [.integer()](#module_define-accessor2--module.exports+integer) ⇒ <code>MethodDecorator</code>
            * [.infinity()](#module_define-accessor2--module.exports+infinity) ⇒ <code>MethodDecorator</code>
            * [.nan()](#module_define-accessor2--module.exports+nan) ⇒ <code>MethodDecorator</code>
            * [.date()](#module_define-accessor2--module.exports+date) ⇒ <code>MethodDecorator</code>
            * [.promise()](#module_define-accessor2--module.exports+promise) ⇒ <code>MethodDecorator</code>
            * [.regexp()](#module_define-accessor2--module.exports+regexp) ⇒ <code>MethodDecorator</code>
            * [.error()](#module_define-accessor2--module.exports+error) ⇒ <code>MethodDecorator</code>
            * [.set()](#module_define-accessor2--module.exports+set) ⇒ <code>MethodDecorator</code>
            * [.map()](#module_define-accessor2--module.exports+map) ⇒ <code>MethodDecorator</code>
        * _inner_
            * [~Context](#module_define-accessor2--module.exports..Context)
            * [~SetterFunction](#module_define-accessor2--module.exports..SetterFunction) ⇒ <code>any</code>
            * [~GetterFunction](#module_define-accessor2--module.exports..GetterFunction) ⇒ <code>any</code>
            * [~ValidateFunction](#module_define-accessor2--module.exports..ValidateFunction) ⇒ <code>Boolean</code>
            * [~PropertyKey](#module_define-accessor2--module.exports..PropertyKey) : <code>String</code> \| <code>Symbol</code>
            * [~PrivatePropKey](#module_define-accessor2--module.exports..PrivatePropKey) : <code>Symbol</code>
            * [~AccessorDescriptor](#module_define-accessor2--module.exports..AccessorDescriptor) : <code>Object</code>
            * [~ValidatorPredicate](#module_define-accessor2--module.exports..ValidatorPredicate) ⇒ <code>Boolean</code>
            * [~BasicType](#module_define-accessor2--module.exports..BasicType) : <code>Number</code> \| <code>String</code>
            * [~AssertionFunction](#module_define-accessor2--module.exports..AssertionFunction) ⇒ <code>Boolean</code>

<a name="exp_module_define-accessor2--module.exports"></a>

### module.exports ⏏
The default library context. Call context.newContext() to
return a new context inherited from the current.
This allows you to create an isolated library scope, which does not affect any others in case of defining a custom validator.

**Kind**: Exported member  
<a name="module_define-accessor2--module.exports+defineAccessor"></a>

#### module.exports.defineAccessor(obj, prop, [descriptor]) ⇒ <code>PrivatePropKey</code>
Defines a single accessor

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>Object</code> | target object |
| prop | <code>PropertyKey</code> | property key |
| [descriptor] | <code>AccessorDescriptor</code> |  |

**Example**  
```js
defineAccessor(obj, "age", {
    get(){
        return 99;
    }
})
     
```
<a name="module_define-accessor2--module.exports+defineAccessor"></a>

#### module.exports.defineAccessor(obj, props, [descriptor]) ⇒ <code>Array.&lt;PrivatePropKey&gt;</code>
Defines several accessors with the same descriptor

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>Object</code> | target object |
| props | <code>Array.&lt;PropertyKey&gt;</code> | properties list |
| [descriptor] | <code>AccessorDescriptor</code> |  |

**Example**  
```js
defineAccessor(obj, ["name", "surname"], {
    get(privateValue, propKey){
        switch(propKey){
            case 'name':
             return 'John';
            case 'surname':
             return 'Connor';
        }
    }
})
     
```
<a name="module_define-accessor2--module.exports+defineAccessor"></a>

#### module.exports.defineAccessor(obj, props, [options]) ⇒ <code>Object.&lt;PrivatePropKey&gt;</code>
Defines several accessors using hash map

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
**Returns**: <code>Object.&lt;PrivatePropKey&gt;</code> - object of private properties that refer to the defined accessors  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>Object</code> | target object |
| props | <code>Object.&lt;PropertyKey&gt;</code> | properties hash map |
| [options] | <code>Object</code> |  |
| [options.prefix] | <code>String</code> | add prefix for each property key of the returned object |

**Example**  
```js
const {_name, _surname}= defineAccessor(obj, {
    name: {
        get(){
            return 'John';
        }
    },

    surname: {
        get(){
            return 'Connor';
        }
    }
}, {
    prefix: '_'
})
```
<a name="module_define-accessor2--module.exports+flushAccessor"></a>

#### module.exports.flushAccessor(obj, ...props) ⇒ <code>boolean</code>
flush accessor's cache

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
**Returns**: <code>boolean</code> - true if flushed successfully  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>Object</code> | target object |
| ...props | <code>PropertyKey</code> | public accessor's key |

**Example**  
```js
defineAccessor(obj, "hash", {
    get(){
        return calcObjectSHA(this);
    }
})
flushAccessor(obj, 'hash')
```
<a name="module_define-accessor2--module.exports+privateSymbol"></a>

#### module.exports.privateSymbol(obj, prop) ⇒ <code>Symbol</code> \| <code>null</code>
retrieve the private accessor symbol assigned to the accessor

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  

| Param | Type |
| --- | --- |
| obj | <code>Object</code> | 
| prop | <code>PropertyKey</code> | 

<a name="module_define-accessor2--module.exports+defineValidator"></a>

#### module.exports.defineValidator(name, fn) ⇒ <code>this</code>
Defines a new validator in the current library context

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | validator's name |
| fn | <code>ValidatorPredicate</code> | validator predicate function |

**Example**  
```js
const validator = require('validator');
defineValidator('email', validator.isEmail);
     
```
<a name="module_define-accessor2--module.exports+defineValidator"></a>

#### module.exports.defineValidator(validators)
Defines a new validator in the current library context

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  

| Param | Type |
| --- | --- |
| validators | <code>Object</code> | 

**Example**  
```js
const validator = require('validator');
defineValidator({
 email: validator.isEmail,
 ip: validator.isIP
});
```
<a name="module_define-accessor2--module.exports+newContext"></a>

#### module.exports.newContext() ⇒ <code>Context</code>
creates a new library context

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
**Example**  
```js
const {defineAccessor, flushAccessor, defineValidator}= require('define-accessor2').newContext()
//define custom validators for the current and inherited from the current contexts only
defineValidator({
    even: (value)=> typeof value && value % 2===0,
    odd: (value)=> typeof value && Math.abs(value % 2)===1,
});
```
<a name="module_define-accessor2--module.exports+accessor"></a>

#### module.exports.accessor(accessorDescriptor) ⇒ <code>MethodDecorator</code>
accessor decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
**Example&#x60;&#x60;&#x60;&#x60;**: class Person{
    @accessor({
        set: (value)=> value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
    })
    fullName='';

    firstName= 'John';
    lastName= 'John Doe';
}````  

| Param |
| --- |
| accessorDescriptor | 

<a name="module_define-accessor2--module.exports+accessor"></a>

#### module.exports.accessor([get], [set], [accessorDescriptor]) ⇒ <code>MethodDecorator</code>
**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| [get] | <code>function</code> | getter function, can be omitted |
| [set] | <code>function</code> | setter function, can be omitted |
| [accessorDescriptor] | <code>AccessorDescriptor</code> | accessor descriptor |

**Example**  
```js
class Person{
    @accessor(null, (value)=> value.charAt(0).toUpperCase() + value.slice(1).toLowerCase())
    fullName='';

    firstName= 'John';
    lastName= 'John Doe';
}
```
<a name="module_define-accessor2--module.exports+lazy"></a>

#### module.exports.lazy() ⇒ <code>MethodDecorator</code>
lazy decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+cached"></a>

#### module.exports.cached() ⇒ <code>MethodDecorator</code>
cached decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+chains"></a>

#### module.exports.chains() ⇒ <code>MethodDecorator</code>
cached decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+type"></a>

#### module.exports.type(type) ⇒ <code>MethodDecorator</code>
type decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  

| Param | Type |
| --- | --- |
| type | <code>BasicType</code> | 

<a name="module_define-accessor2--module.exports+validate"></a>

#### module.exports.validate(validator) ⇒ <code>MethodDecorator</code>
validate decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  

| Param | Type |
| --- | --- |
| validator | <code>BasicType</code> | 

<a name="module_define-accessor2--module.exports+touches"></a>

#### module.exports.touches(props) ⇒ <code>MethodDecorator</code>
touches decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  

| Param | Type |
| --- | --- |
| props | <code>PropertyKey</code> \| <code>Array.&lt;PropertyKey&gt;</code> | 

<a name="module_define-accessor2--module.exports+undefined"></a>

#### module.exports.undefined() ⇒ <code>MethodDecorator</code>
Undefined decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+null"></a>

#### module.exports.null() ⇒ <code>MethodDecorator</code>
Null decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+boolean"></a>

#### module.exports.boolean() ⇒ <code>MethodDecorator</code>
Boolean decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+number"></a>

#### module.exports.number() ⇒ <code>MethodDecorator</code>
Number decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+string"></a>

#### module.exports.string() ⇒ <code>MethodDecorator</code>
string decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+function"></a>

#### module.exports.function() ⇒ <code>MethodDecorator</code>
Function decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+object"></a>

#### module.exports.object() ⇒ <code>MethodDecorator</code>
Object decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+symbol"></a>

#### module.exports.symbol() ⇒ <code>MethodDecorator</code>
Symbol decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+bigint"></a>

#### module.exports.bigint() ⇒ <code>MethodDecorator</code>
BigInt decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+integer"></a>

#### module.exports.integer() ⇒ <code>MethodDecorator</code>
Integer decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+infinity"></a>

#### module.exports.infinity() ⇒ <code>MethodDecorator</code>
Infinity decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+nan"></a>

#### module.exports.nan() ⇒ <code>MethodDecorator</code>
NaN decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+date"></a>

#### module.exports.date() ⇒ <code>MethodDecorator</code>
Date decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+promise"></a>

#### module.exports.promise() ⇒ <code>MethodDecorator</code>
Promise decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+regexp"></a>

#### module.exports.regexp() ⇒ <code>MethodDecorator</code>
RegExp decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+error"></a>

#### module.exports.error() ⇒ <code>MethodDecorator</code>
Error decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+set"></a>

#### module.exports.set() ⇒ <code>MethodDecorator</code>
Set decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports+map"></a>

#### module.exports.map() ⇒ <code>MethodDecorator</code>
Map decorator

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports..Context"></a>

#### module.exports~Context
Library context class

**Kind**: inner class of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports..SetterFunction"></a>

#### module.exports~SetterFunction ⇒ <code>any</code>
**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
**Returns**: <code>any</code> - value to store in the private property  

| Param | Type | Description |
| --- | --- | --- |
| newValue | <code>any</code> | new value to set |
| currentValue | <code>any</code> | current private value |
| propKey | <code>PropertyKey</code> | public property key |
| privateKey | <code>PrivatePropKey</code> | private property key |

<a name="module_define-accessor2--module.exports..GetterFunction"></a>

#### module.exports~GetterFunction ⇒ <code>any</code>
**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| currentValue | <code>any</code> | current private value |
| propKey | <code>PropertyKey</code> | public property key |

<a name="module_define-accessor2--module.exports..ValidateFunction"></a>

#### module.exports~ValidateFunction ⇒ <code>Boolean</code>
**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
**Throws**:

- Error


| Param | Type | Description |
| --- | --- | --- |
| value | <code>any</code> | value to validate |
| propKey | <code>PropertyKey</code> | public property key |

<a name="module_define-accessor2--module.exports..PropertyKey"></a>

#### module.exports~PropertyKey : <code>String</code> \| <code>Symbol</code>
**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports..PrivatePropKey"></a>

#### module.exports~PrivatePropKey : <code>Symbol</code>
**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports..AccessorDescriptor"></a>

#### module.exports~AccessorDescriptor : <code>Object</code>
Accessor's descriptor.

**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [get] | <code>GetterFunction</code> | <code></code> | getter function |
| [set] | <code>SetterFunction</code> | <code></code> | setter function |
| [writable] | <code>Boolean</code> | <code>false</code> | if setter is not present indicates whether accessor's value can be set |
| [enumerable] | <code>Boolean</code> | <code>false</code> |  |
| [configurable] | <code>Boolean</code> | <code>false</code> |  |
| [cached] | <code>Boolean</code> | <code>false</code> | cache getter result until it will be flushed by flushAccessor or other related accessor |
| [lazy] | <code>Boolean</code> | <code>false</code> | indicates whether the accessor should be a lazy computing property |
| [virtual] | <code>Boolean</code> | <code>false</code> | if true a private property is not created |
| [chains] | <code>Boolean</code> | <code>false</code> | create get/set chains for property (like getPropName()/setPropName(value)) |
| [touches] | <code>PropertyKey</code> \| <code>Array.&lt;PropertyKey&gt;</code> | <code></code> | a key of accessor whose value depends on this |
| [type] | <code>BasicType</code> | <code></code> | built-type |
| [validate] | <code>ValidateFunction</code> | <code></code> | validator function |
| [value] | <code>\*</code> |  | value to set after initialization |

<a name="module_define-accessor2--module.exports..ValidatorPredicate"></a>

#### module.exports~ValidatorPredicate ⇒ <code>Boolean</code>
**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>any</code> | value to test |

<a name="module_define-accessor2--module.exports..BasicType"></a>

#### module.exports~BasicType : <code>Number</code> \| <code>String</code>
Basic type.

**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports..AssertionFunction"></a>

#### module.exports~AssertionFunction ⇒ <code>Boolean</code>
**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
**Returns**: <code>Boolean</code> - false if test failed  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>Any</code> | value to test |


## Built-in types
The library's type system consist of native JS types and extended pseudotypes.
The following types do not overlap, unlike native javascript types.
For example, null is not an object, NaN is not a number, and so on.
- Undefined (TYPE_UNDEFINED)
- Null (TYPE_NULL)
- Boolean (TYPE_BOOLEAN)
- Number (TYPE_NUMBER)
- String (TYPE_STRING)
- Function (TYPE_FUNCTION)
- Object (TYPE_OBJECT)
- Symbol (TYPE_SYMBOL)
- BigInt (TYPE_BIGINT)
- Array (TYPE_ARRAY)
- Infinity (TYPE_INFINITY)
- NaN (TYPE_NAN)
- Date (TYPE_DATE)
- Promise (TYPE_PROMISE)
- RegExp (TYPE_REGEXP)
- Error (TYPE_ERROR)
- Set (TYPE_SET)
- Map (TYPE_MAP)

An exception is the integer pseudotype which is an integer and a number types.
- Integer (TYPE_INTEGER)

Special type:
- Any (TYPE_ANY)

*There are predicates for each type named like isUndefined(value), isNumber(value) etc.*

You can combine these types:
type: 'string|number' // strings
or
type: TYPE_STRING|TYPE_NUMBER //bit mask
or
type: string|number // decorators converted to a type bit mask with the valueOf() method

### Decorators
The library supports both versions of the decorators specification (legacy & current draft).
There are following decorators:
- lazy
- cached
- touches
- type
- validate
- accessor
- and decorators for each basic type (string, number, array etc. see [Built-in types](#built-in-types))
Each decorator has valueOf method that returns a type bit mask, so it's possible to pass decorators as a type:
@type(number|string)

## Contribution
Feel free to fork, open issues, enhance or create pull requests.
## License

The MIT License
Copyright (c) 2019 Dmitriy Mozgovoy <robotshara@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
