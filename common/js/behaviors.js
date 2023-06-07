/// <reference path="j/jquery.2.x.js" />
/// <reference path="static.js" />

if ( window.registerLoading ) {
	registerLoading( "behaviors" );
}

( function ( factory ) {
	if ( typeof rrequire === "function" ) {
		// CMS7 rrequire function.
		rrequire( ["j/jquery", "static"], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
}( function ( $ ) {

	// Declare the static collections.
	var Behaviors = window.Behaviors || {},
		_behaviorsOn = false;

	Behaviors.Sticky = function () { };

	// Activate behaviors.
	Behaviors.On = function () {
		if ( !_behaviorsOn ) {
			$( document.body ).on( 'click', Behaviors.Tabs.Click );
			$( document.body ).on( 'change', Behaviors.Conditional.Change );
			_behaviorsOn = true;
		}
	};

	// Deactivate behaviors.
	Behaviors.Off = function () {
		if ( _behaviorsOn ) {
			$( document.body ).off( 'click', Behaviors.Tabs.Click );
			$( document.body ).off( 'change', Behaviors.Conditional.Change );
			_behaviorsOn = false;
		}
	};

	// Legacy for backwards compatibility -- behaviors are no longer set for a particular context.
	Behaviors.Tabs = function ( context ) {
		Behaviors.On();
	};

	// Legacy for backwards compatibility -- behaviors are no longer set for a particular context.
	Behaviors.Conditional = function ( context ) {
		Behaviors.On();
	};

	// Recursively find matching tabs and panels.
	function FindTabs( p, state, all ) {
		var el, name, arr,
			index = 0,
			len = p && p.childNodes && p.childNodes.length,
			type = null;

		if ( !state.parent ) {
			if ( !p ) return;
			if ( p.classList.contains( 'ui-tabs' ) ) {
				state.parent = p;
			} else {
				state.parent = p.closest( '.ui-tabs' );
				if ( !state.parent ) {
					return;
				}
			}
		}

		while ( index < len ) {
			el = p.childNodes[index++];
			if ( !el.classList ) {
				// Not an HTML node.
				continue;
			} else if ( el.classList.contains( 'ui-tab' ) ) {
				type = 'tabs';
			} else if ( el.classList.contains( 'ui-tab-panel' ) ) {
				type = 'panels';
			}

			if ( type ) {
				// What is the tab name?
				name = $( el ).data( 'tab' );
				if ( !name && type === 'tabs' ) {
					name = 'dynamictab_' + ( ++state.count );
					$( el ).data( 'tab', name );
				}
				if ( name ) {
					if ( type === 'tabs' ) {
						// Make sure we have the first and last.
						if ( !state.first ) {
							state.first = name;
						}
						state.last = name;
					}

					// Add it to the collection.
					arr = state[type][name];
					if ( !arr ) {
						state[type][name] = arr = [];
					}
					arr.push( el );

					// If this is active, note it for either tabs or panels.
					if ( el.classList.contains( 'active' ) ) {
						if ( !state.active ) {
							state.active = {};
						}
						state.active[name] = 1;
					} else if ( type === 'tabs' ) {
						if ( !state.active ) {
							// If we haven't yet found the active tab, keep updating the 'prev' one.
							state.prev = name;
						} else if ( !state.next ) {
							// If we have the active tab, and haven't yet set the 'next' one, do so.
							state.next = name;
						}
					}
				}
			}

			// Recurse if we've been asked for all, or haven't hit a nested tab.
			if ( all || !el.classList.contains( 'ui-tabs' ) ) {
				FindTabs( el, state, all );
			}
		}
	}

	// When clicking on a tab area.
	Behaviors.Tabs.Click = function ( e ) {
		var active, toggle, input, returnValue,
			// Check if we clicked on a link.
			linkData = Get.LinkData( e ),
			// Check if we clicked on a tab or a child of a tab.
			item = Get.Class( e, 'ui-tab', 3, 'ui-tabs' ),
			action = linkData.action && linkData.action.toLowerCase();

		// If we clicked on a link with a non-javascript url, don't activate the tabs.
		if ( linkData.href && ( !linkData.fn || action == 'trigger' ) ) {
			return;
		}

		// If we trigger a click on an input element, we'll let the even propagate.
		if ( e.target.nodeName === 'INPUT' ) {
			input = e.target;
		} else if ( e.target.nodeName === 'LABEL' && ( input = e.target.getAttribute( 'for' ) ) ) {
			input = document.getElementById( input );
		}
		switch ( input && input.getAttribute( 'type' ) ) {
			case 'checkbox':
			case 'radio':
				break;
			default:
				returnValue = false;
				break;
		}

		// If we clicked on a tab.
		if ( item ) {
			active = item.classList.contains( 'active' );
			toggle = item.classList.contains( 'ui-toggle' );

			if ( active && !toggle ) {
				// If the tab is already active, exit now.
				return returnValue;
			} else if ( toggle && Get.Class( e, 'no-toggle' ) ) {
				// If we clicked on a no-toggle child element inside a toggle tab, exit now.
				return returnValue;
			}

			// Set the tabs state.
			Behaviors.Tabs.Set( item, !active );

			return returnValue;
		}

		// If we clicked on a ui-tab-nav link.
		if ( linkData.action && linkData.link.classList.contains( 'ui-tab-nav' ) ) {
			switch ( linkData.action ) {
				case 'Next':
					// Activate the next tab.
					Behaviors.Tabs.Set( linkData.link, true, 1 );
					break;
				case 'Prev':
					// Activate the previous tab.
					Behaviors.Tabs.Set( linkData.link, true, -1 );
					break;
			}
		}
	};

	// Set a specific tabs state.
	function SetTabs( state, name, activate ) {
		var fn = activate ? 'addClass' : 'removeClass',
			evt = activate ? 'active' : 'inactive',
			tab = state.tabs[name],
			panel = state.panels[name];

		if ( tab && tab.length === 1 ) { tab = tab[0]; }
		if ( panel && panel.length === 1 ) { panel = panel[0]; }

		// Set the parent activetab attribute.
		if ( state.parent && state.parent ) {
			if ( name ) {
				state.parent.setAttribute( 'data-activetab', name );
			} else {
				state.parent.removeAttribute( 'data-activetab' );
			}
		}

		// Add or remove the active class.
		tab && $( tab )[fn]( 'active' );
		panel && $( panel )[fn]( 'active' );

		// Trigger the event.
		if ( panel ) {
			$( panel ).trigger( { type: evt, tab: tab, panel: panel } );
		} else if ( tab ) {
			$( tab ).trigger( { type: evt, tab: tab } );
		}
	}

	// Get all of the active tabs.
	Behaviors.Tabs.GetActive = function ( el ) {
		var state = Behaviors.Tabs.GetState( el );
		return state.active ? Object.keys( state.active ) : [];
	};

	Behaviors.Tabs.GetState = function ( el, all ) {
		var state;

		if ( el && el.jquery ) {
			// If we have a jquery object, get the underlying tab.
			el = el[0];
		}
		if ( !el || !el.childNodes ) {
			// If we don't have a valid starting point, exit.
			return;
		}

		// Build the tabs dictionary.
		state = {
			count: 0,
			parent: null,
			tabs: {},
			panels: {},
			active: null,
			first: null,
			last: null,
			next: null,
			prev: null
		};
		FindTabs( el, state, all === undefined ? true : all );;
		return state;
	};

	// Set an array of active tabs.
	Behaviors.Tabs.SetActive = function ( el, arr ) {
		var state, index, name;

		if ( !arr || !arr.length ) {
			return;
		}
		if ( el && el.jquery ) {
			// If we have a jquery object, get the underlying tab.
			el = el[0];
		}
		if ( !el || !el.childNodes ) {
			// If we don't have a valid starting point, exit.
			return;
		}

		// Build the tabs dictionary.
		state = {
			count: 0,
			parent: null,
			tabs: {},
			panels: {},
			active: null,
			first: null,
			last: null,
			next: null,
			prev: null
		};
		FindTabs( el, state, true );

		// Turn off any active tabs that do not match the new list.
		if ( state.active ) {
			for ( var p in state.active ) {
				if ( state.active.hasOwnProperty( p ) && arr.indexOf( p ) < 0 ) {
					SetTabs( state, p, false );
				}
			}
		}

		// Then turn on any remaining.
		index = arr.length;
		while ( index-- ) {
			name = arr[index];
			if ( !state.active || !state.active[name] ) {
				SetTabs( state, name, true );
			}
		}
	};

	// Set the tabs state of a particular element.
	Behaviors.Tabs.Set = function ( el, activate, name ) {
		var item, parent, state, validate, inputs, form;

		if ( typeof el === 'string' ) {
			// Check for a tab by name.
			el = document.querySelector( ".ui-tab[data-tab='" + el + "']" );
		}
		if ( el && el.jquery ) {
			// If we have a jquery object, get the underlying tab.
			el = el[0];
		}
		if ( !el || !el.childNodes ) {
			// If we don't have a valid starting point, exit.
			return;
		}

		// Get the parent container.
		item = $( el );
		if ( name && typeof name === 'string' && item.is( '.ui-tabs' ) ) {
			// The supplied element is a ui-tabs object, and we have a name, we have the parent already.
			parent = item;
		} else if ( item.is( '.ui-tab-panel' ) ) {
			// A ui-tab-panel object can sometimes itself be a ui-tabs container, so walk up the tree first.
			parent = item.parent().closest( '.ui-tabs' );
		} else {
			// Fetch the closest ui-tabs container.
			parent = item.closest( '.ui-tabs' );
		}

		// Build the tabs dictionary.
		state = {
			count: 0,
			parent: parent[0],
			tabs: {},
			panels: {},
			active: null,
			first: null,
			last: null,
			next: null,
			prev: null
		};
		FindTabs( parent[0], state );

		// Should we trigger validation on existing tabs before activating the new tab?
		validate = el.classList.contains( 'ui-validate' ) && $.html5form && $.html5form.validateGroup;
		if ( validate ) {
			// Find the visible inputs in the currently active panel.
			inputs = parent.find( ".ui-tab-panel.active" ).find( ":input:not(.ui-dialog-titlebar-close,button):visible" );
			form = inputs.closest( 'form' );
			if ( $.html5form.validateGroup( form, inputs ) === false ) {
				// If the validation method returns false, we will prevent the tabs from changing.
				return false;
			}
		}

		// If we're activating, get the tab name.
		if ( activate ) {
			if ( name > 0 ) {
				name = state.next || state.first;
			} else if ( name < 0 ) {
				name = state.prev || state.last;
			} else {
				name = name || item.data( 'tab' );
			}
		}

		if ( state.active ) {
			for ( var p in state.active ) {
				if ( !state.active.hasOwnProperty( p ) ) {
					continue;
				}
				// If we don't have a tab name to set, we're deactivating tabs, or if the name doesn't match.
				if ( !name || !activate || name !== p ) {
					// Turn the tab off.
					SetTabs( state, p, false );
				}
			}
		}

		if ( activate ) {
			// Turn the tab on.
			SetTabs( state, name, true );
		}

		// Redraw any elements that depend on window size.
		$( window ).trigger( 'resize' );
	};

	// Recursively find matching tabs and panels.
	function FindConditionals( p, state, name, itemValue ) {
		var el, panel, value, notvalue, active,
			index = 0,
			len = p && p.childNodes && p.childNodes.length;

		while ( index < len ) {
			el = p.childNodes[index++];
			if ( !el.classList ) {
				// Not an HTML node.
				continue;
			} else if ( el.classList.contains( 'ui-conditional-panel' ) && el.getAttribute( 'data-name' ) === name ) {
				// Get the panel data.
				panel = $( el );
				value = panel.data( 'value' );
				notvalue = panel.data( 'notvalue' );
				if ( notvalue === undefined ) { notvalue = panel.data( 'notValue' ); }
				active = false;

				if ( notvalue ) {
					// If we have a 'notvalue' property, than active means we DIDN'T get a match.
					active = !Behaviors.Conditional.Match( itemValue, notvalue );
				} else if ( value === undefined ) {
					// If the data-value is not defined, exit.
					continue;
				} else {
					// For a 'value' property, active means we got a match.
					active = Behaviors.Conditional.Match( itemValue, value );
				}

				if ( active ) {
					// Matching panel.
					state.panels.push( el );
				} else if ( el.classList.contains( 'active' ) ) {
					// Panel needs to be deactivated.
					state.active.push( el );
				}
			}

			// Recurse if we haven't hit a nested conditional.
			if ( !el.classList.contains( 'ui-conditionals' ) ) {
				FindConditionals( el, state, name, itemValue );
			}
		}
	}

	// When clicking on a tab area.
	Behaviors.Conditional.Change = function ( e ) {
		var parent, itemValue, state,
			item = e.target.classList.contains( 'ui-conditional' ) ? e.target : null,
			name = item && item.getAttribute( 'data-name' );

		// If we clicked on a tab.
		if ( name ) {
			item = $( item );
			parent = item.closest( '.ui-conditionals' );

			// Get the value of the item.
			itemValue = item.is( ':checkbox' ) ? ( item.prop( 'checked' ) ? item.val() || "on" : "" ) : item.val();

			state = {
				panels: [],
				active: []
			};
			FindConditionals( parent[0], state, name, itemValue );

			if ( state.active.length ) {
				// Deactivate any old panels.
				$( state.active ).removeClass( 'active' ).trigger( 'inactive' );
			}
			if ( state.panels.length ) {
				// Activate any new ones.
				$( state.panels ).addClass( 'active' ).trigger( 'active' );
			}

			// Redraw any elements that depend on window size.
			$( window ).trigger( 'resize' );
		}
	};

	Behaviors.Conditional.SetActive = function (el) {
		var set = el.find( '.ui-conditional[data-name]' );
		set.trigger( 'change' );
	}

	// Perform a conditional match.
	Behaviors.Conditional.Match = function ( value, compare ) {
		// Default is no match.
		var index,
			match = false;

		if ( compare === '*' ) {
			// Any value at all is a match.
			match = !!value;
		} else if ( value === '*' ) {
			match = true;
		} else if ( typeof compare === 'boolean' ) {
			// Compare as a bool
			match = ( compare === Make.Bool( value ) );
		} else if ( typeof compare === 'number' ) {
			// Compare as an int.
			match = ( compare === Make.Int( value ) );
		} else if ( !compare ) {
			// If the compare is empty, then a match is when the "value" is also empty.
			match = !value;
		} else {
			// Get the comparison as an array as needed.
			if ( typeof compare === 'string' && compare[0] === '[' ) {
				compare = compare.replace( /^\[|\]$/g, "" ).split( ',' );
			}

			if ( $.isArray( compare ) ) {
				// Check the elements the array.
				index = compare.length;
				while ( index-- ) {
					if ( compare[index] == value ) {
						// The match exits the loop.
						match = true;
						break;
					}
				}
			} else {
				// Perform a coerced equality comparison.
				match = ( compare == value );
			}
		}

		return match;
	};

	// Regex matches for specific classes.
	Behaviors.Classes = {
		"active": /(?:^| )active(?: |$)/,
		"ui-sticky": /(?:^| )ui\-sticky(?: |$)/,
		"ui-tabs": /(?:^| )ui\-tabs(?: |$)/,
		"ui-tab": /(?:^| )ui\-tab(?: |$)/,
		"ui-tab-panel": /(?:^| )ui\-tab\-panel(?: |$)/,
		"ui-toggle": /(?:^| )ui\-toggle(?: |$)/,
		"no-toggle": /(?:^| )no\-toggle(?: |$)/,
		"ui-conditionals": /(?:^| )ui\-conditionals(?: |$)/,
		"ui-conditional": /(?:^| )ui\-conditional(?: |$)/,
		"ui-conditional-panel": /(?:^| )ui\-conditional\-panel(?: |$)/,
		"ui-validate": /(?:^| )ui\-validate(?: |$)/
	};

	// Keyboard and mouse navigation on a top navigation element.
	Behaviors.TopNav = function ( context ) {
		var	// Parent nav.
			nav = context;

		// Activate any focused element.
		nav.on( 'focusin', function ( e ) {
			// Record the focus element and activate it.
			var focus = $( e.target ).closest( 'li' );

			if ( focus.is( '.active' ) ) {
				return;
			} else {
				focus.addClass( 'active' )
			}

			// Cancel any active classes in the navigation tree.
			nav.find( '.active' ).removeClass( 'active' );

			// Activate any parent LIs as well.
			focus.parentsUntil( this ).filter( 'li' ).addClass( 'active' );
		} );

		nav.on( 'mouseover mouseleave', function ( e ) {
			if ( e.type === 'mouseleave' ) {
				nav.find( '.active' ).removeClass( 'active' );
			} else if ( /^a$/i.test( e.target.nodeName || "" ) ) {
				e.target.focus();
			}
		} );
	};

	Behaviors.MobileNav = function ( context ) {
		var mobNav = context,
			targeted, check;

		mobNav.on( 'click', function ( e ) {
			// Find nearest targeted item
			targeted = $( e.target ).closest( 'li' ),

			// Is it the current active element
			check = targeted.hasClass( 'active' );

			// Remove current active
			mobNav.find( '.active' ).removeClass( 'active' );

			// If active element wasn't previously active add active class
			if ( !check ) {
				targeted.addClass( 'active' );
			}
		} );
	};

	// Save these static collections in the global namespace.
	window.Behaviors = Behaviors;

	// CMS7 register script.
	if ( window.register ) {
		window.register( "behaviors" );
	}

} ) );