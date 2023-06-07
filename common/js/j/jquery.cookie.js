/// <reference path="jquery.js" />
/// <reference path="../static.js" />

/*
 * jQuery Cookie Plugin v1.4.1
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2006, 2014 Klaus Hartl
 * Released under the MIT license
 */

if ( window.registerLoading ) {
	registerLoading( "j/jquery.cookie" );
}

( function ( factory ) {
	if ( typeof rrequire === "function" ) {
		// CMS7 require function.
		rrequire( ["j/jquery", "j/timezone", "static"], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
}( function ( $ ) {

	var pluses = /\+/g;

	function encode( s ) {
		return config.raw ? s : encodeURIComponent( s );
	}

	function decode( s ) {
		return config.raw ? s : decodeURIComponent( s );
	}

	function stringifyCookieValue( value ) {
		return Encode.Cookie( value, config.json );
	}

	function parseCookieValue( s ) {
		return Decode.Cookie( s, config.json );
	}

	function read( s, converter ) {
		var value = config.raw ? s : parseCookieValue( s );
		return $.isFunction( converter ) ? converter( value ) : value;
	}

	var config = $.cookie = function ( key, value, options ) {

		// Write

		if ( arguments.length > 1 && !$.isFunction( value ) ) {

			// Don't set cookies
			if ( document.cookie.indexOf( 'COOK=NO!' ) > -1 ) {
				return;
			}

			options = $.extend( {}, config.defaults, options );

			// If we're setting a null value, treat it as a 'remove'.
			if ( value === null ) {
				options.expires = -1;
			}

			if ( typeof options.expires === 'number' ) {
				var days = options.expires, t = options.expires = new Date();
				t.setMilliseconds( t.getMilliseconds() + days * 864e+5 );
			}

			return ( document.cookie = [
				encode( key ), '=', stringifyCookieValue( value ),
				options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
				options.path ? '; path=' + options.path : '',
				options.domain ? '; domain=' + options.domain : '',
				options.secure ? '; secure' : ''
			].join( '' ) );
		}

		// Read

		var result = key ? undefined : {},
			// To prevent the for loop in the first place assign an empty array
			// in case there are no cookies at all. Also prevents odd result when
			// calling $.cookie().
			cookies = document.cookie ? document.cookie.split( '; ' ) : [],
			i = 0,
			l = cookies.length;

		for ( ; i < l; i++ ) {
			var parts = cookies[i].split( '=' ),
				name = decode( parts.shift() ),
				cookie = parts.join( '=' );

			if ( key === name ) {
				// If second argument (value) is a function it's a converter...
				result = read( cookie, value );
				break;
			}

			// Prevent storing a cookie that we couldn't decode.
			if ( !key && ( cookie = read( cookie ) ) !== undefined ) {
				result[name] = cookie;
			}
		}

		return result;
	};

	config.defaults = { path: '/' };

	$.removeCookie = function ( key, options ) {
		// Must not alter options, thus extending a fresh object...
		$.cookie( key, '', $.extend( {}, options, { expires: -1 } ) );
		return !$.cookie( key );
	};

	// CMS7 ensure we have a time zone set.
	if ( $.cookie( '_tz' ) === undefined && document.cookie.indexOf( 'COOK=NO!' ) < 0 ) {
		$.cookie(
			'_tz',
			jstz.determine().name() || "",
			{ expires: 365, path: '/' }
		);
	}

	// CMS7 register script.
	if ( window.register ) {
		window.register( "j/jquery.cookie" );
	}

} ) );