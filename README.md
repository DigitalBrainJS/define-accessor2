# define-accessor2
[![Build Status](https://travis-ci.com/DigitalBrainJS/define-accessor2.svg?branch=master)](https://travis-ci.com/DigitalBrainJS/define-accessor2)
[![](https://badgen.net/npm/license/define-accessor2)](https://unpkg.com/define-accessor2/dist/define-accessor2.umd.js)
[![Coverage Status](https://coveralls.io/repos/github/DigitalBrainJS/define-accessor2/badge.svg?branch=master)](https://coveralls.io/github/DigitalBrainJS/define-accessor2?branch=master)
[![](https://badgen.net/github/issues/DigitalBrainJS/define-accessor2)](https://github.com/DigitalBrainJS/define-accessor2/issues)
[![](https://badgen.net/github/stars/DigitalBrainJS/define-accessor2)](https://github.com/DigitalBrainJS/define-accessor2/stargazers)

:star: An extended version of Object.defineProperty function. Define feature-rich properties for your objects :star:

# Features
- lazy properties
- cached properties - cache the value returned by the getter. Cached value can be flushed later
- validation handler
- Joi validation out of the box
- built-in basic type system
- automatically flushes getter cache after changing related properties
- defining custom validators
- creating isolated contexts to define validators in a local scope
- chaining methods - can create chaining methods like get**PropName** and set**PropName**

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

## Usage examples
````javascript
     const {defineAccessor, TYPE_NUMBER, TYPE_STRING}= require('define-accessor2');
     const obj= {};

     defineAccessor(obj, 'someProp', {
         type: 'string|number'
      });
      //or using bit mask
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
     //import library and create new context for local validator definition
     const {defineAccessor, defineValidator}= require('define-accessor2').newContext();
     const validator= require('validator');
     const model= {};

    defineValidator({
        mongoId: validator.isMongoId
    });

    defineAccessor(model, 'id', {
        validate: 'mongoId'
    });

    model.age= 30; //ok, now age= 30
    model.age= 150; //ValidationError: value (150) is not valid for property (age). Reason: "value" must be less than or equal to 100
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
        validate(value, {reject}){
            typeof value!=='string' && reject('must be a string');
            value= value.trim();
            !/^[a-zA-Z]+$/.test(value) && reject('only a-zA-Z allowed');
            value.length<=3 && reject('length should be greater than 3');
            return value;
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
            * [.flushAccessor(obj, prop)](#module_define-accessor2--module.exports+flushAccessor) ⇒ <code>boolean</code>
            * [.defineValidator(name, fn)](#module_define-accessor2--module.exports+defineValidator) ⇒ <code>this</code>
            * [.defineValidator(validators)](#module_define-accessor2--module.exports+defineValidator)
            * [.newContext()](#module_define-accessor2--module.exports+newContext) ⇒ <code>Context</code>
        * _inner_
            * [~Context](#module_define-accessor2--module.exports..Context)
            * [~resolvePredicate(type)](#module_define-accessor2--module.exports..resolvePredicate) ⇒ <code>AssertionFunction</code>
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
The default library context. Call context.newContext() toreturn a new context inherited from the current context.This allows you to create an isolated library scope, which does not affect any others in case of defining a custom validator.

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
defineAccessor(obj, "age", {    get(){        return 99;    }})
     
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
defineAccessor(obj, ["name", "surname"], {    get(privateValue, propKey){        switch(propKey){            case 'name':             return 'John';            case 'surname':             return 'Connor';        }    }})
     
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
| [options.prefix] | <code>String</code> | add prefix for each property key of the returning object |

**Example**  
```js
const {_name, _surname}= defineAccessor(obj, {    name: {        get(){            return 'John';        }    },    surname: {        get(){            return 'Connor';        }    }}, {    prefix: '_'})
```
<a name="module_define-accessor2--module.exports+flushAccessor"></a>

#### module.exports.flushAccessor(obj, prop) ⇒ <code>boolean</code>
flush accessor's cache

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
**Returns**: <code>boolean</code> - true if flushed successfully  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>Object</code> | target object |
| prop | <code>PropertyKey</code> | public accessor's key |

**Example**  
```js
defineAccessor(obj, "hash", {    get(){        return calcObjectSHA(this);    }})flushAccessor(obj, 'hash')
```
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
const validator = require('validator');defineValidator('email', validator.isEmail);
     
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
const validator = require('validator');defineValidator({ email: validator.isEmail, ip: validator.isIP});
```
<a name="module_define-accessor2--module.exports+newContext"></a>

#### module.exports.newContext() ⇒ <code>Context</code>
creates a new library context

**Kind**: instance method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
**Example**  
```js
const {defineAccessor, flushAccessor}= require('define-accessor2').newContext()//define custom validators for the current and inherited from the current contexts onlydefineValidator({    even: (value)=> typeof value && value % 2===0,    odd: (value)=> typeof value && Math.abs(value % 2)===1,});
```
<a name="module_define-accessor2--module.exports..Context"></a>

#### module.exports~Context
Library context class

**Kind**: inner class of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
<a name="module_define-accessor2--module.exports..resolvePredicate"></a>

#### module.exports~resolvePredicate(type) ⇒ <code>AssertionFunction</code>
resolve predicate for type

**Kind**: inner method of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
**Returns**: <code>AssertionFunction</code> - assertion function  

| Param | Type |
| --- | --- |
| type | <code>BasicType</code> | 

<a name="module_define-accessor2--module.exports..SetterFunction"></a>

#### module.exports~SetterFunction ⇒ <code>any</code>
**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_define-accessor2--module.exports)  
**Returns**: <code>any</code> - value to store in the private property  

| Param | Type | Description |
| --- | --- | --- |
| newValue | <code>any</code> | new value to set |
| currentValue | <code>any</code> | current private value |
| propKey | <code>PropertyKey</code> | public property key |

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

There are predicates for each type named like isUndefined(value), isNumber(value) etc.

## Contribution
Feel free to fork, open issues, enhance or create pull requests.
## License

The MIT License
Copyright (c) 2019 Dmitriy Mozgovoy <robotshara@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
