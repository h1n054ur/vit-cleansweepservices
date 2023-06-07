/* Notes
 *
 * I wanted a sophisticated class to manage URIs, modeled after the .NET Uri class.  Each part of the URI is separated 
 * it's component properties.
 *
 * There is also a special QueryString method that gets or sets querystring values by case-insensitive key, automatically
 * handling escaping characters as needed. The querystring dictionary is case insensitive.
 *
 *		var uri = new URI( "http://www.google.com/?q=keyword&lang=en&name=joe%20doaks" );
 *		console.assert( uri.QueryString( "q" ) === "keyword" );
 *		console.assert( uri.QueryString( "name" ) === "joe doaks" );
 *		console.assert( uri.QueryString( "Name" ) === "joe doaks" );
 *		uri.QueryString( "Q", "keyword2" );
 *		uri.QueryString( "extra", "(word)" );
 *		console.assert( uri.toString() === "http://www.google.com/?q=keyword2&lang=en&extra=%28word%29" );
 *
 * Also, a relative URI can override an absolute one.
 *
 *		var uri = new URI( "http://www.website.com/path/to/page.html", "sub/page.html" );
 *		console.assert( uri.toString() === "http://www.website.com/path/to/sub/page.html" );
 *
 * The extend method can also be used with a dictionary of querystring terms.
 *
 *		var uri = new URI( window.location.href );
 *		uri.extend( { CallAjax: "UpdatePage", ID: 14 } );
 *
 * The property selector will return each part of the URI.
 *
 *		var uri = new URI( "http://www.google.com/?q=keyword&lang=en&name=joe%20doaks" );
 *		console.assert( uri.Scheme === 'http' );
 */

if ( window.registerLoading ) {
	registerLoading( "uri" );
}

