/* Polyfill service v3.104.0
 * For detailed credits and licence information see https://github.com/financial-times/polyfill-service.
 * 
 * Features requested: HTMLTemplateElement
 * 
 * - _ESAbstract.Call, License: CC0 (required by "HTMLTemplateElement", "Object.getOwnPropertyDescriptor", "_ESAbstract.ToPropertyKey", "_ESAbstract.ToPrimitive", "_ESAbstract.OrdinaryToPrimitive")
 * - _ESAbstract.CreateMethodProperty, License: CC0 (required by "HTMLTemplateElement", "Event", "Array.prototype.includes")
 * - _ESAbstract.Get, License: CC0 (required by "HTMLTemplateElement", "Object.getOwnPropertyDescriptor", "_ESAbstract.ToPropertyKey", "_ESAbstract.ToPrimitive", "_ESAbstract.OrdinaryToPrimitive")
 * - _ESAbstract.HasOwnProperty, License: CC0 (required by "HTMLTemplateElement", "Object.getOwnPropertyDescriptor")
 * - _ESAbstract.IsCallable, License: CC0 (required by "HTMLTemplateElement", "Object.getOwnPropertyDescriptor", "_ESAbstract.ToPropertyKey", "_ESAbstract.ToPrimitive", "_ESAbstract.OrdinaryToPrimitive")
 * - _ESAbstract.SameValueNonNumber, License: CC0 (required by "HTMLTemplateElement", "Event", "Array.prototype.includes", "_ESAbstract.SameValueZero")
 * - _ESAbstract.ToObject, License: CC0 (required by "HTMLTemplateElement", "Object.getOwnPropertyDescriptor", "_ESAbstract.ToPropertyKey", "_ESAbstract.ToPrimitive", "_ESAbstract.GetMethod", "_ESAbstract.GetV")
 * - _ESAbstract.GetV, License: CC0 (required by "HTMLTemplateElement", "Object.getOwnPropertyDescriptor", "_ESAbstract.ToPropertyKey", "_ESAbstract.ToPrimitive", "_ESAbstract.GetMethod")
 * - _ESAbstract.GetMethod, License: CC0 (required by "HTMLTemplateElement", "Object.getOwnPropertyDescriptor", "_ESAbstract.ToPropertyKey", "_ESAbstract.ToPrimitive")
 * - _ESAbstract.Type, License: CC0 (required by "HTMLTemplateElement", "Object.getOwnPropertyDescriptor", "_ESAbstract.ToPropertyKey", "_ESAbstract.ToPrimitive", "_ESAbstract.OrdinaryToPrimitive")
 * - _ESAbstract.OrdinaryToPrimitive, License: CC0 (required by "HTMLTemplateElement", "Object.getOwnPropertyDescriptor", "_ESAbstract.ToPropertyKey", "_ESAbstract.ToPrimitive")
 * - _ESAbstract.SameValueZero, License: CC0 (required by "HTMLTemplateElement", "Event", "Array.prototype.includes")
 * - _ESAbstract.ToInteger, License: CC0 (required by "HTMLTemplateElement", "Event", "Array.prototype.includes", "_ESAbstract.ToLength")
 * - _ESAbstract.ToLength, License: CC0 (required by "HTMLTemplateElement", "Event", "Array.prototype.includes")
 * - _ESAbstract.ToPrimitive, License: CC0 (required by "HTMLTemplateElement", "Event", "Array.prototype.includes", "_ESAbstract.ToString")
 * - _ESAbstract.ToString, License: CC0 (required by "HTMLTemplateElement", "Event", "Array.prototype.includes")
 * - _ESAbstract.ToPropertyKey, License: CC0 (required by "HTMLTemplateElement", "Object.getOwnPropertyDescriptor")
 * - Array.prototype.includes, License: MIT (required by "HTMLTemplateElement", "Event")
 * - DocumentFragment, License: CC0 (required by "HTMLTemplateElement")
 * - Event, License: CC0 (required by "HTMLTemplateElement")
 * - Object.getOwnPropertyDescriptor, License: CC0 (required by "HTMLTemplateElement")
 * - HTMLTemplateElement, License: BSD-3-Clause */

