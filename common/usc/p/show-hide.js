if ( !window.USC ) { window.USC = {}; }
require2( [ 'usc/p/utils', 'usc/p/slide-toggle' ], function () {

	var defaultOptions = {
		// The class added is customizable.
		className: 'show',
		// Do you need a class added to the html element? It goes on the container by default.
		htmlClass: false,
		// Should the panel slide open an shut?
		slider: false
	}

	/**
	 * Create the showHide control.
	 * 
	 * @param {HTMLElement} el 
	 */
	function showHide( el ) {

		// Grab the elements
		var box = el.closest( '[data-showhide]' ) || el;
		this.els = {
			box: box,
			btns: Array.from( box.querySelectorAll( '[data-role="btn"]' ) ),
			panel: box.querySelector( '[data-role="panel"]' )
		}

		// If we don't have all of the pieces to continue, then don't.
		if ( !this.els.btns || !this.els.panel ) return;

		// Set the options.
		var data = USC.elementData( this.els.box );
		this.options = Object.assign( {}, defaultOptions, data );

		// Get the last focusable element in the panel
		this.els.lastFocus = Array.from( this.els.panel.querySelectorAll( 'a, button, input, select, [tabindex="0"], video' ) ).pop();
		if ( !this.els.lastFocus ) this.els.lastFocus = this.els.panel;
		
		// Initiate the tracking of our active state.
		this.active = false

		// Bind these methods to this instance.
		this.handleAria = handleAria.bind( this );
		this.handleClick = handleClick.bind( this );
		this.handleKeyDown = handleKeyDown.bind( this );
		this.toggleActive = toggleActive.bind( this );

		// Handle ARIA Setup.
		this.handleAria();
		
		// If we don't have a return spot yet, set the first btn we have. (This means there wasn't one set as type open)
		this.els.returnSpot = ( this.els.returnSpot ) ? this.els.returnSpot : this.els.btns[0];

		// Bind the click and keydown events to the whole box.
		this.els.box.addEventListener( 'keydown', this.handleKeyDown );
		this.els.box.addEventListener( 'click', this.handleClick);

	}

	/**
	 * Handle all of the ARIA markup and accessibility decisions. 
	 */
	function handleAria() { 
		
		this.els.box.setAttribute( 'role', 'dialog' );
		USC.setAttributes( this.els.panel, { 'aria-hidden': true, tabindex: 0 } );
		
		// Loop through the buttons to set their attributes
		for ( var btn = 0; btn < this.els.btns.length; btn++ ) {
			USC.setAttributes( this.els.btns[btn], { role: 'button', tabindex: 0, 'aria-pressed': false, 'aria-haspopup': false } )
			
			// Check for a type of open so we can set our return element to focus on when we close.
			if ( !this.els.returnSpot && this.els.btns[btn].getAttribute( 'data-type' ) === 'open' ) this.els.returnSpot = this.els.btns[btn];
			
		}
	}
	
	/**
	 * Handles click events and key downs that will count as clicks.
	 * 
	 * @param {Event} e 
	 */
	function handleClick( e ) {
		if ( e.target.closest( '[data-role="btn"]' ) )	this.toggleActive()
	}

	/**
	 * Handles Key Down Events
	 * 
	 * @param {KeyboardEvent} e 
	 */
	function handleKeyDown( e ) {
		
		// Setup a few quick variables to track what we're doing.
		var toggle;

		// Check for someone hitting Escape to close the popup.
		if ( e.keyCode === 27 && this.active ) {
			toggle = true;
		}
		
		// Check to see if we clicked Enter on a Button.
		if ( e.keyCode === 13 && this.els.btns.includes( e.target ) ) {
			toggle = true;
		}
		
		// Check to see if we're tabbing and we're on the panel.
		if ( e.keyCode === 9 && this.els.panel.contains( e.target ) ) {
			
			// If shift was held to move back and they're on the panel itself.
			if ( e.shiftKey && this.els.panel == e.target ) {
				toggle = true;
				e.preventDefault();
			} 
			// If moving forward and we're currently on our last element.
			else if ( !e.shiftKey && this.els.lastFocus == e.target ) {
				toggle = true;
				this.els.lastFocus = this.els.panel;
			} 
			
		}
		
		// Take action if we've decided it's needed
		if ( toggle === true ) this.toggleActive();

	}

	/**
	 * Function to handle showing/hiding the panel.
	 */
	function toggleActive() {

		// If we're sliding, do some crazy slider stuff...
		if ( this.options.slider === true ) {
			USC.slideToggle( this.els.panel, !this.active );
		}

		// Look for videos.
		var videos = this.els.panel.querySelectorAll( 'video' );
			
		// Look for a video and play/pause depending on whether we're opening or closing.
		if ( this.active ) {
			videos.forEach( function(el) {
				try { el.pause(); }
				catch ( ex ) { ; }
			} );
		} else {
			try { 
				if ( videos[0].readyState >= 1 )  videos[0].play(); 
			}
			catch ( ex ) { ; } 
		}

		// Toggle the classes and ARIA attributes
		this.els.box.classList.toggle( this.options.className );
		this.els.panel.setAttribute( 'aria-hidden', this.active );
		for ( var btn = 0; btn < this.els.btns.length; btn++ ) {
			this.els.btns[btn].setAttribute( 'aria-pressed', this.active ? false : true );
		}
		
		// Toggle the class on the html element if desired.
		if ( this.options.htmlClass ) {
			document.querySelector('html').classList.toggle( this.options.className );
		}
		
		// Set our focus where it needs to be.
		if ( this.active ) {
			this.els.returnSpot.focus();
		} else {
			this.els.panel.focus();
		}
		
		// Update the active state.
		this.active = ( this.active ) ? false : true;

	}


	/**
	 * Public showHide creation.
	 * 
	 * @param {any} el
	 */
	window.USC.showHide = function ( el ) {
		if ( !( el instanceof HTMLElement ) ) {
			throw new Error( "Need an HTMLElement to initialize a showHide." )
		} else if ( el.$showHide ) {
			console.log( "showHide already initialized." );
			return;
		} else {
			el.$showHide = new showHide( el );
		}
	};

	if ( window.register ) {
		window.register( 'usc/p/show-hide' );
	}

} );