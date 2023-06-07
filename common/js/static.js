/// <reference path="j/jquery.1.x.js" />
/// <reference path="moment.js" />

if ( window.registerLoading ) {
	registerLoading( "static" );
}

( function ( $, scope ) {
	// Declare the static collections.
	var Make = scope.Make || {},
		Encode = scope.Encode || {},
		Decode = scope.Decode || {},
		Format = scope.Format || {},
		Compute = scope.Compute || {},
		Get = scope.Get || {};

	function isArray( it ) {
		return it && Object.prototype.toString.call( it ) === '[object Array]';
	}

	// scope.performance.now polyfill.
	if ( !scope.performance ) {
		scope.performance = {};
	}

	if ( !scope.performance.now ) {
		scope.performance.now =
			scope.performance.webkitNow ||
			scope.performance.mozNow ||
			scope.performance.msNow ||
			scope.performance.oNow ||
			function () {
				return +( new Date() );
			};
	}

	// Function bind polyfill (taken from MDN article).
	if ( !Function.prototype.bind ) {
		Function.prototype.bind = function ( oThis ) {
			if ( typeof this !== 'function' ) {
				// closest thing possible to the ECMAScript 5
				// internal IsCallable function
				throw new TypeError( 'Function.prototype.bind - what is trying to be bound is not callable' );
			}

			var aArgs = Array.prototype.slice.call( arguments, 1 ),
				fToBind = this,
				fNOP = function () { },
				fBound = function () {
					return fToBind.apply( this instanceof fNOP
						? this
						: oThis,
						aArgs.concat( Array.prototype.slice.call( arguments ) ) );
				};

			if ( this.prototype ) {
				// Function.prototype doesn't have a prototype property
				fNOP.prototype = this.prototype;
			}
			fBound.prototype = new fNOP();

			return fBound;
		};
	}

	// classList polyfill.
	// Source: https://gist.github.com/k-gun/c2ea7c49edf7b757fe9561ba37cb19ca
	( function () {
		// helpers
		var regExp = function ( name ) {
			return new RegExp( '(^| )' + name + '( |$)' );
		};
		var forEach = function ( list, fn, scope ) {
			for ( var i = 0; i < list.length; i++ ) {
				fn.call( scope, list[i] );
			}
		};

		// class list object with basic methods
		function ClassList( element ) {
			this.element = element;
		}

		ClassList.prototype = {
			add: function () {
				forEach( arguments, function ( name ) {
					if ( !this.contains( name ) ) {
						this.element.className += ' ' + name;
					}
				}, this );
			},
			remove: function () {
				forEach( arguments, function ( name ) {
					this.element.className =
						this.element.className.replace( regExp( name ), '' );
				}, this );
			},
			toggle: function ( name ) {
				return this.contains( name )
					? ( this.remove( name ), false ) : ( this.add( name ), true );
			},
			contains: function ( name ) {
				return regExp( name ).test( this.element.className );
			},
			// bonus..
			replace: function ( oldName, newName ) {
				this.remove( oldName ), this.add( newName );
			}
		};

		// IE8/9, Safari
		if ( !( 'classList' in Element.prototype ) ) {
			Object.defineProperty( Element.prototype, 'classList', {
				get: function () {
					return new ClassList( this );
				}
			} );
		}

		// replace() support for others
		if ( window.DOMTokenList && !DOMTokenList.prototype.replace ) {
			DOMTokenList.prototype.replace = ClassList.prototype.replace;
		}
	} )();

	// Convert a value to a bool.
	Make.Bool = function ( val ) {
		if ( !val ) {
			return false;
		} else if ( typeof val === 'boolean' ) {
			return val;
		} else {
			switch ( ( "" + val ).toUpperCase() ) {
				case "1":
				case "YES":
				case "ON":
				case "TRUE":
				case "SUCCESS":
					return true;
				default:
					return false;
			}
		}
	};

	// Convert a value to an integer.
	Make.Int = function ( val ) {
		if ( !val ) {
			return 0;
		} else if ( typeof val === 'number' ) {
			return Math.round( val );
		} else if ( typeof val === 'string' ) {
			var num = parseInt( val.replace( /[^\d\-\.]/g, '' ), 10 );
			return isNaN( num ) ? 0 : Math.round( num );
		} else if ( typeof val === 'boolean' && val ) {
			return 1;
		} else {
			return 0;
		}
	};

	// Convert a value to a float.
	Make.Float = function ( val ) {
		var num;
		if ( !val ) {
			return 0;
		} else if ( typeof val === 'number' ) {
			return val;
		} else if ( typeof val === 'string' ) {
			// Check for exponential notation.
			if ( /e\-/i.test( val ) ) {
				num = parseFloat( val );
				if ( !isNaN( num ) ) {
					return null;
				}
			}
			num = parseFloat( val.replace( /[^\d\-\.]/g, '' ), 10 );
			return isNaN( num ) ? 0 : num / ( /%/.test( val ) ? 100 : 1 ) * ( /\(.+\)/.test( val ) ? -1 : 1 );
		} else {
			return 0;
		}
	};

	// Convert a value into a date.
	Make.Date = Make.DateTime = function ( val ) {
		var d, offset, modifier, timezone, num;
		if ( !val ) {
			return null;
		} else if ( val.constructor === Date ) {
			return val;
		} else if ( typeof val === 'string' ) {
			if ( Date.prototype.parse && ( d = new Date().parse( val ) ) ) {
				// m/date parser.
				return d;
			} else if ( typeof moment === 'undefined' ) {
				// If the value is an ISO-8601 without any time zone settings, make it be relative to the current time zone.
				if ( /^\d{4}\-\d{2}\-\d{2}T\d\d\:\d\d(?::\d\d(?:\.\d+)?)?$/.test( val ) ) {
					// Get the current time zone offset in hours.
					offset = new Date().getTimezoneOffset() / 60;
					// Before or after GMT.
					modifier = offset < 0 ? '+' : '-';
					// Convert the offset to the correct pattern (e.g. "-0700").
					timezone = modifier + ( 10000 + Math.abs( offset * 100 ) ).toString().substring( 1, 5 );
					// Parse with the time zone added to the end.
					num = Date.parse( val + timezone );
				} else {
					// Use native date methods.
					num = Date.parse( val );
				}
				// Return the number as a Date object.
				if ( isNaN( num ) ) {
					return null;
				} else {
					return new Date( num );
				}
			} else {
				// Use the moment library.
				var date = moment( val );
				if ( date.isValid() ) {
					return date.toDate();
				} else {
					return null;
				}
			}
		} else {
			return null;
		}
	};

	// Convert a value into a string array.
	Make.Array = function ( val ) {
		if ( !val ) {
			return [];
		} else if ( isArray( val ) ) {
			return val;
		} else {
			return String( val || "" ).split( ',' );
		}
	};

	// Convert a value to an int array.
	Make.IntArray = function ( val, strict ) {
		var num, dict, result;

		if ( !val ) {
			return [];
		} else if ( strict && val.constructor === Object ) {
			// If we're asking for a strict int array made from a hashtable, convert the keys to unique int values.
			dict = {};
			result = [];
			for ( var p in val ) {
				if ( !val.hasOwnProperty( p ) ) {
					continue;
				}
				num = Make.Int( p );
				if ( num && !dict[num] ) {
					result.push( num );
					dict[num] = true;
				}
			}
			return result;
		} else if ( !isArray( val ) ) {
			// If we have serialized int array, strip off the square brackets.
			if ( val && val.length > 2 && val[0] === '[' && val[val.length - 1] === ']' ) {
				val = $.trim( val.substring( 1, val.length - 1 ) );
				if ( !val ) {
					return [];
				}
			}
			// If we don't already have an array, make one.
			val = ( "" + val ).split( ',' );
		}

		if ( strict ) {
			// Add all non-zero unique numbers.
			dict = {};
			result = [];
			for ( var i = 0, len = val.length; i < len; i++ ) {
				num = Make.Int( val[i] );
				if ( num && !dict[num] ) {
					result.push( num );
					dict[num] = true;
				}
			}
			return result;

		} else {
			// Convert each element into an int.
			for ( var i = 0, len = val.length; i < len; i++ ) {
				val[i] = Make.Int( val[i] );
			}

			return val;
		}
	};

	// Convert val1 to the same type as val2.
	Make.Matching = function ( val1, val2 ) {
		if ( val2 === undefined ) {
			return val1 || undefined;
		} else if ( val2 === null ) {
			return val1 || null;
		}

		switch ( typeof val2 ) {
			case 'boolean':
				return Make.Bool( val1 );
			case 'number':
				return Make.Float( val1 );
			case 'string':
				return "" + val1;
		}

		if ( val2.constructor === Date ) {
			return Make.Date( val1 );
		} else {
			return val1;
		}
	};

	// Base 10 round with number of dedicmal places defined.
	Math.round10 = function ( value, digits ) {
		// If the digits is undefined or zero...
		if ( typeof digits === 'undefined' || +digits === 0 ) {
			return Math.round( value );
		}
		value = +value;
		digits = -digits;
		// If the value is not a number or the digits is not an integer...
		if ( isNaN( value ) || !( typeof digits === 'number' && digits % 1 === 0 ) ) {
			return NaN;
		}
		// Shift
		value = value.toString().split( 'e' );
		value = Math.round( +( value[0] + 'e' + ( value[1] ? ( +value[1] - digits ) : -digits ) ) );
		// Shift back
		value = value.toString().split( 'e' );
		return +( value[0] + 'e' + ( value[1] ? ( +value[1] + digits ) : digits ) );
	};

	// Apply a min / max to a value, optionally wrapping to the other side.
	Math.limit = function ( value, min, max, wrap ) {
		var range;
		if ( typeof min === 'number' && typeof max === 'number' ) {
			// Get the range.
			range = max - min + 1;
			if ( range < 1 ) {
				return min;
			}

			// If the value is too small.
			while ( value < min ) {
				if ( wrap ) {
					// Keep adding the range until it fits.
					value += range;
				} else {
					// Return the min value if we're not wrapping.
					return min;
				}
			}

			// If the value is too large.
			while ( value > max ) {
				if ( wrap ) {
					// Keep subtracting the range until it fits.
					value -= range;
				} else {
					// Return the max value if we're not wrapping.
					return max;
				}
			}
		}

		// Either the min/max is bad, or the value was already in range.
		return value;
	};

	var tabs = '\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t';
	var c = String.fromCharCode( 3 );
	var kb = ['B', 'KB', 'MB', 'GB', 'TB'];

	// Make a tab-based indent of the specified length.
	Format.indent = function ( len ) {
		len = Make.Int( len );
		if ( len <= 0 ) {
			return "";
		} else if ( len > 100 ) {
			return tabs + tabs;
		} else if ( len > 50 ) {
			return ( tabs + tabs ).substr( 0, len );
		} else {
			return tabs.substr( 0, len );
		}
	};

	// Return a byte size.
	Format.Bytes = function ( val, digits ) {
		var quotient, remainder,
			suffix = 0;

		// Get the nearest 1024 block.
		while ( val >= 1024 && suffix++ < 4 ) {
			val = val / 1024;
		}

		// Get the integer and fraction.
		quotient = Math.floor( val );
		remainder = val - quotient;
		digits = Make.Int( digits );

		// Return the formatted result.
		return Format.Number( val )
			+ ( digits && remainder ? remainder.toFixed( digits ).replace( /^0\./, "." ) : "" )
			+ ' ' + kb[suffix];
	};

	// Format a comma-separated number.
	Format.Number = function ( val, digits ) {
		var num, abbrev, fmt, quotient, remainder;

		if ( digits === -1 ) {
			// Do a thousands / millions / billions abbreviated format.
			if ( val < 1000 ) {
				num = val;
			} else if ( val < 1000000 ) {
				num = val / 1000;
				abbrev = "k";
			} else if ( val < 1000000000 ) {
				num = val / 1000000;
				abbrev = "m";
			} else {
				num = val / 1000000000;
				abbrev = "g";
			}
			fmt = Format.Number( num, 1 );
			if ( fmt.substring( fmt.length - 2 ) === ".0" ) {
				fmt = fmt.substring( 0, fmt.length - 2 );
			}
			return fmt + abbrev;
		}

		val = Math.round10( val, digits );

		if ( digits && ( digits = Make.Int( digits ) ) > 0 ) {
			// Get the integer and fraction.
			quotient = Math.floor( val );
			remainder = val - quotient;

			// Return the formatted number with the specified digits.
			return quotient
				.toLocaleString().replace( /\.\d+$/, "" )
				+ remainder.toFixed( digits ).replace( /^0\./, "." );

		} else {
			return val.toLocaleString().replace( /\.\d+$/, "" );
		}
	};

	// Format a comma-separated number preceeded by a USD symbol.
	Format.Currency = function ( val, digits ) {
		return '$' + Format.Number( val, digits );
	};

	// Format a percentage.
	Format.Percent = function ( val, digits ) {
		return Format.Number( 100 * val, digits ) + '%';
	};

	// Pad zeros to make a number an exact amount of digits.
	Format.Digits = function ( num, digits ) {
		var txt = "000000000" + Make.Int( num );
		return txt.substring( txt.length - digits );
	};

	// Format text as a cms-url friendly value.
	Format.CMS = function ( val ) {
		if ( !val ) {
			return "";
		} else {
			return ( "" + val )
				.replace( /'/g, '' )
				.replace( /\W+/gi, '-' )
				.toLowerCase();
		}
	};

	// URI encoding.
	Encode.JS = Encode.Uri = function ( data ) {
		if ( !data ) {
			return "";
		} else {
			return encodeURIComponent( "" + data )
					.replace(
						/['"\(\)]/g,
						function ( m ) {
							switch ( m ) {
								case "'":
									return '%27';
								case '"':
									return '%22';
								case '(':
									return '%28';
								case ')':
									return '%29';
								default:
									return m;
							}
						}
					);
		}
	};

	// URI decoding.
	Decode.JS = Decode.Uri = function ( data ) {
		if ( !data ) {
			return "";
		} else {
			return decodeURIComponent(( "" + data ).replace( /\+/g, '%20' ) );
		}
	};

	// Safely encode HTML for transmission.
	Encode.HTML = function ( data ) {
		var b = /&/g,
			c = />/g,
			e = /</g;
		if ( !data ) {
			return "";
		}
		return data.replace( b, "\x26amp;" ).replace( c, "\x26gt;" ).replace( e, "\x26lt;" )
	};

	// Decode HTML entities.
	Decode.HTML = function ( data ) {
		var div, text;
		if ( !data ) {
			return "";
		}
		div = document.createElement( 'div' );
		div.innerHTML = data;
		text = div.textContent || div.innerText;
		delete div;
		return text;
	};

	// Specialized json format that makes an easy-to-read, but NOT parser-friendly representation of a json string.
	Encode.Json = function ( o, indent ) {
		var json = JSON.stringify( o, null, '\t' )
			// Remove double-quotes from keys.
			.replace( /"([^"]+)": /g, "$1: " )
			// Temporarily hide single quotes
			.replace( /'/g, c )
			// Turn double-quoted values into single-quoted values.
			.replace( /"/g, "'" )
			// Put the single-quotes back in, as escaped properties.
			.replace( new RegExp( c, "g" ), "\\'" )
			// Collapse whitespace from simple number or boolean arrays
			.replace( /\[(?:\s*(?:[\d\.]|true|false)+,?\s*){1,}\]/g, function ( array ) {
				return array.replace( /\s+/g, "" );
			} );

		// Add any additional levels of indent.
		if ( indent && ( indent = Format.indent( indent ) ) ) {
			json = json.replace( /\n/g, '\n' + indent );
		}

		return json;
	};

	// Deserialize a non-standard json representation (i.e. missing quoted keys).
	Decode.Json = function ( data ) {
		// Nothing to decode.
		if ( !data ) {
			return null;
		} else if ( typeof data === 'string' ) {
			var json = data
				// Temporarily hide escaped single quotes.
				.replace( /\\'/g, c )
				// Turn single-quoted values into double-quoted values.
				.replace( /'/g, '"' )
				// Make sure all keys are double-quoted.
				.replace( /(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":' )
				// Put the single quotes back, but not escaped.
				.replace( new RegExp( c, "g" ), "'" );

			// Try to parse it.
			var o = JSON2.parse( json );
			return o || null;
		} else {
			// It's already a native object, return it.
			return data;
		}
	};

	// Encode a value type as a string for serialization in a cookie.
	Encode.Cookie = function ( value, json ) {
		if ( value === null || value === undefined ) {
			return '.';
		} else if ( typeof value === 'number' ) {
			return '#' + value;
		} else if ( typeof value === 'boolean' ) {
			return value ? '!!' : '!';
		} else if ( !value ) {
			return "";
		} else if ( value.constructor === Date ) {
			return ":" + value.getTime();
		} else if ( isArray( value ) ) {
			if ( !value.length ) {
				return "[]";
			} else if ( typeof value[0] === 'number' ) {
				return JSON.stringify( Make.IntArray( value ) );
			} else {
				return encode( String( value ) );
			}
		} else if ( typeof value === 'string' ) {
			return Encode.JS( value );
		} else if ( json ) {
			return JSON.stringify( value );
		} else {
			return String( value );
		}
	};

	// Decode a serialized cookie value.
	Decode.Cookie = function ( value, json ) {
		if ( !value ) {
			return null;
		}

		if ( value.indexOf( '"' ) === 0 ) {
			// This is a quoted cookie as according to RFC2068, unescape...
			value = value.slice( 1, -1 ).replace( /\\"/g, '"' ).replace( /\\\\/g, '\\' );
		}

		switch ( value[0] ) {
			case '#':
				return Make.Float( value.substring( 1 ) );
			case ':':
				return new Date( Make.Int( value.substring( 1 ) ) );
			case '!':
				return value === '!!';
			case '[':
				if ( value[value.length - 1] === ']' ) {
					return Make.IntArray( value.substring( 0, value.length - 1 ) );
				}
				break;
			case "'":
				return Decode.JS( value.substring( 1 ) );
			default:
				return Decode.JS( value );
		}

		if ( value === '.' ) {
			return null;
		}

		try {
			// Replace server-side written pluses with spaces.
			// If we can't decode the cookie, ignore it, it's unusable.
			// If we can't parse the cookie, ignore it, it's unusable.
			value = decodeURIComponent( value.replace( /\+/g, ' ' ) );
			return json ? JSON2.parse( value ) : value;
		} catch ( e ) { }
	};

	// Escape any characters that are regex commands to make it safe as a regex source string.
	Encode.ForRegex = function ( value ) {
		if ( !value ) {
			return null;
		} else {
			return value.replace( /([\*\+\?\^\$\.\[\]\{\}\(\)\|\\])/g, "\\$1" );
		}
	};

	// FNV1a - 32bit
	Compute.Hash = function ( data ) {
		if ( !data ) {
			return 0;
		}

		var FNV1_32A_INIT = 0x811c9dc5;
		var hval = FNV1_32A_INIT;

		for ( var i = 0; i < data.length; i++ ) {
			hval ^= data.charCodeAt( i );
			hval += ( hval << 1 ) + ( hval << 4 ) + ( hval << 7 ) + ( hval << 8 ) + ( hval << 24 );
		}
		return hval >>> 0;
	};

	// Calcuate and return a formatted UUID.
	Compute.UUID = function () {
		var d = performance.now();
		var uuid = '_xxxxxxxxxxxxxxxx'.replace( /x/g, function ( c ) {
			var r = ( d + Math.random() * 16 ) % 16 | 0;
			d = Math.floor( d / 16 );
			return ( r ).toString( 16 );
		} );
		return uuid;
	};

	// Calcuate and return a formatted GUID.
	Compute.GUID = function () {
		var d = performance.now();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, function ( c ) {
			var r = ( d + Math.random() * 16 ) % 16 | 0;
			d = Math.floor( d / 16 );
			return ( c === 'x' ? r : ( r & 0x3 | 0x8 ) ).toString( 16 );
		} );
		return uuid;
	};

	// Convert a supplied string into a searchable regex pattern.
	Compute.Pattern = function ( str ) {
		if ( !str || typeof str !== 'string' ) {
			return null;
		}

		return str
			// Regex control characters are escaped.
			.replace( /([\*\+\?\^\$\.\[\]\{\}\-\|\\])/g, '\\$1' )
			// White space is replaced by a white space token.
			.replace( /\s+/g, '\\s+' );
	};

	// Build a regex to match a search criterial.
	Compute.Regex = function ( str ) {
		var pattern = Compute.Pattern( str );
		return pattern && new RegExp( pattern, "gi" );
	};

	// Rapidly extract a link element from an event target.
	Get.Link = function ( e, iterations ) {
		var p = e && e.target, count = 0;
		iterations = iterations || 3;
		while ( p && count++ < iterations ) {
			if ( p.nodeName === 'A' ) {
				return p;
			} else {
				// Reset the iterations if we hit an SVG element.
				if ( p.nodeName === 'SVG' || p.nodeName === 'svg' ) {
					count = 0;
				}
				p = p.parentNode;
			}
		}
	};

	var r_js = /^javascript:(\w+)(?:\('([^']+)')?/i;
	// Rapidly get information about a link element from an event target.  Returns { link:, href:, fn:, action: }
	Get.LinkData = function ( e, iterations ) {
		var link = Get.Link( e, iterations ),
			href = link && link.getAttribute( 'href' ),
			m = href && r_js.exec( href ),
			fn = m && m[1],
			action = ( fn === 'void' ? m[2] : undefined );

		return {
			link: link,
			href: href,
			fn: fn,
			action: action
		};
	};

	// Rapidly extract an element by class name.
	Get.Class = function ( e, cls, iterations, notcls ) {
		var p = e && e.target, count = 0;
		iterations = iterations || 3;
		if ( !cls ) {
			return null;
		} else if ( cls.constructor === RegExp ) {
			return Get._class( p, cls, iterations );
		}

		while ( p && count++ < iterations ) {
			if ( notcls && p.classList && p.classList.contains( notcls ) ) {
				return null;
			} else if ( p.classList && p.classList.contains( cls ) ) {
				return p;
			} else {
				// Reset the iterations if we hit an SVG element.
				if ( p.nodeName === 'SVG' || p.nodeName === 'svg' ) {
					count = 0;
				}
				p = p.parentNode;
			}
		}

		return null;
	};

	// Backwards-compatible method using regular expressions on the className property.
	Get._class = function ( p, regx, iterations ) {
		var count = 0;

		while ( p && count++ < iterations ) {
			if ( p.className && regx.test( p.className ) ) {
				return p;
			} else {
				// Reset the iterations if we hit an SVG element.
				if ( p.nodeName === 'SVG' || p.nodeName === 'svg' ) {
					count = 0;
				}
				p = p.parentNode;
			}
		}

		return null;
	};

	// Perform a binary search, assuming the array is in sequence.
	Get.BIndex = function ( array, key, propName, last ) {
		var mid, item, val,
			min = 0,
			max = array.length - 1,
			found = null;

		if ( last === undefined && propName === true ) {
			last = propName;
			propName === undefined;
		}

		// Search until we've collapsed the dimensions.
		while ( min < max ) {
			// Get the middle, truncated downwards.
			mid = ( min + max ) >> 1;
			item = array[mid];

			// Get the value as a property, or the element itself.
			if ( propName ) {
				val = item[propName];
			} else {
				val = item;
			}

			// Reduce the search.
			if ( val < key ) {
				min = mid + 1;
			} else if ( val > key ) {
				max = mid - 1;
			} else {
				// Found an exact match, keep going until we get the first (or last) match.
				found = mid;
				if ( last ) {
					min = mid + 1;
				} else {
					max = mid - 1;
				}
			}
		}

		if ( found !== null ) {
			// Found an exact match.
			return found;
		} else if ( min === 0 ) {
			// First item on the list.
			return min;
		} else {
			// If we don't have an exact match, we want the last value that is LESSER than the key.

			// Get the item and value.
			item = array[min];
			if ( propName ) {
				val = item[propName];
			} else {
				val = item;
			}

			// If the value is greater than the key, move back one.
			if ( val > key ) {
				min--;
			}

			return min;
		}
	};

	// Assuming an array of positions with top/left/width/height properties, find which one matches x/y coordinates.
	Get.Position = function ( positions, x, y ) {
		var pos,
			index = positions && positions.length;
		while ( index-- ) {
			pos = positions[index];
			if ( pos &&
				x >= pos.left &&
				x <= pos.left + pos.width &&
				y >= pos.top &&
				y <= pos.top + pos.height ) {
				return index;
			}
		}
		return -1;
	};

	// Save these static collections in the global namespace.
	scope.Make = Make;
	scope.Encode = Encode;
	scope.Decode = Decode;
	scope.Format = Format;
	scope.Compute = Compute;
	scope.Get = Get;

	// Object.keys polyfill.  Add support for old browsers to return the keys in an object as an array.
	if ( !Object.keys ) {
		Object.keys = ( function () {
			'use strict';
			var hasOwnProperty = Object.prototype.hasOwnProperty,
				hasDontEnumBug = !( { toString: null } ).propertyIsEnumerable( 'toString' ),
				dontEnums = [
					'toString',
					'toLocaleString',
					'valueOf',
					'hasOwnProperty',
					'isPrototypeOf',
					'propertyIsEnumerable',
					'constructor'
				],
				dontEnumsLength = dontEnums.length;

			return function ( obj ) {
				if ( typeof obj !== 'object' && ( typeof obj !== 'function' || obj === null ) ) {
					throw new TypeError( 'Object.keys called on non-object' );
				}

				var result = [], prop, i;

				for ( prop in obj ) {
					if ( hasOwnProperty.call( obj, prop ) ) {
						result.push( prop );
					}
				}

				if ( hasDontEnumBug ) {
					for ( i = 0; i < dontEnumsLength; i++ ) {
						if ( hasOwnProperty.call( obj, dontEnums[i] ) ) {
							result.push( dontEnums[i] );
						}
					}
				}
				return result;
			};
		}() );
	}
	// Object.values polyfill.  Add support for old browsers to return the values in an object as an array.
	if ( !Object.values ) {
		Object.values = ( function () {
			'use strict';
			var hasOwnProperty = Object.prototype.hasOwnProperty,
				hasDontEnumBug = !( { toString: null } ).propertyIsEnumerable( 'toString' ),
				dontEnums = [
					'toString',
					'toLocaleString',
					'valueOf',
					'hasOwnProperty',
					'isPrototypeOf',
					'propertyIsEnumerable',
					'constructor'
				],
				dontEnumsLength = dontEnums.length;

			return function ( obj ) {
				if ( typeof obj !== 'object' && ( typeof obj !== 'function' || obj === null ) ) {
					throw new TypeError( 'Object.values called on non-object' );
				}

				var result = [], prop, i;

				for ( prop in obj ) {
					if ( hasOwnProperty.call( obj, prop ) ) {
						result.push( obj[prop] );
					}
				}

				if ( hasDontEnumBug ) {
					for ( i = 0; i < dontEnumsLength; i++ ) {
						if ( hasOwnProperty.call( obj, dontEnums[i] ) ) {
							result.push( dontEnums[i] );
						}
					}
				}
				return result;
			};
		}() );
	}

	if ( scope.document && !scope.document.scrollBy ) {
		// Smoothly scroll by a certain amount.
		scope.document.scrollBy = function ( x, y, dur ) {
			var doc = this,
				wn = doc.defaultView,
				opt = doc._opt;
			if ( opt ) {
				this.scrollTo( opt.endX + x, opt.endY + y, dur );
			} else {
				this.scrollTo( wn.scrollX + x, wn.scrollY + y, dur );
			}
		};
		// Smoothly scroll to a position.
		scope.document.scrollTo = function ( x, y, dur ) {
			var doc = this,
				wn = doc.defaultView,
				opt = doc._opt;
			if ( opt ) {
				// If we're in the middle of an animation, cancel it.
				wn.cancelAnimationFrame( opt.frame );
				// Reset the beginning time.
				delete opt.begin;
			} else {
				// Initialize the animation options.
				opt = {};
				// Record the animation handler.
				opt.fn = function ( timestamp ) {
					var diff, percent, y;
					if ( !opt.begin ) {
						// Initialize the start time.
						opt.begin = timestamp;
						opt.frame = wn.requestAnimationFrame( opt.fn );
						return;
					} else {
						// How far along?
						diff = ( timestamp - opt.begin );
						percent = Math.min( 1, diff / opt.dur );
						// Swing easing.
						percent = 0.5 - Math.cos( percent * Math.PI ) / 2;
						x = ( percent * opt.diffX ) + opt.startX;
						y = ( percent * opt.diffY ) + opt.startY;

						// Set the scroll position.
						wn.scrollTo( x, y );

						if ( percent === 1 ) {
							// We're done.
							delete doc._opt;
						} else {
							// Ask for another frame.
							opt.frame = wn.requestAnimationFrame( opt.fn );
						}
					}
				};
				// Attach it to the document object.
				doc._opt = opt;
			}

			// Current scroll position.
			opt.startX = wn.scrollX;
			opt.startY = wn.scrollY;
			opt.endX = x;
			opt.endY = y;
			opt.diffX = opt.endX - opt.startX;
			opt.diffY = opt.endY - opt.startY;
			opt.dur = dur || 100;

			// Start the animation.
			opt.frame = wn.requestAnimationFrame( opt.fn );
		};
	}

	if ( !scope.JSON2 ) {
		// ISO8601
		var _date = /^\d{4}\-\d{2}\-\d{2}T\d\d\:\d\d/;
		// Keep a reference to the original standard parse function.
		var _parse = scope.JSON.parse;
		// Custom reviver checking for date values.
		function _dateReviver( key, value ) {
			if ( _date.test( value ) ) {
				return Make.Date( value ) || value;
			} else {
				return value;
			}
		}
		// Create a new JSON2 object in the global namespace.
		scope.JSON2 = {
			parse: function ( text, reviver ) {
				return _parse( text, reviver || _dateReviver );
			},
			tryparse: function ( text, reviver ) {
				try {
					return _parse( text, reviver || _dateReviver );
				} catch ( ex ) {
					return null;
				}
			}
		};
	}

	// Global function to completely kill an event bubble.
	scope.StopAll = function ( e ) {
		var p, stop, index;
		if ( e ) {
			stop = ['preventDefault', 'stopImmediatePropagation', 'stopPropagation'];
			index = 3;
			while ( index-- ) {
				p = stop[index];
				if ( e[p] ) {
					e[p]();
				}
			}
		}
		return false;
	};

	// CMS7 register script.
	if ( scope.register ) {
		scope.register( "static" );
	}

} )( this.jQuery, this );