( function ( scope ) {

	var hasOwn = Object.prototype.hasOwnProperty,
		// This segment has a required character at the beginning.
		pre = function ( val, character, out ) {
			if ( val && val[0] === character ) {
				// The character exists in the value.
				if ( out ) {
					// Remove it for an outbound (get) property.
					return val.substring( 1 );
				} else {
					// Leave it for an inbound (set) property.
					return val;
				}
			} else if ( !out && val ) {
				// Add it for an inbound (set) property.
				return character + val;
			} else {
				// Return the value unchanged.
				return val || "";
			}
		},
		// This segment has a required character at the end.
		post = function ( val, character, out ) {
			if ( val && val[val.length - 1] === character ) {
				// The character exists in the value.
				if ( out ) {
					// Remove it for an outbound (get) property.
					return val.substring( 0, val.length - 1 );
				} else {
					// Leave it for an inbound (set) property.
					return val;
				}
			} else if ( !out && val ) {
				// Add it for an inbound (set) property.
				return val + character;
			} else {
				// Return the value unchanged.
				return val || "";
			}
		},
		// Local encode function.
		_encode = function ( data ) {
			if ( !data ) {
				return "";
			} else {
				return encodeURIComponent( "" + data )
						// Allow a pipe in a querystring parameter.
						.replace( /%7C/gi, "|" )
						// Allow a comma in a querystring parameter.
						.replace( /%2C/gi, "," )
						// These characters aren't encoded by default, do it manually.
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
		},
		// Stolen from jQuery
		isPlainObject = function ( obj ) {
			if ( jQuery.type( obj ) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
				return false;
			}
			if ( obj.constructor &&
					!hasOwn.call( obj.constructor.prototype, "isPrototypeOf" ) ) {
				return false;
			}
			return true;
		},
		// URI constructor.
		URI = function ( url, relative, relative2 ) {
			// If this browser supports the define property, create getters and setters for private URI part variables.
			if ( Object.defineProperty ) {
				var scheme = undefined,
					userinfo = undefined,
					port = undefined,
					query = undefined,
					hash = undefined;

				// e.g. "http:"
				Object.defineProperty( this, 'Scheme', {
					get: function () {
						return post( scheme, ':', true );
					},
					set: function ( val ) {
						scheme = post( val, ':', false );
					}
				} );

				// e.g. "joe.doaks:pass1234@"
				Object.defineProperty( this, 'UserInfo', {
					get: function () {
						return post( userinfo, '@', true );
					},
					set: function ( val ) {
						userinfo = post( val, '@', false );
					}
				} );

				// e.g. ":8080"
				Object.defineProperty( this, 'Port', {
					get: function () {
						return pre( port, ':', true );
					},
					set: function ( val ) {
						port = pre( val, ':', false );
					}
				} );

				// e.g. "?prop=value"
				Object.defineProperty( this, 'Query', {
					get: function () {
						return pre( query, '?', true );
					},
					set: function ( val ) {
						query = pre( val, '?', false );
					}
				} );

				// e.g. "#anchor"
				Object.defineProperty( this, 'Hash', {
					get: function () {
						return pre( hash, '#', true );
					},
					set: function ( val ) {
						hash = pre( val, '#', false );
					}
				} );

				// Assembly the URI accessing the private variables behind the gettors.
				this.get = function ( relative ) {
					if ( !relative || userinfo || ( scheme && scheme != 'http:' && scheme != 'https:' ) ) {
						// User info (e.g. mailto:joe@doaks.com) and other schemes (e.g. tel;) can't ever be relative.
						return ( scheme || "" ) + ( this.Whack || "" ) + ( userinfo || "" ) + ( this.Host || "" ) + ( port || "" ) + ( this.Path || "" ) + ( query || "" ) + ( hash || "" );
					} else {
						// Url without scheme and domain
						return ( this.Path || "" ) + ( query || "" ) + ( hash || "" );
					}
				};
			} else {
				// Brower doesn't support defineProperty, so assemble the URI parts from the fields.
				this.get = function ( relative ) {
					if ( !relative || this.UserInfo || ( this.Scheme && this.Scheme != 'http:' && this.Scheme != 'https:' ) ) {
						return ( this.Scheme || "" ) + ( this.Whack || "" ) + ( this.UserInfo || "" ) + ( this.Host || "" ) + ( this.Port || "" ) + ( this.Path || "" ) + ( this.Query || "" ) + ( this.Hash || "" );
					} else {
						return ( this.Path || "" ) + ( this.Query || "" ) + ( this.Hash || "" );
					}
				};
			}

			// Map the toString method for backwards compatibility.
			this.toString = this.get;

			if ( url && typeof url === 'string' ) {
				// Parse the string.
				this.parse( url );
			} else if ( url && url.constructor === URI ) {
				// We already had a URI object, so copy the values.
				this.Scheme = url.Scheme;
				this.Whack = url.Whack;
				this.UserInfo = url.UserInfo;
				this.Host = url.Host;
				this.Port = url.Port;
				this.Path = url.Path;
				this.Query = url.Query;
				this.Hash = url.Hash;
			}

			if ( relative ) {
				this.extend( relative );
			}
			if ( relative2 ) {
				this.extend( relative2 );
			}
		};

	// Merge a set of values to the querystring dictionary.
	function mergeQueryString( q, values ) {
		var key,
			count = URI.count( q );

		for ( var name in values ) {
			if ( hasOwn.call( values, name ) ) {
				key = ( "" + name ).toLowerCase();
				setQueryString( q, key, name, values[name], count++ );
			}
		}
	}

	// Add a single key/value item to the querystring dictionary.
	function setQueryString( q, key, name, value, count ) {
		if ( count === undefined ) {
			count = URI.count( q );
		}
		q[key] = { name: name, value: value, index: count };
	}

	// Get or set a querystring value.
	URI.prototype.QueryString = function ( name, value ) {
		var key, item,
			// Parse the querystring into a case-insensitive dictionary.
			q = URI.parseQuery( this.Query ) || {};

		if ( !name ) {
			// Nothing to be done.
			return;
		} else if ( name && isPlainObject( name ) ) {
			// We have a dictionary of querystring parameters.
			mergeQueryString( q, name );
		} else {
			// Look for a matching item.
			key = ( "" + name ).toLowerCase();
			item = q[key];

			if ( value === undefined ) {
				// Return the item value if we found a match.
				return item ? item.value : undefined;
			} else if ( item ) {
				// Update the value of an existing item.
				item.value = value;
			} else {
				// Add a new item.
				setQueryString( q, key, name, value );
			}
		}

		// Reserialize the querystring.
		this.Query = URI.serialize( q );

		// Return the original object for chaining.
		return this;
	};

	// Remove one or more keys from the querystring collection.
	URI.prototype.RemoveQuery = function () {
		var q, key,
			keys = Array.prototype.slice.call( arguments ),
			len = keys.length,
			index = 0;

		if ( !len ) {
			return;
		} else {
			q = URI.parseQuery( this.Query );
			if ( !q ) {
				return;
			}
		}
		while ( index < len ) {
			delete q[keys[index++]];
		}
		this.Query = URI.serialize( q );

		// If we're doing a set, return the original object for chaining.
		return this;
	};

	// Parse uri string.
	URI.prototype.parse = function ( url ) {
		var m;
		if ( url && url[0] === '.' && url[1] === '/' ) {
		}
		m = /^(?:(\w{2,8}:)?(\/\/)?([\w\-\.:]+@)?([\w\-\.]+)(:\d+)?)?(\/?[^\?#]+)?(\?[^#]*)?(#.*)?$/.exec( url );
		if ( m ) {
			// Get the parts of the url.
			this.Scheme = m[1];
			this.Whack = m[2];
			this.UserInfo = m[3];
			this.Host = m[4];
			this.Port = m[5];
			this.Path = m[6];
			this.Query = m[7];
			this.Hash = m[8];

			// If we only have a host, then it is treated as the page path.
			if ( !this.Path && !this.Scheme && this.Host ) {
				this.Path = this.Host;
				this.Host = undefined;
			}
		}
		// Return the original object for chaining.
		return this;
	};

	// Extend the current URI with another.
	URI.prototype.extend = function ( data ) {
		var rel, _q;
		if ( !data ) {
			// No value supplied.
			return this;
		} else if ( data.constructor === URI ) {
			// We already have a URI object.
			rel = data;
		} else if ( typeof data === 'string' ) {
			// If we're overriding a uri with another relative one.
			if ( data[0] === '.' && ( data[1] === '/' || ( data[1] === '.' && data[2] === '/' ) ) ) {
				// We're adding a path relative to the current page.
				this.addChild( data );
			} else {
				// Parse a new url to use as the override.
				rel = new URI( data );
			}
		} else if ( data.constructor === Object ) {
			// If we're extending the querystring properties.
			_q = URI.parseQuery( data );
		} else {
			// Not compatible data type.
			return this;
		}

		if ( rel && rel.Path ) {
			// Override the full url.
			this.Scheme = rel.Scheme || this.Scheme;
			this.Host = rel.Host || this.Host;
			if ( rel.Path[0] === '/' ) {
				// If the relative path starts with a slash, assign it.
				this.Path = rel.Path;
			} else {
				// Otherwise set the new path relative to the current one.
				var path = this.Path.split( '/' );
				path.pop();
				this.Path = path.concat( rel.Path.split( '/' ) ).join( '/' );
			}
			this.Query = rel.Query;
			this.Hash = rel.Hash;
		} else {
			// If we have query data, we'll merge it.
			if ( rel && rel.Query ) {
				_q = URI.parseQuery( rel.Query );
			}
			if ( _q ) {
				// Get the current querystring data.
				var q = URI.parseQuery( this.Query ) || {},
					count = URI.count( q );

				// Iterate through the supplied values.
				for ( var p in _q ) {
					if ( hasOwn.call( _q, p ) ) {
						// Get the new and existing item by name.
						var newitem = _q[p],
							existing = q && q[p];

						if ( existing ) {
							// Update the value.
							existing.value = newitem.value;
						} else {
							// Fix the index and add the new item.
							newitem.index = count++;
							q[p] = newitem;
						}
					}
				}

				// Reserialize the updated Query.
				this.Query = URI.serialize( q );
			}

			// Override any hash property.
			if ( rel && rel.Hash ) {
				this.Hash = rel.Hash;
			}
		}
		return this;
	};

	// Take the supplied path and try to make it relative to the current page.
	URI.prototype.getRelative = function ( path ) {
		var segments1, segments2, index, start, len, str;

		if ( !path ) {
			// No supplied path.
			return null;
		} else if ( !this.Path || this.Path.length < 3 ) {
			// Root not long enough to be able to make a relative path.
			return path;
		}

		// Get the current path as a root (without page extensions), split into segments.
		segments1 = this.Path.replace( /(\.\w+|\/)$/, "" ).toLowerCase().replace( /^\//, "" ).split( '/' );
		// Get the supplied path split into segments as well.
		segments2 = path.replace( /^\/|\/$/g, "" ).split( '/' );

		// If we cannot map a relative path between these two urls, return it unchanged.
		if ( segments1.length < 1 || segments2.length < 1 || segments1[0] != segments2[0].toLowerCase() ) {
			return path;
		}

		index = 1;
		for ( ; index < segments1.length && index < segments2.length; index++ ) {
			// Break on the first segment that doesn't match.
			if ( segments1[index] != segments2[index].toLowerCase() ) {
				break;
			}
		}

		// If boths paths were a perfect match, return it unchanged.
		if ( index == segments1.length && index == segments2.length ) {
			return path;
		}

		// Get the part of the root that matches the supplied path.
		start = segments1.slice( 0, index ).join( "/" ).length + 2;

		if ( index == segments1.length ) {
			// A simple relative path, down from the current root position.
			return "./" + path.substring( start );
		} else {
			// Get the 'walk up the tree' parts.
			len = Math.max( 1, segments1.length - index );
			str = [];
			for ( var i = 0; i < len; i++ ) {
				str.push( ".." );
			}

			// Walk up the tree, then back down.
			return str.join( "/" ) + "/" + path.substring( start );
		}
	};

	// Merge a second path with 'walk up the tree' relative root commants.
	function mergeRelative( path1, path2 ) {
		var segments1 = path1.replace( /^\/|\/$/g, "" ).split( '/' );
		var segments2 = path2.split( '/' );
		while ( segments2[0] === '..' ) {
			segments1.pop();
			segments2.shift();
		}
		return "/" + segments1.concat( segments2 ).join( "/" );
	}

	// Take a current url and add a child path to it.  If the current path has an extension, treat the page name as part of the path.
	URI.prototype.addChild = function ( path ) {
		var parts, last;
		if ( !path ) {
			return this;
		} else if ( path[0] === '/' ) {
			this.extend( path );
		} else {
			if ( path === '.' ) {
				path = "";
			} else if ( path[0] === '.' && path[1] === '/' ) {
				path = path.substring( 2 );
			} else if ( path[0] === '.' && path[1] === '.' && path[2] === '/' ) {
				this.extend( mergeRelative( this.Path, path ) );
				return this;
			}
			parts = this.Path ? this.Path.split( '/' ) : ["", ""];
			last = parts[parts.length - 1];
			if ( !last ) {
				parts[parts.length - 1] = path;
			} else {
				last = last.replace( /\.\w+$/, "" );
				parts[parts.length - 1] = last;
				parts.push( path );
			}
			this.extend( parts.join( "/" ) );
		}
		return this;
	};

	// Get a case-insensitive querystring dictionary.
	URI.parseQuery = function ( data ) {
		if ( !data ) {
			return undefined;
		} else if ( data.constructor === Object ) {
			// The supplied value already is a key-value pair.
			var i = 0, _q = {};
			for ( var k in data ) {
				if ( hasOwn.call( data, k ) ) {
					// Save each querystring element.
					var v = data[k],
						p = k.toLowerCase();
					if ( v && v.name ) {
						_q[p] = v;
					} else {
						_q[p] = { name: k, value: v, index: i++ };
					}
				}
			}
			return _q;
		} else if ( typeof data === 'string' ) {
			// Serialized string data.
			if ( data[0] === '?' ) {
				data = data.substring( 1 );
			}
			var _q = {};
			var query = data.split( '&' );
			for ( var i = 0, len = query.length; i < len; i++ ) {
				// Save each querystring element.
				var v,
					pair = query[i].split( '=' ),
					k = pair[0],
					p = k.toLowerCase();

				if ( pair[1] === undefined ) {
					v = null;
				} else {
					v = decodeURIComponent(( "" + pair[1] ).replace( /\+/g, '%20' ) );
				}

				_q[p] = { name: k, value: v, index: i };
			}
			return _q;
		}
	};

	// Serialize a querystring dictionary into a string, sorted in its original order.
	URI.serialize = function ( data ) {
		if ( !data || typeof data === 'string' ) {
			// Nothing to process.
			return data;
		} else if ( data.constructor === Object ) {
			// Convert the dictionary to a list.
			var items = [];
			for ( var p in data ) {
				if ( hasOwn.call( data, p ) ) {
					items.push( data[p] );
				}
			}
			// Sort the items in sequence.
			items.sort( function ( q1, q2 ) {
				var i1 = typeof q1.index === 'number' ? q1.index : 9999;
				var i2 = typeof q2.index === 'number' ? q2.index : 9999;
				return i1 - i2;
			} );
			// Add each item.
			var query = [];
			for ( var i = 0, len = items.length; i < len; i++ ) {
				var k = items[i].name, v = items[i].value;
				if ( v === undefined ) {
					// Value was removed.
					continue;
				} else if ( v === null ) {
					// Null values only get the key.
					query.push( k );
				} else {
					// Add the key and value.
					query.push( k + '=' + _encode( v || "" ) );
				}
			}
			// Return the fininshed querystring.
			return query.join( '&' );
		} else {
			// Invalid data type.
			return null;
		}
	};

	// How many querystring elements are there?
	URI.count = function ( q ) {
		var count = 0;
		if ( q ) {
			// Count how many parameters we already have.
			for ( var p in q ) {
				if ( hasOwn.call( p, q ) ) {
					count++;
				}
			}
		}
		return count;
	};

	// Make this class public.
	scope.URI = URI;

	// CMS7 register script.
	if ( window.register ) {
		window.register( "uri" );
	}

} )( this );