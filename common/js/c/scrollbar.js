/// <reference path="../j/jquery.2.x.js" />
/// <reference path="../static.js" />

if ( window.registerLoading ) {
	registerLoading( "c/scrollbar" );
}

( function ( factory ) {
	if ( typeof rrequire === "function" ) {

		// CMS7 rrequire function.
		rrequire( ["j/jquery", "j/jquery.ui", "static", "j/ui.wheel"], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
}( function ( $ ) {

	$.widget( "cms.scrollbar", {
		options: {
			captureScroll: false
		},

		_create: function () {
			var container, w;

			if ( Modernizr.cssscrollbar ) {
				// Using the webkit scrollbar css.
				return;
			} else {
				// Wrap the element and get the panel with the overflow setting.
				this.panel = $.cms.scrollbar.wrap( this.element.addClass( 'cms-scrollbar' ) );

				// Check if we had to wrap outside the current element (e.g. for a UL).
				if ( this.panel.is( '.ui-scroll-wrap' ) ) {
					// The wrap returned the parent container.  The scrolling panel is the actual element.
					container = this.panel;
					this.panel = this.element;
				} else {
					// The panel is correct, and the parent container is the original element.
					container = this.element;
				}

				// Create the vertical scrolling thumbnail.
				this.vthumb = $( '<div class="ui-scroll-thumb vertical"></div>' )
					.appendTo( container )
					.draggable( {
						axis: 'y',
						containment: 'parent',
						drag: $.proxy( this._setVScroll, this )
					} );

				// Create the horizontal scrolling thumbnail.
				this.hthumb = $( '<div class="ui-scroll-thumb horizontal"></div>' )
					.appendTo( container )
					.draggable( {
						axis: 'x',
						containment: 'parent',
						drag: $.proxy( this._setHScroll, this )
					} );

				// Set any constraints.
				if ( this.element.is( '.vertical' ) ) {
					this.direction = 1;
				} else if ( this.element.is( '.horizontal' ) ) {
					this.direction = 2;
				}

				// Adjust the inner panel width.
				w = this.vthumb.outerWidth( true );
				h = this.hthumb.outerHeight( true );
				this.panel.css( { width: 'calc(100% - ' + w + 'px)', height: 'calc(100% - ' + h + 'px)' } );

				// Event handlers.
				if ( this.options.captureScroll ) {
					this.panel.on( 'mousewheel', this.direction, $.cms.scrollbar.wheelcapture );
				} else {
					this.panel.on( 'mousewheel', this.direction, $.cms.scrollbar.wheel );
				}

				this.vmargin = null;
				this.hmargin = null;

				// Wire up the scrollbar redraw.
				this._update = $.proxy( this.update, this );
				this.element.on( 'update', this._update );
				$( window ).on( 'resize.scrollbar', this._update );
				this._update();
			}
		},

		// Set the scrollable area based on where the thumb was dragged.
		_setVScroll: function ( e, ui ) {
			var ratio,
				thumb = this.vthumb[0],
				p = this.panel[0],
				t = ui.position.top,
				h = p.scrollHeight,
				o = p.offsetHeight;

			if ( h > o ) {
				if ( this.vmargin === null ) {
					this.updateMargin();
				}

				// The position of the thumb, relative to the offset height (less thumb height) is what percentage down from the top we are.
				ratio = t / ( o - thumb.offsetHeight - this.vmargin );

				// Scrollable height (less visible area) times ratio is where to set the scroll top.
				p.scrollTop = Make.Int(( h - o ) * ratio );
			}
		},

		// Set the scrollable area based on where the thumb was dragged.
		_setHScroll: function ( e, ui ) {
			var ratio,
				thumb = this.hthumb[0],
				p = this.panel[0],
				l = ui.position.left,
				w = p.scrollWidth,
				o = p.offsetWidth;

			if ( w > o ) {
				if ( this.hmargin === null ) {
					this.updateMargin();
				}

				// The position of the thumb, relative to the offset width (less thumb width) is what percentage over from the left we are.
				ratio = l / ( o - thumb.offsetWidth - this.hmargin );

				// Scrollable width (less visible area) times ratio is where to set the scroll left.
				p.scrollLeft = Make.Int(( w - o ) * ratio );
			}
		},

		// Calculate the margin of the scrollbar thumb.
		updateMargin: function () {
			this.vmargin = Make.Int( this.vthumb.css( 'marginTop' ) ) + Make.Int( this.vthumb.css( 'marginBottom' ) );
			this.hmargin = Make.Int( this.hthumb.css( 'marginLeft' ) ) + Make.Int( this.hthumb.css( 'marginRight' ) );
		},

		// Update the scrollbar thumbnail.
		update: function () {
			var p = this.panel[0],
				vthumb = this.vthumb[0],
				t = p.scrollTop,
				h = p.scrollHeight,
				oh = p.offsetHeight,
				hthumb = this.hthumb[0],
				l = p.scrollLeft,
				w = p.scrollWidth,
				ow = p.offsetWidth;

			if ( h > oh ) {
				if ( this.vmargin === null ) {
					this.updateMargin();
				}
				// Set the thumb style.
				vthumb.style.height = ( Make.Int( oh / h * oh ) - this.vmargin ) + 'px';
				vthumb.style.top = Make.Int( t / h * oh ) + 'px';
				vthumb.style.display = 'block';
			} else {
				// Hide the thumb.
				vthumb.style.display = 'none';
			}
			if ( w > ow ) {
				if ( this.hmargin === null ) {
					this.updateMargin();
				}
				// Set the thumb style.
				hthumb.style.width = ( Make.Int( ow / w * ow ) - this.vmargin ) + 'px';
				hthumb.style.left = Make.Int( l / w * ow ) + 'px';
				hthumb.style.display = 'block';
			} else {
				// Hide the thumb.
				hthumb.style.display = 'none';
			}

			// Cancel bubble.
			return false;
		},

		// When the scrollbar is destroyed.
		_destroy: function () {
			if ( Modernizr.cssscrollbar ) {
				// Using the webkit scrollbar css.
				return;
			}

			// Remove the thumb elements.
			this.vthumb.remove();
			this.hthumb.remove();

			// Unbind the events.
			this.element.off( 'update', this._update );
			$( window ).off( 'resize.scrollbar', this._update );

			// Unwrap the scroller.
			$.cms.scrollbar.unwrap( this.element.removeClass( 'cms-scrollbar' ) );
		}
	} );

	// Static methods.
	$.extend( $.cms.scrollbar, {
		wheel: function ( e, capture, greedy ) {
			var top,
				amountY = e.data === 2 ? 0 : e.deltaY * e.deltaFactor,
				amountX = e.data === 1 ? 0 : e.deltaX * e.deltaFactor,
				el = e.target,
				adjusted = false;

			// CMS5 adapter.
			if ( isNaN( amountY ) ) {
				amountY = e.delta * 70;
			}
			if ( isNaN( amountX ) ) {
				amountX = 0;
			}

			// If we're doing a horizontal scroll, translate a mousewheel up and down
			// into a mousewheel left and right.
			if ( e.data === 2 && !amountX && !amountY && e.deltaY ) {
				amountX = e.deltaY * e.deltaFactor * -1;
			}

			while ( true ) {
				// Measure the scroll top.
				top = el.scrollTop;
				left = el.scrollLeft;

				// Try to adjust it.
				el.scrollTop -= amountY;
				el.scrollLeft += amountX;

				if ( el.scrollTop != top || el.scrollLeft != left ) {
					// If it changed, we're good.  Trigger any scrollbar redraw.
					$( el ).closest( '.ui-scroll' ).trigger( 'update' );

					// Note that we made an adjustment and exit.
					adjusted = true;
					break;
				} else if ( capture && el.scrollHeight > el.offsetHeight ) {
					// If we've been asked to capture the mousewheel, and the current item has a scrollbar, mark it as adjusted.
					adjusted = true;
				}

				if ( el === this || !el.parentNode || e.parentNode === document.body ) {
					// If we've reached the end, stop here.
					break;
				} else {
					el = el.parentNode;
				}
			}

			if ( greedy === true ) {
				// Kill the event.
				return StopAll( e );
			} else if ( capture && adjusted ) {
				// Kill the event.
				return StopAll( e );
			} else if ( adjusted ) {
				// Stop the bubble.
				return false;
			}
		},

		// Capture the wheel event and do not let it propagate upwards if we have a scrollbar.
		wheelcapture: function ( e ) {
			$.cms.scrollbar.wheel.apply( this, [e, true] );
		},

		// Capture the wheel event and do not let it propagate upwards at all.
		wheelgreedy: function ( e ) {
			$.cms.scrollbar.wheel.apply( this, [e, true, true] );
		},

		// Wrap the element with a container div.
		wrap: function ( el ) {
			var parent, temp, style, positioned, outer, inner;

			if ( !el || !el.is( '.ui-scroll' ) || el.is( '.ui-scroll-wrap,.ui-scroll-inner' ) ) {
				return;
			}

			// Outer wrapping is tricky.  The position and dimensions of the wrapper needs to be assigned.  But if
			// The inner element has percentage or calculated heights, it is difficult to obtain.
			// 
			// Webkit only returns the actual pixel size.  Luckily it supports native styling of scrollbar elements.
			// Mozilla returns the percentage values only if the parent element is a display:none.  11/6/2014
			// IE10+ returns the percentage values with the nonstandard element.currentStyle property.

			// Temporarily hide the parent element.
			parent = el[0].parentNode;
			temp = parent.getAttribute( 'style' );
			parent.style.display = 'none';

			// Get the current style of the element.
			style = el[0].currentStyle || window.getComputedStyle( el[0] );

			// Does the current element have a non-static position?
			positioned = /absolute|fixed|relative/i.test( style.position );

			// Get the css for the outer wrap tag.
			outer = {
				display: style.display,
				position: positioned ? style.position : 'relative',
				top: positioned ? style.top : 'auto',
				right: positioned ? style.right : 'auto',
				bottom: positioned ? style.bottom : 'auto',
				left: positioned ? style.left : 'auto',
				width: style.width,
				height: style.height,
				marginTop: style.marginTop,
				marginRight: style.marginRight,
				marginBottom: style.marginBottom,
				marginLeft: style.marginLeft,
				borderTopColor: style.borderTopColor,
				borderTopStyle: style.borderTopStyle,
				borderTopWidth: style.borderTopWidth,
				borderRightColor: style.borderRightColor,
				borderRightStyle: style.borderRightStyle,
				borderRightWidth: style.borderRightWidth,
				borderBottomColor: style.borderBottomColor,
				borderBottomStyle: style.borderBottomStyle,
				borderBottomWidth: style.borderBottomWidth,
				borderLeftColor: style.borderLeftColor,
				borderLeftStyle: style.borderLeftStyle,
				borderLeftWidth: style.borderLeftWidth,
				borderRadius: style.borderRadius,
				clear: style.clear,
				padding: 0,
				"float": style["float"],
				overflow: 'visible'
			};

			// Reset the parent style.
			parent.setAttribute( 'style', temp );

			// Record the original style of the element.
			el.data( 'originalStyle', el.attr( 'style' ) );

			// Set the css of the original (inner) element.
			el.css( {
				position: 'relative',
				top: 'auto',
				right: 'auto',
				bottom: 'auto',
				left: 'auto',
				width: '100%',
				height: '100%',
				margin: 0,
				border: 0,
				borderRadius: 0,
				clear: 'none',
				"float": 'none',
				overflow: 'hidden'
			} );

			// Create the outer panel and move the UL into it.
			return $( '<div class="ui-scroll-wrap"></div>' )
				.css( outer )
				.insertBefore( el.addClass( 'ui-scroll-inner' ) )
				.append( el );
		},

		// Unwrap a container scrolling div.
		unwrap: function ( el ) {
			var outer, style;

			if ( !el.is( 'ul.ui-scroll-inner' ) ) {
				return;
			}

			// Get the inner scroll element and the original element style.
			outer = el.parent( '.ui-scroll-wrap' );
			style = el.data( 'originalStyle' );

			if ( !outer.length ) {
				return;
			}

			// Move the element back up.
			el.insertBefore( outer );

			// Get rid of the outer wrapping div.
			outer.remove();

			// Restore the original element.
			el.attr( 'style', style || "" ).removeData( 'originalStyle' ).removeClass( 'ui-scroll-inner' );
		}
	} );

	// Add the capture scroll function.
	$.fn.captureScroll = function ( greedy ) {
		if ( this.is( ".horizontal" ) ) {
			return this.on( 'mousewheel', 2, $.cms.scrollbar[greedy ? 'wheelgreedy' : 'wheelcapture'] );
		} else {
			return this.on( 'mousewheel', $.cms.scrollbar[greedy ? 'wheelgreedy' : 'wheelcapture'] );
		}
	};

	// When setting html on a scrollable element, make sure to apply it to the inner div.
	$.fn.shtml = function ( html ) {
		var el = this;
		if ( html === undefined ) {
			if ( el.is( '.ui-scroll-wrap' ) ) {
				el = el.children( '.ui-scroll-inner' );
			}
			return el.html();
		}

		el.filter( '.ui-scroll-wrap' ).children( '.ui-scroll-inner' ).html( html );
		el.filter( '.ui-scroll-inner' ).html( html );
		el.filter( ':not(.ui-scroll-wrap)' ).html( html );
		el.closest( '.ui-scroll' ).trigger( 'update' );
		return this;
	};

	// CMS7 register script.
	if ( window.register ) {
		window.register( "c/scrollbar" );
	}

} ) );