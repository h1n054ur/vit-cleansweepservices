if ( window.registerLoading ) {
	registerLoading( "m/gmap" );
}

( function ( factory ) {
	if ( typeof rrequire === "function" ) {

		// CMS7 rrequire function.
		rrequire( ["j/jquery", "j/jquery.ui", "static", "m/maputils", "m/wicket.src", "m/wicket-gmap3.src", "googlemap"], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
}( function ( $ ) {

	var wn_evt,
		hasOwn = Object.prototype.hasOwnProperty,
		mouseDown = false,
		mouseButton = 0,
		paintSelect = false,
		paintDeselect = false,
		paintExclude = false,
		paintUnexclude = false,
		ctrlKeyPressed = false,
		shiftKeyPressed = false,
		currentPolygon = null,
		// Start the id at two million to prevent conflict with the location polygons.
		uuid = 2000000;

	window.MAP_MULTI_SELECT = {
		DISABLE: -1,// Disable mouse interaction.
		SINGLE: 0,	// Select one at a time with a click
		CLICK: 1,	// Handle a custom click event.
		CTRL: 2,	// Turn select on and off with a ctrl-click
		TOGGLE: 4,	// Toggle select on and off with a left click.
		PAINT: 8,	// Paint on and off with a right-click and drag.
		RIGHT: 16,	// Right click to remove.
		SHIFT: 32	// Shift-Click to exclude.
	};

	window.MAP_POINTER_EVENTS = {
		NONE: -1,	// No pointer events
		LEVEL: 0,	// Map level should match polygon level.
		ANY: 1,		// Map level doesn't matter.
		ALL: 2		// All polygons trigger pointer events (even protected polygons).
	};

	$.widget( "cms.gmap", {
		options: {
			map: {
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				panControl: false,
				rotateControl: false,
				streetViewControl: false,
				zoomControl: true,
				zoomControlOptions: {
					style: google.maps.ZoomControlStyle.LARGE
				},
				scaleControl: false,
				mapTypeControl: false,
				disableDoubleClickZoom: true,
				draggable: true,
				scrollwheel: true,
				styles: [
					{
						"stylers": [{ hue: "#68c0ff" }, { saturation: 20 }]
					},
					{
						"featureType": "road",
						"stylers": [{ "weight": 0.5 }]
					}
				]
			},
			level: 0,
			multiSelect: MAP_MULTI_SELECT.TOGGLE | MAP_MULTI_SELECT.PAINT,
			pointerEvents: MAP_POINTER_EVENTS.LEVEL,
			persistSelected: false,
			preciseFit: false,
			colors: {
				standard: {
					strokeColor: '#1e1b1a',
					fillColor: '#cccccc',
					strokeOpacity: 0.2,
					fillOpacity: 0.1
				},
				selected: {
					strokeColor: '#8667ab',
					fillColor: '#8667ab',
					strokeOpacity: 1,
					fillOpacity: 0.5
				},
				highlight: {
					strokeColor: '#6a37a6',
					fillColor: '#9a61de',
					strokeOpacity: 1,
					fillOpacity: 0.5
				},
				add: {
					strokeColor: '#64cb66',
					fillColor: '#64cb66',
					strokeOpacity: 1.0,
					fillOpacity: 0.5
				},
				remove: {
					strokeColor: '#f35958',
					fillColor: '#f35958',
					strokeOpacity: 1.0,
					fillOpacity: 0.4
				},
				hover: {
					strokeColor: '#8667ab',
					fillColor: '#8667ab',
					strokeOpacity: .5,
					fillOpacity: 0.2
				},
				unavailable: {
					strokeColor: '#0079D9',
					fillColor: '#0079D9',
					strokeOpacity: .8,
					fillOpacity: 0.2
				},
				circle: {
					strokeWeight: 2,
					strokeColor: '#566b7e',
					strokeOpacity: 0.7,
					fillOpacity: 0.1
				},
				excluded: {
					strokeColor: '#b85842',
					fillColor: '#d8664c',
					strokeOpacity: 1,
					fillOpacity: 0.5
				}
			},
			pinAnimation: google.maps.Animation.DROP
		},

		_create: function () {
			var data, v;

			// Get additional options out of the data collection.
			if ( this.options.data === true ) {
				data = this.element.data();
				for ( var p in data ) {
					if ( !hasOwn.call( data, p ) ) {
						continue;
					} else {
						v = data[p];
						if ( typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || $.isArray( v ) || $.isPlainObject( v ) ) {
							this.options[p] = v;
						}
					}
				}
			}

			switch ( this.options.country ) {
				case 'CA':
				case 'CAN':
					CMS.Map.Country = 'CAN';
					break;
			}

			// Create the map.
			this.map = new google.maps.Map( this.element[0], this.options.map );

			// This event fires when the map is initialized, idle, and ready to be managed.
			this._handle = google.maps.event.addListener( this.map, 'idle', $.proxy( this._setup, this ) );

			// Build a polygon dictionary.
			this._polygons = {};
			this._highlight = {};
			this._selected = {};
			this._excluded = {};
			this._unavailable = {};
			this._active = {};

			// Protected items cannot be interacted with.
			this._protected = {};

			// Build an icon dictionary.
			this._icons = {};
			this._activeIcons = {};

			// If we have existing locations, mark them as selected.
			if ( this.options.locations ) {
				for ( var i = 0; i < this.options.locations.length; i++ ) {
					this._selected[this.options.locations[i]] = true;
				}
			}
		},

		// Set the map up once it is ready.
		_setup: function () {
			var gmap;
			// Remove the handler so as to only fire this once.
			google.maps.event.removeListener( this._handle );

			google.maps.event.addListener( this.map, 'dragend', $.proxy( this._onDrag, this ) );
			google.maps.event.addListener( this.map, 'zoom_changed', $.proxy( this._onZoom, this ) );

			if ( this.options.latitude && this.options.longitude ) {
				// Set the map position directly.
			    this.setLatLng( { lat: Make.Float(this.options.latitude), lng: Make.Float(this.options.longitude )}, this.options.zoom );
			} else if ( this.fitBounds( this.options ) ) {
				// Set the map to fit a rectangle.
			} else if ( this.options.address ) {
				// Set the map position based on the address, fire the ready event when done.
				this.setAddress( this.options.address, this._ready.bind( this ) );
				return;
			} else {
				this.update();
			}

			// Fire the ready event now.
			this._ready();
		},

		// When the map is ready.
		_ready: function ( latlng ) {
			// Set the pin.
			if ( this.options.autopin ) {
				if ( this.options.address ) {
					// If we have an address, use that for the pin.
					$.cms.gmap.getLatLng(
						this.options.address,
						function ( latlng ) {
							this.setPin( latlng, this.options.icon, true );
						}.bind( this )
					);
				} else {
					// Otherwise, get the center and use that.
					this.setPin( this.center(), this.options.icon, true );
				}
			}

			// Trigger the ready event.
			this._trigger( 'ready' );
		},

		// When the map is dragged.
		_onDrag: function () {
			// Update the contents of the map.
			this.update();

			// Trigger the drag event.
			this._trigger( 'dragged' );
		},

		// Return a reference to the underlying google maps object.
		getMap: function () {
			return this.map;
		},

		// When the map is zoomed.
		_onZoom: function ( e ) {
			// Update the contents of the map.
			this.update();

			// Trigger the zoom event.
			this._trigger( 'zoomed' );
		},

		// Set the position of the map.
		setLatLng: function ( latlng, zoom, results, status ) {
			if ( latlng ) {
				this.map.setCenter( latlng );
				this.map.setZoom( zoom || 10 );
				this.update();
			}
		},

		// Set the map to show a specific boundary.
		fitBounds: function ( extents ) {
			var minLat, maxLat, minLng, maxLng, x, y, bounds;

			// If we've been passed a native boundary object, use it directly.
			if ( extents && extents.constructor === google.maps.LatLngBounds ) {
				this.map.fitBounds( extents );
				this.update();

				return true;
			}

			if ( !extents || !$.isPlainObject( extents ) ) {
				return;
			}

			// Normalize the values.
			minLat = Make.Float( extents.MinLat || extents.minLat || extents.minlat );
			maxLat = Make.Float( extents.MaxLat || extents.maxLat || extents.maxlat );
			minLng = Make.Float( extents.MinLng || extents.minLng || extents.minlng );
			maxLng = Make.Float( extents.MaxLng || extents.maxLng || extents.maxlng );

			// Get the dimensions.
			x = maxLng - minLng;
			y = maxLat - minLat;

			// The google maps "fitBounds" is aggressive, so we'll shrink the visible area by 10% on each side.
			if ( x > 0 && y > 0 ) {
				if ( !this.options.preciseFit ) {
					minLng += ( x * .1 );
					maxLng -= ( x * .1 );
					minLat += ( y * .1 );
					maxLat -= ( y * .1 );
				}
				// Build the boundary.
				bounds = new google.maps.LatLngBounds(
					new google.maps.LatLng( minLat, minLng ),
					new google.maps.LatLng( maxLat, maxLng )
					);
				// Set the map.
				this.map.fitBounds( bounds );
				this.update();

				return true;
			}

			// Invalid boundary.
			return false;
		},

		// Zoom / pan to fit all active polygons.
		fitActive: function () {
			var poly, item, row,
				extents = {};

			// Look through the active polygons.
			for ( var p in this._active ) {
				if ( hasOwn.call( this._active, p ) ) {
					// Extend the boundaries of each one.
					$.cms.gmap.extend( extents, this._polygons[p] );
				}
			}

			// Fit the extents.
			this.fitBounds( extents );
		},

		// Set the map to focus on a specific address.
		setAddress: function ( address, zoom, callback ) {
			// Build a closure to update the map after the geo lookup.
			var fn;

			if ( $.isFunction( zoom ) ) {
				callback = zoom;
				zoom = this.options.zoom;
			}

			fn = function ( gmap ) {
				return function ( latlng ) {
					gmap.setLatLng.call( gmap, latlng, zoom );
					if ( $.isFunction( callback ) ) {
						callback.apply( gmap.element[0], arguments );
					}
				};
			}( this );

			// Look up the address and center the map on it.
			$.cms.gmap.getLatLng( address, fn );
		},

		// Get or set the zoom level of the map.
		zoom: function ( amount ) {
			if ( amount === undefined ) {
				return this.map.getZoom();
			} else if ( amount === '+1' ) {
				this.map.setZoom( this.map.getZoom() + 1 );
			} else if ( amount === '-1' ) {
				this.map.setZoom( this.map.getZoom() - 1 );
			} else {
				this.map.setZoom( amount );
			}
		},

		// Update the map state after a move.
		update: function () {
			if ( this._timer ) {
				clearTimeout( this._timer );
			}
			this._timer = setTimeout( $.proxy( this._update, this ), 100 );
		},

		// Handle the map update.
		_update: function () {
			// Get the boundary.
			var bounds = this.map.getBounds(),
				sw = bounds && bounds.getSouthWest(),
				ne = bounds && bounds.getNorthEast(),
				extents = bounds && {
					minLat: sw.lat(),
					minLng: sw.lng(),
					maxLat: ne.lat(),
					maxLng: ne.lng()
				};

			if ( !extents ) {
				return;
			}

			this._trigger( 'update', {}, extents );

			if ( this.options.level ) {
				CMS.Map.Require( extents, this.options.level, $.proxy( this._loadLevel, this ), this.options.canada ? 'CAN' : undefined );
			}
		},

		_loadLevel: function () {
			// Get the boundary.
			var rows,
				bounds = this.map.getBounds(),
				sw = bounds && bounds.getSouthWest(),
				ne = bounds && bounds.getNorthEast(),
				extents = bounds && {
					minLat: sw.lat(),
					minLng: sw.lng(),
					maxLat: ne.lat(),
					maxLng: ne.lng()
				};

			// Get the matching polygons and add them.
			rows = CMS.Map.Match( this.options.level, extents );
			this.addPolygons( rows );

			// Note that the map polygons have been loaded and pass in the matched polygons.
			this._trigger( 'loaded', {}, { extents: extents, rows: rows } );
		},

		_persistState: function ( poly, row ) {
			var item = ( poly && poly.list ) || poly;
			var row = item && item.row;
			var id = row && row.id;

			// If the level matches the current active level.
			if ( row && row.level == this.options.level ) {

				// A selected polygon that was protected can now be unprotected.
				if ( this.options.persistSelected && this._selected[id] && this._protected[id] ) {
					poly["protected"] = false;
					delete this._protected[id];
					this._setPolyOptions( poly, { map: this.map, zIndex: 2 } );
					this._active[id] = 1;
				} else {
					// Restore the z-index position.
					this._setPolyOptions( poly, { zIndex: 2 } );
				}

			} else if ( id && this.options.persistSelected && poly.unavailable ) {

				// Unavailable items will stay on the map at a lower z-index.
				this._setPolyOptions( poly, { map: this.map, zIndex: 1 } );
				this._active[id] = 1;

			} else if ( id && this.options.persistSelected && poly.selected ) {

				// Selected items will stay on the map as 'protected'.
				this._protected[id] = true;
				poly["protected"] = true;
				this._setPolyOptions( poly, { map: this.map, zIndex: 1 } );
				this._active[id] = 1;

			} else {

				// Remove it from the map.
				this._setPolyOptions( poly, { map: null } );
				delete this._active[id];
			}
		},

		// Change which level (state, city, etc.) polygons are being displayed.
		setLevel: function ( level ) {
			var poly;

			if ( level == this.options.level ) {
				return;
			}
			this.options.level = +( level );

			// Look for active polygons that don't belong on the current level.
			for ( var p in this._active ) {
				if ( hasOwn.call( this._active, p ) ) {
					// Get the next polygon and its row.
					poly = this._polygons[p];

					// Set the polygon state.
					this._persistState( poly );
				}
			}

			if ( this.options.persistSelected ) {
				// We only need to update the map state.
				this.update();
			} else {
				// Since the level has changed, we'll update the current set of selected items, based off what is marked as selected.
				// This will maintain the selected state when switching between levels.
				this._selected = this._getSelected();

				// Update the map state.
				this.update();

				// Trigger the selected event.
				this.notifySelected();
			}
		},

		// Get the lat/lng center of the map.
		getCenter: function () {
			var c = this.map.getCenter();
			return {
				lat: c.lat(),
				lng: c.lng()
			};
		},

		// Get or set the lat/lng center of the map.
		center: function ( lat, lng ) {
			var c;
			if ( lat === undefined ) {
				// Return the center.
				c = this.map.getCenter();
				return {
					lat: c.lat(),
					lng: c.lng()
				};
			} else if ( lat.lat ) {
				// The first parameter is a complete lat/lng object, use it directly.
				this.map.setCenter( lat );
			} else if ( lat && lng ) {
				// Create a lat/lng literal and apply it.
				this.map.setCenter( {
					lat: lat,
					lng: lng
				} );
			} else {
				console.log( 'Could not set map center', Array.prototype.slice.call( arguments ) );
			}
		},

		pan: function ( x, y ) {
			// Numbers.
			x = Make.Float( x );
			y = Make.Float( y );

			// Need values.
			if ( !x && !y ) {
				return;
			}
			// If we were given percentages convert them to pixels.
			if ( x > -1 && x < 1 && y > -1 && y < 1 ) {
				x *= this.element.width();
				y *= this.element.height();
			}

			this.map.panBy( x, y );
		},

		// Add a set of polygons.
		addPolygons: function ( rows ) {
			var size, poly;
			if ( !rows || !rows.length ) {
				return;
			}

			size = rows.length;
			while ( size-- ) {
				this.addPolygon( rows[size] );
			}
		},

		// Add a single polygon.
		addPolygon: function ( row, alt ) {
			var p, poly, wkt, len;

			// If we were passed an ID, try to match it to a row.
			if ( typeof row === 'number' || typeof row === 'string' ) {
				row = CMS.Map.Locations[row];
			}
			if ( !row ) {
				console.log( 'Missing polygon row data.' );
				return;
			}

			if ( !alt && row.alt ) {
				// Force an alternate color scheme?
				alt = row.alt;
			}

			if ( !row.id ) {
				// Add a new unique id for the polygon as needed.
				row.id = uuid++;
			}

			if ( !( poly = this._polygons[row.id] ) ) {
				// If we haven't already loaded this polygon.

				if ( row.lat && row.lng && row.radius ) {
					// Build a circle shape.
					poly = new google.maps.Circle( {
						center: { lat: Make.Float( row.lat ), lng: Make.Float( row.lng ) },
						radius: Make.Float( row.radius ),
						map: this.map
					} );
				} else {
					// Convert the polygon data ito a gmaps object.
					try {
						wkt = new Wkt.Wkt();
						wkt.read( row.poly );
						poly = wkt.toObject( { reverseInnerPolygons: false } );
					} catch ( ex ) {
						console.log( 'Error', row );
						return;
					}
				}

				// Add a reference to the source row.
				poly.row = row;
				if ( alt ) {
					poly.alt = alt;
				}

				if ( $.isArray( poly ) ) {
					// If this is a multi polygon, connect them.
					len = poly.length;
					while ( len-- ) {
						poly[len].list = poly;
						this._setupPoly( poly[len] );
					}
				} else {
					this._setupPoly( poly );
				}

				// Add the polygon to the dictionary.
				this._polygons[row.id] = poly;

				// If we don't have a specific level set, or the level matches the polygon, set it as active.
				if ( !this.options.level || row.level == this.options.level ) {
					this._active[row.id] = 1;
				}
			} else if ( !this._active[row.id] && row.level == this.options.level ) {
				// If this polygon isn't on the active layer, set it.
				this._active[row.id] = 1;
				this._setPolyOptions( poly, { map: this.map } );
			}

			// Update the poly state based on the current map settings.
			poly.selected = !!this._selected[row.id];
			poly.excluded = !!this._excluded[row.id];
			poly.highlight = !!this._highlight[row.id];
			poly["protected"] = !!this._protected[row.id];

			// If the poly is active on the map, update it's style.
			if ( this._active[row.id] ) {
				this._updatePolyStyle( poly );
			}

			return poly;
		},

		// Refresh the styles of every polygon on the stage.
		refresh: function () {
			var poly;
			// Look through the active polygons.
			for ( var p in this._active ) {
				if ( hasOwn.call( this._active, p ) && ( poly = this._polygons[p] ) ) {
					this._updatePolyStyle( poly );
				}
			}
		},

		// Add a circle to the map.
		addCircle: function ( center, radius, style ) {
			var poly = new google.maps.Circle( {
				center: center,
				radius: radius,
				map: this.map
			} );
			poly.setOptions( style || this.options.colors.circle );
			return poly;
		},

		// Remove a polygon by id.
		removePolygon: function ( id ) {
			var poly = id && this._polygons[id];
			if ( poly ) {
				delete this._active[id];
				this._setPolyOptions( poly, { map: null } );
			}
		},

		// Remove a polygon by ids.
		removePolygons: function ( ids ) {
			if ( !ids ) {
				// Remove all active polygons.
				return this.removePolygons( Object.keys( this._active ) );
			}
			for ( var i = 0; i < ids.length; i++ ) {
				this.removePolygon( ids[i] );
			}
		},

		// Create an overlay, initlaizing it to the current map.
		addOverlay: function ( options ) {
			// Create the overlay.
			var o = new $.cms.gmap.overlay( this.map, options );
			// Show the overlay on the map.
			o.show();
			// Return it.
			return o;
		},

		// Set the state of a polygon.
		_setState: function ( poly, state, style ) {
			var item = poly.list || poly, selected, excluded,
				// Is toggle enabled?
				toggle = ( this.options.multiSelect & MAP_MULTI_SELECT.TOGGLE ) === MAP_MULTI_SELECT.TOGGLE,
				// Is ctrl-click multi-select enabled?
				ctrl = ctrlKeyPressed && ( this.options.multiSelect & MAP_MULTI_SELECT.CTRL ) === MAP_MULTI_SELECT.CTRL,
				// Is shift-click exclude enabled?
				shiftExclude = shiftKeyPressed && ( this.options.multiSelect & MAP_MULTI_SELECT.SHIFT ) === MAP_MULTI_SELECT.SHIFT;

			switch ( state ) {
				case 'mouseover':
					item.over = true;
					break;
				case 'mouseout':
					item.over = false;
					break;
				case 'highlight':
					item.highlight = true;
					break;
				case 'unhighlight':
					item.highlight = false;
					break;
				case 'available':
					item.unavailable = false;
					break;
				case 'unavailable':
					item.unavailable = true;
					break;
				case 'click':
					// If we're doing a toggle OR a ctrl-click, then reverse the current selection state.
					// Otherwise, set the select state as true.
					if ( shiftExclude ) {
						// Set the exclusion state.
						excluded = ( toggle || ctrl ) ? !item.excluded : true;
						this._setExcludeState( item, excluded, toggle || ctrl );
					} else {
						// Set the selection state.
						selected = ( toggle || ctrl ) ? !item.selected : true;
						this._setSelectState( item, selected, toggle || ctrl );
					}
					return;
			}

			// Update the state of the polygon.
			this._updatePolyStyle( item, style, toggle || ctrl, shiftExclude );
		},

		// Set the selection state.
		_setSelectState: function ( item, selected, multi, conceal ) {
			var row = item.row;

			if ( !multi ) {
				// If we're not doing a multi-select, clear the current selection.
				this.clearSelection();
			} else if ( !item.selected === !selected ) {
				// If the selection state didn't change, exit.
				return;
			}

			// Cannot select an unavailable item.
			if ( selected && item.unavailable ) {
				return;
			}

			// Update the state.
			item.selected = !!selected;

			// Add or remove the item from the 'selected' collection.
			if ( row && row.id ) {
				if ( item.selected ) {
					this._selected[row.id] = true;

					// If this item used to be excluded and is now selected, remove it from the excluded collection.
					if ( item.excluded ) {
						item.excluded = false;
						delete this._excluded[row.id];
					}
				} else {
					delete this._selected[row.id];
				}
			}

			// Update the state of the polygon.
			this._updatePolyStyle( item, null, multi );

			if ( !conceal ) {
				// Trigger the selected change event.
				this.notifySelected();
			}
		},

		// Set the excluded state.
		_setExcludeState: function ( item, excluded, multi, conceal ) {
			var row = item.row;

			if ( !multi ) {
				// If we're not doing a multi-select, clear the current selection.
				this.clearExclusions();
			} else if ( !item.excluded === !excluded ) {
				// If the exclusion state didn't change, exit.
				return;
			}

			// Update the state.
			item.excluded = !!excluded;

			// Add or remove the item from the 'excluded' collection.
			if ( row && row.id ) {
				if ( item.excluded ) {
					this._excluded[row.id] = true;

					// If this item used to be selected and is now excluded, remove it from the selected collection.
					if ( item.selected ) {
						item.selected = false;
						delete this._selected[row.id];
					}
				} else {
					delete this._excluded[row.id];
				}
			}

			// Update the state of the polygon.
			this._updatePolyStyle( item, null, multi, true );

			if ( !conceal ) {
				// Trigger the selected change event.
				this.notifySelected();
			}
		},

		// Set the exact set of polygons to protect.
		setProtected: function ( items ) {
			this.unprotect();
			this.protect( Make.IntArray( items ) );
		},

		// Set active polygons by id.
		setPolygons: function ( ids, fit ) {
			var size, dict, poly, row;

			ids = Make.IntArray( ids, true );
			size = ids.length;
			dict = {};
			while ( size-- ) {
				dict[ids[size]] = true;
			}

			// Look for active polygons that aren't on the new list.
			for ( var p in this._active ) {
				if ( hasOwn.call( this._active, p ) && !dict[p] ) {
					// Get the polygon and remove it.
					poly = this._polygons[p];
					this._setPolyOptions( poly, { map: null } );
					delete this._active[p];
					delete dict[p];
				}
			}

			// Add whatever's left.
			for ( var p in dict ) {
				if ( hasOwn.call( dict, p ) ) {
					poly = this._polygons[p];
					if ( poly ) {
						this._active[p] = 1;
						this._setPolyOptions( poly, { map: this.map } );
						this._updatePolyStyle( poly );
					} else {
						row = CMS.Map.Locations[p];
						if ( row ) {
							this._active[p] = 1;
							this.addPolygon( row );
						} else {
							console.log( "Couldn't find row", p );
						}
					}
				}
			}

			if ( fit ) {
			}
		},

		// Get a set of selected items based off which polygons are so marked.
		_getSelected: function () {
			var poly, item, row,
				selected = {};

			// Look through polygons in the current layer.
			for ( var p in this._polygons ) {
				if ( hasOwn.call( this._polygons, p ) ) {
					// Get the next polygon.
					poly = this._polygons[p];
					item = ( poly && poly.list ) || poly;
					row = item && item.row;

					// If it is marked as selected, add it to the collection.
					if ( row && item.selected && row.level == this.options.level ) {
						selected[p] = true;
					}
				}
			}

			return selected;
		},

		// Trigger the selected event.
		notifySelected: function () {
			var poly, row,
				ids = [],
				rows = [],
				eids = [],
				erows = [];

			// Look through the selected items.
			for ( var p in this._selected ) {
				if ( hasOwn.call( this._selected, p ) ) {
					// Get the polygon and matching row.
					poly = this._polygons[p];
					row = ( poly && poly.row ) || CMS.Map.Locations[p];

					// Put the row in place, even if not found.
					rows[ids.length] = row;

					// Add the id.
					ids.push( p );
				}
			}

			// Look through the excluded items.
			for ( var p in this._excluded ) {
				if ( hasOwn.call( this._excluded, p ) ) {
					// Get the polygon and matching row.
					poly = this._polygons[p];
					row = ( poly && poly.row ) || CMS.Map.Locations[p];

					// Put the row in place, even if not found.
					erows[eids.length] = row;

					// Add the id.
					eids.push( p );
				}
			}

			// Trigger the selected event with the ids and matching rows.
			this._trigger( 'selected', null, { selected: ids, rows: rows, excluded: eids, erows: erows } );
		},

		// Update the state of the polygon.
		_updatePolyStyle: function ( poly, style, multi, shiftExclude ) {
			var selected, excluded, over, highlight, unavailable, defaults, colors, ecolors, opacity;

			// If we don't have a specific declared style.
			if ( !style ) {
				// Get the current state.
				if ( poly.list ) {
					selected = poly.list.selected;
					excluded = poly.list.excluded;
					over = poly.list.over;
					highlight = poly.list.highlight;
					unavailable = poly.list.unavailable;
				} else {
					selected = poly.selected;
					excluded = poly.excluded;
					over = poly.over;
					highlight = poly.highlight;
					unavailable = poly.unavailable;
				}

				if ( shiftExclude && over && selected ) {
					// If we're alt-exclude hovering on a selected item, we'll be 'ADDING' it as excluded.
					selected = false;
				} else if ( !shiftExclude && over && excluded ) {
					// If we're hovering on an excluded item, we'll be 'ADDING' it as selected.
					excluded = false;
				}

				// Default colors.
				defaults = this.options.colors;
				// Obtain the custom state colors (or the standard state colors).
				colors = ( poly.alt && defaults[poly.alt] ) || defaults;

				if ( unavailable ) {
					// Anything unavailable is the highest priority.
					style = colors.unavailable || defaults.unavailable;
				} else if ( selected && over && multi ) {
					// If we can do multi-select, and we're hovering over a selected item, color it 'remove'.
					style = colors.remove || defaults.remove;
				} else if ( excluded && over && multi ) {
					// If we can do multi-select, and we're hovering over a excluded item, color it 'remove'.
					style = colors.removeexcluded || defaults.removeexcluded || colors.remove || defaults.remove;
				} else if ( !selected && !excluded && over && multi ) {
					if ( shiftExclude ) {
						// If we can do multi-select, and we're hovering over an unexcluded item, color it 'addexcluded'.
						style = colors.addexcluded || defaults.addexcluded || colors.add || defaults.add;
					} else {
						// If we can do multi-select, and we're hovering over an unselected item, color it 'add'.
						style = colors.add || defaults.add;
					}
				} else if ( selected ) {
					// Otherwise, any selected item gets the default 'selected' state.
					style = colors.selected || defaults.selected;
				} else if ( excluded ) {
					// Otherwise, any excluded item gets the default 'excluded' state.
					style = colors.excluded || defaults.excluded;
				} else if ( highlight ) {
					// If we have a highlighted item, show it.
					style = colors.highlight || defaults.highlight;
				} else if ( over ) {
					// If we have an unselected, hovering, non-multi-select state, color it 'hover'.
					style = colors.hover || defaults.hover;
				} else {
					// All that's left is the standard color.
					style = colors.standard || defaults.standard;
				}
			}

			// Set the poly style.
			this._setPolyOptions( poly, style );

			// If a custom opacity has been set.
			if ( poly.opacity && style.fillOpacity !== undefined ) {
				this._setPolyOptions( poly, { fillOpacity: style.fillOpacity * poly.opacity } );
			}

			// Return it.
			return style;
		},

		// Set options for a polygon (or group of polygons).		
		_setPolyOptions: function ( poly, options ) {
			if ( $.isArray( poly ) ) {
				var size = poly.length;
				while ( size-- ) {
					poly[size].setOptions( options );
				}
				return;
			}
			poly.setOptions( options );
		},

		// Set up the polygon defaults.
		_setupPoly: function ( poly ) {
			var // Get the item.
				item = poly.list || poly,
				// And the row.
				row = item && item.row,
				// If the level matches the current map level, add the poly to the map immediately.
				map = ( !this.options.level || row.level == this.options.level ) ? this.map : null,
				// Poly colors.
				options = $.extend(
					{ strokeWeight: 0.5 },
					{ zIndex: 2, map: map }
				);

			// Set the options.
			poly.setOptions( options );

			// Set the poly level.
			item.level = row.level;

			// Save a reference to the gmap widget to the polygon being bound.
			poly.gmap = this;

			// Wire up the events.
			google.maps.event.addListener( poly, "mouseover", function ( e ) {
				var item = this.list || this;

				// Note the current polygon.
				currentPolygon = this;

				if ( $.cms.gmap.disabled( this.gmap ) ) {
					// Map interaction disabled.
					return;
				} else if ( this.gmap.options.pointerEvents === MAP_POINTER_EVENTS.ALL ) {
					// All events enabled.
				} else if ( item["protected"] || item.unavailable ) {
					// Skip over protected items.
					return;
				} else if ( this.gmap.options.pointerEvents === MAP_POINTER_EVENTS.ANY ) {
					// Any level can work.
				} else if ( this.gmap.options.level && this.gmap.options.level != item.level ) {
					// Level doesn't match.
					return;
				}

				if ( paintSelect || paintDeselect ) {
					// Set the selection state.
					this.gmap._setSelectState( item, paintSelect, true );

					// Trigger any highlight event.
					this.gmap._trigger( 'paint', null, { item: item, row: item && item.row, select: paintSelect } );

					// Exit now, we won't fire the standard mouseover event.
					return;
				} else if ( paintExclude || paintUnexclude ) {
					// Set the selection state.
					this.gmap._setExcludeState( item, paintExclude, true );

					// Exit now, we won't fire the standard mouseover event.
					return;
				}

				// Set the state.
				this.gmap._setState( this, 'mouseover' );

				// Trigger any highlight event.
				this.gmap._trigger( 'highlight', null, { item: item, row: item && item.row } );
			} );
			google.maps.event.addListener( poly, "mouseout", function ( e ) {
				var item = this.list || this;

				// Clear the current polygon.
				currentPolygon = null;

				if ( $.cms.gmap.disabled( this.gmap ) ) {
					// Map interaction disabled.
					return;
				} else if ( this.gmap.options.pointerEvents === MAP_POINTER_EVENTS.ALL ) {
					// All events enabled.
				} else if ( item["protected"] || item.unavailable ) {
					// Skip over protected items.
					return;
				} else if ( this.gmap.options.pointerEvents === MAP_POINTER_EVENTS.ANY ) {
					// Any level can work.
				} else if ( this.gmap.options.level && this.gmap.options.level != item.level ) {
					// Level doesn't match.
					return;
				}

				// Set the state.
				this.gmap._setState( this, 'mouseout' );

				// Trigger an unhighlight event.
				this.gmap._trigger( 'unhighlight', null, { item: item, row: item && item.row } );
			} );
			google.maps.event.addListener( poly, "mousedown", function ( e ) {
				var item = this.list || this;

				if ( $.cms.gmap.disabled( this.gmap ) ) {
					// Map interaction disabled.
					return;
				} else if ( this.gmap.options.pointerEvents === MAP_POINTER_EVENTS.ALL ) {
					// All events enabled.
				} else if ( item["protected"] || item.unavailable ) {
					// Skip over protected items.
					return;
				} else if ( this.gmap.options.pointerEvents === MAP_POINTER_EVENTS.ANY ) {
					// Any level can work.
				} else if ( this.gmap.options.level && this.gmap.options.level != item.level ) {
					// Level doesn't match.
					return;
				}

				if ( paintSelect || paintDeselect ) {
					// Set the selection state.
					item.over = false;
					this.gmap._setSelectState( item, paintSelect, true );

					// Exit now, we won't fire the standard mouseover event.
					return;
				} else if ( paintExclude || paintUnexclude ) {
					// Set the selection state.
					item.over = false;
					this.gmap._setExcludeState( item, paintExclude, true );

					// Exit now, we won't fire the standard mouseover event.
					return;
				}
			} );
			google.maps.event.addListener( poly, "mouseup", function ( e ) {
				// Restore the 'over' state on mouse up.
				var toggle, ctrl,
					item = this.list || this;

				if ( $.cms.gmap.disabled( this.gmap ) ) {
					// Map interaction disabled.
					return;
				} else if ( this.gmap.options.pointerEvents === MAP_POINTER_EVENTS.ALL ) {
					// All events enabled.
				} else if ( item["protected"] || item.unavailable ) {
					// Skip over protected items.
					return;
				} else if ( this.gmap.options.pointerEvents === MAP_POINTER_EVENTS.ANY ) {
					// Any level can work.
				} else if ( this.gmap.options.level && this.gmap.options.level != item.level ) {
					// Level doesn't match.
					return;
				}

				// Reset the 'over' state correctly.
				item.over = true;
				toggle = $.cms.gmap.toggle( this.gmap );
				ctrl = ctrlKeyPressed && $.cms.gmap.ctrl( this.gmap );
				this.gmap._updatePolyStyle( item, null, ( toggle || ctrl ) );
			} );
			google.maps.event.addListener( poly, "click", function ( e ) {
				var stop, item = this.list || this;

				if ( $.cms.gmap.click( this.gmap ) ) {
					stop = this.gmap.options.multiSelect === MAP_MULTI_SELECT.CLICK;
					// Trigger a custom click event.
					this.gmap._trigger( 'click', null, { polygon: this, item: item, row: item.row } );
					if ( stop ) {
						// If this is the only selection type, exit.
						return;
					}
				} else if ( $.cms.gmap.disabled( this.gmap ) ) {
					// Map interaction disabled.
					return;
				} else if ( this.gmap.options.pointerEvents === MAP_POINTER_EVENTS.ALL ) {
					// All events enabled.
				} else if ( item["protected"] || item.unavailable ) {
					// Skip over protected items.
					return;
				} else if ( this.gmap.options.pointerEvents === MAP_POINTER_EVENTS.ANY ) {
					// Any level can work.
				} else if ( this.gmap.options.level && this.gmap.options.level != item.level ) {
					// Level doesn't match.
					return;
				}

				this.gmap._setState( this, 'click' );
			} );

			if ( map ) {
				// Note that the poly is in the active layer.
				this._active[row.id] = 1;
			}
		},

		// Clear all active polygons on the map.
		clear: function () {
			var poly, item, row;
			for ( var p in this._active ) {
				if ( hasOwn.call( this._active, p ) ) {
					// Get the next polygon and its row.
					poly = this._polygons[p];
					item = ( poly && poly.list ) || poly;
					row = item && item.row;
					// Clear it.
					delete item.over;
					this._setPolyOptions( poly, { map: null } );
					delete this._active[p];
				}
			}
		},

		// Protect a polygon from being interacted with.
		protect: function ( id ) {
			var index, poly;

			// If we have an array of ids, select all of them.
			if ( $.isArray( id ) ) {
				index = id.length;
				while ( index-- ) {
					this.protect( id[index] );
				}
				return;
			}

			if ( !id ) {
				return;
			}
			this._protected[id] = true;
			poly = this._polygons[id];
			if ( poly ) {
				poly["protected"] = true;
			}
		},

		// Unprotect a polygon from being interacted with.
		unprotect: function ( id ) {
			var index, poly;

			// Unprotect all.
			if ( !id ) {
				this.unprotect( Object.keys( this._protected ) );
				return;
			}

			// If we have an array of ids, select all of them.
			if ( $.isArray( id ) ) {
				index = id.length;
				while ( index-- ) {
					this.unprotect( id[index] );
				}
				return;
			}

			if ( !id ) {
				return;
			}
			delete this._protected[id];
			poly = this._polygons[id];
			if ( poly ) {
				poly["protected"] = false;
			}
		},

		// Select a polygon by id (or an array of ids).
		select: function ( id, conceal ) {
			var index, poly;

			// If we have an array of ids, select all of them.
			if ( $.isArray( id ) ) {
				index = id.length;
				while ( index-- ) {
					this.select( id[index], true );
				}
				if ( !conceal ) {
					this.notifySelected();
				}
				return;
			}

			poly = id && this._polygons[id];
			if ( poly ) {
				// Select the polygon.
				this._setSelectState( poly, true, true, true );
				this._persistState( poly );
			}

			if ( !conceal ) {
				this.notifySelected();
			}
		},

		// Unselect a polygon by id (or an array of ids).
		unselect: function ( id, conceal ) {
			var index, poly;

			// Unselect all.
			if ( !id ) {
				this.unselect( Object.keys( this._selected ) );
				return;
			}

			// If we have an array of ids, unselect all of them.
			if ( $.isArray( id ) ) {
				index = id.length;
				while ( index-- ) {
					this.unselect( id[index], true );
				}
				if ( !conceal ) {
					this.notifySelected();
				}
				return;
			}

			poly = id && this._polygons[id];
			if ( poly ) {
				this._setSelectState( poly, false, true, true );
				this._persistState( poly );
			} else {
				delete this._selected[id];
			}

			if ( !conceal ) {
				this.notifySelected();
			}
		},

		// Set selected elements.
		setSelection: function ( items, conceal ) {
			// Clear the existing selection.
			this.clearSelection();

			// Get  the list as an arrayt.
			items = Make.IntArray( items, true );
			for ( var i = 0; i < items.length; i++ ) {
				// Select each item without broadcasting an event.
				this.select( items[i], true );
			}

			if ( !conceal ) {
				// Trigger the selected event.
				this.notifySelected();
			}
		},

		// Clear all selected items.
		clearSelection: function () {
			var poly;
			for ( var p in this._polygons ) {
				if ( hasOwn.call( this._polygons, p ) ) {
					poly = this._polygons[p];
					if ( poly && poly.selected ) {
						poly.selected = false;
						this._updatePolyStyle( poly );
					}
				}
			}
			this._selected = {};
		},

		// Add a polygon by id (or an array of ids) to the excluded collection.
		exclude: function ( id, conceal ) {
			var index, poly;

			// If we have an array of ids, select all of them.
			if ( $.isArray( id ) ) {
				index = id.length;
				while ( index-- ) {
					this.exclude( id[index], true );
				}
				if ( !conceal ) {
					this.notifySelected();
				}
				return;
			}

			poly = id && this._polygons[id];
			if ( poly ) {
				this._setExcludeState( poly, true, true, true );
			}

			if ( !conceal ) {
				this.notifySelected();
			}
		},

		// Unselect a polygon by id (or an array of ids).
		unexclude: function ( id, conceal ) {
			var index, poly;

			// Unselect all.
			if ( !id ) {
				this.unexclude( Object.keys( this._excluded ) );
				return;
			}

			// If we have an array of ids, unselect all of them.
			if ( $.isArray( id ) ) {
				index = id.length;
				while ( index-- ) {
					this.unexclude( id[index], true );
				}
				if ( !conceal ) {
					this.notifySelected();
				}
				return;
			}

			poly = id && this._polygons[id];
			if ( poly ) {
				this._setExcludeState( poly, false, true, true );
			}

			if ( !conceal ) {
				this.notifySelected();
			}
		},

		// Set excluded elements.
		setExclusion: function ( items, conceal ) {
			var size, poly;

			// Clear the existing selection.
			this.clearExclusion();

			// Set the selected properties.
			items = Make.IntArray( items, true );
			size = items.length;
			while ( size-- ) {
				this._excluded[items[size]] = true;

				// Update the polygon state.
				poly = this._polygons[items[size]];
				if ( poly ) {
					poly.excluded = true;
					this._updatePolyStyle( poly );
				}
			}

			if ( !conceal ) {
				// Trigger the selected event.
				this.notifySelected();
			}
		},

		// Clear all excluded items.
		clearExclusion: function () {
			var poly;
			for ( var p in this._polygons ) {
				if ( hasOwn.call( this._polygons, p ) ) {
					poly = this._polygons[p];
					if ( poly && poly.excluded ) {
						poly.excluded = false;
						this._updatePolyStyle( poly );
					}
				}
			}
			this._excluded = {};
		},

		// Highlight a polygons by id.
		highlight: function ( id, style ) {
			var index, poly;

			// If we have an array of ids, select all of them.
			if ( $.isArray( id ) ) {
				index = id.length;
				while ( index-- ) {
					this.highlight( id[index], style );
				}
				return;
			}

			if ( !id ) {
				return;
			}
			this._highlight[id] = true;
			poly = this._polygons[id];
			if ( !poly ) {
				return;
			}
			this._setPolyOptions( poly, { map: this.map } );
			this._active[id] = 1;
			this._setState( poly, 'highlight', style );
		},

		// Unhighlight a polygons by id.
		unhighlight: function ( id ) {
			var index, poly;

			// Unhighlight all.
			if ( !id ) {
				this.unhighlight( Object.keys( this._highlight ) );
				return;
			}

			// If we have an array of ids, select all of them.
			if ( $.isArray( id ) ) {
				index = id.length;
				while ( index-- ) {
					this.unhighlight( id[index] );
				}
				return;
			}

			if ( !id ) {
				return;
			}
			delete this._highlight[id];
			poly = this._polygons[id];
			if ( poly && this._active[id] ) {
				this._setState( poly, 'unhighlight' );
			}
		},

		// Set the exact list of unavailable items.
		setHighlight: function ( ids ) {
			this.clearHighlight();
			if ( ids && ids.length ) {
				for ( var i = 0; i < ids.length; i++ ) {
					var id = ids[i];
					if ( !id ) {
						return;
					}

					// If we don't yet have this polygon loaded, but it exists in the map dictionary, create it.
					var poly = this._polygons[id];
					if ( !poly ) {
						row = CMS.Map.Locations[id];
						if ( row ) {
							poly = this.addPolygon( row );
						}
					}

					// Highlight the element by id.
					this.highlight( ids[i] );
				}
			}
		},

		// Clear all highlighted items.
		clearHighlight: function () {
			var poly;
			for ( var p in this._polygons ) {
				if ( hasOwn.call( this._polygons, p ) ) {
					poly = this._polygons[p];
					if ( poly && poly.highlight ) {
						poly.highlight = false;
						this._updatePolyStyle( poly );
					}
				}
			}
			this._highlight = {};
		},

		// Mark a polygon as available.
		available: function ( id ) {
			var index, poly;

			// If we have an array of ids, select all of them.
			if ( $.isArray( id ) ) {
				index = id.length;
				while ( index-- ) {
					this.available( id[index] );
				}
				return;
			}

			if ( !id ) {
				return;
			}
			delete this._unavailable[id];
			poly = this._polygons[id];
			if ( !poly ) {
				return;
			}
			this._setState( poly, 'available' );
		},

		// Mark a polygon as unavailable.
		unavailable: function ( id ) {
			var index, poly;

			// If we have an array of ids, select all of them.
			if ( $.isArray( id ) ) {
				index = id.length;
				while ( index-- ) {
					this.unavailable( id[index] );
				}
				return;
			}

			if ( !id ) {
				return;
			}
			this._unavailable[id] = true;
			poly = this._polygons[id];
			if ( !poly ) {
				return;
			}
			this._setState( poly, 'unavailable' );
		},

		// Set the exact list of unavailable items.
		setUnavailable: function ( ids ) {
			this.clearUnavailable();
			if ( ids && ids.length ) {
				for ( var i = 0; i < ids.length; i++ ) {
					this.unavailable( ids[i] );
				}
			}
		},

		// Clear all unavailable items.
		clearUnavailable: function () {
			var poly;
			for ( var p in this._polygons ) {
				if ( hasOwn.call( this._polygons, p ) ) {
					poly = this._polygons[p];
					if ( poly && poly.unavailable ) {
						poly.unavailable = false;
						this._updatePolyStyle( poly );
					}
				}
			}
			this._unavailable = {};
		},

		// Highlight a specific polygon.
		hover: function ( id ) {
			var poly = id && this._polygons[id];
			if ( poly && this._active[id] ) {
				this._setState( poly, 'mouseover' );
			}
		},

		// Unhighlight a specific polygon.
		unhover: function ( id ) {
			var poly = id && this._polygons[id];
			if ( poly && this._active[id] ) {
				this._setState( poly, 'mouseout' );
			}
		},

		// Add an icon.
		addIcon: function ( row, icon ) {
			var icon;

			// Make sure we have valid data.
			if ( row.id && row.lat && row.lng ) {
				icon = this._icons[row.id];
				if ( !icon ) {
					// Create the icon and add it to the collection.
					icon = this.setPin( { lat: row.lat, lng: row.lng }, icon );
					this._icons[row.id] = icon;
					this._activeIcons[row.id] = 1;
				} else if ( !this._activeIcons[row.id] ) {
					// Activate the icon.
					icon.setOptions( { map: this.map } );
					this._activeIcons[row.id] = 1;
				}
			}
		},

		// Remove an icon from the map by id.
		removeIcon: function ( id ) {
			var icon = id && this._icons[id];
			if ( icon && this._activeIcons[id] ) {
				// Activate the icon.
				icon.setOptions( { map: null } );
				delete this._activeIcons[id];
			}
		},

		// Set a pin in the map.
		setPin: function ( location, icon, center ) {
			var fn, pin;

			if ( !location ) {
				// Need a location.
				return;
			}

			// If we've passed an object with coordinates, convert it to a lat/lng literal.
			if ( location.latitude && location.longitude ) {
				location = {
					lat: location.latitude,
					lng: location.longitude
				};
			}

			if ( typeof location === 'string' ) {
				// If we have an address, look it up first.
				fn = function ( map ) {
					return function ( latlng ) {
						if ( latlng ) {
							map.setPin( latlng, icon, center );
						}
					};
				}( this );
				$.cms.gmap.getLatLng( location, fn );
			} else if ( center && this._centerPin ) {
				// If we already have a center pin, reset the animation and position.
				pin = this._centerPin;
				pin.setAnimation( null );
				pin.setAnimation( google.maps.Animation.DROP );
				pin.setOptions( { position: location, map: this.map } );
				if ( icon ) {
					pin.setIcon( icon );
				}
			} else {
				// Create the pin and add it.
				pin = new google.maps.Marker( {
					position: location,
					map: this.map,
					animation: this.options.pinAnimation,
					icon: icon || '//www.scorpioncms.com/common/images/map-marker.png'
				} );

				if ( center ) {
					// Set the center pin.
					this._centerPin = pin;
				} else {
					// Add the pin to the collection.
					if ( !this._pins ) {
						this._pins = [];
					}
					this._pins.push( pin );
				}
			}

			return pin;
		},

		// Remove any pins from the map.
		clearPins: function () {
			var size;
			if ( this._pins ) {
				size = this._pins.length;
				while ( size-- ) {
					this._pins[size].setOptions( { map: null } );
				}
			}
			if ( this._centerPin ) {
				this._centerPin.setOptions( { map: null } );
			}
		}

	} );

	// Static properties and methods
	$.extend( $.cms.gmap, {

		LEVEL_STATE: 2,
		LEVEL_COUNTY: 3,
		LEVEL_CITY: 4,
		LEVEL_ZIPCODE: 5,

		// Geo cache.
		cache: {},

		// Static geocoder object.
		geo: null,

		// Get a latitude / longitude from an address.
		getLatLng: function ( address, callback, options ) {
			var latlng,
				componentRestrictions = {};
			// Validate inputs.
			if ( !address || typeof address != 'string' ) {
				return;
			}

			// Check for the address in the cache.
			latlng = $.cms.gmap.cache[address];
			if ( latlng ) {
				// Run the callback.
				if ( $.isFunction( callback ) ) {
					callback( latlng );
				}
				// Exit.
				return;
			}

			// Initialize the geo coder.
			if ( !$.cms.gmap.geo ) {
				$.cms.gmap.geo = new google.maps.Geocoder();
			}
			
			// Apply any geocoder restrictions.
			if ( $.isPlainObject( options ) ) {
				if ( options.country ) {
					componentRestrictions.country = options.country;
				}
			}

			// Get the address.
			$.cms.gmap.geo.geocode( { "address": address, "componentRestrictions": componentRestrictions }, function ( results, status ) {
				var latlng = null;
				if ( status === google.maps.GeocoderStatus.OK ) {
					// Cache the results.
					latlng = results[0].geometry.location;
					$.cms.gmap.cache[address] = latlng;
				}

				// Run the callback.
				if ( $.isFunction( callback ) ) {
					callback( latlng, results, status );
				}
			} );
		},

		fixEvent: function ( e ) {
			if ( e && e.kb && !e.kb.button && mouseButton ) {
				console.log( e.kb );
				e.kb.button = mouseButton;
			}
		},

		// Extend boundaries with a polygon.
		extend: function ( e, poly ) {
			var size, sw, lat, lng, ne, coords, bounds;

			if ( !e || !poly ) {
				return;
			} else if ( $.isArray( poly ) ) {
				// We have an array of polygons, extend each one.
				size = poly.length;
				while ( size-- ) {
					$.cms.gmap.extend( e, poly[size] );
				}
			} else if ( poly.getSouthWest ) {
				// Extend the min boundary.
				sw = poly.getSouthWest();
				lat = sw.lat();
				lng = sw.lng();
				if ( lng > 160 ) { lng = -179.9; }	// Fix alaska crossing the IDL.
				if ( !e.minlat || lat < e.minlat ) {
					e.minlat = lat;
				}
				if ( !e.minlng || lng < e.minlng ) {
					e.minlng = lng;
				}
				// Extend the max boundary.
				ne = poly.getNorthEast();
				lat = ne.lat();
				lng = ne.lng();
				if ( lng > 160 ) { lng = -179.9; }	// Fix alaska crossing the IDL.
				if ( !e.maxlat || lat > e.maxlat ) {
					e.maxlat = lat;
				}
				if ( !e.maxlng || lng > e.maxlng ) {
					e.maxlng = lng;
				}
			} else if ( poly.getBounds ) {
				// The poly has a getBounds, so obtain it and recurse.
				bounds = poly.getBounds();
				$.cms.gmap.extend( e, bounds );
			} else if ( poly.getPath ) {
				// The poly has a getPath, get the points.
				coords = poly.getPath().getArray();
				size = coords.length;
				// Extend the points into a bounds.
				bounds = new google.maps.LatLngBounds();
				while ( size-- ) {
					bounds.extend( coords[size] );
				}
				// Recurse.
				$.cms.gmap.extend( e, bounds );
			}
		},

		// Basic map overlay function.
		overlay: function ( m, options ) {
			// Save a reference to the map.
			var _map = m;

			// Set the options.
			this.options = $.extend( {}, options );

			// Show the cluster.
			this.show = function () {
				this.setMap( _map );
			};

			// Hide the cluster.
			this.hide = function () {
				this.setMap( null );
			};

			// When the cluster is added to the map.
			this.onAdd = function () {
				if ( !this._div ) {
					this._div = document.createElement( 'div' );
					this._div.style.display = 'block';
					this._div.style.position = 'static';
					this._div.style.margin = '0px';
					this._div.style.padding = '0px';
					this._div.style.overflow = 'visible';
					this._div.style.opacity = 1;
				}

				// Add a container div to the overlay.
				this.getPanes().overlayMouseTarget.appendChild( this._div );
				$( this._div ).on( 'click', $.proxy( this._onClick, this ) );

				// Trigger any subscribed init event.
				if ( $.isFunction( this.options.init ) ) {
					this.options.init.apply( this, arguments );
				}
			};

			// When the cluster is removed from the map.
			this.onRemove = function () {
				if ( this._div ) {
					// Unbind the click event and remove the div.
					$( this._div ).off( 'click' );
					this._div.parentNode.removeChild( this._div );
				}
			};

			// Clicking on the cluster.
			this._onClick = function ( e ) {
				// Trigger any subscribed click event.
				if ( $.isFunction( this.options.click ) ) {
					this.options.click.apply( this, arguments );
				}
			};

			// Draw the overlay contents.
			this.draw = function () {
				var proj = this.getProjection(),
					// Create a calculation function for turning lat/lng to x/y pixels.
					calc = proj && function () {
						var obj, lat, lng, ll;
						if ( arguments.length === 1 && ( obj = arguments[0] ) ) {
							// If we have a single argument, assume it's a object.
							lat = obj.lat || obj.latitude || obj.Latitude;
							lng = obj.lng || obj.longitude || obj.Longitude;
						} else if ( arguments.length === 2 ) {
							// If we have 2 arguments, the lat and lng are directly supplied.
							lat = arguments[0];
							lng = arguments[1];
						}

						if ( lat && lng ) {
							// Build the lat/lng object.
							ll = new google.maps.LatLng( lat, lng );
							// Covert it to pixels.
							return proj.fromLatLngToDivPixel( ll );
						} else {
							return null;
						}
					};

				if ( calc && $.isFunction( this.options.draw ) ) {
					this.options.draw.apply( this, [calc] );
				}
			};
		},
		// Are mouse events disabled for the map?
		disabled: function ( gmap ) { return gmap.options.multiSelect === MAP_MULTI_SELECT.DISABLE || gmap.options.pointerEvents === MAP_POINTER_EVENTS.NONE; },
		// Is a custom click handler enabled?
		click: function ( gmap ) { return ( gmap.options.multiSelect > 0 && gmap.options.multiSelect & MAP_MULTI_SELECT.CLICK ) === MAP_MULTI_SELECT.CLICK },
		// Is ctrl-click toggle enabled?
		ctrl: function ( gmap ) { return ( gmap.options.multiSelect > 0 && gmap.options.multiSelect & MAP_MULTI_SELECT.CTRL ) === MAP_MULTI_SELECT.CTRL },
		// Is left-click toggle enabled?
		toggle: function ( gmap ) { return ( gmap.options.multiSelect > 0 && gmap.options.multiSelect & MAP_MULTI_SELECT.TOGGLE ) === MAP_MULTI_SELECT.TOGGLE },
		// Is paint selection enabled?
		paint: function ( gmap ) { return ( gmap.options.multiSelect > 0 && gmap.options.multiSelect & MAP_MULTI_SELECT.PAINT ) === MAP_MULTI_SELECT.PAINT }

	} );

	// Set the correct overlay prototype inheritance.
	$.cms.gmap.overlay.prototype = new google.maps.OverlayView();

	// Make a compatible window event function.
	if ( window.addEventListener ) {
		wn_evt = function ( type, handler ) {
			window.addEventListener( type, handler, true );
		};
	} else if ( window.attachEvent ) {
		wn_evt = function ( type, handler ) {
			window.attachEvent( 'on' + type, handler );
		};
	}

	// Record which mouse button is down.
	wn_evt( 'mousedown', function ( e ) {
		mouseDown = true;
		mouseButton = e.button;

		// Are we activating a right-click and drag paint?
		if ( mouseButton === 2 && currentPolygon && $.cms.gmap.paint( currentPolygon.gmap ) ) {
			if ( shiftKeyPressed && currentPolygon.excluded ) {
				paintUnexclude = true;
			} else if ( shiftKeyPressed ) {
				paintExclude = true;
			} else if ( currentPolygon.selected ) {
				paintDeselect = true;
			} else {
				paintSelect = true;
			}
			// Treat this like a click on the polygon.
			new google.maps.event.trigger( currentPolygon, 'click', {} );
			// Prevent the default event so the right-click drag doesn't begin.
			return StopAll( e );
		}
	} );
	wn_evt( 'mouseup', function ( e ) {
		mouseDown = false;
		mouseButton = 0;

		// Turn off all painting on a mouseup.
		paintSelect = false;
		paintDeselect = false;
		paintExclude = false;
		paintUnexclude = false;
	} );

	// Record if we have a ctrl key down.
	wn_evt( 'keydown', function ( e ) {
		if ( e.repeat ) {
			return;
		}
		ctrlKeyPressed = e.ctrlKey;
		shiftKeyPressed = e.shiftKey;

		if ( shiftKeyPressed && currentPolygon ) {
			currentPolygon.gmap._setState( currentPolygon );
		}
	} );
	wn_evt( 'keyup', function ( e ) {
		ctrlKeyPressed = e.ctrlKey;
		shiftKeyPressed = e.shiftKey;

		if ( !shiftKeyPressed && currentPolygon ) {
			currentPolygon.gmap._setState( currentPolygon );
		}
	} );

	// If the mouse leaves the window, treat it as a mouse up / key up.
	wn_evt( 'mouseout', function ( e ) {
		var evt = e || window.event || {},
			from = evt.relatedTarget || evt.toElement;
		if ( !from || !from.nodeName || from.nodeName === 'HTML' ) {
			mouseDown = false;
			mouseButton = 0;
			paintDeselect = false;
			ctrlKeyPressed = false;
		}
	} );

	// CMS7 register script.
	if ( window.register ) {
		window.register( "m/gmap" );
	}

} ) );