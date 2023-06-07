if ( !window.USC ) { window.USC = {}; }
require2( ['usc/p/utils', 'usc/p/slide-toggle'], function () {

	var defaultOptions = {
		slider: false,
		speed: 500,
		// Are the tabs and their panels siblings or in separate elements?
		siblings: true,
		// Do we want to close an item if it's open and they click the tab again?
		closing: false,
		// Do we want to open items when their tab is hovered?
		hovers: false,
		// Do we want items to stay open once they've been hovered on?
		hoverStay: true,
		// Do you have videos in your items?
		video: false,
		// Do you have images that are being lazy loaded?
		lazy: false,
		// Do you need the first tab in existance to always be active by default?
		// Mostly for when you can't know what might be on the page. (Ex: Not knowing which fields may be filled in on a Staff Profile)
		firstActive: false,
		// Are we running a stepping form of some sort that needs the tabbable to check validity of inputs between steps?
		stepForm: false,
		// Do we want to be able to move the tabs with next and previous buttons of some sort?
		nextPrev: false
	};
	var touch = window.matchMedia( '(hover:none)' );

	/**
	 * Create the Tabbable control.
	 * 
	 * @param {HTMLElement} el 
	 */
	function Tabbable( el ) {
		this.element = el;

		// Get our elements.
		var s = el.closest( '.el-tab-box' ) || el;
		this.els = {
			tabBox: s,
			tabs: Array.from( s.querySelectorAll( '.el-tab' ) ),
			panels: Array.from( s.querySelectorAll( '.el-panel' ) ),
			secTabs: Array.from( s.querySelectorAll( '.el-sec-tab' ) ),
			tabbable: []
		};

		// Make sure we have tabs and panels before we move on.
		if ( !this.els.panels.length || !this.els.tabs.length ) return false;

		// Set the options.
		var data = USC.elementData( el );
		this.options = Object.assign( {}, defaultOptions, data );

		// Bind these methods to this instance.
		this.handleAria = handleAria.bind( this );
		this.getTabbable = getTabbable.bind( this );
		this.handleSubs = handleSubs.bind( this );
		this.tabState = tabState.bind( this );
		this.firstActive = firstActive.bind( this );
		this.toggleActive = toggleActive.bind( this );
		this.checkValidity = checkValidity.bind( this );
		this.handleClick = handleClick.bind( this );

		// Grab any sub tab boxes so we can remove their elements from our current set and set the subsets up with their own Tabbable.
		var sub = Array.from( this.els.tabBox.querySelectorAll( '.el-tab-box' ) );
		if ( sub.length ) {
			this.handleSubs( sub );
		}

		// Make sure we still have tabs and panels before continuing.
		if ( !this.els.panels.length || !this.els.tabs.length ) return false;

		// Check to see if we have secondary tabs.
		if ( this.els.secTabs.length ) this.options.secTabs = true;

		// Check to make sure we don't have non-active panels that are visible as this is an indication we don't need to run.
		var visCheck = panelVisCheck( this.els.panels );
		if ( !visCheck ) return false; 

		// If we are using next/prev buttons, find them and store them. 
		if ( this.options.nextPrev ) {
			this.els.next = s.querySelector( '.el-next-btn' );
			this.els.prev = s.querySelector( '.el-prev-btn' );
		}

		this.handleAria();

		// Do we need the first tab to be active no matter which tab it is?
		if ( this.options.firstActive === true ) this.firstActive();

		// Collect the tabbable elements in our display.
		this.getTabbable();

		// Setup Event Bindings
		this.els.tabBox.addEventListener( 'keydown', handleKeyDown.bind( this ) );
		this.els.tabBox.addEventListener( 'click', handleClick.bind( this ) );

		// If we want to activate the tabs on hover.
		if ( this.options.hovers ) {

			// If we're not on a touch device, treat a focusin or a mouseover on a tab as though we clicked it.
			if ( !touch.matches ) {
				this.els.tabBox.addEventListener( 'mouseover', handleClick.bind( this ) );
				this.els.tabBox.addEventListener( 'focusin', handleClick.bind( this ) );
			}

			if ( !this.options.hoverStay ) {
				// When leaving a tab, turn it off.
				this.els.tabBox.addEventListener( 'mouseleave', handleMouseLeave.bind( this ) );
				this.els.tabBox.addEventListener( 'focusout', handleMouseLeave.bind( this ) );
			}
		}


	}

	/**
	 * Remove items from the arrays if they belong to a subset of tabs.
	 * 
	 * @param {HTMLElement[]} subs
	 * @param {HTMLElement} el
	 * @param {Array} array
	 * @param {Number} index 
	 */
	function removeSub( subs, el, array, index ) {

		// Iterate through the tab subsets and check the element against them.
		for ( var i = 0; i < subs.length; i++ ) {

			// If the element is a child of a subset, remove it from the elements array.
			if ( subs[i].contains( el ) && el != subs[i] ) {
				array.splice( index, 1 );
				break;
			}
		}

	}

	/**
	 * Check each type of element to make sure it's not in a subset.
	 * 
	 * @param {HTMLElement[]} subs
	 */
	function handleSubs( subs ) {

		// Create temporary arrays to work with.
		var tempTabs = this.els.tabs.slice( 0 );
		var tempPanels = this.els.panels.slice( 0 );
		var tempSecTabs = this.els.secTabs.slice( 0 );

		// Check and remove any tabs from nested tab sets.
		for ( var t = this.els.tabs.length - 1; t >= 0; t-- ) {
			removeSub( subs, this.els.tabs[t], tempTabs, t );
		}

		// Replace the orginal object with the updated temp array.
		this.els.tabs = tempTabs;

		// Check and remove any panels from nested tab sets.
		for ( var p = this.els.panels.length - 1; p >= 0; p-- ) {
			removeSub( subs, this.els.panels[p], tempPanels, p );
		}

		// Replace the orginal object with the updated temp array.
		this.els.panels = tempPanels;

		// Check and remove any secondary tabs from nested tab sets.
		for ( var st = this.els.secTabs.length - 1; st >= 0; st-- ) {
			removeSub( subs, this.els.secTabs[st], tempSecTabs, st );
		}

		// Replace the orginal object with the updated temp array.
		this.els.secTabs = tempSecTabs;

		// Create a new Tabbable for each subset of tabs.
		for ( var i = 0; i < subs.length; i++ ) {
			new window.USC.tabbable( subs[i] );
		}
	}

	/**
	 * Take an array of tabs and find the tab associated to the provided panel ID.
	 * 
	 * @param {Array} tabs
	 * @param {Number} id 
	 */
	function findTab( tabs, id ) {
		for ( var i = 0; i < tabs.length; i++ ) {
			if ( tabs[i].getAttribute( 'aria-controls' ) === id ) return tabs[i];
		}
	}

	/**
	 * Handle all of the ARIA markup and accessibility decisions. 
	 */
	function handleAria() {

		// Get the first tab and panel for checking our setup.
		// Grab the tab list element if we have one.
		var tab = this.els.tabs[0];
		var panel = this.els.panels[0];
		var list = tab && tab.closest( 'ul' );

		// If we have a list, add the appropriate attribute.
		if ( list ) {
			list.setAttribute( 'role', 'tablist' );
		}

		// Add tabindex for non-sibling panels so we can jump focus back and forth later.
		if ( this.options.siblings === false ) {
			for ( var pn = 0; pn < this.els.panels.length; pn++ ) {
				this.els.panels[pn].setAttribute( 'tabindex', 0 );
			}
		} else {

			// ( Allows for easily changing to an accordion on mobile. )
			// Since the tabs & panels are siblings, let's determine whether or not we want to use sliding. 
			// Let's assume we want to slide if the panels are relative in position and we're not using hovers as a control.
			// Since all panels should have the same styles, we'll just check the first one. 
			if ( panel && getComputedStyle( panel ).position !== 'absolute' && this.options.hovers === false ) {
				this.options.slider = true;
			}

		}

		// Do some checking to make sure we're only setting necessary attributes.
		this.els.panelIds = ( panel && this.els.panels[0].getAttribute( 'id' ) ) ? true : false;
		this.els.tabControls = ( tab && this.els.tabs[0].getAttribute( 'aria-controls' ) ) ? true : false;

		// If our tabs aren't in a list and we have manually associated elements, let's reorder the arrays.
		// This part assumes the panels are in proper order.
		if ( !list && this.els.panelIds && this.els.tabControls ) {

			// For each panel, find the matching tab and push them one by one into a new array.
			var newTabs = [],
				newSecTabs = [];

			// Run through the panels and find the associated tab or tabs. Reorder them into new arrays accordingly.
			for ( k = 0; k < this.els.panels.length; k++ ) {
				newTabs.push( findTab( this.els.tabs, this.els.panels[k].getAttribute( 'id' ) ) );
				if ( this.options.secTabs ) {
					newTabs.push( findTab( this.els.secTabs, this.els.panels[k].getAttribute( 'id' ) ) );
				}
			}


			// Since we now have an array of tabs in the same order as their matching panels, update the offical tabs array.
			this.els.tabs = newTabs;
			if ( this.options.secTabs ) {
				this.els.secTabs = newSecTabs;
			}

		}

		// Check to see if the first tab is inside any of our panels. 
		// If it is, set an attribute so we can alter how ADA navigation works.
		for (  var pan = 0; pan < this.els.panels; pan++ ) {
			if ( this.els.panels[pan].contains( this.els.tabs[0] ) ) {
				this.els.tabsInPanels = true;
				break;
			}
		}

		// For as many tabs as we have, set the necessary attributes on each tab and its corresponding panel.
		for ( var j = 0; j < this.els.tabs.length; j++ ) {
			if ( !this.els.tabs[j].classList ) {
				console.warn( "This node does not support the classList property", this.els.tabs[j] );
				continue;
			}
			if ( !this.els.panels[j] ) {
				console.warn( "No panel found for this tab", this.els.tabs[j] );
				continue;
			}

			// Setup value for if the current tab / panel are supposed to be active.
			var active = ( this.els.tabs[j].classList.contains( 'active' ) ) ? true : false,
				// If we already have IDs, let's stick with them. If not, let's make our own.
				id = ( this.els.panelIds ) ? this.els.panels[j].getAttribute( 'id' ) : ( this.element.getAttribute( 'id' ) ) ? this.element.getAttribute( 'id' ) : Math.floor( Math.random() * 100 ) + 'Panel' + j;

			// Set all necessary attributes for the current tab
			USC.setAttributes( this.els.tabs[j], { role: 'tab', tabindex: 0, 'aria-selected': active, 'aria-expanded': active, 'aria-controls': id, index: j } );

			// If we have secondary tabs, mirror the normal tab attributes.
			if ( this.options.secTabs ) {
				USC.setAttributes( this.els.secTabs[j], { role: 'tab', tabindex: 0, 'aria-selected': active, 'aria-expanded': active, 'aria-controls': id, index: j } );
			}

			// Set all necessary attributes for the current panel
			USC.setAttributes( this.els.panels[j], { role: 'tabpanel', 'aria-hidden': active ? false : true, id: id } );

		}

		// If we have next/prev buttons, let's set them up.
		if ( this.els.next ) USC.setAttributes( this.els.next, { role: 'button', title: 'View the Next Panel'  } )
		if ( this.els.prev ) USC.setAttributes( this.els.prev, { role: 'button', title: 'View the Previous Panel'  } )

	}

	/**
	 * Find all tabbable elements in the tab box so we can track where we are in moving keyboard users.
	 */
	function getTabbable() {
		var tabbable = Array.from( this.els.tabBox.querySelectorAll( "a,button,input,select,[tabindex]" ) );
		while ( tabbable.length ) {
			// Get the first item on the list and move it to the tabbable collection.
			var item = tabbable.shift();
			this.els.tabbable.push( item );

			// Check to see if this is one of the tab objects.
			var index = this.els.tabs.indexOf( item );
			if ( index < 0 ) {
				continue;
			}

			// Get the matching panel.
			var panel = this.els.panels[index];
			if ( !panel ) continue;
			// Find all tabbable elements in the matching panel.
			for ( var i = 0; i < tabbable.length; i++ ) {
				item = tabbable[i];
				if ( panel === item || panel.contains( item ) ) {
					// Move those over to the tabbable collection, in sequence.
					this.els.tabbable.push( item );

					// Remove this item from the temp collection and adjust the index.
					tabbable.splice( i, 1 );
					i--;
				}
			}
		}
	}

	/**
	 * Handles click events and key downs that will count as clicks.
	 * 
	 * @param {Event} e 
	 */
	function handleClick( e ) {
		// Make sure we clicked on or inside of a tab.
		var tab = e.target.closest( '.el-tab' );
		var secTab = e.target.closest( '.el-sec-tab' );
		var next = e.target.closest( '.el-next-btn' );
		var prev = e.target.closest( '.el-prev-btn' );
		var novalidate = e.target.closest( '.ui-novalidate' );
		
		// If we clicked the next button, makre sure we're in bounds and then open the next panel.
		if ( next ) {
			if ( ( this.activeIndex + 1 ) <= ( this.els.panels.length - 1 ) ) {
				// If we're using form controls, grab them and let's validate before we move. 
				if ( this.options.stepForm && !novalidate ) {
					var valid = this.checkValidity();
					if ( !valid ) return;
				};
				this.tabState( this.activeIndex + 1 );
			} 
		} else if ( prev ) {
			// If we clicked on the previous button, make sur we're in bound and then go to the previous panel.
			if ( ( this.activeIndex - 1 ) >= 0 ) {
				this.tabState( this.activeIndex - 1 );
			} 
		} else if ( !tab && !secTab ) {
			// Not a tab.
			if ( this.options.hover && !this.options.hoverStay ) {
				// Turn off the tabs.
				this.tabState( -1 );
			}
			return;
		} else {
			
			// If what we have is a secondary tab, let's get the regular tab before we move on.
			var sti = secTab && this.els.secTabs.indexOf( secTab );
			if ( secTab && sti > -1 ) {
				tab = this.els.tabs[parseInt( secTab.getAttribute( 'index' ) )];
			}
			
			// Since it is a tab, let's make sure it belongs to this level of tabs.
			var ti = this.els.tabs.indexOf( tab );
			if ( ti < 0 ) {
				return;
			}

			// If we're using form controls, grab them and let's validate before we move. 
			if ( this.options.stepForm ) {
				var valid = this.checkValidity();
				if ( !valid ) return;
			};
			
			// Check to see if the tab is active.
			if ( tab.classList.contains( 'active' ) ) {

				// Close the tabs if we're closing when clicking an active item.
				if ( this.options.closing ) {
					// Turn off all tabs.
					this.tabState( -1 );
				} else {
					return;
				}

			} else {
				// Since we have a tab that belongs to this instance and it's not active, activate it.
				this.tabState( this.els.tabs.indexOf( tab ) );
			}

		}
	}

	/**
	 * Handles Key Down Events
	 * 
	 * @param {KeyboardEvent} e 
	 */
	function handleKeyDown( e ) {
		var tab, index, next, bounds;

		if ( e.keyCode === 13 ) {
			// Pressed enter.
			if ( e.shiftKey && e.ctrlKey && e.altKey ) {
				return;
			} else if ( ( tab = e.target.closest( ".el-tab" ) ) || ( tab = e.target.closest( ".el-sec-tab" ) ) ) {
				// Since we entered on a tab, call the click function for it.
				this.handleClick( e );
				return;
			}
			return;
		} else if ( e.keyCode !== 9 ) {
			// Not a tab key, leave.
			return;
		}

		// Are we in the list of aquired tabbable elements.
		index = this.els.tabbable.indexOf( e.target );
		if ( index < 0 ) {
			return;
		}

		// If our tabs are inside of panels, go no further.
		if ( this.els.tabsInPanels ) return;

		// Find the next or previous visible element depending on whether Shift was held.
		for ( var i = index + ( e.shiftKey ? -1 : 1 ); ( i < this.els.tabbable.length ) && ( i >= 0 ); e.shiftKey ? i-- : i++ ) {
			next = this.els.tabbable[i];
			bounds = next.getBoundingClientRect();
			if ( !bounds.width || !bounds.height ) {
				next = undefined;
				continue;
			} else {
				break;
			}
		}

		if ( next ) {
			// Manually focus on that element.
			next.focus();
			e.preventDefault();
		} else if ( !e.shiftKey ) {
			// Since we're going forward.
			// Create a temp element to skip us passed the open panel.
			var esc = document.createElement( 'span' )
			esc.setAttribute( 'tabindex', 0 );

			// Add the temp element to the end of the tab box and focus on it.
			this.els.tabBox.appendChild( esc );
			esc.focus();

			// Now that we've moved our focus passed the panels and we're safe, remove the escape element.
			esc.remove();
		}
	}

	/**
	 * If we're closing when you leave a tab, this function handles it.
	 * 
	 * @param {MouseEvent} e 
	 */
	function handleMouseLeave( e ) {
		this.tabState( -1 );
	}

	/**
	 * Check Validity Function for Stepping Forms.
	 */
	function checkValidity() {
		var pnl;
		// Get the active panel
		for ( var p = 0; p < this.els.panels.length; p++ ) {
			if ( this.els.panels[p].classList.contains( 'active' ) ) { 
				pnl = this.els.panels[p];
				continue;
			}
		}

		// Grab the inputs from that panel and add them to an array.
		var inps = Array.from( pnl.querySelectorAll( 'input, select, textarea' ) );
		// If we have inputs, check them against the form.js "Invalid" function. 
		// It returns true if valid and false if invalid.
		if ( inps ) {
			for (var i = 0; i < inps.length; i++ ) {
				if ( !inps[i].trigger( 'invalid' ) ) return false;
			}
		}
		
		// If we don't find inputs or none come back invalid, return true.
		return true;
	}

	/**
	 * Set the first visible tab to be active, no matter which tab it is.
	 */
	function firstActive() {
		var activeIndex = 0;

		// Check each tab in order to see which one is the first visible tab.
		for ( var t = 0; t < this.els.tabs.length; t++ ) {

			var tab = this.els.tabs[t];

			// If the tab is visible, let's set the activeIndex.
			// Otherwise, let's check the next tab.
			var bounds = tab.getBoundingClientRect();
			if ( bounds.width || bounds.height ) {
				activeIndex = parseInt( t );
				break;
			}

		}

		// Store the active index.
		this.activeIndex = activeIndex;

		// Call it.
		this.tabState( activeIndex );

	}

	/**
	 * ( Allows you to block or move to a scrolling list in responsive ) 
	 * If our panels are not hidden, let's assume we don't want tabs. 
	 * Iterate through the panels looking for a non-active panel that is being displayed. 
	 * 
	 * @param {Array} panels 
	 */
	function panelVisCheck( panels ) {
		for ( var p = 0; p < panels.length; p++ ) {

			// Grab the current panel.
			var panel = panels[p];
			if ( panel.classList.contains( 'active' ) ) {
				continue;
			}

			// If a non-active panel is visible, exit now.
			var bounds = panel.getBoundingClientRect();
			if ( bounds.width || bounds.height ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Set the active and inactive state for each tab.
	 * 
	 * @param {Number} index 
	 */
	function tabState( index ) {
		// Loop through the tabs and set the state. 
		for ( var i = 0; i < this.els.tabs.length; i++ ) {
			var tab = this.els.tabs[i];
			var panel = this.els.panels[i];
			this.toggleActive( tab, panel, i === index );
			if ( i === index ) this.activeIndex = index;
		}

		// If we're on the first or last tab, add a class to the tab-box. Otherwise, make sure we don't have either class.
		if ( this.activeIndex === 0 ) {
			this.els.tabBox.classList.add( 'tab-start' );
			this.els.tabBox.classList.remove( 'tab-end' );
		} else if ( this.activeIndex === ( this.els.panels.length - 1 ) ) {
			this.els.tabBox.classList.remove( 'tab-start' );
			this.els.tabBox.classList.add( 'tab-end' );
		} else {
			this.els.tabBox.classList.remove( 'tab-start', 'tab-end' );
		}

	}

	/**
	 * Handle activating and deactivating tabs and panels. 
	 * 
	 * @param {HTMLElement} el
	 * @param {HTMLElement} panel 
	 * @param {Boolean} active
	 */
	function toggleActive( el, panel, active ) {
		// If we're already active and we're trying to activate, there's nothing to do.
		if ( active && el.classList.contains( 'active' ) ) return;

		// If we're not active and we're trying to deactivate, there's nothing to do.
		if ( !active && !el.classList.contains( 'active' ) ) return;

		// If we're sliding, do some crazy slider stuff...
		if ( this.options.slider === true ) {
			USC.slideToggle( panel, active );
		}

		// Add/remove the active class from the tab and it's corresponding panel.
		el.classList.toggle( 'active' );
		panel.classList.toggle( 'active' );

		// Update the ARIA attributes to reflect the new states
		USC.setAttributes( el, { 'aria-selected': active, 'aria-expanded': active } );
		panel.setAttribute( 'aria-hidden', active ? false : true );

		// If we're using secondary tabs, let's update them according to how we did the normal tabs.
		if ( this.options.secTabs ) {
			secTab = this.els.secTabs[el.getAttribute( 'index' )];
			secTab.classList.toggle( 'active' );
			USC.setAttributes( secTab, { 'aria-selected': active, 'aria-expanded': active } );

			// Focus on the normal tab so we're back in the correct spot we were before we entered the current panel.
			if ( !active ) {
				el.focus();
			}

		}

		// If we're marking a panel as active and we have a setup where tabs are in panels, move the focus to the newly opened panel.
		if ( active && this.els.tabsInPanels ) {
			panel.focus();
		}

		// Trigger any elements that are deferred inside the panel that is active
		if ( active ) {
			panel.dispatchEvent( new Event('resize') );
		}

		// If we're going active, look to see if there are images we need to show. 
		// The lazy load can't handle images inside of hidden panels so we have to work around it until we can find a better solution.
		if ( this.options.lazy === true && active ) {
			if ( panel.querySelector( 'img[data-src],img[data-bg],video[data-src],source[data-src]' ).length > 0 ) {
				window.dispatchEvent(new Event('resize'));
			}
		}

		// If we're handling video and we have a video, let's pause it
		if ( this.options.video === true && !active ) {
			panel.querySelectorAll( "video" ).forEach( function ( el ) {
				try { el.pause(); }
				catch ( ex ) { ; }
			} );
		}

	}


	/**
	 * Public Tabbable creation.
	 * 
	 * @param {any} el
	 */
	window.USC.tabbable = function ( el ) {
		if ( !( el instanceof HTMLElement ) ) {
			throw new Error( "Need an HTMLElement to initialize a Tabbable." )
		} else if ( el.$tabbable ) {
			console.log( "Tabbable already initialized." );
			return;
		} else {
			el.$tabbable = new Tabbable( el );
		}
	};

	/**
	 * If the supplied element is part of a tabbable, ensure it is visible.
	 * 
	 * @param {HTMLElement} el
	 */
	window.USC.setTabbableActive = function ( el ) {
		// Look for a panel.
		var panel = el.closest( '.el-panel' );
		if ( !panel || panel.offsetHeight ) {
			// If there isn't one, or it's visible, exit.
			return;
		}

		// Find the Tabbable instance.
		var tabbable;
		var p = el;
		while ( p ) {
			if ( p.$tabbable ) {
				tabbable = p.$tabbable;
				break;
			} else if ( p === panel ) {
				break;
			} else if ( !p.parentNode ) {
				break;
			} else {
				p = p.parentNode;
			}
		}
		if ( !tabbable ) {
			return;
		}

		// Set this as active.
		var index = tabbable.els.panels.indexOf( panel );
		if ( index !== -1 ) {
			tabbable.tabState( index );
		}
	}

	if ( window.register ) {
		window.register( 'usc/p/tabbable' );
	}

} );