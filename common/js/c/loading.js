/// <reference path="../j/jquery.2.x.js" />
/// <reference path="../j/ui.draw.js" />
/// <reference path="../static.js" />

if ( window.registerLoading ) {
	registerLoading( "c/loading" );
}

( function ( factory ) {
	if ( typeof rrequire === "function" ) {

		// CMS7 rrequire function.
		rrequire( ["j/jquery", "j/jquery.ui", "static", "c/scrollbar"], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
}( function ( $ ) {

	$.widget( "cms.loading", {
		options: {
			// Add a modal overlay.
			modal: true,
			// Fade out duration.
			fadeOut: 200
		},

		// Create the wizard.
		_create: function () {
			var indexes, zIndex, pos, cls;

			if ( this.loading ) {
				return;
			}

			// Record the start time.
			this.startTime = performance.now();

			// Create the overlay.
			if ( this.options.modal ) {
				// Record the original position value.
				this.origPosition = this.element[0].style.position;

				// Make the element relative as needed.
				if ( this.element.css( 'position' ) === 'static' && this.element[0] !== document.body ) {
					this.element.css( { position: 'relative' } );
				}

				// Get the largest z-index element already in the area.
				indexes = this.element.children( '.ui-front:visible' ).map( function () {
					return +$( this ).css( 'z-index' );
				} ).get();
				zIndex = Math.max.apply( null, indexes );

				// Get the loader positioning.
				pos = this.element.is( 'body' ) ? 'fixed' : 'absolute';

				// Wrap any scrolling area as needed.
				$.cms.scrollbar.wrap( this.element );

				cls = 'ui-widget-overlay ui-front ' + ( this.options.overlayClass || "" );
				this.overlay = $( '<div class="' + cls + '"></div>' ).css( { position: pos } ).appendTo( this.element );

				// Update the z-index as needed.
				if ( zIndex >= +this.overlay.css( 'z-index' ) ) {
					this.overlay.css( { zIndex: zIndex + 1 } );
				}

				// Create the loader.
				this.loading = $( $.cms.loading.html ).css( { position: pos } ).appendTo( this.element );
				if ( this.options.large ) {
					this.loading.addClass( 'large' );
				}

				// Update the z-index as needed.
				if ( zIndex >= +this.loading.css( 'z-index' ) ) {
					this.loading.css( { zIndex: zIndex + 1 } );
				}
			}

			// Add the loading classes.
			this.element.removeClass( 'loaded' ).addClass( 'ui-loader loading' );
		},

		// Done completes the loader.
		done: function () {
			var running;

			// Non modal is destroyed immediately.
			if ( !this.options.modal ) {
				this.destroy();
				return;
			}

			// If we don't have a fade out, kill it not.
			if ( !this.options.fadeOut ) {
				this.destroy();
				return;
			}

			// If the loading animation has been running from less that 0.25 seconds, destroy it immediately.
			running = performance.now() - this.startTime;
			if ( running < 250 ) {
				this.destroy();
				return;
			}

			// Add the loaded class.
			this.element.removeClass( 'loading' ).addClass( 'loaded' );

			// Otherwise, fade it out.
			if ( this.overlay ) {
				this.overlay.animate( { opacity: 0 }, this.options.fadeOut );
			}
			if ( this.loading ) {
				this.loading.animate( { opacity: 0 }, this.options.fadeOut );
			}
			setTimeout( $.proxy( this.destroy, this ), this.options.fadeOut );
		},

		// Clean up the loader.
		_destroy: function () {
			// Just in case we skipped the 'done' step.
			this.element.removeClass( 'loading' ).addClass( 'loaded' );

			// Remove the overlay and loading elements.
			if ( this.overlay ) {
				this.overlay.remove();
				this.overlay = null;
			}
			if ( this.loading ) {
				this.loading.remove();
				this.loading = null;
			}

			if ( this.options.modal ) {
				// Unwrap the scrolling area (unless it is a cms-crollbar and shouldn't be unwrapped.
				if ( !this.element.is( '.cms-scrollbar' ) ) {
					$.cms.scrollbar.unwrap( this.element );
				}

				// Restore the original position of the element.
				this.element[0].style.position = this.origPosition || "";
			}
		}

	} );

	// Loading icon.
	$.cms.loading.html = '<div class="cms-fancy-loader ui-front"><div class="cms-fancy-border"></div></div>';

	// CMS7 register script.
	if ( window.register ) {
		window.register( "c/loading" );
	}

} ) );