if ( window.registerLoading ) {
	registerLoading( "m/ajaxify" );
}

( function ( factory ) {
	if ( typeof rrequire === "function" ) {

		// CMS7 rrequire function.
		rrequire( ["j/jquery", "j/jquery.ui", "static", "extensions", "c/loading", "form"], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
}( function ( $ ) {

	var parseJson = function ( text, reviver ) { return ( window.JSON2 || JSON ).parse( text, reviver ) };

	var hasOwn = Object.prototype.hasOwnProperty;

	$.widget( "cms.ajaxify", {
		options: {
			loading: true,
			searchDelay: 400,
			scrollPaging: 10,
			deferred: false,
			increment: 10
		},

		_create: function () {
			var _fnSearch;

			this.id = this.element.attr( 'id' );

			// Get any options defined as direct data properties.
			this._updateOptions();

			// Wire up the main events.
			this.element.on( 'click', $.proxy( this._handleClick, this ) );
			this.element.on( 'keydown', $.proxy( this._handleKeydown, this ) );

			// Wire up the change and the input to the same onidle function so one will clear the timeout of the other.
			_fnSearch = $.proxy( this._handleSearch, this );
			this.element.onidle( 'change', _fnSearch, 10 );
			this.element.onidle( 'input', _fnSearch, this.options.searchDelay );

			// Capture the submit event on the parent form.
			this.form = this.element.closest( 'form' );//.on( 'submit', $.proxy( this.submit, this ) );

			this._lastData = null;
			this._lastButton = null;
			this._lastSearch = JSON.stringify( this.getData() );
			this._lastScroll = null;
			this._lastAuto = null;

			// Autoupdate queue (only one allowed at a time, in case an update happens before an insert is processed).
			// Null = nothing running
			// [] = something running, nothing in the queue.
			// [item] = something running, something, in the queue.
			this.autoqueue = null;

			if ( !this.options.deferred ) {
				// Trigger the load.
				this.load();
			}

			if ( this.options.draggable ) {
				this.element.draggable( {
					axis: this.options.dragAxis === 'xy' ? false : 'y',
					handle: 'a.ui-drag',
					cursorAt: this.options.dragAxis === 'xy' ? { top: 25, left: 25 } : { top: 25 },
					helper: function ( e ) {
						var handle,
							el = $( e.target ).closest( "tr, [data-role='tr']" );

						if ( el.is( 'tr' ) ) {
							el.children().each( function ( i ) {
								var w = $( this ).width();
								$( this ).css( 'width', w + 'px' );
							} );
						} else if ( !el.length ) {
							console.log( "Couldn't find a tr or data-role='tr' for dragging." );
							return null;
						}
						handle = el.clone().appendTo( el.parent() );
						return handle;
					},
					start: $.proxy( this._drag, this ),
					drag: $.proxy( this._dragging, this ),
					stop: $.proxy( this._drop, this )
				} );
			}

			this.options.html5 = !!this.element.closest( "form[data-html5='1']" ).length;
		},

		// Handle any specialized load functions.
		load: function () {
			// Activate any client-side filtering.
			var elements = this.element.find( "[data-filter]:input" ),
				filterBy = elements.length && $.cms.ajaxify.getValues( elements );

			this._init();

			if ( filterBy ) {
				this.filterBy( filterBy );
			}

			if ( typeof USE !== 'undefined' ) {
				USE.Replace();
			}

			this._trigger( 'load' );
		},

		// Initialize the grid (fired on the first load).
		_init: function () {
			if ( this._initialized ) {
				return;
			} else {
				this._initialized = true;

				if ( this.options.infinite ) {
					if ( !this.options.ajaxreplace ) {
						console.log( 'Infinite loading requires the ajaxreplace property to be set' );
						return;
					}
					// Wire up the infinite scrolling event.
					$( window ).onidle( 'scroll', 150, $.proxy( this._infinite, this ) );

					// Check to see if we need to trigger an initial more.
					this._infinite();
				}

				this._trigger( '_init' );
			}
		},

		// Get any data attributes of the original element and convert them into options.
		_updateOptions: function ( e ) {
			var val,
				data = this.element.data();

			for ( var p in data ) {
				if ( hasOwn.call( data, p ) ) {
					val = data[p];
					if ( val && val.widgetName ) {
						// Skip over any widget classes defined in the data collection.
						continue;
					} else if ( val !== undefined ) {
						// Everything else is fair game.
						this.options[p] = val;
					}
				}
			}
		},

		// When clicking on an ajax grid.
		_handleClick: function ( e ) {
			var fn, opt,
				target = $( e.target ),
				data = Get.LinkData( e ),
				link = data.link && $( data.link ),
				confirm = link && link.data( 'confirm' ),
				title = link && link.data( 'title' );

			// Check for a 'confirm' message before executing this click.
			if ( confirm ) {
				if ( !link.data( 'confirmed' ) ) {
					// Convert line feeds to line breaks.
					if ( confirm.indexOf( '<' ) < 0 ) {
						confirm = confirm.replace( /\n/g, '<br>' );
					}

					fn = function () {
						// When confirmed, set that it is confirmed and re-trigger the event.
						link.data( 'confirmed', true );
						link.click();
					};

					if ( window.$8 && $8.Dialog ) {
						if ( !title ) title = 'Are you sure?';
						var opt = {
							title: title,
							message: confirm,
							onconfirm: fn
						};
						if ( data.action.indexOf( 'Delete' ) > -1 ) opt.icon = 'trash';
						$8.Dialog.Confirm( opt );
					} else {
						// If the target is not already marked as confirmed, run the popup first.
						$confirm( confirm, fn );
					}
					return StopAll( e );
				} else {
					// If the button WAS confirmed, reset this flag (just in case we need to retrigger this event later).
					link.data( 'confirmed', false );
				}
			}

			if ( target.is( ':submit,:image,:button' ) ) {
				// Record the last button clicked.
				this._lastButton = target;

				// Exit here.
				return;
			}

			// Null out the last button.
			this._lastButton = null;

			// Check for an event click.
			switch ( ( data.action || "" ).toLowerCase() ) {
				case 'edit':
				case 'details':
					this.edit( target.closest( "[data-key]" ).data( 'key' ), e );
					break;
				case 'save':
					this.save( e );
					break;
				case 'saveinsert':
					this.saveInsert( e, 1 );
					break;
				case 'cancel':
				case 'close':
					this.cancel( e );
					break;
				case 'delete':
					this["delete"]( target.closest( "[data-key]" ).data( 'key' ), e );
					break;
				case 'next':
					this.navigate( 1, true, e );
					break;
				case 'prev':
					this.navigate( -1, true, e );
					break;
				case 'start':
					this.navigate( 1, false, e );
					break;
				case 'end':
					this.navigate( -1, false, e );
					break;
				case 'more':
					this.more( null, e );
					break;
				case 'add':
					this.add( e );
					break;
				case 'insert':
					this.insert( e, 1 );
					break;
				case 'clear':
					this.clearField( e );
					break;
				case 'clearall':
					this.clearField( e, true );
					break;
				case 'sort':
					this._sortLink( $( data.link ), e );
					break;
				case 'reload':
					this.reload( e );
					break;
				case 'trigger': // Force an event past a popinto - it is greedy
					// Fire any subscribed event.
					return this._trigger( 'click', e, data );
				default:
					if ( data.href && ( !data.fn || data.fn != 'void' ) ) {
						// If we clicked on a link with a regular href, or a non-void javascript function.
						// let the default event propagate.
						return this._trigger( 'click', e, data );
					} else if ( this.options.popinto ) {
						// If we're doing a popinto, clicking on an element selects the row.
						if ( !target.closest( '[data-noselect]' ).length ) {
							this.select( target, e );
						}
					}
					// Fire any subscribed event.
					return this._trigger( 'click', e, data );
			}

			// Cancel any propagation of this event, it's already been handled.
			return false;

		},

		_handleKeydown: function ( e ) {
			var parents, buttons,
                target = $( e.target ),
                greedy = target.data('greedy-keys');

            // If the enter key was pressed.
            if ( e.which === $.ui.keyCode.ENTER && target.is( "input" ) && !greedy ) {
				if ( this._editing ) {
					// Trigger the save on an edit.
					this.save( e );
				} else if ( target.data( 'search' ) ) {
					// Run a search immediately.
					this.search( e );
				}

				// Cancel the native event.
				return StopAll( e );
			}
		},

		// When the search event is triggered.
		_handleSearch: function ( e ) {
			var desc, elements, filterBy, max, min, val, name,
				target = $( e.target ),
				filter = target.data( 'filter' ),
				sort = target.attr( 'data-sort' ),
				val = target.val();

			// If we're doing an in-memory sort.
			if ( sort && val ) {
				// Descending?
				desc = false;
				val = val.replace( /\s+DESC$/i, function ( m ) {
					desc = true;
					return "";
				} );
				if ( desc ) {
					target.addClass( 'desc' );
				} else {
					target.removeClass( 'desc' );
				}

				// Set the sort data.
				target.data( 'sort', val.toLowerCase() );

				// Trigger the sort link.
				this._sortLink( target, e );

				return;
			}

			// If we're doing an in-memory filter.
			if ( filter ) {
				elements = this.element.find( "[data-filter]:input" );
				filterBy = $.cms.ajaxify.getValues( elements );
				this.filterBy( filterBy );
				e && e.stopPropagation && e.stopPropagation();
				return;
			}

			// If we just changed an auto-update input element, fire a save.
			if ( target.is( "[data-autoupdate]" ) ) {
				if ( target.is( "[data-autoupdate='manual']" ) ) return;
				this.autoupdate( target );
			}

			// If we didn't trigger the input event on a search element, exit.
			if ( !target.data( 'search' ) ) {
				const el = e.target.closest( "[data-search]:not(form)" );
				if ( el ) {
					val = el.getValue();
					target = $( el );
				} else {
					return;
				}
			}

			if ( target.is( "input[type='date'], input[type='time'], input[type='datetime'], input[data-date-type]" ) && !Make.DateTime( val ) ) {
				console.log( 'Invalid Date Value', val );
				return;
			}

			// Check for an out-of-range search value.
			max = Make.Int( target.prop( 'max' ) );
			if ( max ) {
				min = Make.Int( target.prop( 'min' ) );
				val = Math.limit( Make.Int( target.val() ), min, max );
				if ( val != target.val() ) {
					target.val( val );
				}
			}

			if ( name = target.attr( 'name' ) ) {
				// When a value changes, find any other search elements with same name and sync them.
				// This is most commonly seen with a 'pagingid' input at the top and bottom of the page.
				val = target.val();
				if ( target.is( ":checkbox,:radio" ) ) {
					// Check off any related checkbox / radio buttons to match.
					this.element.find( "[data-search][name$='" + name.split( '$' ).pop() + "'][value='" + val + "']" ).each( function ( i ) {
						if ( this != target[0] ) {
							$( this ).prop( 'checked', true );
						}
					} );
				} else {
					// Update any other input elements to match.
					this.element.find( "[data-search][name$='" + name.split( '$' ).pop() + "']:not(:radio,:checkbox)" ).each( function ( i ) {
						if ( this !== target[0] ) {
							$( this ).val( val );
						}
					} );
				}

				// If we're doing a search on any element (other than the paging id control itself).
				if ( name.split( '$' ).pop().toLowerCase() != 'pagingid' ) {
					// Reset back to page 1.
					this._resetPaging();
				}
			}

			// Run the search.
			this.search( e );
		},

		// Reset the paging to the beginning.
		_resetPaging: function () {
			// Find the paging  input control.
			var paging = this.element.find( "input[name]" ).filter( function ( i ) {
				return $( this ).attr( 'name' ).split( '$' ).pop().toLowerCase() === 'pagingid';
			} );

			// Reset paging to 1.
			paging.val( 1 );

			// Reset the needspaging property.
			delete this.options.needspaging;
		},

		// Get any named datasource associated with the event.
		_getDS: function ( e ) {
			if ( typeof e === 'string' ) {
				return e;
			} else if ( e && e.datasource ) {
				return e.datasource;
			} else if ( e && e.target ) {
				return $( e.target ).closest( "[data-datasource]" ).data( 'datasource' );
			} else {
				return null;
			}
		},

		// Select a specific row.
		select: function ( target, e ) {
			var selected, id,
				obj = this._getTBody( target );

			if ( obj && obj.trs ) {
				// Get the current item.
				selected = obj.trs.filter( function ( i ) {
					return this === target[0] || $.contains( this, target[0] );
				} );

				// Already selected.
				if ( !selected.length || this.isSelected( selected ) || e.shiftKey ) {
					return;
				} else if ( selected.is( '.ui-tab' ) ) {
					// If we have a tab, propagate the behavior as the event will otherwise cancel and not propagate.
					Behaviors.Tabs.Click( e );
					// Links can be a little aggressive so if this is a tab, we know it will be active on postback.
					selected.addClass( 'active' );
				}

				// Remove any existing selected item.
				obj.trs.removeClass( 'selected' );
				selected.addClass( 'selected' );

				// Activate any popinto.
				id = selected.data( 'key' );
				if ( id > 0 && this.options.popinto ) {
					this.edit( id, e );
				}

				this._trigger( 'select', e, id );
			}
		},

		// Was this item already selected?
		isSelected: function ( item ) {
			var opt, into;
			if ( item.is( '.selected' ) ) {
				// Selected class.
				return true;
			} else if ( !this.options.popinto ) {
				// Missing popinto properties.
				return false;
			} else if ( !this.options.popinto.multiple ) {
				// If we don't allow multiple selections, then it cannot be selected.
				return false;
			}

			// Find the matching popinto.
			opt = item.data( 'popinto' );
			if ( !opt || !opt.element ) {
				return false;
			} else if ( opt.element[0] === '#' ) {
				into = $( opt.element );
			} else {
				into = this.element.find( opt.element );
			}

			// See if it is marked as loaded.
			return into.data( 'loaded' );			
		},

		// Edit an item in the list.
		edit: function ( id, e ) {
			var ds;
			if ( !id ) {
				return;
			}

			if ( this._editing ) {
				this.cancel();
			}

			// If we're in a modern browser.
			if ( document.addEventListener ) {
				// Create the 'cancel' closure if it doesn't already exist.
				if ( !this._cancel ) {
					var ajax = this;
					this._cancel = function ( e ) {
						if ( e.which === $.ui.keyCode.ESCAPE ) {
							ajax.cancel();
						}
					};
				}
				// Wire up the cancel event on capture.
				document.addEventListener( 'keydown', this._cancel, true );
			}

			this._editing = true;

			// Set the edit id and update.
			this.form.find( "#" + this.id + "__edit_" ).val( id );
			this.form.find( "#" + this.id + "__command_" ).val( "" );
			this.form.find( "#" + this.id + "__datasource_" ).val( this._getDS( e ) || "" );
			this.submit( e );
		},

		// Save an item being edited.
		save: function ( e ) {
			var item, element;
			// A popup will already be validated at this point.
			if ( !this._popup ) {
				// We'll check form validity for the element by default.
				element = this.element;

				// Check to see if this was triggered from within a specific item template.
				item = $( e.target ).closest( "[data-key]" );
				if ( item.length &&
					this.element[0].contains( item[0] ) &&
					( key = item.data( 'key' ) ) > 0 ) {
					item = this.element.find( "[data-item='e'][data-key='" + key + "']" );
					if ( item.length > 0 ) {
						// We'll use that as the scope for the validity.
						element = item;
					}
				}
				if ( $.html5form.validateGroup( element ) === false ) {
					return StopAll( e );
				}
			}

			// Clear out any saved HTML from an edit.
			this._lastHtml = null;

			this.form.find( "#" + this.id + "__command_" ).val( "Save" );
			this._trigger( 'beforesave', e );
			this.submit( e, $.proxy( this.cancel, this ) );
		},

		// Save an item being edited.
		saveInsert: function ( e ) {
			var item, key;
			if ( !e || !e.target ) {
				console.log( 'Missing target for SaveInsert.' );
				return StopAll( e );
			} else if ( this._popup ) {
				console.log( 'SaveInsert not compatible with a popup.' )
				return StopAll( e );
			}

			item = $( e.target ).closest( "[data-key]" );
			key = item.data( 'key' );
			if ( !( key < 0 ) ) {
				console.log( 'Improperly formed data key for a SaveInsert' );
				return StopAll( e );
			}

			// Check the validation of just the local inputs of this one item.
			if ( $.html5form.validateGroup( item ) === false ) {
				return StopAll( e );
			}

			// Clear out any saved HTML from an edit.
			this._lastHtml = null;

			// Get the elements for this item and the post data.
			elements = item.find( "[name]:not(button,:submit,:button,:image)" );
			elements = elements.filter( ":not([data-filter])" );
			data = $.cms.ajaxify.getValues( elements );

			// Add in the other properties necessary to make this work..
			data["_m_"] = this.form.find( "input[name='_m_']" ).val();
			data[this.form.find( "#" + this.id + "__edit_" ).attr( 'name' )] = key;
			data[this.form.find( "#" + this.id + "__command_" ).attr( 'name' )] = 'AutoUpdate';

			this._trigger( 'beforesaveinsert', e );
			// Submit with the custom data.
			this.submit( e, null, data );
		},

		// Cancel an edit.
		cancel: function ( e, command ) {
			var item, key, addEmpty, amt;
			if ( this._editing ) {
				// Restore any saved HTML.
				if ( this._lastHtml ) {
					this.element.html( this._lastHtml );
				}

				// Simply reset.
				this.reset();
			} else {
				item = e && e.target && $( e.target ).closest( "[data-key]" );
				key = item && Make.Int( item.data( 'key' ) );
				if ( key < -100 ) {
					// Remove one of the addemptyrows properties.
					this.insert( e, -1 );
				}
			}
			this._trigger( 'cancel', e );
		},

		// Delete an item.
		"delete": function ( id, e ) {
			var evt = {};
			if ( !id ) {
				return;
			}

			if ( id < 0 ) {
				this.form.find( "[data-key='" + id + "']" ).remove();
				this.insert( e, -1 );
				return;
			}
			evt.key = id;
			var result = this._trigger( 'beforedelete', e, evt );
			if ( result === false ) return;
			// Cancel any editing.
			this.form.find( "#" + this.id + "__edit_" ).val( id );
			this.form.find( "#" + this.id + "__command_" ).val( "Delete" );
			this.form.find( "#" + this.id + "__datasource_" ).val( this._getDS( e ) || "" );
			this.submit( e, $.proxy( this.reset, this ) );
		},

		// Add a new item.
		add: function ( e ) {
			this.edit( -1, e );
		},

		// Reset the state of any edit item.
		reset: function () {
			var obj = this._getTBody();

			// Note that we're not editing anymore.
			this._editing = false;
			this._lastButton = null;
			this._lastHtml = null;

			// Clear any edit items and command.
			this.form.find( "#" + this.id + "__edit_" ).val( "" );
			this.form.find( "#" + this.id + "__command_" ).val( "" );
			this.form.find( "#" + this.id + "__datasource_" ).val( "" );

			// Remove the cancel event listener.
			if ( this._cancel ) {
				document.removeEventListener( 'keydown', this._cancel, true );
			}

			if ( this._popup ) {
				this._popup.dialog( 'close' );
				this._popup = null;
			}

			if ( this._popinto ) {
				this.element.removeClass( 'ui-ajax-popinto' );
				$( 'html' ).removeClass( 'cms-popinto-active' );
				if ( obj && obj.trs ) {
					obj.trs.removeClass( 'selected' );
				}
				this._popinto.removeClass( 'active' );
				this._popinto.empty();
				this._popinto = null;
			}
		},

		// Navigate to another page (in paged result sets).
		navigate: function ( page, relative, e ) {
			var id, min, max,
				// Find the paging  input control.
				paging = this.element.find( "input[name]" ).filter( function ( i ) {
					return $( this ).attr( 'name' ).split( '$' ).pop().toLowerCase() === 'pagingid';
				} );

			// Paging not enabled.
			if ( !paging.length ) {
				console.log( "Couldn't find PagingID input control" );
				return;
			} else if ( !paging.data( 'search' ) ) {
				console.log( "PagingID input control not set for search." );
				return;
			}

			// Get the total page count
			max = Make.Int( paging.attr( 'max' ) );

			// Set the page id.
			if ( relative ) {
				id = ( Make.Int( paging.val() ) || 1 ) + Make.Int( page );
			} else {
				id = page == -1 ? max : Make.Int( page );
			}

			// Make sure it's valid.
			if ( max ) {
				id = Math.limit( id, 1, max, false );
			}

			// if we've got an open edit item, clear the value since we're paging away
			this.form.find( "#" + this.id + "__edit_" ).val( '' );
			// Set the value and submit.
			paging.val( id );
			this.search( e );
		},

		// Load more elements by increasing the results per page.
		more: function ( amount, e ) {
			// Find the results per page input control.
			var tbody, scroll,
				perpage = this.element.find( "input[name]" ).filter( function ( i ) {
					return $( this ).attr( 'name' ).split( '$' ).pop().toLowerCase() === 'resultsperpage';
				} );

			if ( this.options.needspaging === false ) {
				// Paging disabled (we've reached the end).
				return;
			} else if ( this.options.ajaxreplace ) {
				// Ajax replace will navigate to the next page and append the results.
				this.form.find( "#" + this.id + "__command_" ).val( "More" );
				this.navigate( 1, true, e );
				return;
			}

			// More not enabled.
			if ( !perpage.length ) {
				console.log( "Couldn't find ResultsPerPage input control" );
				return;
			} else if ( !perpage.data( 'search' ) ) {
				console.log( "ResultsPerPage input control not set for search." );
				return;
			}

			// Get the new amount.
			amount = Make.Int( perpage.val() ) + ( Make.Int( amount ) || this.options.increment || 10 );

			// Check for a tbody inside a ui-scroll
			tbody = this._getTBody().tbody;
			scroll = tbody && tbody.closest( '.ui-scroll' );
			if ( scroll.length ) {
				this._lastScroll = scroll.prop( 'scrollTop' );
			}

			// Set the value and submit.
			perpage.val( amount );
			this.search( e );
		},

		_infinite: function ( e ) {
			var dim, wn;
			if ( this.options.needspaging === false ) {
				return;
			}

			// Get the element dimensions.
			dim = this.element.offset();
			dim.height = this.element.height();

			// Get the window dimensions.
			wn = {
				top: Math.max( document.documentElement.scrollTop, document.body.scrollTop ),
				height: window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight
			};

			// If the bottom of the current element is visible in the viewport, trigger the more event.
			if ( ( dim.top + dim.height > wn.top && dim.top + dim.height < wn.top + wn.height ) && !this._editing ) {
				this.more();
			}
		},

		// Insert an additional row for editing.
		insert: function ( e, amount ) {
			var dict, that = this,
				allowZero = false,
				addEmpty = this.element.find( "input[name]" ).filter( function ( i ) {
					return $( this ).attr( 'name' ).split( '$' ).pop().toLowerCase() === 'addemptyrows';
				} );

			if ( !addEmpty.length ) {
				console.log( "Couldn't find AddEmptyRows input control" );
				return;
			}

			if ( addEmpty.data( 'allow-zero' ) ) {
				allowZero = true;
			}

			// Count how many unique rows there are in the grid.
			dict = {};
			this.element.find( "[data-item='i']" ).each( function ( i ) {
				var item = $( this ),
					parent = item.closest( '.ui-repeater' ).attr('id');
				if ( parent === that.id ) {
					var key = Make.Int( $( this ).data( 'key' ) );
					if ( key ) {
						dict[key] = true;
					}
				}
			} );

			// Add the selected amount to the number of existing rows.
			amount = Object.keys( dict ).length + Make.Int( amount || 1 );
			if ( amount >= 0 || allowZero ) {
				if ( !amount && ( !allowZero || Object.keys( dict ).length ) ) {
					amount = 1;
				}
				// Update and run the search.
				addEmpty.val( amount );
				this._lastSearch = null;
				this.search( e );
			}
		},

		// Run a search if any of the values changed.
		search: function ( e, callback ) {
			var search;

			if ( this._popinto || ( this.options.popinto && this.options.popinto.multiple ) ) {
				this.reset();
			}

			// Serialize the search data.
			search = JSON.stringify( this.getData() );
			if ( search === this._lastSearch ) {
				// Didn't change.
				return;
			} else {
				// Update and submit.
				this._lastSearch = search;
				this.submit( e, callback );
			}
		},

		// Force a reload of the ajax grid.
		reload: function ( e, callback ) {
			this._lastSearch = undefined;
			if ( callback === undefined && $.isFunction( e ) ) {
				callback = e;
				e = null;
			}
			this.search( e, callback );
		},

		// Clear one or all search inputs
		clearField: function ( e, all ) {
			var target;
			if ( all ) {
				target = this.element.find( "[data-search]" );
			} else {
				target = $( e.target ).parent().children( "[data-search]" );
			}

			target.each( function () {
				var input = $( this );
				if ( input.is( ":checkbox,:radio" ) ) {
					if ( input.prop( 'checked' ) ) {
						input.prop( 'checked', false ).trigger( 'change' );
					}
				} else {
					if ( input.val() ) {
						input.val( "" ).trigger( 'change' );
					}
				}
			} );
		},

		// Perform a server-side sort.
		sort: function ( orderby, desc, e ) {
			// Find the order by input control.
			var input = this.element.find( "input[name]" ).filter( function ( i ) {
				return $( this ).attr( 'name' ).split( '$' ).pop().toLowerCase() === 'orderby';
			} );

			// Sort not enabled.
			if ( !input.length ) {
				console.log( "Couldn't find OrderBy input control" );
				return;
			} else if ( !input.data( 'search' ) ) {
				console.log( "OrderBy input control not set for search." );
				return;
			} else if ( !orderby ) {
				console.log( "OrderBy value not set." );
				return;
			}

			if ( desc ) {
				// If we're doing a descending sort.
				if ( orderby.indexOf( ',' ) > 0 ) {
					// If this is a complex (multi-item) order by, parse and handle it.
					orderby = $.cms.ajaxify.descending( orderby );
				} else if ( !/\s+DESC$/i.test( orderby ) ) {
					// Or just tack descending onto the end if it doesn't already have one.
					orderby += ' DESC';
				}
			}

			// Set the value and submit.
			input.val( orderby );

			// Reset the paging as needed.
			this._resetPaging();

			// Run the search.
			this.search( e );
		},

		// Sort the rows, in memory.
		_sortLink: function ( link, e ) {
			var m, tbody, trs, sizes, desc, index, size,
				// ORDER BY is for server-side handling.
				orderby = link.data( 'orderby' ),
				// Do we have a custom descending sort order.
				orderbyDesc = link.data( 'orderby-desc' ),
				// Are doing a fixed sequence in the order by,
				fixed = null,
				// SORT is for client-side handling.
				sort = link.data( 'sort' ),
				// If we have a client-side sort, look for the THEAD and TBODY elements.
				obj = sort && this._getTBody();

			// CHECK TO SEE IF THE ORDERBY CLAUSE HAS A BAKED-IN SORT BY
			if ( !orderby ) {
			} else if ( orderby.indexOf( ',' ) >= 0 ) {
				// Check for a fixed sequence in a complex order by.
				fixed = $.cms.ajaxify.sortsequence( orderby );
			} else if ( m = /\s+(DESC|ASC)$/i.exec( orderby ) ) {
				// Check for a fixed sequence at the end of the simple order by.
				fixed = m[1];
			}

			// Set the sorting state.
			if ( link.is( '.ui-sort' ) ) {
				if ( link.is( '.active' ) ) {
					if ( fixed ) {
						// We're not toggling the sequence, and this sequence is already active.  Nothing to do.
						return;
					} else {
						link.toggleClass( 'desc' );
					}
				} else {
					this.element.find( '.ui-sort.active' ).removeClass( 'active' );
					link.addClass( 'active' );
				}
			}

			// We only care about descending if the orderby isn't fixed.
			desc = !fixed && link.is( '.desc' );

			if ( orderbyDesc ) {
				// Run the server-side sort.
				return this.sort( desc ? orderbyDesc : orderby, false, e );
			} else if ( orderby ) {
				// Run the server-side sort.
				return this.sort( orderby, desc, e );
			}

			// Get the parts to handle.
			if ( obj ) {
				tbody = obj.tbody;
				trs = obj.trs;
				sizes = obj.sizes;
			} else {
				return;
			}

			if ( $.isArray( sort ) ) {
				Array.quickSort( trs, function ( tr1, tr2 ) {
					var r1 = $( tr1 ).data( 'row' );
					var r2 = $( tr2 ).data( 'row' );

					for ( var i = 0; i < sort.length; i++ ) {
						var v1 = r1 && r1[sort[i]];
						var v2 = r2 && r2[sort[i]];
						var _desc = desc && i === 0;
						if ( v1 > v2 ) {
							return _desc ? -1 : 1;
						} else if ( v1 < v2 ) {
							return _desc ? 1 : -1;
						}
					}
					return 0;
				} );
			} else {
				// Sort the rows.
				sort = 'data-' + sort;
				Array.quickSort( trs, function ( r1, r2 ) {
					var v1 = r1.getAttribute( sort ),
						v2 = r2.getAttribute( sort ),
						n1 = parseFloat( v1 ),
						n2 = parseFloat( v2 );

					if ( !isNaN( n1 ) && !isNaN( n2 ) ) {
						v1 = n1;
						v2 = n2;
					}

					if ( v1 > v2 ) {
						return desc ? -1 : 1;
					} else if ( v1 < v2 ) {
						return desc ? 1 : -1;
					} else {
						return 0;
					}
				} );
			}

			// Set the first row sizes.
			this._setTDSize( trs, sizes, 0 );

			// Re-add all of the rows back to the tbody, in sequence.
			index = 0;
			size = trs.length;
			while ( index < size ) {
				tbody[0].appendChild( trs[index++] );
			}

			this._trigger('sort', e, link);
		},

		// Filter the rows, in memory.
		filterBy: function ( filterBy ) {
			var tbody, trs, dividers, sizes, index, count, size, first, fnMatch, match, key, value, noresults,
				obj = filterBy && this._getTBody();

			// Get the parts to handle.
			if ( obj ) {
				tbody = obj.tbody;
				trs = obj.trs;
				dividers = obj.dividers;
				sizes = obj.sizes;
			} else {
				return;
			}

			// The filterby needs to be a dictionary of key/value pair filter criteria.
			if ( !filterBy || !$.isPlainObject( filterBy ) || $.isEmptyObject( filterBy ) ) {
				return;
			}

			// Show or hide the rows, as appropriate.
			index = 0;
			count = 0;
			size = trs.length;
			first = -1;

			// Perform an exact match on numeric data, and a LIKE match on string data.
			fnMatch = function ( v1, tr, key ) {
				var v2 = tr.getAttribute( key ),
					n1 = parseFloat( v1 ),
					n2 = parseFloat( v2 );

				if ( !isNaN( n1 ) && !isNaN( n2 ) ) {
					return n1 == n2;
				} else {
					return v2 && v2.toLowerCase().indexOf( v1.toLowerCase() ) >= 0;
				}
			};

			while ( index < size ) {
				tr = trs[index];
				match = true;

				// Iterate through the filer criteria.
				for ( p in filterBy ) {
					if ( hasOwn.call( filterBy, p ) ) {
						// Get the filter value and the data key.
						value = filterBy[p];
						key = 'data-' + p;

						// If we have a value, AND it doesn't match, we'll hide the row.
						// Note that an empty value in the filter criteria is ignored.
						if ( value && !fnMatch( value, tr, key ) ) {
							match = false;
							break;
						}
					}
				}

				// If we don't have a value to filter by, OR if the filter value matches.
				if ( match ) {
					// Show the row, increment the count.
					tr.style.display = '';
					count++;
					// If we haven't logged the index position of the first row, do so now.
					if ( first < 0 ) {
						first = index;
					}
				} else {
					tr.style.display = 'none';
				}
				index++;
			}

			// If we have divider items, set the visibility based on any visible trs inside them.
			index = 0;
			size = ( dividers && dividers.length ) || 0;
			while ( index < size ) {
				tr = dividers[index++];
				if ( $.cms.ajaxify.visibleTR( tr ) ) {
					tr.style.display = '';
				} else {
					tr.style.display = 'none';
				}
			}

			if ( first >= 0 ) {
				this._setTDSize( trs, sizes, first );
			}

			// Show/hide no-results panels.
			noresults = !count;
			this.element
				.find( "[data-role='noresults']" )
				.each( function ( i ) {
					var	// Get the panel, and the filter / value criteria it's looking for.
						nr = $( this ),
						f = nr.data( 'filter' ),
						v = nr.data( 'value' ),
						// If we don't have any results, and we have a filter field, and a filter value,
						// and the 'filterBy' criteria matches, we'll show this noresults panel.
						show = noresults && ( ( !f && !v ) || filterBy[f] == v );

					if ( show ) {
						// Activate the no results panel.
						nr.addClass( 'active' );

						// If we've shown a single no-results panel, we won't show another.
						noresults = false;
					} else {
						nr.removeClass( 'active' );
					}
				} );

			if ( !count ) {
				// Trigger any noresults event.
				this._trigger( 'noresults', {}, filterBy );
			}

			// Trigger the filter event.
			this._trigger( 'filter', {}, filterBy );

			return false;
		},

		// Get the tbody and its children to process.
		_getTBody: function ( link ) {
			var thead, tbody, table, dividers, trs, tds, index, len, sizes, multi;

			if ( this.element.find( "[data-role='tbody'], tbody" ).length > 1 ) {
				multi = true;
			}

			if ( link && link.is( 'a.ui-sort' ) ) {
				thead = link.closest( "thead,[data-role='thead']" );
			} else if ( multi && link ) {
				table = link.closest( "table, [data-role='table']" );
				thead = table.find( "thead,[data-role='thead']" );
			} else {
				thead = this.element.find( "thead,[data-role='thead']" );
			}

			// Need a thead and tbody to make this work.
			if ( !thead || !thead.length ) {
				return;
			}
			tbody = this.element.find( "[data-role='tbody']" );
			if ( !tbody.length && thead.is( 'thead' ) ) {
				tbody = this.element.find( 'tbody' );
			} else if ( table && table.length ) {
				tbody = table.find( "[data-role='tbody'], tbody" );
			}
			if ( !tbody.length ) {
				return;
			}

			// Get the elements to manipulate.
			if ( tbody.is( 'tbody' ) ) {
				trs = tbody.children();
			} else {
				trs = tbody.find( '[data-role="tr"]' );
				if ( trs.length ) {
					dividers = tbody.find( '[data-role="divider"]' );
				} else {
					trs = tbody.children();
				}
			}

			if ( !trs.length ) {
				return;
			}

			// Look for named widths in any TDs in the first row.
			tds = trs.eq( 0 ).filter( 'tr' ).children();
			index = 0;
			len = tds.length;
			sizes = [];
			while ( index < len ) {
				sizes.push( tds[index++].style.width );
			}

			return { tbody: tbody, trs: trs, sizes: sizes, dividers: dividers || null };
		},

		// Re-set the sizes on the first set of TDs.
		_setTDSize: function ( trs, sizes, first ) {
			var tds, index,
				size = sizes.length;
			if ( size ) {
				tds = trs.eq( first ).children();
				if ( tds.length === size ) {
					index = 0;
					while ( index < size ) {
						tds[index].style.width = sizes[index];
						index++;
					}
				}
			}
		},

		// Find all of the input elements and build a data array from it's values.
		getData: function ( command, context ) {
			var elements, keys, index, v,
				save = command === 'Save',
				popup = command && ( this._editing && this._popup ),
				form = popup || this.form,
				data = {};

			// Get the elements to check.
			elements = ( context || form ).find( "[name]:not(button,:submit,:button,:image)" );
			if ( save ) {
				// Get all elements except client-side filters.
				elements = elements.filter( ":not([data-filter])" );
			} else if ( command ) {
				// Get search elements plus edit/datasource.
				elements = elements.filter( "[data-search],[name='_m_'],[name$='$_edit_'],[name$='$_command_'],[name$='$_datasource_']" );
			} else {
				// Get search elements only.
				elements = elements.filter( "[data-search],[name='_m_']" );
			}
			// Get their values in a data collection.
			data = $.cms.ajaxify.getValues( elements );

			// If we're doing a popup.
			if ( popup ) {
				// Add the control values to the data collection.
				this.form.find( "input[name='_m_'],#" + this.id + "__edit_,#" + this.id + "__command_,#" + this.id + "__datasource_" )
					.each( function ( i ) {
						var hidden = $( this );
						data[hidden.attr( 'name' )] = hidden.val();
					} );

				// Add in any search controls from the parent grid.
				$.extend( data, this.getData() );
			}

			// Convert any array data into a single comma-separated string value.
			keys = Object.keys( data );
			index = keys.length;
			while ( index-- ) {
				v = data[keys[index]];
				if ( $.isArray( v ) ) {
					data[keys[index]] = v.join( "," );
				}
			}

			if ( command && this._lastButton ) {
				// Add the button.
				data[this._lastButton.attr( 'name' )] = this._lastButton.val() || "";
			}

			return data;
		},

		// Get a reference to the current popup dialog box.
		popup: function () {
			return this._popup;
		},

		// Handle a special dialog box.
		_handlePopup: function ( temp, popup, evt ) {
			var item, data, options, ajaxed, button;

			// Make sure we have valid data.
			if ( !temp || !temp.length || !popup ) {
				return;
			}

			// Get the edit item.
			item = temp.find( "[data-item='e']" );

			// If it's an LI, get the child, and migrate and data values to it.
			if ( item.is( 'li,td,tr' ) ) {
				data = item.data() || {};
				if ( item.is( 'tr' ) ) {
					item = item.children( 'td:first' ).children( ':first' );
				} else {
					item = item.children( ':first' );
				}
				$.extend( item.data(), data );
			}

			// Make sure we have something to show.
			if ( !item.length ) {
				this._alert( 'No data was available' );
				return this.reset();
			}

			ajaxed = this;

			// Build the dialog options.
			options = {
				width: 'css',
				height: 'css',
				modal: true,
				buttons: [
					{ text: 'Close', click: function () { $( this ).dialog( 'close' ); } }
				],
				create: function () {
					var el = $( this );

					// Set the dialog as fixed.
					if ( window.Modernizr && !Modernizr.touch ) {
						el.parent().css( { position: 'fixed' } );
					}
					el.captureScroll( true );
					el.closest('.ui-dialog').on( 'tap click', '.ui-dialog-titlebar-close', function () {
						$( this ).dialog( 'close' );
					} );
					// Initialize any form on create.
                    el.find( 'form' )
                        .on( 'submit', function ( e ) {
                            return StopAll( e );
                        } )
                        .html5form()
                        .on( 'change', function ( e ) {
                            ajaxed._handleSearch( e );
                        });

					// Set the initial state of any conditional elements.
					el.find( ".ui-conditionals .ui-conditional" ).each( function ( i ) {
						var input = $( this );
						if ( input.is( ":checkbox,:radio" ) && !input.is( ':checked' ) ) {
							return;
						} else {
							input.trigger( 'change' );
						}
					} );

					// Initialize any other widgets.
					evt.target = this;
					ajaxed._trigger( 'widgets', {}, evt );

				},
				close: function () {
					// Devolve any other widgets.
					evt.target = this;
					ajaxed._trigger( 'unwidgets', {}, evt );

					// Clean up any ckeditor instances before closing the dialog box.
					if ( $.fn.ckeditor ) {
						$( this ).find( "[data-editor='ckeditor']" ).ckeditor( 'destroy' );
					}

					// Reset the ajaxed state and remove the popup.
					if ( ajaxed._popup && ajaxed._popup[0] === this ) {
						ajaxed.reset();
					}

					$( this ).remove();
				}
			};

			// If we have a submit button, add a 'save' to the dialog.
			button = item.find( ":submit:first" );
			if ( button.length ) {
				// Hide it in the form (the dialog button 'save' will supplant it).
				button.hide();

				// If we have custom post data in the original event, add it to the save button.
				if ( evt && evt.options && evt.options.post ) {
					button.data( 'post', evt.options.post );
					button.attr( 'data-key', "" );
				}
				if ( popup && popup.confirm ) {
					button.data( 'confirm', popup.confirm );
				}

				// If we have a button, make sure the contents are wrapped in a form.
				if ( !item.is( 'form' ) && !item.find( 'form' ).length ) {
					var form = $( '<form action="javascript:void(0)" method="post"></form>' ).appendTo( item ).append( item.children() );
					if ( this.options.html5 ) {
						form.attr( 'data-html5', '1' );
					}
				}

				// Add a save button to the options.
				options.buttons.unshift( {
					text: button.text() || "Save",
					click: function ( e ) {
						var target = $( e.target );
						// Check for a 'confirm' message before executing this click.

						if ( $.html5form.validateGroup( $( this ).find( 'form' ) ) === false ) {
							button.click();
						} else if ( confirm = target.data( 'confirm' ) ) {
							if ( !button.data( 'confirmed' ) ) {
								// Convert line feeds to line breaks.
								if ( confirm.indexOf( '<' ) < 0 ) {
									confirm = confirm.replace( /\n/g, '<br>' );
								}

								fn = function () {
									// When confirmed, set that it is confirmed and re-trigger the event.
									button.data( 'confirmed', true );
									button.click();
								};

								if ( window.$8 && $8.Dialog ) {
									if ( !title ) title = 'Are you sure?';
									var opt = {
										title: title,
										message: confirm,
										onconfirm: fn
									}
									if ( data.action.indexOf( 'Delete' ) > -1 ) opt.icon = 'trash';
									$8.Dialog.Confirm( opt );
								} else {
									// If the target is not already marked as confirmed, run the popup first.
									$confirm( confirm, fn );
								}
								return StopAll( e );
							} else {
								// If the button WAS confirmed, reset this flag (just in case we need to retrigger this event later).
								button.data( 'confirmed', false );
							}
						} else {
							// Get the last button.
							ajaxed._lastButton = button;
							// Show the dialog box loading.
							item.parent().loading();
							// Save the form elements, passing along the save button as a target.
							ajaxed.save( { target: button[0] } );
							// Clear out the last button
							ajaxed._lastButton = null;
						}
					}
				} );
			}

			// Create the popup, overriding the options with any that were supplied.
			this._popup = item.dialog( $.extend( options, popup ) );
		},

		// Put the html into the element.
		_handlePopInto: function ( temp, popinto, evt ) {
			var into, tag, item, data;

			// Make sure we have valid data.
			if ( !temp || !temp.length || !popinto ) {
				console.log( 'Missing properties to handle the pop into' );
				return;
			} else if ( !popinto.element ) {
				console.log( 'Missing popinto.element property' );
				return;
			} else if ( popinto.element[0] === '#' ) {
				into = $( popinto.element );
			} else {
				into = this.element.find( popinto.element );
			}

			if ( !into || !into.length ) {
				this._alert( 'Into item not found.' );
			} else {
				tag = into[0].nodeName;
			}

			// Get the edit item.
			item = temp.find( "[data-item='e']" );

			if ( item.is( 'ul,table,tbody,tr' ) && item.is( tag ) ) {
				// If we're putting an item inside a UL, TABLE, TBODY or TR element, and the item being 'added'
				// matches the "into" insertion point, get the children of the item.
				item = item.children();
			} else if ( item.is( 'li,td,tr' ) ) {
				// We cannot append an LI/TD/DR to the container.
				data = item.data() || {};
				if ( item.is( 'tr' ) ) {
					item = item.children( 'td:first' ).children();
				} else {
					item = item.children();
				}
				$.extend( item.data(), data );
			}

			// Make sure we have something to show.
			if ( !item.length ) {
				this._alert( 'No data was available' );
				return this.reset();
			}

			// Add the item to the target.
			into = into.empty().append( item ).addClass( 'active' );
			if ( !popinto.multiple ) {
				// If we're not doing multiple popintos, save a reference to it.
				this._popinto = into;
			} else {
				// Note that it is loaded.
				into.data( 'loaded', true );
			}
			this.element.addClass( 'ui-ajax-popinto' );
			$( 'html' ).addClass( 'cms-popinto-active' );
		},

		// Measure the drag positions.
		_drag: function ( e, ui ) {
			// Any before drag event.
			this._trigger( 'beforedrag', e, ui );

			var el = $( e.originalEvent.target ).closest( "tr, [data-role='tr']" ).addClass( 'blank droppable' );
			this._measureDrag( ui, el );

			// Trigger a drag event.
			this._trigger( 'drag', e, ui );
		},

		// Measure the drag positions for calculations of how to drop it.
		_measureDrag: function ( ui, el ) {
			var items,
				h = el.outerHeight(),
				w = el.outerWidth(),
				parent = el.parent().addClass( 'ui-dragging' ),
				po = parent.offset(),
				top = po.top,
				left = po.left,
				xy = this.options.dragAxis === 'xy',
				positions = [],
				start = -1;

			// Record the positions.
			items = parent.children().each( function ( i ) {
				var item = $( this ),
					pos = item.offset();

				if ( item.is( ':hidden,.ui-draggable-dragging' ) ) {
					return;
				}

				// If we found the item, record it's position.
				if ( this === el[0] ) {
					start = positions.length;
				}

				pos.top -= top;
				pos.left -= left;
				pos.width = w;
				pos.height = h;
				pos.item = item;
				positions.push( pos );
			} );
			// And the 'end' item.
			positions.push( {
				top: positions[positions.length - 1].top + h,
				left: positions[positions.length - 1].left + w,
				width: w,
				height: h,
				item: positions[positions.length - 1].item,
				end: true
			} );

			// Save the item data.
			ui.helper.items = items;
			ui.helper.positions = positions;
			ui.helper.start = start;
			ui.helper.over = start;
			ui.helper.item = el;
			ui.helper.xy = xy;
		},

		// While dragging.
		_dragging: function ( e, ui ) {
			var pos,
				that = this,
				positions = ui.helper.positions,
				top = ui.position.top,
				left = ui.position.left,
				start = ui.helper.start,
				xy = ui.helper.xy,
				// What are we over right now?
				over = xy ? Get.Position( positions, left, top ) : Get.BIndex( positions, top, "top" );

			if ( over < 0 ) {
				// If we're over the starting position, or over nothing.
				if ( ui.helper.wait ) {
					clearTimeout( ui.helper.wait );
					ui.helper.wait = null;
				}
				// Exit.
				return;
			} else {
				// If our current 'over' position is different from the 'last' over position.
				if ( over != ui.helper.over ) {
					// Clear the last item.
					ui.helper.items.removeClass( 'droppable end' );

					// Set the state of the item we're now over.
					pos = positions[over];
					pos.item.addClass( 'droppable' );
					if ( pos.end || ( xy && over > start ) ) {
						pos.item.addClass( 'end' );
					}
					// Record the new 'over' position.
					ui.helper.over = over;
				}

				if ( xy ) {
					clearTimeout( ui.helper.wait );
					ui.helper.wait = setTimeout( function ( ui, pos ) {
						// Move the dragged element.
						that._reposition.apply( that, [ui] );
						// Re-measure the positions.
						that._measureDrag.apply( that, [ui, ui.helper.item] );
					}, this.options.dragDelay, ui, pos );
				}
			}
		},

		// When dropping the element.
		_drop: function ( e, ui ) {
			// Reposition the elements.
			this._reposition.apply( this, [ui] );

			// Clear out the temp data attached to the ui object.
			delete ui.helper.items;
			delete ui.helper.positions;
			delete ui.helper.start;
			delete ui.helper.over;
			delete ui.helper.item;
			delete ui.helper.xy;
			delete ui.helper.wait;
		},

		// Position the dropped element.
		_reposition: function ( ui ) {
			var id, after, before,
				xy = ui.helper.xy,
				positions = ui.helper.positions,
				start = ui.helper.start,
				over = ui.helper.over,
				pos = positions[over],
				item = ui.helper.item;

			// Clear any timeout.
			if ( ui.helper.wait ) {
				clearTimeout( ui.helper.wait );
				ui.helper.wait = null;
			}

			// Reset the state.
			ui.helper.items.removeClass( 'droppable end' );
			item.removeClass( 'blank' ).parent().removeClass( 'ui-dragging' );

			// Nothing changed.
			if ( over == start ) {
				return;
			}

			// Get the id of the item being moved.
			id = Make.Int( item.data( 'key' ) );

			// Move the item into position.
			if ( pos && pos.end ) {
				// Get the id of the 'after' insertion point.
				after = pos.item.data( 'key' );

				// Move it after the item.
				pos.item.after( item );
			} else if ( xy && over > start ) {
				// If we're doing an XY drag, and we're AFTER the starting point, we need the 'after' position.

				// Get the id of the 'after ' insertion point.
				after = pos.item.data( 'key' );

				// Move the element after the selected item.
				pos.item.after( item );
			} else {
				// Get the id of the 'before' insertion point.
				before = pos.item.data( 'key' );

				// Move the element before the selected item.
				pos.item.before( item );
			}

			// Run the resequence.
			this.resequence( id, before, after );
		},

		// Resequence an item in a list.
		resequence: function ( id, before, after ) {
			var evt, result, ajaxed,
				data = {};

			// Get the control values to trigger the server-side resequence event.
			this.form.find( "input[name='_m_'],#" + this.id + "__edit_,#" + this.id + "__command_,#" + this.id + "__datasource_" )
				.each( function ( i ) {
					var hidden = $( this ),
						name = hidden.attr( 'name' ),
						type = ( name || "" ).split( '$' ).pop();

					switch ( type ) {
						case "_edit_":
							data[name] = JSON.stringify( {
								id: id,
								before: Make.Int( before ),
								after: Make.Int( after )
							} );
							break;
						case "_command_":
							data[name] = "Resequence";
							break;
						default:
							data[name] = hidden.val();
							break;
					}
				} );

			// Get the event data.
			evt = {
				data: data,
				id: id,
				before: before,
				after: after
			};

			// Handle any before resequence event.
			result = this._trigger( 'beforeresequence', {}, evt );

			// If the before event returns an explicit false, or we don't have an id (to run a server-side event), exit.
			if ( result === false || !id ) {
				return;
			}

			// Make the server-side call.
			ajaxed = this;
			$.ajax( {
				url: window.location.href,
				type: 'POST',
				data: data,
				success: function () {
					// Trigger any resequence event.
					ajaxed._trigger( 'resequence', {}, evt );
				},
				error: $.cms.ajaxify.error
			} );
		},

		// Replace a standard page submit with an ajax post.
		submit: function ( e, callback, data ) {
			var opt, name, xhr,
				// Reference to this widget for the ajax closure.
				ajaxed = this,
				// And the element being modified.
				el = this.element,
				// Andit's it.
				id = this.id,
				// A reference to that focused element (for selection purposes).
				sel = document.activeElement,
				// What is the ID of the last focused element (usually an input box).
				fid = sel && sel.getAttribute( 'id' ),
				// Get any active tabs.
				tabs = Behaviors.Tabs.GetActive( this.element ),
				// A copy of the last data submitted in a previous ajax call.
				last = this._lastData ? $.extend( {}, this._lastData ) : null,
				// Any special edit and command data being submitted.
				edit = this.form.find( "#" + this.id + "__edit_" ).val(),
				command = this.form.find( "#" + this.id + "__command_" ).val(),
				// Get any popup settings.
				popup = this.options.popup && $.extend( {}, this.options.popup ),
				// Get any popup settings.
				popinto = this.options.popinto && $.extend( {}, this.options.popinto ),
				scrollTop = this._lastScroll;

			if ( !data ) {
				// The current data to submit, taken from the form.
				// Only fetch non-search data on a save.
				data = this.getData( command || edit );
			}

			// If we have an event target.
			if ( e && e.target ) {
				// Look for the data key and get any additional options specified.
				opt = $( e.target ).closest( "[data-key],[data-post]" ).data();
				if ( opt && !$.isEmptyObject( opt ) ) {
					// Custom popup properties?
					if ( opt.popup ) {
						// Extend the default popup properties, with the named popup ones.
						popup = $.extend( popup, this.options.popups && this.options.popups[opt.popup] );
					}
					if ( opt.popinto ) {
						if ( typeof opt.popinto === 'string' ) {
							// Extend the default popinto properties, with the named popinto ones.
							popinto = $.extend( popinto, this.options.popintos && this.options.popintos[opt.popinto] );
						} else if ( $.isPlainObject( opt.popinto ) ) {
							// Extend the default popinto properties with ones defined on the element triggering the popinto.
							popinto = $.extend( popinto, opt.popinto );
						}
					}
					// Custom title?
					if ( popup && opt.title ) {
						// Set the custom title.
						popup.title = opt.title;
					}
					// Post data.
					if ( opt.post && $.isPlainObject( opt.post ) ) {
						// Start with the event post data, override with the other post data.
						data = $.extend( {}, opt.post, data );
					}

					// If we have a named 'target' for the submit, null out what we DON'T want it to do.
					switch ( opt.target ) {
						case 'popup':
							popinto = null;
							break;
						case 'popinto':
							popup = null;
							break;
					}
				}
			}

			// If we had a popinto, and we're NOT about to do a popup, clear out the popinto -- we'll be reloading.
			if ( this._popinto && !( command === 'Edit' && popup ) ) {
				this.element.removeClass( 'ui-ajax-popinto' );
				$( 'html' ).removeClass( 'cms-popinto-active' );
				this._popinto.removeClass( 'active' );
				this._popinto = null;
			}

			// Null out invalid callback.
			if ( !$.isFunction( callback ) ) {
				callback = null;
			}

			// Get the start and and of any selection in the focused input.
			if ( sel && sel.setSelectionRange ) {
				try { sel = [sel.selectionStart, sel.selectionEnd]; }
				catch ( ex ) { sel = null; }
			}

			// Set the command to edit as needed.
			if ( !command && edit ) {
				command = 'Edit';
			} else if ( command === 'More' ) {
				// Reset the input element value.
				name = this.form.find( "#" + this.id + "__command_" ).val( "" ).attr( 'name' );

				// Remove the more command from the data collection.
				delete data[name];
			}

			// If we're about to do an edit by replacing contents, save the last HTML in case we cancel.
			if ( command === 'Edit' && !popup && !popinto ) {
				this._lastHtml = this.element.html();
			}

			// Start the loader.
			el.loading( { modal: this.options.loading } );

			// If we were in the middle of an ajax SEARCH (note that a previous edit/save/delete won't be stored herre).
			if ( this._lastXHR ) {
				try {
					// Otherwise, we'll kill the last ajax call, as this one will supercede it.
					this._lastXHR.abort();
					this._lastXHR = null;
				}
				catch ( ex ) { ; }
			}

			// Post this back.
			xhr = $.ajax( {
				url: window.location.href,
				type: 'POST',
				data: data,
				success: function ( html, status, XHR ) {
					var result, temp, items, placeholder, pagingId, result, searching, redirect,
						// Get the event data.
						evt = {
							target: el[0],
							command: command,
							data: data,
							html: html,
							lastData: last,
							focusid: fid,
							options: opt,
							scrollTop: scrollTop,
							tabs: tabs,
							key: edit
						};

					// Check for a redirect after ajax postback.
					redirect = XHR && XHR.getResponseHeader && XHR.getResponseHeader( "X-REDIRECT" );
					if ( redirect ) {
						$( document.body ).loading();
						window.location.href = redirect;
						return;
					}

					// Stop the modal loading.
					el.loading( 'done' );

					// Handle any html processing event.
					result = ajaxed._trigger( 'beforerender', e, evt );
					if ( result === false ) {
						return;
					}
					if ( Make.Int( edit ) < 0 ) {
						// Check for a newly-inserted ajax insert record.
						m = html && / data-ajaxinsert="(\d+)"/.exec( html );
						if ( m && ( key = Make.Int( m[1] ) ) ) {
							// Update the primary key.
							evt.oldkey = Make.Int( edit );
							evt.key = key;
						}
					}

					// Convert the html into objects.
					temp = $( evt.html );

					// Pass along any 'fake data' attribute.
					if ( temp.data( 'fake' ) === "" ) {
						ajaxed.element.attr( 'data-fake', '' );
					} else {
						ajaxed.element.removeAttr( 'data-fake' );
					}

					if ( command === 'Edit' && popup ) {
						// Handle the popup.
						ajaxed._handlePopup( temp, popup, evt );
						tabs = null;
					} else if ( command === 'Edit' && popinto ) {
						// Handle the popinto.
						ajaxed._handlePopInto( temp, popinto, evt );
						tabs = null;
					} else if ( ajaxed.options.ajaxreplace ) {
						// Note if paging is now disabled.
						ajaxed.options.needspaging = temp.find( '#' + id ).data( 'needspaging' );

						// Update the temp to only be the contents in-between the placeholder elements.
						items = temp
							.find( ".cms-repeater-placeholder" )
							.eq( 0 )
							.nextUntil( ".cms-repeater-placeholder" );

						// Find the placeholders in the ajaxed grid.
						placeholder = ajaxed.element.find( ".cms-repeater-placeholder" );

						if ( !command || command != 'More' ) {
							// Remove the contents between the placeholder (instead of appending).
							placeholder.eq( 0 ).nextUntil( ".cms-repeater-placeholder" ).remove();
						}

						// Insert the updated contents (check for no results as needed).
						if ( !items.length ) items = ajaxed.element.find( "[data-item='nr']" );
						if ( !items.length ) items = temp.find( "[data-item='nr']" );

						placeholder.eq( 1 ).before( items );

						// Look for any named paging items in the new and old content.
						items = temp.find( "[data-ajaxrender='replace']" );
						placeholder = ajaxed.element.find( "[data-ajaxrender='replace']" );
						if ( items.length && items.length === placeholder.length ) {
							// Replace the paging items.
							for ( var i = 0; i < items.length; i++ ) {
								placeholder.eq( i ).before( items.eq( i ) );
								placeholder.eq( i ).remove();
							}
						} else {
							// Show or hide any more elements based on the 'needspaging' property.
							ajaxed.element.find( "a[href^='javascript']" ).each( function ( i ) {
								var data = Get.LinkData( { target: this } ),
									action = ( data.action || "" ).toLowerCase();
								if ( action === 'more' ) {
									if ( ajaxed.options.needspaging === false ) {
										$( this ).hide();
									} else {
										$( this ).show();
									}
								}
							} );
						}

						// See if we need to trigger another more event.
						if ( ajaxed.options.infinite ) {
							ajaxed._infinite();
						}

						// The focus id is no longer needed at this point.
						fid = null;

						// Trigger a form reload.
						el.closest( 'form' ).trigger( 'reload' );
					} else {
						var resel = document.getElementById( fid );
						// Get the start and and of any selection in the focused input, in case it changed during postback.
						if ( resel && resel.setSelectionRange ) {
							try { resel = [resel.selectionStart, resel.selectionEnd]; }
							catch ( ex ) { resel = null; }
						}
						if ( sel !== resel ) {
							sel = resel;
						}

						// Replace the entire html contents.
						el.empty().append( temp.find( '#' + id ).children() );

						// Get rid of the temp container.
						temp.remove();

						// Initialize any newly-added widgets.
						ajaxed._trigger( 'widgets', {}, evt );

						if ( scrollTop ) {
							el.find( '.ui-scroll' ).scrollTop( scrollTop );
						}

						// Trigger a form reload.
						el.closest( 'form' ).trigger( 'reload' );
					}

					// Re-set any active tabs.
					if ( evt.tabs && evt.tabs.length ) {
						//Behaviors.Tabs.SetActive( ajaxed.element, evt.tabs );
					}

					// Trigger the load.
					ajaxed.load();

					// Trigger any render event.
					ajaxed._trigger( 'render', e, evt );

					if ( !command && data ) {
						var keys = Object.keys( data );
						for ( var i = 0; i < keys.length; i++) {
							var key = keys[i];
							if ( key.indexOf( '_command_' ) > -1 ) {
								command = data[key];
								break;
							}
						}
					}	

					// And any other specific event.
					switch ( command ) {
						case 'Edit':
							// If we just rendered an edit item inline with the grid (not a popup)
							// and we have custom post options.
							if ( !popup && !popinto && opt && opt.post ) {
								// Search for javascript links (that don't have a data-post attribute already).
								el.find( "a[href^='javascript:']:not([data-post])" ).each( function ( i ) {
									var data = Get.LinkData( { target: this } );
									// Check for a save link.
									if ( ( data.action || "" ).toLowerCase() == 'save' ) {
										// Set the custom post value for the save button.
										$( this ).attr( "data-post", "" ).data( 'post', opt.post );
									}
								} );
							}

							// Trigger the edit event.
							ajaxed._trigger( 'edit', e, evt );

							if ( !popinto ) {
								// Focus on the first autofocus element in the edit panel.
								( ajaxed._popup || el ).find( ":input[autofocus]:first" ).focus();
							}
							break;
						case 'Delete':
							ajaxed._trigger( 'delete', e, evt );
							break;
						case 'Save':
						case 'AutoUpdate':
							ajaxed._trigger( 'save', e, evt );
							// If we didn't have a popup, and we've just replaced input elements.
							if ( !popup && ajaxed.element.find( 'input,textarea' ).length ) {
								// Reload the parent form with it's default widget initialization.
								ajaxed.element.closest( 'form' ).trigger( 'reload' );
							}
							break;
					}

					// Check for search / paging events.
					if ( !command && data ) {
						searching = false;

						// Look through the posted data.
						for ( var p in data ) {
							if ( hasOwn.call( data, p ) ) {
								// Found the paging id.
								if ( p.split( '$' ).pop().toLowerCase() === 'pagingid' ) {
									pagingId = Make.Int( data[p] ) || 1;

									// If the paging id value has changed since the last post.
									if ( pagingId != ( Make.Int( last && last[p] ) || 1 ) ) {
										// Trigger the paging event.
										result = ajaxed._trigger( 'paging', null, evt );

										// Scroll to the top of the ajax grid.
										if ( ajaxed.options.scrollPaging ) {
											el.find( ":visible:first" ).scrollIntoView( 500, Make.Int( ajaxed.options.scrollPaging ) || 10 );
										}
									}

									break;
								} else if ( !$.cms.ajaxify.ctrl( p ) ) {
									// If this isn't an ajax control value.
									if ( ( data[p] || "" ) != ( ( last && last[p] ) || "" ) ) {
										// And the posted values don't match, then we performed a search.
										searching = true;
									}
								}
							}
						}

						if ( searching ) {
							// Trigger the search event.
							ajaxed._trigger( 'search', null, { data: data, lastData: last } );
						}
					}

					// Refocus on the last element on a timeout.
					if ( fid ) {
						fid = document.getElementById( fid );
						if ( fid ) {
							fid.focus();
							if ( sel && sel.length == 2 ) {
								try { fid.setSelectionRange.apply( fid, sel ); }
								catch ( ex ) { ; }
							}
						}
					}

					// Handle any callback.
					callback && callback( data, command );

					// Update the last data.
					ajaxed._lastData = data;

					// Run any complete function.
					ajaxed._complete( evt );

					// Trigger a resize so any visibility events fire.
					$( window ).trigger( 'resize' );
				},
				error: function ( xhr, type, message ) {
					var m;
					// Don't care about abort errors -- we just caused it.
					if ( type === 'abort' ) {
						console.log( 'Aborted XHR for ' + ajaxed.id );
						return;
					}

					// Stop the modal loading.
					el.loading( 'done' );

					// Look for an error message.
					if ( xhr && xhr.responseText && ( m = /<title>(.+?)<\/title>/i.exec( xhr.responseText ) ) ) {
						message = m[1];
					} else if ( xhr && xhr.responseText && /^\{[\s\S]*\}$/.test( xhr.responseText ) ) {
						try {
							var jobj = parseJson( xhr.responseText );
							message = jobj.error;
						} catch ( ex ) { ; }
					}
					if ( message ) {
						if ( message.length > 100 ) {
							message = message.replace( /\.(\s+)/g, '.<br>$1' );
						}
						// Alert it.
						ajaxed._alert( message );

					}
					if ( ajaxed._popup ) {
						ajaxed._popup.closest( '.loading' ).loading( 'done' );
					}
				},
				complete: function ( _xhr ) {
					// If we've just completed the last saved XHR, null it out.
					if ( ajaxed._lastXHR === _xhr ) {
						ajaxed._lastXHR = null;
					}
				}
			} );

			if ( !this._lastXHR ) {
				switch ( command ) {
					case 'Edit':
					case 'Delete':
					case 'Save':
					case 'AutoUpdate':
						// If we're about to manipulate data, don't save the request.
						break;
					default:
						try {
							// Otherwise, save the last request so it can be aborted if we start a new one.
							this._lastXHR = xhr;
						}
						catch ( ex ) { ; }
						break;
				}
			}

			// Kill the native submit event.
			return StopAll( e );

		},

		// Stub for inheriting classes.
		_complete: function ( evt ) {
		},

		_alert: function ( msg, title ) {
			var opt = {},
				is8 = window.$8 && $8.Dialog;
			if ( is8 ) {
				opt.message = msg;
				opt.title = title;
				$8.Dialog.Alert( opt );
			} else {
				$alert( msg );
			}
		},

		// Do we have a valid input?
		_validInput: function ( input ) {
			var el, validity, date, year;

			// Check validity, if possible.
			el = input && input[0];
			if ( el && el.checkValidity && !el.checkValidity() ) {
				return false;
			}

			// Check for a valid date/time value.
			switch ( input.attr( 'type' ) ) {
				case 'date':
				case 'datetime':
				case 'datetime-local':
					date = Make.DateTime( input.val() );
					break;
				case 'time':
					date = Make.DateTime( '1/1/1900 ' + input.val() );
					break;
				default:
					return true;
			}

			year = date && date.getFullYear();
			return year && year >= 1900 && year <= 3000;
		},

		// Handle the auto queue.
		_autoQueue: function () {
			var args;
			if ( !this.autoqueue ) {
				// Nothing in the queue.
				return;
			} else {
				// Get the next item.
				args = this.autoqueue.shift();

				// If there's nothing left, null out the queue.
				if ( !this.autoqueue.length ) {
					this.autoqueue = null;
				}

				// If we have an item, run it.
				if ( args ) {
					args.push( null );
					args.push( true );
					this.autoupdate.apply( this, args );
				}
			}
		},

		// Perform a single auto update on a single input element.
		autoupdate: function ( input, callback, queued ) {
			// Start the data collection with the module id.
			var index, args, id, name, json, val, evt, update,
				// The item holding this input element.
				item = input.closest( "[data-key]" ),
				// What is the primary key value of this row?
				key = item.data( 'key' ),
				// Get any search data fields.
				data = this.getData( 'AutoUpdate' ),
				// Does this grid do a merge with two datasources.
				merging = this.element.data( 'merging' ),
				// And a reference to this grid.
				ajaxed = this,
				// Information about the last auto-update.
				last = this._lastAuto;

			if ( !item.length || !this._validInput( input ) ) {
				// Couldn't find the item or an input that is still being typed.
				return;
			}

			// Check if the queue already exists.
			if ( this.autoqueue && !queued ) {
				// Check to see if this item is already queued.
				index = this.autoqueue.length;
				while ( index-- ) {
					args = this.autoqueue[index];
					id = args[0].attr( 'id' );
					if ( id === item.attr( 'id' ) ) {
						// No need to add the item a second time, it will run the latest version of the update.
						return;
					}
				}
				// Add self and exit.
				this.autoqueue.push( Array.prototype.slice.call( arguments ) );
				return;
			} else if ( !this.autoqueue ) {
				// Create the queue.
				this.autoqueue = [];
			}

			if ( key < 0 || merging ) {
				// Add in the all of the data in this row (which would include defaults).
				$.extend( data, this.getData( 'Save', item ) );
			} else {
				// Add this single input value to the collection.
				name = input.attr( 'name' ) || input.find( ":input[name]" ).attr( 'name' );
				if ( !name ) {
					console.log( "Couldn't trigger auto-update", input[0] );
					return;
				} else if ( item.find( ":input[name='" + name + "']" ).length > 1 ) {
					val = input.parent().closest( "[id]" ).val();
				} else {
					val = input.is( ':checkbox,:radio' ) && !input.is( ':checked' ) ? "" : input.val()
				}
				data[name] = val;
			}

			// Stringify the data collection.
			json = JSON.stringify( data );

			if (// If this wasn't a manually triggered call.
				!callback &&
				// And we have a last auto update.
				last &&
				// That is less than a few seconds old.
				last.time > new Date().getTime() - 8000 &&
				// And it didn't change.
				last.json === json ) {
				// Handle any queued items and exit.
				this._autoQueue();
				return;
			} else {
				// Record the last auto.
				this._lastAuto = {
					time: new Date().getTime(),
					json: json
				};
			}

			// Add in the other properties necessary to make this work..
			data["_m_"] = this.form.find( "input[name='_m_']" ).val();
			data[this.form.find( "#" + this.id + "__edit_" ).attr( 'name' )] = key;
			data[this.form.find( "#" + this.id + "__command_" ).attr( 'name' )] = 'AutoUpdate';

			evt = {};
			evt.input = input;
			evt.data = data;
			evt.key = key;

			update = this._trigger( 'beforeautoupdate', null, evt );
			if ( update === false ) return;

			this.element.addClass( 'ui-autoupdate' );

			// Post the save to the server.
			$.ajax( {
				url: window.location.href,
				type: 'POST',
				data: data,
				error: function ( xhr, type, message ) {
					$.cms.ajaxify.error( xhr, type, message );
					item.addClass( 'ui-autoupdate-error' );
					item.removeClass( 'ui-autoupdate-success' );
				},
				success: function ( html ) {
					var evt, m, regx, queue;

					// Build the autoupdate event.
					evt = {
						key: key,
						data: data,
						html: html,
						merging: ajaxed.element.data( 'merging' ),
						input: input
					};

					if ( key < 0 ) {
						// Check for a newly-inserted ajax insert record.
						m = html && / data-ajaxinsert="(\d+)"/.exec( html );
					} else if ( key > 0 && evt.merging ) {
						// Check for a just-deleted record.
						m = html && / data-ajaxdelete="(-\d+)"/.exec( html );
					}

					if ( m && ( key = Make.Int( m[1] ) ) ) {
						// Update the primary key.
						evt.oldkey = evt.key;
						evt.key = key;
						ajaxed._swapKey( item, evt );
					}

					// If we have a callback, run it.
					if ( callback && $.isFunction( callback ) ) {
						callback.apply( this, arguments );
					}

					ajaxed.element.removeClass( 'ui-autoupdate' );
					item.removeClass( 'ui-autoupdate-error' );
					item.addClass( 'ui-autoupdate-success' );

					// Run the event.
					ajaxed._trigger( 'autoupdate', {}, evt );

					// Handle the queue.
					ajaxed._autoQueue();
				}
			} );
		},

		// When doing an insert/delete on a row, make sure the primary key values are maintained.
		_swapKey: function ( item, evt ) {
			var regx;

			// Update the key so that future updates will behave correctly.
			item.attr( 'data-key', evt.key ).data( 'key', evt.key );

			// Handle any secondary items the same way.
			this.element.find( "[data-item='si'][data-key='" + evt.oldkey + "']" ).attr( 'data-key', evt.key ).data( 'key', evt.key );

			// Check for input elements in the current item that now need to be updated.
			regx = new RegExp( "(\\$|_)ITM" + evt.oldkey + "(\\d?\\$|\\d?_)" );
			item.find( "[name],[id],[for]" ).each( function ( i ) {
				var val, repl,
					el = $( this ),
					attr = ['id', 'name', 'for'],
					index = attr.length;

				while ( index-- ) {
					val = el.attr( attr[index] );
					if ( val ) {
						repl = val.replace( regx, '$1ITM' + evt.key + '$2' );
						if ( repl != val ) {
							el.attr( attr[index], repl );

							if (// If we're updating the name attribute.
								attr[index] === 'name' &&
								// If a checkbox.
								el.is( "input:checkbox" ) &&
								// That matchines the merge primary key.
								repl.split( '$' ).pop() == evt.merging ) {
								// Set or remove the pk value.
								if ( evt.key > 0 ) {
									el.attr( 'value', evt.key );
								} else {
									el.removeAttr( 'value' );
								}
							}
						}
					}
				}
			} );
		},

		_destroy: function () {
			// Remove the scroll event.
			$( window ).off( 'scroll', this._infinite );
		}

	} );

	// Parse a set of select items, splitting by comma, but taking into account expressions and aliases.
	$.cms.ajaxify.parseSelect = function ( select ) {
		var inAlias, depth, index, last, len, C,
			items = [];

		if ( !select ) {
			return items;
		}

		// Select parser.
		inAlias = false;
		depth = 0;
		index = -1;
		last = 0;
		len = select.length;

		// Look through the characters.
		while ( ++index < len ) {
			C = select[index];
			switch ( C ) {
				case ',':
					if ( !inAlias && depth == 0 ) {
						// Add the next item and continue.
						if ( index > last ) {
							items.push( select.substring( last, index ) );
							last = index + 1;
						}
						continue;
					}
					break;
				case '(':
					// Starting a group.
					if ( !inAlias ) {
						depth++;
					}
					break;
				case ')':
					// Ending a group.
					if ( !inAlias ) {
						depth--;
					}
					break;
				case '[':
					// Starting an alias.
					if ( !inAlias ) {
						inAlias = true;
					}
					break;
				case ']':
					// Ending an alias.
					if ( inAlias ) {
						inAlias = false;
					}
					break;
				default:
					break;
			}
		}

		// Add the last item.
		if ( index > last ) {
			items.push( select.substring( last, index ) );
		}

		return items;
	};

	// Add descending to a complex orderby statement.
	$.cms.ajaxify.descending = function ( orderBy ) {
		var post,
			// Parse out the individual parts of the order by clause.
			items = $.cms.ajaxify.parseSelect( orderBy );

		if ( items.length && !/\s+DESC$/i.test( items[0] ) ) {
			// If the first item isn't already marked as descending, add it.
			items[0] += " DESC";
			return items.join( "," );
		} else {
			// Nothing to do.
			return orderBy;
		}
	};

	// Check for a named sequence in a complex orderby statement.
	$.cms.ajaxify.sortsequence = function ( orderBy ) {
		var m,
			// Parse out the individual parts of the order by clause.
			items = $.cms.ajaxify.parseSelect( orderBy );

		if ( items.length ) {
			m = /\s+(DESC|ASC)$/i.exec( items[0] );
			return m && m[1];
		}
	};

	// Take a collection of elements, and build a dictionary of key / values off of each one.
	$.cms.ajaxify.getValues = function ( elements ) {
		var data = {};
		elements.each( function ( i ) {
			var val, selector,
				input = $( this ),
				name = input.attr( 'name' ),
				filter = input.data( 'filter' ) || name,
				search = !!input.data( 'search' );

			if ( input.is( ':disabled' ) ) {
				// Skip over disabled elements.
				return;
			} else if ( input.is( ':checkbox,:radio' ) ) {
				// If we haven't yet defined this item.
				if ( data[filter] === undefined ) {
					// Build an array.
					val = [];

					// if we have a name AND a data filter, use both.
					if ( filter == name ) {
						selector = "[name='" + name + "']:checked";
					} else {
						selector = "[name='" + name + "'][data-filter='" + filter + "']:checked";
					}
					// Look for all related items in a checkbox list or radio button list.
					elements.filter( selector ).each( function ( j ) {
						var	// Get the checked item.
							input2 = $( this ),
							// And it's value.
							val2 = input2.val() || ( input2.is( ':checkbox' ) ? 'on' : "" );

						// Add it to the array.
						val.push( val2 );
					} );
					if ( !val.length ) {
						// If we don't have any selected items at all, submit an empty string.
						val = "";
					} else if ( val.length === 1 ) {
						// If we have a single item, submit it's value.
						val = val[0];
					} else {
						// Otherwise, we'll leave it as an array.
					}
				} else {
					// If we've already defined this item by name, exit and move onto the next.
					return;
				}
			} else if ( input.is( '.ui-ckeditor' ) ) {
				input.trigger( 'update' );
				val = input.val();
			} else if ( input.is( "input[type='file']" ) ) {
				var file = input[0].files[0];
				if ( file ) {
					var reader = new FileReader();
					var name = file.name + "|";
					reader.onload = function ( evt ) {
						val = name + reader.result;
					};
					reader.readAsDataURL( file );
				}
			} else {
				val = input.val() || "";
			}

			// Make search criteria safely submittable?
			if ( val && search && typeof val === 'string' && val.indexOf( '<' ) >= 0 ) {
				val = String.fromCharCode( 27 ) + Encode.JS( val );
			}

			if ( data[filter] === undefined ) {
				// If we haven't already recorded this name, do so.
				data[filter] = val;
			} else if ( $.isArray( data[filter] ) ) {
				// If we have an array of values, add it.
				data[filter].push( val );
			} else {
				// If we already had a value, convert it to an array and add the next one.
				data[filter] = [data[filter], val];
			}

		} );

		return data;
	};

	// Submit a standard form through an ajax method, with a specific button clicked.
	$.cms.ajaxify.submitForm = function ( button, callback ) {
		// Get the form values .
		var form = button.closest( 'form' ),
			elements = form.find( "[name]:not(button,:submit,:button,:image)" ),
			data = $.cms.ajaxify.getValues( elements );

		// Add the autosubmit button to the post data.
		data[button.attr( 'name' )] = "";

		// Submit.
		$.ajax( {
			url: window.location.href,
			type: 'POST',
			data: data,
			success: $.isFunction( callback ) ? callback : undefined
		} );
	};

	// Optimized function to check for visible tr in a divider.
	$.cms.ajaxify.visibleTR = function ( el ) {
		var index, visible,
			role = el.getAttribute && el.getAttribute( 'data-role' );

		if ( role === 'tr' ) {
			// If the row we started with is visible, we're good to go.
			if ( el.style.display != 'none' ) {
				return true;
			}

			// Otherwise, check the siblings.
			visible = false;
			$( el ).siblings( "[data-role='tr']" ).each( function ( i ) {
				if ( this.style.display == 'none' ) {
					// This tr is hidden.
					return;
				} else {
					// Found a visible, TR, we can stop here.
					visible = true;
					return false;
				}
			} );
			return visible;
		}

		// Walk down the tree.
		index = el.childNodes.length;
		while ( index-- ) {
			visible = $.cms.ajaxify.visibleTR( el.childNodes[index] );
			if ( visible === undefined ) {
				continue;
			} else {
				return visible;
			}
		}

		return undefined;
	};

	$.cms.ajaxify.error = function ( xhr, type, message ) {
		var m;
		// Don't care about abort errors -- we just caused it.
		if ( type === 'abort' ) {
			console.log( 'Aborted XHR' );
			return;
		}

		if ( xhr && xhr.responseText && ( m = /<title>(.+?)<\/title>/i.exec( xhr.responseText ) ) ) {
			// Error message in the title.
			message = m[1];
		} else if ( xhr && xhr.responseText && xhr.responseText[0] === '{' ) {
			// Error message in a JSON response.
			var jobj;
			try { jobj = parseJson( xhr.responseText ); }
			catch ( ex ) { ; }
			if ( jobj && jobj.error ) {
				message = jobj.error;
			}
		}
		if ( message ) {
			if ( message.length > 100 ) {
				message = message.replace( /\.(\s+)/g, '.<br>$1' );
			}
			// Alert it.
			if ( window.$8 && $8.Dialog ) {
				$8.Dialog.Alert( {
					message: message
				} );
			} else {
				$alert( message );
			}
		}
	};

	$.cms.ajaxify._ctrl = {
		'_m_': 1,
		'_command_': 1,
		'_edit_': 1,
		'_datasource_': 1,
		'pagingid': 1,
		'resultsperpage': 1,
		'maxeach': 1,
		'orderby': 1,
		'orderby2': 1
	};

	// Is the supplied name used in ajaxify control operations?
	$.cms.ajaxify.ctrl = function ( name ) {
		var key = ( name || "" ).split( '$' ).pop().toLowerCase();
		return !!$.cms.ajaxify._ctrl[key];
	};


	// CMS7 register script.
	if ( window.register ) {
		window.register( "m/ajaxify" );
	}

} ) );