( function ( self, undefined ) {

    // _ESAbstract.Call
    /* global IsCallable */
    // 7.3.12. Call ( F, V [ , argumentsList ] )
    function Call( F, V /* [, argumentsList] */ ) { // eslint-disable-line no-unused-vars
        // 1. If argumentsList is not present, set argumentsList to a new empty List.
        var argumentsList = arguments.length > 2 ? arguments[2] : [];
        // 2. If IsCallable(F) is false, throw a TypeError exception.
        if ( IsCallable( F ) === false ) {
            throw new TypeError( Object.prototype.toString.call( F ) + 'is not a function.' );
        }
        // 3. Return ? F.[[Call]](V, argumentsList).
        return F.apply( V, argumentsList );
    }

    // _ESAbstract.CreateMethodProperty
    // 7.3.5. CreateMethodProperty ( O, P, V )
    function CreateMethodProperty( O, P, V ) { // eslint-disable-line no-unused-vars
        // 1. Assert: Type(O) is Object.
        // 2. Assert: IsPropertyKey(P) is true.
        // 3. Let newDesc be the PropertyDescriptor{[[Value]]: V, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: true}.
        var newDesc = {
            value: V,
            writable: true,
            enumerable: false,
            configurable: true
        };
        // 4. Return ? O.[[DefineOwnProperty]](P, newDesc).
        Object.defineProperty( O, P, newDesc );
    }

    // _ESAbstract.Get
    // 7.3.1. Get ( O, P )
    function Get( O, P ) { // eslint-disable-line no-unused-vars
        // 1. Assert: Type(O) is Object.
        // 2. Assert: IsPropertyKey(P) is true.
        // 3. Return ? O.[[Get]](P, O).
        return O[P];
    }

    // _ESAbstract.HasOwnProperty
    // 7.3.11 HasOwnProperty (O, P)
    function HasOwnProperty( o, p ) { // eslint-disable-line no-unused-vars
        // 1. Assert: Type(O) is Object.
        // 2. Assert: IsPropertyKey(P) is true.
        // 3. Let desc be ? O.[[GetOwnProperty]](P).
        // 4. If desc is undefined, return false.
        // 5. Return true.
        // Polyfill.io - As we expect user agents to support ES3 fully we can skip the above steps and use Object.prototype.hasOwnProperty to do them for us.
        return Object.prototype.hasOwnProperty.call( o, p );
    }

    // _ESAbstract.IsCallable
    // 7.2.3. IsCallable ( argument )
    function IsCallable( argument ) { // eslint-disable-line no-unused-vars
        // 1. If Type(argument) is not Object, return false.
        // 2. If argument has a [[Call]] internal method, return true.
        // 3. Return false.

        // Polyfill.io - Only function objects have a [[Call]] internal method. This means we can simplify this function to check that the argument has a type of function.
        return typeof argument === 'function';
    }

    // _ESAbstract.SameValueNonNumber
    // 7.2.12. SameValueNonNumber ( x, y )
    function SameValueNonNumber( x, y ) { // eslint-disable-line no-unused-vars
        // 1. Assert: Type(x) is not Number.
        // 2. Assert: Type(x) is the same as Type(y).
        // 3. If Type(x) is Undefined, return true.
        // 4. If Type(x) is Null, return true.
        // 5. If Type(x) is String, then
        // a. If x and y are exactly the same sequence of code units (same length and same code units at corresponding indices), return true; otherwise, return false.
        // 6. If Type(x) is Boolean, then
        // a. If x and y are both true or both false, return true; otherwise, return false.
        // 7. If Type(x) is Symbol, then
        // a. If x and y are both the same Symbol value, return true; otherwise, return false.
        // 8. If x and y are the same Object value, return true. Otherwise, return false.

        // Polyfill.io - We can skip all above steps because the === operator does it all for us.
        return x === y;
    }

    // _ESAbstract.ToObject
    // 7.1.13 ToObject ( argument )
    // The abstract operation ToObject converts argument to a value of type Object according to Table 12:
    // Table 12: ToObject Conversions
    /*
    |----------------------------------------------------------------------------------------------------------------------------------------------------|
    | Argument Type | Result                                                                                                                             |
    |----------------------------------------------------------------------------------------------------------------------------------------------------|
    | Undefined     | Throw a TypeError exception.                                                                                                       |
    | Null          | Throw a TypeError exception.                                                                                                       |
    | Boolean       | Return a new Boolean object whose [[BooleanData]] internal slot is set to argument. See 19.3 for a description of Boolean objects. |
    | Number        | Return a new Number object whose [[NumberData]] internal slot is set to argument. See 20.1 for a description of Number objects.    |
    | String        | Return a new String object whose [[StringData]] internal slot is set to argument. See 21.1 for a description of String objects.    |
    | Symbol        | Return a new Symbol object whose [[SymbolData]] internal slot is set to argument. See 19.4 for a description of Symbol objects.    |
    | Object        | Return argument.                                                                                                                   |
    |----------------------------------------------------------------------------------------------------------------------------------------------------|
    */
    function ToObject( argument ) { // eslint-disable-line no-unused-vars
        if ( argument === null || argument === undefined ) {
            throw TypeError();
        }
        return Object( argument );
    }

    // _ESAbstract.GetV
    /* global ToObject */
    // 7.3.2 GetV (V, P)
    function GetV( v, p ) { // eslint-disable-line no-unused-vars
        // 1. Assert: IsPropertyKey(P) is true.
        // 2. Let O be ? ToObject(V).
        var o = ToObject( v );
        // 3. Return ? O.[[Get]](P, V).
        return o[p];
    }

    // _ESAbstract.GetMethod
    /* global GetV, IsCallable */
    // 7.3.9. GetMethod ( V, P )
    function GetMethod( V, P ) { // eslint-disable-line no-unused-vars
        // 1. Assert: IsPropertyKey(P) is true.
        // 2. Let func be ? GetV(V, P).
        var func = GetV( V, P );
        // 3. If func is either undefined or null, return undefined.
        if ( func === null || func === undefined ) {
            return undefined;
        }
        // 4. If IsCallable(func) is false, throw a TypeError exception.
        if ( IsCallable( func ) === false ) {
            throw new TypeError( 'Method not callable: ' + P );
        }
        // 5. Return func.
        return func;
    }

    // _ESAbstract.Type
    // "Type(x)" is used as shorthand for "the type of x"...
    function Type( x ) { // eslint-disable-line no-unused-vars
        switch ( typeof x ) {
            case 'undefined':
                return 'undefined';
            case 'boolean':
                return 'boolean';
            case 'number':
                return 'number';
            case 'string':
                return 'string';
            case 'symbol':
                return 'symbol';
            default:
                // typeof null is 'object'
                if ( x === null ) return 'null';
                // Polyfill.io - This is here because a Symbol polyfill will have a typeof `object`.
                if ( 'Symbol' in self && ( x instanceof self.Symbol || x.constructor === self.Symbol ) ) return 'symbol';

                return 'object';
        }
    }

    // _ESAbstract.OrdinaryToPrimitive
    /* global Get, IsCallable, Call, Type */
    // 7.1.1.1. OrdinaryToPrimitive ( O, hint )
    function OrdinaryToPrimitive( O, hint ) { // eslint-disable-line no-unused-vars
        // 1. Assert: Type(O) is Object.
        // 2. Assert: Type(hint) is String and its value is either "string" or "number".
        // 3. If hint is "string", then
        if ( hint === 'string' ) {
            // a. Let methodNames be « "toString", "valueOf" ».
            var methodNames = ['toString', 'valueOf'];
            // 4. Else,
        } else {
            // a. Let methodNames be « "valueOf", "toString" ».
            methodNames = ['valueOf', 'toString'];
        }
        // 5. For each name in methodNames in List order, do
        for ( var i = 0; i < methodNames.length; ++i ) {
            var name = methodNames[i];
            // a. Let method be ? Get(O, name).
            var method = Get( O, name );
            // b. If IsCallable(method) is true, then
            if ( IsCallable( method ) ) {
                // i. Let result be ? Call(method, O).
                var result = Call( method, O );
                // ii. If Type(result) is not Object, return result.
                if ( Type( result ) !== 'object' ) {
                    return result;
                }
            }
        }
        // 6. Throw a TypeError exception.
        throw new TypeError( 'Cannot convert to primitive.' );
    }

    // _ESAbstract.SameValueZero
    /* global Type, SameValueNonNumber */
    // 7.2.11. SameValueZero ( x, y )
    function SameValueZero( x, y ) { // eslint-disable-line no-unused-vars
        // 1. If Type(x) is different from Type(y), return false.
        if ( Type( x ) !== Type( y ) ) {
            return false;
        }
        // 2. If Type(x) is Number, then
        if ( Type( x ) === 'number' ) {
            // a. If x is NaN and y is NaN, return true.
            if ( isNaN( x ) && isNaN( y ) ) {
                return true;
            }
            // b. If x is +0 and y is -0, return true.
            if ( 1 / x === Infinity && 1 / y === -Infinity ) {
                return true;
            }
            // c. If x is -0 and y is +0, return true.
            if ( 1 / x === -Infinity && 1 / y === Infinity ) {
                return true;
            }
            // d. If x is the same Number value as y, return true.
            if ( x === y ) {
                return true;
            }
            // e. Return false.
            return false;
        }
        // 3. Return SameValueNonNumber(x, y).
        return SameValueNonNumber( x, y );
    }

    // _ESAbstract.ToInteger
    /* global Type */
    // 7.1.4. ToInteger ( argument )
    function ToInteger( argument ) { // eslint-disable-line no-unused-vars
        if ( Type( argument ) === 'symbol' ) {
            throw new TypeError( 'Cannot convert a Symbol value to a number' );
        }

        // 1. Let number be ? ToNumber(argument).
        var number = Number( argument );
        // 2. If number is NaN, return +0.
        if ( isNaN( number ) ) {
            return 0;
        }
        // 3. If number is +0, -0, +∞, or -∞, return number.
        if ( 1 / number === Infinity || 1 / number === -Infinity || number === Infinity || number === -Infinity ) {
            return number;
        }
        // 4. Return the number value that is the same sign as number and whose magnitude is floor(abs(number)).
        return ( ( number < 0 ) ? -1 : 1 ) * Math.floor( Math.abs( number ) );
    }

    // _ESAbstract.ToLength
    /* global ToInteger */
    // 7.1.15. ToLength ( argument )
    function ToLength( argument ) { // eslint-disable-line no-unused-vars
        // 1. Let len be ? ToInteger(argument).
        var len = ToInteger( argument );
        // 2. If len ≤ +0, return +0.
        if ( len <= 0 ) {
            return 0;
        }
        // 3. Return min(len, 253-1).
        return Math.min( len, Math.pow( 2, 53 ) - 1 );
    }

    // _ESAbstract.ToPrimitive
    /* global Type, GetMethod, Call, OrdinaryToPrimitive */
    // 7.1.1. ToPrimitive ( input [ , PreferredType ] )
    function ToPrimitive( input /* [, PreferredType] */ ) { // eslint-disable-line no-unused-vars
        var PreferredType = arguments.length > 1 ? arguments[1] : undefined;
        // 1. Assert: input is an ECMAScript language value.
        // 2. If Type(input) is Object, then
        if ( Type( input ) === 'object' ) {
            // a. If PreferredType is not present, let hint be "default".
            if ( arguments.length < 2 ) {
                var hint = 'default';
                // b. Else if PreferredType is hint String, let hint be "string".
            } else if ( PreferredType === String ) {
                hint = 'string';
                // c. Else PreferredType is hint Number, let hint be "number".
            } else if ( PreferredType === Number ) {
                hint = 'number';
            }
            // d. Let exoticToPrim be ? GetMethod(input, @@toPrimitive).
            var exoticToPrim = typeof self.Symbol === 'function' && typeof self.Symbol.toPrimitive === 'symbol' ? GetMethod( input, self.Symbol.toPrimitive ) : undefined;
            // e. If exoticToPrim is not undefined, then
            if ( exoticToPrim !== undefined ) {
                // i. Let result be ? Call(exoticToPrim, input, « hint »).
                var result = Call( exoticToPrim, input, [hint] );
                // ii. If Type(result) is not Object, return result.
                if ( Type( result ) !== 'object' ) {
                    return result;
                }
                // iii. Throw a TypeError exception.
                throw new TypeError( 'Cannot convert exotic object to primitive.' );
            }
            // f. If hint is "default", set hint to "number".
            if ( hint === 'default' ) {
                hint = 'number';
            }
            // g. Return ? OrdinaryToPrimitive(input, hint).
            return OrdinaryToPrimitive( input, hint );
        }
        // 3. Return input
        return input;
    }
    // _ESAbstract.ToString
    /* global Type, ToPrimitive */
    // 7.1.12. ToString ( argument )
    // The abstract operation ToString converts argument to a value of type String according to Table 11:
    // Table 11: ToString Conversions
    /*
    |---------------|--------------------------------------------------------|
    | Argument Type | Result                                                 |
    |---------------|--------------------------------------------------------|
    | Undefined     | Return "undefined".                                    |
    |---------------|--------------------------------------------------------|
    | Null	        | Return "null".                                         |
    |---------------|--------------------------------------------------------|
    | Boolean       | If argument is true, return "true".                    |
    |               | If argument is false, return "false".                  |
    |---------------|--------------------------------------------------------|
    | Number        | Return NumberToString(argument).                       |
    |---------------|--------------------------------------------------------|
    | String        | Return argument.                                       |
    |---------------|--------------------------------------------------------|
    | Symbol        | Throw a TypeError exception.                           |
    |---------------|--------------------------------------------------------|
    | Object        | Apply the following steps:                             |
    |               | Let primValue be ? ToPrimitive(argument, hint String). |
    |               | Return ? ToString(primValue).                          |
    |---------------|--------------------------------------------------------|
    */
    function ToString( argument ) { // eslint-disable-line no-unused-vars
        switch ( Type( argument ) ) {
            case 'symbol':
                throw new TypeError( 'Cannot convert a Symbol value to a string' );
            case 'object':
                var primValue = ToPrimitive( argument, String );
                return ToString( primValue ); // eslint-disable-line no-unused-vars
            default:
                return String( argument );
        }
    }

    // _ESAbstract.ToPropertyKey
    /* globals ToPrimitive, Type, ToString */
    // 7.1.14. ToPropertyKey ( argument )
    function ToPropertyKey( argument ) { // eslint-disable-line no-unused-vars
        // 1. Let key be ? ToPrimitive(argument, hint String).
        var key = ToPrimitive( argument, String );
        // 2. If Type(key) is Symbol, then
        if ( Type( key ) === 'symbol' ) {
            // a. Return key.
            return key;
        }
        // 3. Return ! ToString(key).
        return ToString( key );
    }

    // Array.prototype.includes
    /* global CreateMethodProperty, Get, SameValueZero, ToInteger, ToLength, ToObject, ToString */
    // 22.1.3.11. Array.prototype.includes ( searchElement [ , fromIndex ] )
    CreateMethodProperty( Array.prototype, 'includes', function includes( searchElement /* [ , fromIndex ] */ ) {
        'use strict';
        // 1. Let O be ? ToObject(this value).
        var O = ToObject( this );
        // 2. Let len be ? ToLength(? Get(O, "length")).
        var len = ToLength( Get( O, "length" ) );
        // 3. If len is 0, return false.
        if ( len === 0 ) {
            return false;
        }
        // 4. Let n be ? ToInteger(fromIndex). (If fromIndex is undefined, this step produces the value 0.)
        var n = ToInteger( arguments[1] );
        // 5. If n ≥ 0, then
        if ( n >= 0 ) {
            // a. Let k be n.
            var k = n;
            // 6. Else n < 0,
        } else {
            // a. Let k be len + n.
            k = len + n;
            // b. If k < 0, let k be 0.
            if ( k < 0 ) {
                k = 0;
            }
        }
        // 7. Repeat, while k < len
        while ( k < len ) {
            // a. Let elementK be the result of ? Get(O, ! ToString(k)).
            var elementK = Get( O, ToString( k ) );
            // b. If SameValueZero(searchElement, elementK) is true, return true.
            if ( SameValueZero( searchElement, elementK ) ) {
                return true;
            }
            // c. Increase k by 1.
            k = k + 1;
        }
        // 8. Return false.
        return false;
    } );

    // DocumentFragment
    ( function ( global ) {
        global.DocumentFragment = function DocumentFragment() {
            return document.createDocumentFragment();
        };

        var fragment = document.createDocumentFragment();
        global.DocumentFragment.prototype = Object.create( fragment.constructor.prototype )
    }( self ) );

    // Event
    ( function () {
        var unlistenableWindowEvents = {
            click: 1,
            dblclick: 1,
            keyup: 1,
            keypress: 1,
            keydown: 1,
            mousedown: 1,
            mouseup: 1,
            mousemove: 1,
            mouseover: 1,
            mouseenter: 1,
            mouseleave: 1,
            mouseout: 1,
            storage: 1,
            storagecommit: 1,
            textinput: 1
        };

        // This polyfill depends on availability of `document` so will not run in a worker
        // However, we asssume there are no browsers with worker support that lack proper
        // support for `Event` within the worker
        if ( typeof document === 'undefined' || typeof window === 'undefined' ) return;

        var existingProto = ( window.Event && window.Event.prototype ) || null;
        function Event( type, eventInitDict ) {
            if ( !type ) {
                throw new Error( 'Not enough arguments' );
            }

            var event;
            // Shortcut if browser supports createEvent
            if ( 'createEvent' in document ) {
                event = document.createEvent( 'Event' );
                var bubbles = eventInitDict && eventInitDict.bubbles !== undefined ? eventInitDict.bubbles : false;
                var cancelable = eventInitDict && eventInitDict.cancelable !== undefined ? eventInitDict.cancelable : false;

                event.initEvent( type, bubbles, cancelable );

                return event;
            }

            event = document.createEventObject();

            event.type = type;
            event.bubbles = eventInitDict && eventInitDict.bubbles !== undefined ? eventInitDict.bubbles : false;
            event.cancelable = eventInitDict && eventInitDict.cancelable !== undefined ? eventInitDict.cancelable : false;

            return event;
        }
        Event.NONE = 0;
        Event.CAPTURING_PHASE = 1;
        Event.AT_TARGET = 2;
        Event.BUBBLING_PHASE = 3;
        window.Event = Window.prototype.Event = Event;
        if ( existingProto ) {
            Object.defineProperty( window.Event, 'prototype', {
                configurable: false,
                enumerable: false,
                writable: true,
                value: existingProto
            } );
        }

        if ( !( 'createEvent' in document ) ) {
            window.addEventListener = Window.prototype.addEventListener = Document.prototype.addEventListener = Element.prototype.addEventListener = function addEventListener() {
                var
                    element = this,
                    type = arguments[0],
                    listener = arguments[1];

                if ( element === window && type in unlistenableWindowEvents ) {
                    throw new Error( 'In IE8 the event: ' + type + ' is not available on the window object. Please see https://github.com/Financial-Times/polyfill-service/issues/317 for more information.' );
                }

                if ( !element._events ) {
                    element._events = {};
                }

                if ( !element._events[type] ) {
                    element._events[type] = function ( event ) {
                        var
                            list = element._events[event.type].list,
                            events = list.slice(),
                            index = -1,
                            length = events.length,
                            eventElement;

                        event.preventDefault = function preventDefault() {
                            if ( event.cancelable !== false ) {
                                event.returnValue = false;
                            }
                        };

                        event.stopPropagation = function stopPropagation() {
                            event.cancelBubble = true;
                        };

                        event.stopImmediatePropagation = function stopImmediatePropagation() {
                            event.cancelBubble = true;
                            event.cancelImmediate = true;
                        };

                        event.currentTarget = element;
                        event.relatedTarget = event.fromElement || null;
                        event.target = event.target || event.srcElement || element;
                        event.timeStamp = new Date().getTime();

                        if ( event.clientX ) {
                            event.pageX = event.clientX + document.documentElement.scrollLeft;
                            event.pageY = event.clientY + document.documentElement.scrollTop;
                        }

                        while ( ++index < length && !event.cancelImmediate ) {
                            if ( index in events ) {
                                eventElement = events[index];

                                if ( list.includes( eventElement ) && typeof eventElement === 'function' ) {
                                    eventElement.call( element, event );
                                }
                            }
                        }
                    };

                    element._events[type].list = [];

                    if ( element.attachEvent ) {
                        element.attachEvent( 'on' + type, element._events[type] );
                    }
                }

                element._events[type].list.push( listener );
            };

            window.removeEventListener = Window.prototype.removeEventListener = Document.prototype.removeEventListener = Element.prototype.removeEventListener = function removeEventListener() {
                var
                    element = this,
                    type = arguments[0],
                    listener = arguments[1],
                    index;

                if ( element._events && element._events[type] && element._events[type].list ) {
                    index = element._events[type].list.indexOf( listener );

                    if ( index !== -1 ) {
                        element._events[type].list.splice( index, 1 );

                        if ( !element._events[type].list.length ) {
                            if ( element.detachEvent ) {
                                element.detachEvent( 'on' + type, element._events[type] );
                            }
                            delete element._events[type];
                        }
                    }
                }
            };

            window.dispatchEvent = Window.prototype.dispatchEvent = Document.prototype.dispatchEvent = Element.prototype.dispatchEvent = function dispatchEvent( event ) {
                if ( !arguments.length ) {
                    throw new Error( 'Not enough arguments' );
                }

                if ( !event || typeof event.type !== 'string' ) {
                    throw new Error( 'DOM Events Exception 0' );
                }

                var element = this, type = event.type;

                try {
                    if ( !event.bubbles ) {
                        event.cancelBubble = true;

                        var cancelBubbleEvent = function ( event ) {
                            event.cancelBubble = true;

                            ( element || window ).detachEvent( 'on' + type, cancelBubbleEvent );
                        };

                        this.attachEvent( 'on' + type, cancelBubbleEvent );
                    }

                    this.fireEvent( 'on' + type, event );
                } catch ( error ) {
                    event.target = element;

                    do {
                        event.currentTarget = element;

                        if ( '_events' in element && typeof element._events[type] === 'function' ) {
                            element._events[type].call( element, event );
                        }

                        if ( typeof element['on' + type] === 'function' ) {
                            element['on' + type].call( element, event );
                        }

                        element = element.nodeType === 9 ? element.parentWindow : element.parentNode;
                    } while ( element && !event.cancelBubble );
                }

                return true;
            };

            // Add the DOMContentLoaded Event
            document.attachEvent( 'onreadystatechange', function () {
                if ( document.readyState === 'complete' ) {
                    document.dispatchEvent( new Event( 'DOMContentLoaded', {
                        bubbles: true
                    } ) );
                }
            } );
        }
    }() );

    // Object.getOwnPropertyDescriptor
    /* global CreateMethodProperty, ToObject, ToPropertyKey, HasOwnProperty, Type */
    ( function () {
        var nativeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

        var supportsDOMDescriptors = ( function () {
            try {
                return Object.defineProperty( document.createElement( 'div' ), 'one', {
                    get: function () {
                        return 1;
                    }
                } ).one === 1;
            } catch ( e ) {
                return false;
            }
        } );

        var toString = ( {} ).toString;
        var split = ''.split;

        // 19.1.2.8 Object.getOwnPropertyDescriptor ( O, P )
        CreateMethodProperty( Object, 'getOwnPropertyDescriptor', function getOwnPropertyDescriptor( O, P ) {
            // 1. Let obj be ? ToObject(O).
            var obj = ToObject( O );
            // Polyfill.io fallback for non-array-like strings which exist in some ES3 user-agents (IE 8)
            obj = ( Type( obj ) === 'string' || obj instanceof String ) && toString.call( O ) == '[object String]' ? split.call( O, '' ) : Object( O );

            // 2. Let key be ? ToPropertyKey(P).
            var key = ToPropertyKey( P );

            // 3. Let desc be ? obj.[[GetOwnProperty]](key).
            // 4. Return FromPropertyDescriptor(desc). 
            // Polyfill.io Internet Explorer 8 natively supports property descriptors only on DOM objects.
            // We will fallback to the polyfill implementation if the native implementation throws an error.
            if ( supportsDOMDescriptors ) {
                try {
                    return nativeGetOwnPropertyDescriptor( obj, key );
                    // eslint-disable-next-line no-empty
                } catch ( error ) { }
            }
            if ( HasOwnProperty( obj, key ) ) {
                return {
                    enumerable: true,
                    configurable: true,
                    writable: true,
                    value: obj[key]
                };
            }
        } );
    }() );

    // HTMLTemplateElement
    /**
     * @license
     * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
     * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
     * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
     * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
     * Code distributed by Google as part of the polymer project is also
     * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
     */

    // minimal template polyfill
    ( function () {
        'use strict';

        var needsTemplate = ( typeof HTMLTemplateElement === 'undefined' );
        var brokenDocFragment = !( document.createDocumentFragment().cloneNode() instanceof DocumentFragment );
        var needsDocFrag = false;

        // NOTE: Replace DocumentFragment to work around IE11 bug that
        // causes children of a document fragment modified while
        // there is a mutation observer to not have a parentNode, or
        // have a broken parentNode (!?!)
        if ( /Trident/.test( navigator.userAgent ) ) {
            ( function () {

                needsDocFrag = true;

                var origCloneNode = Node.prototype.cloneNode;
                Node.prototype.cloneNode = function cloneNode( deep ) {
                    var newDom = origCloneNode.call( this, deep );
                    if ( this instanceof DocumentFragment ) {
                        newDom.__proto__ = DocumentFragment.prototype;
                    }
                    return newDom;
                };

                // IE's DocumentFragment querySelector code doesn't work when
                // called on an element instance
                DocumentFragment.prototype.querySelectorAll = HTMLElement.prototype.querySelectorAll;
                DocumentFragment.prototype.querySelector = HTMLElement.prototype.querySelector;

                Object.defineProperties( DocumentFragment.prototype, {
                    'nodeType': {
                        get: function () {
                            return Node.DOCUMENT_FRAGMENT_NODE;
                        },
                        configurable: true
                    },

                    'localName': {
                        get: function () {
                            return undefined;
                        },
                        configurable: true
                    },

                    'nodeName': {
                        get: function () {
                            return '#document-fragment';
                        },
                        configurable: true
                    }
                } );

                var origInsertBefore = Node.prototype.insertBefore;
                function insertBefore( newNode, refNode ) {
                    if ( newNode instanceof DocumentFragment ) {
                        var child;
                        while ( ( child = newNode.firstChild ) ) {
                            origInsertBefore.call( this, child, refNode );
                        }
                    } else {
                        origInsertBefore.call( this, newNode, refNode );
                    }
                    return newNode;
                }
                Node.prototype.insertBefore = insertBefore;

                var origAppendChild = Node.prototype.appendChild;
                Node.prototype.appendChild = function appendChild( child ) {
                    if ( child instanceof DocumentFragment ) {
                        insertBefore.call( this, child, null );
                    } else {
                        origAppendChild.call( this, child );
                    }
                    return child;
                };

                var origRemoveChild = Node.prototype.removeChild;
                var origReplaceChild = Node.prototype.replaceChild;
                Node.prototype.replaceChild = function replaceChild( newChild, oldChild ) {
                    if ( newChild instanceof DocumentFragment ) {
                        insertBefore.call( this, newChild, oldChild );
                        origRemoveChild.call( this, oldChild );
                    } else {
                        origReplaceChild.call( this, newChild, oldChild );
                    }
                    return oldChild;
                };

                Document.prototype.createDocumentFragment = function createDocumentFragment() {
                    var frag = this.createElement( 'df' );
                    frag.__proto__ = DocumentFragment.prototype;
                    return frag;
                };

                var origImportNode = Document.prototype.importNode;
                Document.prototype.importNode = function importNode( impNode, deep ) {
                    deep = deep || false;
                    var newNode = origImportNode.call( this, impNode, deep );
                    if ( impNode instanceof DocumentFragment ) {
                        newNode.__proto__ = DocumentFragment.prototype;
                    }
                    return newNode;
                };
            } )();
        }

        // NOTE: we rely on this cloneNode not causing element upgrade.
        // This means this polyfill must load before the CE polyfill and
        // this would need to be re-worked if a browser supports native CE
        // but not <template>.
        var capturedCloneNode = Node.prototype.cloneNode;
        var capturedCreateElement = Document.prototype.createElement;
        var capturedImportNode = Document.prototype.importNode;
        var capturedRemoveChild = Node.prototype.removeChild;
        var capturedAppendChild = Node.prototype.appendChild;
        var capturedReplaceChild = Node.prototype.replaceChild;
        var capturedParseFromString = DOMParser.prototype.parseFromString;
        var capturedHTMLElementInnerHTML = Object.getOwnPropertyDescriptor( window.HTMLElement.prototype, 'innerHTML' ) || {
            /**
             * @this {!HTMLElement}
             * @return {string}
             */
            get: function () {
                return this.innerHTML;
            },
            /**
             * @this {!HTMLElement}
             * @param {string}
             */
            set: function ( text ) {
                this.innerHTML = text;
            }
        };
        var capturedChildNodes = Object.getOwnPropertyDescriptor( window.Node.prototype, 'childNodes' ) || {
            /**
             * @this {!Node}
             * @return {!NodeList}
             */
            get: function () {
                return this.childNodes;
            }
        };

        var elementQuerySelectorAll = Element.prototype.querySelectorAll;
        var docQuerySelectorAll = Document.prototype.querySelectorAll;
        var fragQuerySelectorAll = DocumentFragment.prototype.querySelectorAll;

        var scriptSelector = 'script:not([type]),script[type="application/javascript"],script[type="text/javascript"]';

        function QSA( node, selector ) {
            // IE 11 throws a SyntaxError with `scriptSelector` if the node has no children due to the `:not([type])` syntax
            if ( !node.childNodes.length ) {
                return [];
            }
            switch ( node.nodeType ) {
                case Node.DOCUMENT_NODE:
                    return docQuerySelectorAll.call( node, selector );
                case Node.DOCUMENT_FRAGMENT_NODE:
                    return fragQuerySelectorAll.call( node, selector );
                default:
                    return elementQuerySelectorAll.call( node, selector );
            }
        }

        // returns true if nested templates cannot be cloned (they cannot be on
        // some impl's like Safari 8 and Edge)
        // OR if cloning a document fragment does not result in a document fragment
        var needsCloning = ( function () {
            if ( !needsTemplate ) {
                var t = document.createElement( 'template' );
                var t2 = document.createElement( 'template' );
                t2.content.appendChild( document.createElement( 'div' ) );
                t.content.appendChild( t2 );
                var clone = t.cloneNode( true );
                return ( clone.content.childNodes.length === 0 || clone.content.firstChild.content.childNodes.length === 0
                    || brokenDocFragment );
            }
        } )();

        var TEMPLATE_TAG = 'template';
        var PolyfilledHTMLTemplateElement = function () { };

        if ( needsTemplate ) {

            var contentDoc = document.implementation.createHTMLDocument( 'template' );
            var canDecorate = true;

            var templateStyle = document.createElement( 'style' );
            templateStyle.textContent = TEMPLATE_TAG + '{display:none;}';

            var head = document.head;
            head.insertBefore( templateStyle, head.firstElementChild );

            /**
              Provides a minimal shim for the <template> element.
            */
            PolyfilledHTMLTemplateElement.prototype = Object.create( HTMLElement.prototype );


            // if elements do not have `innerHTML` on instances, then
            // templates can be patched by swizzling their prototypes.
            var canProtoPatch =
                !( document.createElement( 'div' ).hasOwnProperty( 'innerHTML' ) );

            /**
              The `decorate` method moves element children to the template's `content`.
              NOTE: there is no support for dynamically adding elements to templates.
            */
            PolyfilledHTMLTemplateElement.decorate = function ( template ) {
                // if the template is decorated or not in HTML namespace, return fast
                if ( template.content ||
                    template.namespaceURI !== document.documentElement.namespaceURI ) {
                    return;
                }
                template.content = contentDoc.createDocumentFragment();
                var child;
                while ( ( child = template.firstChild ) ) {
                    capturedAppendChild.call( template.content, child );
                }
                // NOTE: prefer prototype patching for performance and
                // because on some browsers (IE11), re-defining `innerHTML`
                // can result in intermittent errors.
                if ( canProtoPatch ) {
                    template.__proto__ = PolyfilledHTMLTemplateElement.prototype;
                } else {
                    template.cloneNode = function ( deep ) {
                        return PolyfilledHTMLTemplateElement._cloneNode( this, deep );
                    };
                    // add innerHTML to template, if possible
                    // Note: this throws on Safari 7
                    if ( canDecorate ) {
                        try {
                            defineInnerHTML( template );
                            defineOuterHTML( template );
                        } catch ( err ) {
                            canDecorate = false;
                        }
                    }
                }
                // bootstrap recursively
                PolyfilledHTMLTemplateElement.bootstrap( template.content );
            };

            // Taken from https://github.com/jquery/jquery/blob/73d7e6259c63ac45f42c6593da8c2796c6ce9281/src/manipulation/wrapMap.js
            var topLevelWrappingMap = {
                'option': ['select'],
                'thead': ['table'],
                'col': ['colgroup', 'table'],
                'tr': ['tbody', 'table'],
                'th': ['tr', 'tbody', 'table'],
                'td': ['tr', 'tbody', 'table']
            };

            var getTagName = function ( text ) {
                // Taken from https://github.com/jquery/jquery/blob/73d7e6259c63ac45f42c6593da8c2796c6ce9281/src/manipulation/var/rtagName.js
                return ( /<([a-z][^/\0>\x20\t\r\n\f]+)/i.exec( text ) || ['', ''] )[1].toLowerCase();
            };

            var defineInnerHTML = function defineInnerHTML( obj ) {
                Object.defineProperty( obj, 'innerHTML', {
                    get: function () {
                        return getInnerHTML( this );
                    },
                    set: function ( text ) {
                        // For IE11, wrap the text in the correct (table) context
                        var wrap = topLevelWrappingMap[getTagName( text )];
                        if ( wrap ) {
                            for ( var i = 0; i < wrap.length; i++ ) {
                                text = '<' + wrap[i] + '>' + text + '</' + wrap[i] + '>';
                            }
                        }
                        contentDoc.body.innerHTML = text;
                        PolyfilledHTMLTemplateElement.bootstrap( contentDoc );
                        while ( this.content.firstChild ) {
                            capturedRemoveChild.call( this.content, this.content.firstChild );
                        }
                        var body = contentDoc.body;
                        // If we had wrapped, get back to the original node
                        if ( wrap ) {
                            for ( var j = 0; j < wrap.length; j++ ) {
                                body = body.lastChild;
                            }
                        }
                        while ( body.firstChild ) {
                            capturedAppendChild.call( this.content, body.firstChild );
                        }
                    },
                    configurable: true
                } );
            };

            var defineOuterHTML = function defineOuterHTML( obj ) {
                Object.defineProperty( obj, 'outerHTML', {
                    get: function () {
                        return '<' + TEMPLATE_TAG + '>' + this.innerHTML + '</' + TEMPLATE_TAG + '>';
                    },
                    set: function ( innerHTML ) {
                        if ( this.parentNode ) {
                            contentDoc.body.innerHTML = innerHTML;
                            var docFrag = this.ownerDocument.createDocumentFragment();
                            while ( contentDoc.body.firstChild ) {
                                capturedAppendChild.call( docFrag, contentDoc.body.firstChild );
                            }
                            capturedReplaceChild.call( this.parentNode, docFrag, this );
                        } else {
                            throw new Error( "Failed to set the 'outerHTML' property on 'Element': This element has no parent node." );
                        }
                    },
                    configurable: true
                } );
            };

            defineInnerHTML( PolyfilledHTMLTemplateElement.prototype );
            defineOuterHTML( PolyfilledHTMLTemplateElement.prototype );

            /**
              The `bootstrap` method is called automatically and "fixes" all
              <template> elements in the document referenced by the `doc` argument.
            */
            PolyfilledHTMLTemplateElement.bootstrap = function bootstrap( doc ) {
                var templates = QSA( doc, TEMPLATE_TAG );
                for ( var i = 0, l = templates.length, t; ( i < l ) && ( t = templates[i] ); i++ ) {
                    PolyfilledHTMLTemplateElement.decorate( t );
                }
            };

            // auto-bootstrapping for main document
            document.addEventListener( 'DOMContentLoaded', function () {
                PolyfilledHTMLTemplateElement.bootstrap( document );
            } );

            // Patch document.createElement to ensure newly created templates have content
            Document.prototype.createElement = function createElement() {
                var el = capturedCreateElement.apply( this, arguments );
                if ( el.localName === 'template' ) {
                    PolyfilledHTMLTemplateElement.decorate( el );
                }
                return el;
            };

            DOMParser.prototype.parseFromString = function () {
                var el = capturedParseFromString.apply( this, arguments );
                PolyfilledHTMLTemplateElement.bootstrap( el );
                return el;
            };

            Object.defineProperty( HTMLElement.prototype, 'innerHTML', {
                get: function () {
                    return getInnerHTML( this );
                },
                set: function ( text ) {
                    capturedHTMLElementInnerHTML.set.call( this, text );
                    PolyfilledHTMLTemplateElement.bootstrap( this );
                },
                configurable: true,
                enumerable: true
            } );

            // http://www.whatwg.org/specs/web-apps/current-work/multipage/the-end.html#escapingString
            var escapeAttrRegExp = /[&\u00A0"]/g;
            var escapeDataRegExp = /[&\u00A0<>]/g;

            var escapeReplace = function ( c ) {
                switch ( c ) {
                    case '&':
                        return '&amp;';
                    case '<':
                        return '&lt;';
                    case '>':
                        return '&gt;';
                    case '"':
                        return '&quot;';
                    case '\u00A0':
                        return '&nbsp;';
                }
            };

            var escapeAttr = function ( s ) {
                return s.replace( escapeAttrRegExp, escapeReplace );
            };

            var escapeData = function ( s ) {
                return s.replace( escapeDataRegExp, escapeReplace );
            };

            var makeSet = function ( arr ) {
                var set = {};
                for ( var i = 0; i < arr.length; i++ ) {
                    set[arr[i]] = true;
                }
                return set;
            };

            // http://www.whatwg.org/specs/web-apps/current-work/#void-elements
            var voidElements = makeSet( [
                'area',
                'base',
                'br',
                'col',
                'command',
                'embed',
                'hr',
                'img',
                'input',
                'keygen',
                'link',
                'meta',
                'param',
                'source',
                'track',
                'wbr'
            ] );

            var plaintextParents = makeSet( [
                'style',
                'script',
                'xmp',
                'iframe',
                'noembed',
                'noframes',
                'plaintext',
                'noscript'
            ] );

            /**
             * @param {Node} node
             * @param {Node} parentNode
             * @param {Function=} callback
             */
            var getOuterHTML = function ( node, parentNode, callback ) {
                switch ( node.nodeType ) {
                    case Node.ELEMENT_NODE: {
                        var tagName = node.localName;
                        var s = '<' + tagName;
                        var attrs = node.attributes;
                        for ( var i = 0, attr; ( attr = attrs[i] ); i++ ) {
                            s += ' ' + attr.name + '="' + escapeAttr( attr.value ) + '"';
                        }
                        s += '>';
                        if ( voidElements[tagName] ) {
                            return s;
                        }
                        return s + getInnerHTML( node, callback ) + '</' + tagName + '>';
                    }
                    case Node.TEXT_NODE: {
                        var data = /** @type {Text} */ ( node ).data;
                        if ( parentNode && plaintextParents[parentNode.localName] ) {
                            return data;
                        }
                        return escapeData( data );
                    }
                    case Node.COMMENT_NODE: {
                        return '<!--' + /** @type {Comment} */ ( node ).data + '-->';
                    }
                    default: {
                        window.console.error( node );
                        throw new Error( 'not implemented' );
                    }
                }
            };

            /**
             * @param {Node} node
             * @param {Function=} callback
             */
            var getInnerHTML = function ( node, callback ) {
                if ( node.localName === 'template' ) {
                    node =  /** @type {HTMLTemplateElement} */ ( node ).content;
                }
                var s = '';
                var c$ = callback ? callback( node ) : capturedChildNodes.get.call( node );
                for ( var i = 0, l = c$.length, child; ( i < l ) && ( child = c$[i] ); i++ ) {
                    s += getOuterHTML( child, node, callback );
                }
                return s;
            };

        }

        // make cloning/importing work!
        if ( needsTemplate || needsCloning ) {

            PolyfilledHTMLTemplateElement._cloneNode = function _cloneNode( template, deep ) {
                var clone = capturedCloneNode.call( template, false );
                // NOTE: decorate doesn't auto-fix children because they are already
                // decorated so they need special clone fixup.
                if ( this.decorate ) {
                    this.decorate( clone );
                }
                if ( deep ) {
                    // NOTE: use native clone node to make sure CE's wrapped
                    // cloneNode does not cause elements to upgrade.
                    capturedAppendChild.call( clone.content, capturedCloneNode.call( template.content, true ) );
                    // now ensure nested templates are cloned correctly.
                    fixClonedDom( clone.content, template.content );
                }
                return clone;
            };

            // Given a source and cloned subtree, find <template>'s in the cloned
            // subtree and replace them with cloned <template>'s from source.
            // We must do this because only the source templates have proper .content.
            var fixClonedDom = function fixClonedDom( clone, source ) {
                // do nothing if cloned node is not an element
                if ( !source.querySelectorAll ) return;
                // these two lists should be coincident
                var s$ = QSA( source, TEMPLATE_TAG );
                if ( s$.length === 0 ) {
                    return;
                }
                var t$ = QSA( clone, TEMPLATE_TAG );
                for ( var i = 0, l = t$.length, t, s; i < l; i++ ) {
                    s = s$[i];
                    t = t$[i];
                    if ( PolyfilledHTMLTemplateElement && PolyfilledHTMLTemplateElement.decorate ) {
                        PolyfilledHTMLTemplateElement.decorate( s );
                    }
                    capturedReplaceChild.call( t.parentNode, cloneNode.call( s, true ), t );
                }
            };

            // make sure scripts inside of a cloned template are executable
            var fixClonedScripts = function fixClonedScripts( fragment ) {
                var scripts = QSA( fragment, scriptSelector );
                for ( var ns, s, i = 0; i < scripts.length; i++ ) {
                    s = scripts[i];
                    ns = capturedCreateElement.call( document, 'script' );
                    ns.textContent = s.textContent;
                    var attrs = s.attributes;
                    for ( var ai = 0, a; ai < attrs.length; ai++ ) {
                        a = attrs[ai];
                        ns.setAttribute( a.name, a.value );
                    }
                    capturedReplaceChild.call( s.parentNode, ns, s );
                }
            };

            // override all cloning to fix the cloned subtree to contain properly
            // cloned templates.
            var cloneNode = Node.prototype.cloneNode = function cloneNode( deep ) {
                var dom;
                // workaround for Edge bug cloning documentFragments
                // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/8619646/
                if ( !needsDocFrag && brokenDocFragment && this instanceof DocumentFragment ) {
                    if ( !deep ) {
                        return this.ownerDocument.createDocumentFragment();
                    } else {
                        dom = importNode.call( this.ownerDocument, this, true );
                    }
                } else if ( this.nodeType === Node.ELEMENT_NODE &&
                    this.localName === TEMPLATE_TAG &&
                    this.namespaceURI == document.documentElement.namespaceURI ) {
                    dom = PolyfilledHTMLTemplateElement._cloneNode( this, deep );
                } else {
                    dom = capturedCloneNode.call( this, deep );
                }
                // template.content is cloned iff `deep`.
                if ( deep ) {
                    fixClonedDom( dom, this );
                }
                return dom;
            };

            // NOTE: we are cloning instead of importing <template>'s.
            // However, the ownerDocument of the cloned template will be correct!
            // This is because the native import node creates the right document owned
            // subtree and `fixClonedDom` inserts cloned templates into this subtree,
            // thus updating the owner doc.
            var importNode = Document.prototype.importNode = function importNode( element, deep ) {
                deep = deep || false;
                if ( element.localName === TEMPLATE_TAG ) {
                    return PolyfilledHTMLTemplateElement._cloneNode( element, deep );
                } else {
                    var dom = capturedImportNode.call( this, element, deep );
                    if ( deep ) {
                        fixClonedDom( dom, element );
                        fixClonedScripts( dom );
                    }
                    return dom;
                }
            };
        }

        if ( needsTemplate ) {
            window.HTMLTemplateElement = PolyfilledHTMLTemplateElement;
        }

    } )();

    if ( window.register ) {
        window.register( 'usc/p/poly-template' );
    }

} )( 'object' === typeof window && window || 'object' === typeof self && self || 'object' === typeof global && global || {} );
