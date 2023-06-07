/// <reference path="j/jquery.2.x.js" />
/// <reference path="j/jquery.ui.js" />
/// <reference path="static.js" />

if ( window.registerLoading ) {
	registerLoading( "extensions" );
}

( function ( factory ) {
	if ( typeof rrequire === "function" ) {
		// CMS7 rrequire function.
		rrequire( ["j/jquery", "j/jquery.ui", "static", "uri"], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
}( function ( $ ) {
	// Static value is this page running a screenshot.
	var SCREENSHOT = Make.Bool( new URI( window.location.href ).QueryString( 'screenshot' ) );

	var utils = {
		// Swap two positions of an array.
		swap: function ( array, a, b ) {
			var tmp = array[a];
			array[a] = array[b];
			array[b] = tmp;
		},

		// Separate part of an array into high/low.
		partition: function ( array, begin, end, pivot, fn ) {
			// Get the pivit point.
			var piv = array[pivot];
			utils.swap( array, pivot, end - 1 );

			// Move all items in front of or after the pivot point.
			var store = begin;
			var ix;
			for ( ix = begin; ix < end - 1; ++ix ) {
				if ( fn ? fn( array[ix], piv ) <= 0 : array[ix] <= piv ) {
					utils.swap( array, store, ix );
					++store;
				}
			}
			utils.swap( array, end - 1, store );

			return store;
		},

		// Perform a quicksort on a part of an array.
		quick: function ( array, begin, end, fn ) {
			if ( end - 1 > begin ) {
				// Get a pivot point.
				var pivot = begin + Math.floor( Math.random() * ( end - begin ) );

				// Partition the array in to pre-sorted halves.
				pivot = utils.partition( array, begin, end, pivot, fn );

				// Recursivly sort each half.
				utils.quick( array, begin, pivot, fn );
				utils.quick( array, pivot + 1, end, fn );
			}
		}
	};

	// Run a partition-exchange sort.
	Array.quickSort = function ( array, fn ) {
		utils.quick( array, 0, array.length, fn );
	};

	// Check for an item in an array, optionally matching a specific property.
	Array.indexOf = function ( array, item, prop ) {
		var index = array && array.length;

		while ( index-- ) {
			if ( prop === undefined ) {
				// If the property is undefined, compare the item directly.
				if ( array[index] == item ) {
					return index;
				}
			} else if ( array[index][prop] == item ) {
				return index;
			}
		}

		return -1;
	};

	var overflowRegex = /auto|scroll|(hidden)/;

	// Get the first parent element responsible for scrolling.
	$.fn.getScroller = function () {
		var el,
			fnScroller = function ( e ) {
				var $el = $( e );
				if ( e === document.body ) {
					return true;
				} else if ( el.scrollHeight - el.offsetHeight < 10 ) {
					return false;
				} else {
					$el = $( e );
					if ( $el.is( '.ui-scroll' ) ) {
						return true;
					} else {
						return overflowRegex.test( $el.css( "overflow" ) + $el.css( "overflow-y" ) + $el.css( "overflow-x" ) );
					}
				}
			};

		if ( !this.length ) {
			return $( [] );
		}

		el = this[0].parentNode;
		while ( el && !fnScroller( el ) ) {
			el = el.parentNode;
		}

		return $( el || document.body );
	};

	// Scroll the element into view.
	$.fn.scrollIntoView = function ( speed, margin ) {
		if ( this.is( ':visible' ) ) {
			var current, body, top, right, bottom, left, p, ph, pw, elements, fn,
				o = this.offset(),
				h = this[0].offsetHeight,
				w = this[0].offsetWidth,
				parent = this.getScroller(),
				m = Make.Int( margin ),
				s = Make.Int( speed ),
				scrolled = false;

			if ( parent.is( 'body' ) || parent.is( document ) ) {
				// We'll need to animate both of these for cross-platform compatibility.
				parent = $( 'body,html' );

				// But we'll get spacing exclusively off of the body.
				body = $( 'body' );

				// Get the current page scroll data.
				current = {
					left: Math.max( document.documentElement.scrollLeft, document.body.scrollLeft ),
					top: Math.max( document.documentElement.scrollTop, document.body.scrollTop ),
					spacing: Make.Int( body.css( 'margin-top' ) ) + Make.Int( body.css( 'padding-top' ) )
				};

				// Adjust the window scrollbar position for the padding and margin on the body.
				p = {
					left: current.left + Make.Int( body.css( 'margin-left' ) ) + Make.Int( body.css( 'padding-left' ) ),
					top: current.top + current.spacing
				};

				// And window dimensions.
				ph = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
				pw = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
			} else {
				// Get the current scroll position.
				current = {
					left: parent[0].scrollLeft,
					top: parent[0].scrollTop
				};

				// And parent element dimensions and position.
				p = parent.offset();
				ph = parent[0].clientHeight;
				pw = parent[0].clientWidth;
			}

			// Calculate the relative positions.
			top = p.top - o.top + m;
			bottom = o.top - ( p.top + ph ) + h + m + ( current.spacing || 0 );
			left = p.left - p.left + m;
			right = o.left - ( p.left + pw ) + w + m;

			// Get any scrollable zones to update after the scroll is finished.
			elements = this.closest( '.ui-scroll' );
			fn = function () {
				elements.trigger( 'update' );
			};

			// If we're animating the scroll position.
			if ( s > 0 ) {
				// Stop any existing animations.
				parent.stop();

				if ( top > 1 && current.top > 0 ) {
					// Move the item down.
					parent.animate( { scrollTop: Math.max( 0, current.top - top ) }, s, fn );
				} else if ( bottom > 1 ) {
					// Move the item up.
					parent.animate( { scrollTop: current.top + bottom }, s, fn );
				} else if ( left > 1 && current.left > 0 ) {
					// move the item left.
					parent.animate( { scrollLeft: Math.max( 0, current.left - left ) }, s, fn );
				} else if ( right > 1 ) {
					// Move the item right.
					parent.animate( { scrollLeft: current.left + right }, s, fn );
				}
			} else {
				// Othwerwise, change the scrollbar at once.
				if ( top > 1 && current.top > 0 ) {
					// Move the item down.
					parent.prop( 'scrollTop', Math.max( 0, current.top - top ) );
					scrolled = true;
				} else if ( bottom > 1 ) {
					// Move the item up.
					parent.prop( 'scrollTop', current.top + bottom );
					scrolled = true;
				} else if ( left > 1 && current.left > 0 ) {
					// move the item left.
					parent.animate( 'scrollLeft', Math.max( 0, current.left - left ) );
					scrolled = true;
				} else if ( right > 1 ) {
					// Move the item right.
					parent.prop( 'scrollLeft', current.left + right );
					scrolled = true;
				}

				// Trigger the update if we scrolled anything.
				if ( scrolled ) {
					fn();
				}
			}

			if ( !parent.is( 'body' ) ) {
				parent.scrollIntoView( speed, margin );
			}
		}

		return this;
	};

	// Is the element visible in the viewport (or anywhere on the page)?
	function is_visible( el, viewport ) {
		var bounds, offsetX, offsetY, style;

		// If we're checking for 'visible in the viewport'
		if ( viewport > 0 || viewport < 0 ) {
			bounds = el.getBoundingClientRect();
			if ( !bounds.width && !bounds.height ) {
				// If we have no bounding dimensions, it's not visible.
				return false;
			}

			// If we're doing a screenshot, everything is considered visible.
			if ( SCREENSHOT ) {
				return true;
			}

			if ( !win_dim ) {
				// Cache the window dimensions.
				style = window.getComputedStyle( document.body );
				win_dim = {
					top: parseFloat( style.paddingTop ) + parseFloat( style.marginTop ),
					right: window.innerWidth,
					bottom: window.innerHeight,
					left: parseFloat( style.paddingLeft ) + parseFloat( style.marginLeft )
				};
			}

			// How much of the item should be in the viewport before it is considered "visible".
			if ( viewport < 1 && viewport > -1 ) {
				// Percentage based.
				offsetX = Math.round( Math.min( viewport * win_dim.right, viewport * bounds.width ) );
				offsetY = Math.round( Math.min( viewport * win_dim.bottom, viewport * bounds.height ) );
			} else {
				// Pixel dimensions.
				offsetX = Math.min( viewport, bounds.width );
				offsetY = Math.min( viewport, bounds.height );
			}

			if ( bounds.top + offsetY > win_dim.bottom ) {
				// Below the viewport.
				return false;
			} else if ( bounds.right - offsetX < win_dim.left ) {
				// To the left of the viewport.
				return false;
			} else if ( bounds.bottom - offsetY < win_dim.top ) {
				// Above the viewport.
				return false;
			} else if ( bounds.left + offsetX > win_dim.right ) {
				// To the right of the viewport.
				return false;
			}
			// Visible!
			return true;
		} else {
			// Does it have any dimensions on the page?
			return !!( el.offsetWidth || el.offsetHeight || el.getClientRects().length );
		}
	}

	var win_dim = null;

	function check_visibility( e ) {
		var item, el, visible, j, len2, handler,
			i = 0;

		if ( e && e.type === 'resize' ) {
			// Reset the cached window dimensions.
			win_dim = null;
		}

		while ( i < global_onvisible.length ) {
			item = global_onvisible[i];

			el = item && item.element;
			if ( !el || !el.ownerDocument || !el.ownerDocument.body.contains( el ) ) {
				// Remove invalid items.
				global_onvisible.splice( i, 1 );
				continue;
			}

			// Check visiblity.
			visible = is_visible( el, item.viewport );
			if ( visible ) {
				// Run any handlers.
				j = 0;
				len2 = item.handlers.length;
				while ( j < len2 ) {
					item.handlers[j++].call( item.element, { type: 'visible', target: el }  );
				}
				// Remove it from the collection.
				global_onvisible.splice( i, 1 );
				continue;
			}

			i++;
		}

		if ( !global_onvisible.length ) {
			$( window ).off( 'resize', check_visibility );
			$( window ).off( 'scroll', check_visibility );
		}
	}

	var global_onvisible = [];

	// Run a handler when an element is visible.
	$.fn.onvisible = function ( handler, viewport ) {
		var cls, len1, i, el, visible, j, len2, next, item, bind;

		// If the handler is a string, it assumed to be a class that is added upon visiblity.
		if ( typeof handler === 'string' && !/[^\w \-]/.test( handler ) ) {
			cls = handler;
			handler = function () {
				$( this ).addClass( cls );
			};
		}

		// Validate the inputs.
		len1 = this.length;
		if ( !len1 || !$.isFunction( handler ) ) {
			return this;
		}
		handler.guid = handler.guid || jQuery.guid++;
		viewport = viewport === true ? 1 : Make.Float( viewport );

		// Wire up each of the elements.
		i = 0;

		while ( i < len1 ) {
			el = this[i++];

			// If it's currently visible, fire the handler.
			visible = is_visible( el, viewport );
			if ( visible ) {
				handler.call( el, { type: 'visible', target: el } );
				continue;
			}

			// Check if this element is already being monitored.
			item = null;
			j = 0;
			len2 = global_onvisible.length;
			while ( j < len2 ) {
				next = global_onvisible[j++];
				if ( next.element === el && next.viewport === viewport ) {
					item = next;
					break;
				}
			}

			if ( !item ) {
				// Build the item.
				item = { element: el, handlers: [handler], viewport: viewport };

				// Do we need to wire up the events from scratch?
				if ( !global_onvisible.length ) {
					bind = true;
				}

				// Add it to the collection.
				global_onvisible.push( item );

				// Move onto the next item.
				continue;
			}

			// Check if the handler is already being monitored for this item.
			j = 0;
			len2 = item.handlers.length;
			while ( j < len2 ) {
				if ( item.handlers[j++].guid === handler.guid ) {
					// Found a match, null it out so it won't get added a second time.
					handler = null;
					break;
				}
			}
			if ( handler ) {
				item.handlers.push( handler );
			}
		}

		if ( bind ) {
			// Reset the cached window dimensions, in case it's out of date.
			win_dim = null;

			// Check visiblity after a resize or scroll.
			$( window ).onidle( 'resize', check_visibility, 50 );
			$( window ).onidle( 'scroll', check_visibility, 50 );
		}

		return this;
	};

	// Unbind any onvisible event.
	$.fn.offvisible = function ( handler ) {
		var i, item, el, fn;

		// Look through the global visible handlers backwards.
		i = global_onvisible.length;
		while ( i-- ) {
			// Get the next item.
			item = global_onvisible[i];

			// Loop through the jquery collection of elements.
			for ( var j = 0; j < this.length; j++ ) {
				// Check for a matching element.
				el = this[j];
				if ( item.element === el ) {
					if ( !handler || !handler.guid ) {
						// Unbind all handklers.
						global_onvisible.splice( i, 1 );
						break;
					} else {
						// Unbind any matching handlers.
						for ( var k = 0; k < item.handlers.length; k++ ) {
							var fn = item.handlers[k];
							if ( fn.guid == handler.guid ) {
								item.handlers.splice( k, 1 );
							}
						}
						// If there's nothing left, remove the entry.
						if ( item.handlers.length === 0 ) {
							global_onvisible.splice( i, 1 );
							break;
						}
					}
				}
			}
		}
		return this;
	};

	// Bind an event to run when the browser is idle.  Each time the event fires it refreshes the timer, with
	// the handler only running when the timer runs out.
	$.fn.onidle = function () {
		var args, index, wait, fn, proxy;

		// Clone the arguments array.
		args = Array.prototype.slice.call( arguments );

		// Look for the wait value.
		index = args.length;
		while ( index-- ) {
			if ( typeof args[index] === 'number' ) {
				// Remove wait from the arguments.
				wait = args.splice( index, 1 )[0];
				break;
			}
		}

		if ( wait ) {
			// Look for the original handler.
			index = args.length;
			while ( index-- ) {
				if ( $.isFunction( args[index] ) ) {
					fn = args[index];
					break;
				}
			}
		}

		if ( fn ) {
			// Wrap the function in a proxy.
			proxy = function () {
				// Save the context.
				var context = this,
					args = Array.prototype.slice.call( arguments );

				// If we already have a timer, clear it.
				if ( fn.timer ) {
					clearTimeout( fn.timer );
				}

				// Start a new timeout to execute the original function under the correct context.
				fn.timer = setTimeout( function () {
					clearTimeout( fn.timer );
					fn.timer = null;
					fn.apply( context, args );
				}, wait );
			};

			if ( fn.guid ) {
				proxy.guid = fn.guid;
			}

			// Replace the original handler with the proxy in the arguments.
			args[index] = proxy;
		}

		// Run the native 'on' with the new handler.
		this.on.apply( this, args );

		// Copy the guid if it was just added.
		if ( proxy && proxy.guid && !fn.guid ) {
			fn.guid = proxy.guid;
		}

		// Return the original event for chaining.
		return this;
	};

	// Bind a mouseclick event that checks for the mouse coordinates inside a specific area.
	// Used for detecting clicks on ::before or ::after content in the corners of an object.
	$.fn.clickin = function () {
		var args, index, coords, selector, fn, proxy;

		// Clone the arguments array.
		args = Array.prototype.slice.call( arguments );

		// Look for the wait value.
		index = args.length;
		while ( index-- ) {
			if ( $.isPlainObject( args[index] )) {
				// Remove coords from the arguments.
				coords = args.splice( index, 1 )[0];
				break;
			} else if ( typeof args[index] === 'string' ) {
				// Remove selector from the arguments.
				selector = args.splice( index, 1 )[0];
			} else if ( $.isFunction( args[index] ) ) {
				// Remove the handler from the arguments.
				fn = args.splice( index, 1 )[0];
			}
		}

		if ( !coords || !fn ) {
			console.log( 'Invalid parameters for the clickin' );
			return this;
		}

		// Wrap the function in a proxy.
		proxy = function ( e ) {
			var right, bottom,
				args = Array.prototype.slice.call( arguments ),
				el = selector ? $( e.target ).closest( selector ) : $( this ),
				o = el.offset(),
				x = e.pageX + ( coords.x || 0 ),
				y = e.pageY + ( coords.y || 0 );

			if ( coords.left && ( x - o.left ) > coords.left ) {
				return;
			}
			if ( coords.top && ( y - o.top ) > coords.top ) {
				return;
			}
			if ( coords.right && ( o.left + el.width() - x ) > coords.right ) {
				return;
			}
			if ( coords.bottom && ( o.top + el.height() - y ) > coords.bottom ) {
				return;
			}
			if ( selector ) {
				e.target = el[0];
			}
			fn.apply( this, args );
		};

		if ( fn.guid ) {
			proxy.guid = fn.guid;
		}

		// Set up the arguments array to wire up a standard click.
		args.unshift( proxy );
		args.unshift( 'click' );

		// Run the native 'on' with the new handler.
		this.on.apply( this, args );

		// Copy the guid if it was just added.
		if ( proxy.guid && !fn.guid ) {
			fn.guid = proxy.guid;
		}

		// Return the original event for chaining.
		return this;
	};

	if ( $.ui && $.ui.dialog ) {
		// Hide the dialog by adding a class.
		$.ui.dialog.prototype._hide = function ( element, options, callback ) {
			this._trigger( "beforeclose" );
			element.addClass( 'dialog-out' );
			setTimeout( function () {
				element.hide().removeClass( 'dialog-out' );
				$.isFunction( callback ) && callback.call( element[0] );
			}, 400 );
		};

		$.ui.dialog.prototype._destroyOverlay = function () {
			if ( !this.options.modal ) {
				return;
			}

			if ( this.overlay ) {
				var overlays = this.document.data( "ui-dialog-overlays" ) - 1;

				if ( !overlays ) {
					this._off( this.document, "focusin" );
					this.document.removeData( "ui-dialog-overlays" );
				} else {
					this.document.data( "ui-dialog-overlays", overlays );
				}

				// Add an out class and remove it on a timeout.
				var overlay = this.overlay;
				overlay.addClass( 'out' );
				setTimeout( function () { overlay.remove(); }, 300 );

				// Null out the overlay reference now.
				this.overlay = null;
			}
		};

		// Add the function keys.
		$.extend( $.ui.keyCode, {
			F1: 112,
			F2: 113,
			F3: 114,
			F4: 115,
			F5: 116,
			F6: 117,
			F7: 118,
			F8: 119,
			F9: 120
		} );
	}

	// Simple alert widget.
	window.$alert = function ( message, onclose ) {
		// Get the default options.
		var fn, o = $.extend( true, {}, $alert.options );

		if ( $.isPlainObject( onclose ) ) {
			// If key-value pair data is supplied on the second argument, add them to the options.
			$.extend( o, onclose );
		} else if ( $.isFunction( onclose ) ) {
			// If the second argument is a function, set it as the onclose event.
			fn = o.close;
			o.close = function () {
				// Run the supplied onclose event.
				onclose.apply( this, arguments );
				// Run the original close function.
				fn.apply( this, arguments );
			};
		}

		if ( message.indexOf( '<' ) < 0 ) {
			o.dialogClass += ' icon';
		}

		return $( '<div></div>' ).html( message || "" ).dialog( o );
	};

	// Simple confirm widget.
	window.$confirm = function ( message, onconfirm, oncancel ) {
		// Get the default options.
		var fn, o = $.extend( true, { confirmed: false }, $alert.options, $confirm.options );

		if ( $.isPlainObject( onconfirm ) ) {
			// If key-value pair data is supplied on the second argument, add them to the options.
			$.extend( o, onconfirm );
		} else if ( $.isFunction( onconfirm ) ) {
			// If the second argument is a function, set it as the onconfirm event.
			o.confirm = onconfirm;
		}

		// If the third option is an onclose event, add it to the default close event.
		if ( $.isFunction( oncancel ) ) {
			fn = o.close;
			o.close = function () {
				var confirmed = $( this ).dialog( 'option', 'confirmed' );
				if ( !confirmed ) {
					// Run the supplied oncancel event if the user hasn't confirmed.
					oncancel.apply( this, arguments );
				}
				// Run the original close function.
				fn.apply( this, arguments );
			};
		}

		return $( '<div></div>' ).html( message || "" ).dialog( o );
	};

	// Simple popup widget that will load local url.
	window.$popup = function ( url, options) {
		// Get the default options.
		var o = $.extend( true, {}, $alert.options, $popup.options, options ),
			fn = o.open;

		if ( !url || url[0] !== '/' || url[1] === '/' ) {
			console.log( 'Invalid url for popup' );
			return;
		}

		// Load the url on open.
		o.open = function () {
			var el = $( this ),
				args = Array.prototype.slice.call( arguments );

			el.loading();
			$.ajax( {
				url: url,
				success: function ( html ) {
					// Get the position setting.
					var pos = el.dialog( 'option', 'position' );

					// Update the html and re-set the position.
					el.loading( 'done' ).html( html ).parent().position( pos );

					if ( $.isFunction( fn ) ) {
						// Run any supplied open function.
						fn.apply( el[0], args );
					}
				}
			} );
		};

		$( '<div></div>' ).dialog( o );
	};

	// Default alert options.
	window.$alert.options = {
		create: function () {
			$( this ).parent().css( { position: 'fixed' } );
		},
		modal: true,
		resizable: false,
		dialogClass: 'cms-alert ui-noselect',
		width: 'css',
		height: 'css',
		close: function () {
			$( this ).dialog( 'destroy' );
			$( this ).remove();
		},
		buttons: [
			{ text: 'OKAY', click: function () { $( this ).dialog( 'close' ); } }
		]
	};

	// Default confirm options.
	window.$confirm.options = {
		buttons: [
			{
				text: 'YES',
				click: function () {
					var wz = $( this ),
						fn = wz.dialog( 'option', 'confirm' );

					// Note that the user has confirmed the option.
					wz.dialog( 'option', 'confirmed', true );

					// Run any onconfirm method.
					if ( $.isFunction( fn ) ) {
						fn.apply( this, arguments );
					}

					// Close the confirmation box.
					$( this ).dialog( 'close' );

				}
			},
			{ text: 'NO', click: function () { $( this ).dialog( 'close' ); } }
		]
	};

	// Default popup options.
	window.$popup.options = {
		dialogClass: 'cms-popup daylight',
		buttons: [
			{ text: 'CLOSE', click: function () { $( this ).dialog( 'close' ); } }
		]
	};

	// CMS7 register script.
	if ( window.register ) {
		window.register( "extensions" );
	}

} ) );