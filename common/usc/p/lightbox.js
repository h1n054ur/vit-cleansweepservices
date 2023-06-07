if ( !window.USC ) { window.USC = {}; }
require2( ['usc/p/utils'], function () {

	var defaultOptions = {
		// Do we want a 1 / 5 counter in the lightbox?
		counter: true,
		// Do we want social sharing? 
		// This is also contingent per image on the settings set in the publishing pages. 
		social: true,
		// Do we want zoom functionality?
		zoom: true,
		// Do we want the ability to go full screen?
		fullscreen: true,
		// Do we want change images through arrows?
		arrows: true,
		// Are we using thumbs to change images in the lightbox? 
		thumbs: false,
		// If we're using thumbs, are they going to be a scrolling list?
		thumbScroller: false
	};

	/**
	 * Create the lightBox control.
	 * 
	 * @param {HTMLElement} el 
	 */
	function lightBox( el ) {

		// Grab the Elements. 
		this.els = {
			gal: el,
			thumbs: Array.from( el.querySelectorAll( '[data-thumb]' ) ),
			items: Array.from( el.querySelectorAll( 'li[data-lb-item]' ) ),
			btn: el.querySelector( 'a[data-lb-btn]' ),
			customItem: el.querySelector( 'li[data-custom-item]' ),
			customBox: el.querySelector( 'div[data-custom-box]' )
		}

		this.id = this.els.gal.closest( '[id]' ).getAttribute( 'id' );
		this.lightboxId = this.id + '_Lightbox';

		// If we don't have items, use our thumbs as the items.
		if ( !this.els.items.length ) this.els.items = this.els.thumbs;

		// If we have thumbs, let's add default attributes onto them.
		if ( this.els.thumbs ) {
			for ( t in this.els.thumbs ) {
				USC.setAttributes( this.els.thumbs[t], { role: 'button', tabindex: 0, 'aria-haspopup': true, 'aria-expanded': false, 'aria-controls': 'lbItem' + t, 'lb-index': t } );
			}
		}

		// If we have a button that controls the opening of the light box, let's setup attributes for it.
		if ( this.els.btn ) USC.setAttributes( this.els.btn, { role: 'button', tabindex: 0, 'aria-haspopup': true, 'aria-expanded': false, 'aria-controls': this.lightboxId } );

		// Setup an object to store data about what we're doing.
		this.state = {
			index: 0,
			total: this.els.items.length,
			touch: 'ontouchstart' in document.documentElement,
			animating: false,
			loaded: false,
			icons: this.els.gal.getAttribute( 'data-icons' ),
			zoom: 0,
			dragging: false,
			drag: {
				range: {
					x: 0,
					y: 0
				},
				cursorPos: {
					x: 0,
					y: 0
				},
				startPos: {
					x: 0,
					y: 0
				}
			},
			firstOpen: true
		}

		// Set the options.
		var data = USC.elementData( el );
		this.options = Object.assign( {}, defaultOptions, data );

		// Bind these methods to this instance.
		this.handleClick = handleClick.bind( this );
		this.handleKeyDown = handleKeyDown.bind( this );
		this.dragStart = dragStart.bind( this );
		this.dragMove = dragMove.bind( this );
		this.dragStop = dragStop.bind( this );
		this.dragReset = dragReset.bind( this );
		this.dragReset = dragReset.bind( this );
		this.createLightBox = createLightBox.bind( this );
		this.openBox = openBox.bind( this );
		this.closeBox = closeBox.bind( this );
		this.loadSlides = loadSlides.bind( this );
		this.classCleaner = classCleaner.bind( this );
		this.loaded = loaded.bind( this );
		this.handleZoom = handleZoom.bind( this );
		this.toggleFullscreen = toggleFullscreen.bind( this );
		this.toggleShare = toggleShare.bind( this );
		this.ajaxReset = ajaxReset.bind( this );

		// Go create the lightbox and add it to the page.
		this.createLightBox();

		// If we have light box thumbs, let's get them in place.
		if ( this.options.thumbs ) {
			for ( var i = 0; i < this.els.lbThumbs.length; i++ ) {
				this.els.lbThumbs[i].querySelector( 'img' ).setAttribute( 'src', this.els.items[i].dataset.img );
			}
		};

		// Add Event to the Transcript Container for Updating the Video.
		this.els.gal.addEventListener( 'click', this.handleClick );
		this.els.lightBox.addEventListener( 'click', this.handleClick );
		this.els.gal.addEventListener( 'keydown', this.handleKeyDown );
		this.els.lightBox.addEventListener( 'keydown', this.handleKeyDown );

		// If we're allowing users to zoom, we need to add drag functionality.
		if ( this.options.zoom ) this.els.lightBox.addEventListener( 'mousedown', this.dragStart );

		// If we're allowing fullscreen, setup polyfills for it.
		if ( this.options.fullscreen ) {
			if ( !Element.prototype.requestFullscreen ) Element.prototype.requestFullscreen = Element.prototype.mozRequestFullscreen || Element.prototype.webkitRequestFullscreen || Element.prototype.msRequestFullscreen;
			if ( !document.exitFullscreen ) document.exitFullscreen = document.mozExitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
		}

		// If we have an ajax render event, let's reset everything.
		this.els.gal.addEventListener( 'ajaxifyrender', this.ajaxReset );

	}

	/**
	 * Create the Light Box According to Our Setup.
	 */
	function createLightBox() {

		// Create variables so we can assemble our lightbox one piece at a time.
		var lightItems = '';
		var lightThumbs = '';
		var siteHost = window.location.protocol + window.location.host;
		// If we've already got a Lightbox, remove it
		if ( document.getElementById( this.lightboxId ) ) {
			document.getElementById( this.lightboxId ).remove();
		}
		// If we have a fully custom lightbox, let's do things a little bit differently. 
		if ( this.els.customBox ) {

			// Insert the box and give the inserted box a separate ID so we can catch the correct one.
			document.body.insertAdjacentHTML( 'beforeend', this.els.customBox.outerHTML );
			var cb = Array.from( document.querySelectorAll( 'div[data-custom-box]' ) ).pop();
			cb.setAttribute( 'id', this.lightboxId );

		} else {

			// Create the Light Box with the other pieces in place.
			var lightBox =
				'<div class="lb-con dk-bg lb-zoom-0" aria-hidden="true" id="' + this.lightboxId + '"' + ( this.options.thumbScroller ? ' data-role="scroller"' : '' ) + '>' +
				'<div class="lb-background bg-bx lk-bg flx f_m">' +
				'<div class="lb-box bg-bx ulk-bg pd_v-40 pd_h rsp_pd mn_tn">' +
				'<div class="lb-controls flx f_m f_sb">' +
				'<div class="lb-paging" data-paging></div>' +
				'<ul class="flx f_m" data-controls></ul>' +
				'</div>' +
				'<div class="lb-arrows" data-arrows></div>' +
				'<ul class="lb-slide-con rlt" data-slides></ul>' +
				( this.options.thumbs ?
					'<div class="mrg_tp" ' + ( this.options.thumbScroller ? 'data-role="container"' : '' ) + '>' +
					'<ul class="lb-thumbs flx-grd-sml sl_ato-rsp" ' + ( this.options.thumbScroller ? 'data-role="list"' : '' ) + ' data-thumbs></ul>' +
					( this.options.thumbScroller ? '<div class="flx f_m f_c mrg_tp-40" data-role="arrows"><button class="flx" title="View previous item" aria-label="View previous item" data-action="Prev"><svg viewbox="0 0 24 24"><use href="/cms/svg/admin/' + this.state.icons + '.24.svg#caret_left"></svg></button><button class="flx" title="View next item" aria-label="View next item" data-action="Next"><svg viewbox="0 0 24 24"><use href="/cms/svg/admin/' + this.state.icons + '.24.svg#caret_right"></svg></button></div>' : '' ) +
					'</div>' : ''
				) +
				'</div>' +
				'</div>' +
				'</div>';

			// Add the Light Box into the site so we can store it and add the pieces into it.
			document.body.insertAdjacentHTML( 'beforeend', lightBox );

		}

		// Grab the lightbox so we can add more stuff into it. 
		this.els.lightBox = document.getElementById( this.lightboxId );

		// Create the social share links. 
		var lightShare =
			'<ul class="dk-bg" aria-hidden="true">' +
			'<li><a class="btn-stl btn-clr-hvr" target="_blank" data-url="https://www.facebook.com/sharer/sharer.php?u=' + siteHost + '">Facebook</a></li>' +
			'<li><a class="btn-stl btn-clr-hvr" target="_blank" data-url="https://twitter.com/intent/tweet?url=' + siteHost + '">Twitter</a></li>' +
			'<li><a class="btn-stl btn-clr-hvr" target="_blank" data-url="https://plus.google.com/share?url=' + siteHost + '">GooglePlus</a></li>' +
			'<li><a class="btn-stl btn-clr-hvr" target="_blank" data-url="http://www.linkedin.com/shareArticle?url=' + siteHost + '">LinkedIn</a></li>' +
			'<li><a class="btn-stl btn-clr-hvr" target="_blank" data-url="http://www.pinterest.com/pin/create/button/?url=' + siteHost + '">Pinterest</a></li>' +
			'</ul>';


		// Create the counter, find its container, and insert it.				
		if ( this.options.counter ) {
			var lightCounter = '<span data-current="true"></span> / <span data-total="true">' + this.els.items.length + '</span>';
			var countCon = this.els.lightBox.querySelector( 'div[data-paging]' );
			if ( countCon ) countCon.insertAdjacentHTML( 'beforeend', lightCounter );
		}

		// Create the main set of controls based on what we need.				
		if ( this.options.fullscreen || this.options.zoom || this.options.social ) {
			var lightControls =
				( this.options.fullscreen ? ( '<li class="hd-1024"><button data-action="fullscreen" title="Toggle Fullscreen" aria-label="Toggle Fullscreen"><svg class="maximize" viewbox="0 0 24 24"><use href="/cms/svg/admin/' + this.state.icons + '.24.svg#full_size"></svg><svg class="minimize" viewbox="0 0 24 24"><use href="/cms/svg/admin/' + this.state.icons + '.24.svg#align_center"></svg></button></li>' ) : '' ) +
				( this.options.zoom ? ( '<li class="flx f_m hd-1024"><button data-action="zoom-out" title="Zoom Out" aria-label="Zoom Out"><svg viewbox="0 0 24 24"><use href="/cms/svg/admin/' + this.state.icons + '.24.svg#zoom_out"></svg></button><button data-action="zoom-in" title="Zoom In" aria-label="Zoom In"><svg viewbox="0 0 24 24"><use href="/cms/svg/admin/' + this.state.icons + '.24.svg#zoom_in"></svg></button></li>' ) : '' ) +
				( this.options.social ? ( '<li class="lb-share rlt"><button data-action="share" title="Share this gallery" aria-label="Share this gallery"><svg viewbox="0 0 36 36"><use href="/cms/svg/admin/' + this.state.icons + '.36.svg#social"></svg></button>' + lightShare + '</li>' ) : '' ) +
				'<li><button data-action="close" title="Close" aria-label="Close"><svg viewbox="0 0 24 24"><use href="/cms/svg/admin/' + this.state.icons + '.24.svg#cancel_outline"></svg></button></li>';
		} else {
			var lightControls = '<button data-action="close" title="Close" aria-label="Close"><svg viewbox="0 0 24 24"><use href="/cms/svg/admin/' + this.state.icons + '.24.svg#cancel_outline"></svg></button>';
		}

		// Insert the control set into the container.
		var controlCon = this.els.lightBox.querySelector( '[data-controls]' );
		if ( controlCon ) controlCon.insertAdjacentHTML( 'afterbegin', lightControls );

		// Stuff to handle if we have more than 1 slide.
		if ( this.els.items.length > 1 ) {

			// Create the arrows, get their container, and insert them.
			if ( this.options.arrows ) {
				var lightArrows =
					'<button data-action="prev" title="Previous Item" aria-label="Previous Item"><svg viewbox="0 0 24 24"><use href="/cms/svg/admin/' + this.state.icons + '.24.svg#caret_left"></svg></button>' +
					'<button data-action="next" title="Next Item" aria-label="Next Item"><svg viewbox="0 0 24 24"><use href="/cms/svg/admin/' + this.state.icons + '.24.svg#caret_right"></svg></button>';
				var arrowCon = this.els.lightBox.querySelector( 'div[data-arrows]' );
				if ( arrowCon ) arrowCon.insertAdjacentHTML( 'afterbegin', lightArrows );
			}

			// Create the light box thumbs set 
			if ( this.options.thumbs ) {
				var thumbTemplate =
					'<li ' + ( this.options.thumbScroller ? 'class="sixth" data-role="item' : '' ) + '">' +
					'<div class="img pd-h-75 fit lb-thumb bg-bx lk-bg" data-role="lb-thumb">' +
					'<svg class="thumb-check" viewbox="0 0 24 24"><use href="/cms/svg/admin/' + this.state.icons + '.24.svg#checkmark"></svg>' +
					'<img data-img="" data-alt="">' +
					'</div>' +
					'</li>';
			}

		}

		// Setup an item template based on whether or not we have a customItem so we can add it into the slides container.
		var itemTemplate = ( this.els.customItem ) ? this.els.customItem.outerHTML :
			'<li class="lb-slide ta_c-1024 flx-ato-rsp-mgd col-50-50 f_sb f_m">' +
			'<div class="cnt">' +
			'<h3 data-title=""></h3>' +
			'<p data-caption=""></p>' +
			'</div>' +
			'<div class="lb-img ta_c hdn">' +
			'<img data-img="" data-alt="">' +
			'</div>' +
			'</li>';

		// Add an item into lightItems for each item in our this.els.items.
		for ( var i = 0; i < this.els.items.length; i++ ) {
			lightItems += itemTemplate;
		}

		// Insert the lighItems into the slide container.
		this.els.lightBox.querySelector( 'ul[data-slides]' ).insertAdjacentHTML( 'afterbegin', lightItems );

		// Check to see if we need thumbs and go through the process of adding them into the lightbox.
		if ( this.options.thumbs === true ) {
			for ( var t = 0; t < this.els.items.length; t++ ) {
				lightThumbs += thumbTemplate;
			}
			this.els.lightBox.querySelector( 'ul[data-thumbs]' ).insertAdjacentHTML( 'afterbegin', lightThumbs );
		}

		// Store needed elements.
		this.els.lightItems = Array.from( this.els.lightBox.querySelectorAll( '.lb-slide' ) );
		this.els.lbThumbs = Array.from( this.els.lightBox.querySelectorAll( '.lb-thumb' ) );
		this.els.paging = this.els.lightBox.querySelector( '[data-current]' );
		this.els.share = this.els.lightBox.querySelector( '.lb-share > ul' );
		if ( this.options.social ) this.els.shareItems = Array.from( this.els.share.querySelectorAll( 'a' ) );

		// If we have light box items, let's add some attributes onto them that will help us track them.
		if ( this.els.lightItems ) {
			for ( var li = 0; li < this.els.lightItems.length; li++ ) {
				USC.setAttributes( this.els.lightItems[li], { id: 'lbItem' + li, 'lb-index': li } );
			}
		}

		// If we have light box thumbs, let's add some attributes onto them that will help us track them.
		if ( this.els.lbThumbs.length > 0 ) {
			for ( var lt = 0; lt < this.els.lbThumbs.length; lt++ ) {
				USC.setAttributes( this.els.lbThumbs[lt], { role: 'button', tabindex: 0, 'aria-haspopup': true, 'aria-expanded': false, 'aria-controls': 'lbItem' + lt, 'lb-index': lt } );
			}
		}

		// Call the replace function to get our icons
		USE.Replace()

	}

	/**
	 * Open the lightbox and/or change images. 
	 */
	function openBox() {

		// If we've been dragging, run the reset.
		if ( this.state.dragging ) this.dragReset();

		// Let's get the indexes for the next and previous slide indexes.
		var next = ( this.state.index + 1 >= this.state.total ) ? 0 : this.state.index + 1;
		var prev = ( this.state.index - 1 < 0 ) ? this.state.total - 1 : this.state.index - 1;

		// If we haven't already loaded all of our slides, load the current needs. 
		if ( this.state.loaded === false ) {
			this.loadSlides( [this.state.index, next, prev] );
		}

		// If we're using light box thumbs, let's mark the active one.
		if ( this.options.thumbs ) this.els.lbThumbs[this.state.index].classList.add( 'active' );

		// Now that we've loaded the slides (or at least sent them to be loaded), let's open the lightbox and setup the needed classes / attributes.
		document.documentElement.classList.add( 'lb-open' );
		this.els.lightBox.setAttribute( 'aria-hidden', false );
		this.els.lightItems[this.state.index].classList.add( 'lb-active' );
		this.els.lightItems[next].classList.add( 'lb-next' );
		this.els.lightItems[prev].classList.add( 'lb-prev' );

		// Clean up the classes from previous slides.
		if ( this.state.activeItem !== this.els.lightItems[this.state.index] ) this.classCleaner();

		// Call the scrolling list, if we need it.
		if ( this.state.firstOpen && this.options.thumbScroller && this.options.thumbs && window.USC.scrollingList ) {
			window.USC.scrollingList( this.els.lightBox );
		}

		// If we have a scrolling list, update the position.
		if ( this.options.thumbScroller ) this.els.lightBox.$scrollingList.moveTo( this.state.index );

		// Save the slides into the state so we can track and change which slides are in which slot.
		this.state.activeItem = this.els.lightItems[this.state.index];
		this.state.nextItem = this.els.lightItems[next];
		this.state.prevItem = this.els.lightItems[prev];

		// Update the paging
		if ( this.options.counter ) this.els.paging.textContent = this.state.index + 1;

		// Set the firstOpen state to false.
		this.state.firstOpen = false;

	}

	/**
	 * Close the lightbox
	 */
	function closeBox() {

		// Close the box and show the site.
		document.documentElement.classList.remove( 'lb-open' );
		this.els.lightBox.setAttribute( 'aria-hidden', true );

		//  Cleanup the slide classes so it can transition back in nicely.
		this.classCleaner();

		// If we're in fullscreen mode, call the toggle to close it.
		if ( document.fullscreenElement ) this.toggleFullscreen();

		// If we were focused on something when we opened the lightbox and we were able to store it, move back to it.
		if ( this.state.lastFocus ) this.state.lastFocus.focus();

	}

	/**
	 * Load the needed slide elements into the templates rendered on the page.
	 * @param {Array} indexes
	 */
	function loadSlides( indexes ) {

		// Run through the indexes and load each slide if needed.
		for ( var i = 0; i < indexes.length; i++ ) {

			// Get the item and the slide template for our current slide. 
			var item = this.els.items[indexes[i]];
			var data = item.dataset;
			var slide = this.els.lightItems[indexes[i]];

			// If we've already loaded this slide, move on. 
			if ( slide.classList.contains( 'loaded' ) ) continue;

			for ( var d in data ) {

				// If we don't have a value to set, continue to the next data attribute.
				if ( !data[d] ) continue;

				// Get and make sure we have an element matching the current data attribute.
				var elm = slide.querySelector( '[data-' + d + ']' );
				if ( !elm ) continue;

				// If the data attribute has a name that includes img, we need to set the image source, not the html.
				if ( d.indexOf( 'img' ) !== -1 ) {
					elm.setAttribute( 'src', data[d] );
				}
				// If the data attribute has a name that includes link, we need to set the href, not the html.
				else if ( d.indexOf( 'link' ) !== -1 ) {
					elm.setAttribute( 'href', data[d] );
				}
				else {
					// Since we're not working with an image, set the content of the element.
					elm.innerHTML = data[d];
				}
			}

			// Remove Content Pieces if we don't have them.
			if ( !data.caption && !data.title ) {
				var hasContent = slide.querySelector( '.cnt' );
				if ( hasContent ) hasContent.remove();
			}

			slide.classList.add( 'loaded' );

		}

		// Check to see if we've loaded all of the slides so we can stop calling this function.
		this.els.loaded = this.loaded();

	}

	/**
	 * Check Keydowns Before Passing them on to the handleClick.
	 * 
	 * @param {Event} e 
	 */
	function handleKeyDown( e ) {
		// Make sure it was the enter key and we didn't hold a key that would make it a different type of action.
		if ( e.keyCode == '13' ) {
			if ( !e.shiftKey && !e.ctrlKey && !e.altKey ) this.handleClick( e );
		} else if ( e.keyCode == '27' ) {
			// If it was the escape key, close the box.
			this.closeBox();
		}


	}

	/**
	 * Handles click events and key downs that will count as clicks.
	 * 
	 * @param {Event} e 
	 */
	function handleClick( e ) {

		// If we clicked on a thumb, button, or action, let's get it.
		var thumb = e.target.closest( '[data-thumb]' );
		var lbThumb = e.target.closest( '[data-role="lb-thumb"]' );
		var btn = e.target.closest( '[data-lb-btn]' );
		var action = e.target.closest( '[data-action]' );
		var shareLink = e.target.closest( '.lb-share' );

		// If what we clicked wasn't a part of the social share and the share is open, let's close it. 
		if ( this.options.social ) if ( !shareLink && this.els.share.classList.contains( 'lb-active' ) ) this.toggleShare();

		// If what we clicked wasn't a button, thumb, or action button, there's no need to continue.
		if ( !thumb && !btn && !action && !lbThumb ) return;

		// If we have a thumb or a button, let's open the lightbox.
		if ( thumb || btn ) {

			// If we have a thumb, let's set the index accordingly before we open.
			this.state.index = ( thumb ) ? parseInt( thumb.getAttribute( 'lb-index' ) ) : this.state.index;
			this.openBox();

			// Store the thing we clicked as our last focus so we can move back to it later.
			this.state.lastFocus = thumb || btn;

		}

		// If we clicked on a light box thumb, let's change the image.
		if ( lbThumb ) {
			this.state.index = ( lbThumb ) ? parseInt( lbThumb.getAttribute( 'lb-index' ) ) : this.state.index;
			this.openBox();
		}

		// If we clicked on an action, let's find out what it is and handle it. 
		if ( action ) {

			switch ( action.getAttribute( 'data-action' ) ) {

				// Close the lightbox
				case 'close':
					this.closeBox();
					break;

				// Open/Close the share menu and set the links to the current image. 
				case 'share':
					this.toggleShare();
					break;

				// Enter into fullscreen mode and add a class on the lightbox so we can swap the buttons.
				case 'fullscreen':
					this.toggleFullscreen();
					break;

				// If we're trying to zoom in and we're within the 5 zoom levels, zoom in by 1 level.
				case 'zoom-in':
					if ( ( this.state.zoom + 1 ) <= 5 ) this.handleZoom( true );
					break;

				// If we're trying to zoom out and we're zoomed in, zoom out by 1 level.
				case 'zoom-out':
					if ( ( this.state.zoom - 1 ) >= 0 ) this.handleZoom( false );
					break;

				// If we clicked on the previous arrow, move the index back and then call the open function.
				case 'prev':
					this.state.index = ( this.state.index - 1 < 0 ) ? this.state.total - 1 : this.state.index - 1;
					this.openBox();
					break;

				// If we clicked on the next arrow, move the index forward and then call the open function.
				case 'next':
					this.state.index = ( this.state.index + 1 >= this.state.total ) ? 0 : this.state.index + 1;
					this.openBox();
					break;

			}

		}

	}

	/**
	 * Handles a drag start for zoomed images.
	 */
	function dragStart( e ) {

		// Make sure we're starting on an image.
		var item = e.target.closest( 'img' );
		if ( !item ) return;

		// Let's store the dimensions of the image and check to see if we're big enough to need dragging.
		var itemDim = item.getBoundingClientRect();
		var offset = {
			x: ( itemDim.width - item.parentElement.offsetWidth ) / 2,
			y: ( itemDim.height - item.parentElement.offsetHeight ) / 2
		}

		// If our x and y positions are positive, we haven't zoomed. 
		if ( offset.x <= 1 && offset.y <= 1 ) return;

		// Store the item to the drag object to be used in other functions where it isn't the target.
		this.state.drag.item = item;

		// Set the state of dragging so we know what's going on and can turn it off if needed.
		this.state.dragging = true;

		// Since we're on an image and it's large enough that not all of it is in view, bind a mousemove to track the drag.
		document.addEventListener( 'mousemove', this.dragMove );

		// Also bind a mouseup to track when the drag is finished. 
		document.addEventListener( 'mouseup', this.dragStop );

		// If our starting positions are at 0, store our x and y range of possible movement.
		if ( this.state.drag.range.x === 0 && this.state.drag.range.y === 0 ) {
			this.state.drag.range.x = offset.x;
			this.state.drag.range.y = offset.y;
		}

		// Update the position of the cursor at this starting point.
		this.state.drag.cursorPos.x = e.clientX;
		this.state.drag.cursorPos.y = e.clientY;

	}

	/**
	 * Handles mouse moves for while dragging a zoomed image.
	 */
	function dragMove( e ) {

		// Get the current cursor position
		var x = e.clientX;
		var y = e.clientY;

		// Get the amount we need to move rlt to our stored x and y.
		var distance = {
			x: ( x - this.state.drag.cursorPos.x ) + this.state.drag.startPos.x,
			y: ( y - this.state.drag.cursorPos.y ) + this.state.drag.startPos.y
		}

		// Move the image.
		this.state.drag.item.style.left = distance.x + 'px';
		this.state.drag.item.style.top = distance.y + 'px';

	}

	/**
	 * Handles the mouse up for while dragging a zoomed image.
	 */
	function dragStop( e ) {

		var x; var y;

		// Update the stored positions.
		this.state.drag.startPos.x = parseInt( this.state.drag.item.style.left );
		this.state.drag.startPos.y = parseInt( this.state.drag.item.style.top );

		// If the current position of the image is less than the lowest end of our range, set it to the lowest allowed value.
		if ( this.state.drag.startPos.x < ( this.state.drag.range.x * -1 ) ) x = ( this.state.drag.range.x * -1 );
		if ( this.state.drag.startPos.y < ( this.state.drag.range.y * -1 ) ) y = ( this.state.drag.range.y * -1 );

		// If the current position of the image is greater than the highest end of our range, set it to the highest allowed value.
		if ( this.state.drag.startPos.x > this.state.drag.range.x ) x = this.state.drag.range.x;
		if ( this.state.drag.startPos.y > this.state.drag.range.y ) y = this.state.drag.range.y;

		// If we were outside of the range in any way and we have an adjustment, let's make it.
		if ( x ) this.state.drag.startPos.x = x;
		if ( y ) this.state.drag.startPos.y = y;

		// Move the image to match the adjusted values.
		if ( x || y ) {
			this.state.drag.item.style.left = this.state.drag.startPos.x + 'px';
			this.state.drag.item.style.top = this.state.drag.startPos.y + 'px';
		}

		// Unbind the events for mousemove and mouseup since the drag is complete. 
		document.removeEventListener( 'mousemove', this.dragMove );
		document.removeEventListener( 'mouseup', this.dragStop );

	}

	/**
	 * Handle resetting everything related to dragging.
	 */
	function dragReset() {

		// Reset all of the start postions and what not.
		this.state.drag.startPos = { x: 0, y: 0 };
		this.state.drag.range = { x: 0, y: 0 };
		this.state.drag.cursorPos = { x: 0, y: 0 };

		// Move the item back to it's default position and then get rid of it as the drag item.
		this.state.dragging = false;
		this.state.drag.item.style.left = 'auto';
		this.state.drag.item.style.top = 'auto';
		delete this.state.drag.item;

	}

	/**
	 * Reset all classes on our lightbox and it's items.
	 */
	function classCleaner() {
		if ( this.state.activeItem ) this.state.activeItem.classList.remove( 'lb-active' );
		if ( this.state.nextItem ) this.state.nextItem.classList.remove( 'lb-next' );
		if ( this.state.prevItem ) this.state.prevItem.classList.remove( 'lb-prev' );
		if ( this.options.thumbs && this.state.activeItem ) this.els.lbThumbs[this.state.activeItem.getAttribute( 'lb-index' )].classList.remove( 'active' );
		this.els.lightBox.classList.remove( 'lb-zoom-1', 'lb-zoom-2', 'lb-zoom-3', 'lb-zoom-4', 'lb-zoom-5' );
		this.els.lightBox.classList.add( 'lb-zoom-0' );
		this.state.zoom = 0;
	}

	/**
	 * Are all of our slides loaded yet?
	 * @returns {Boolean}
	 */
	function loaded() {

		// Run through the slides and check that each one is loaded. 
		for ( var i = 0; i < this.els.lightItems.length; i++ ) {
			if ( !this.els.lightItems[i].classList.contains( 'loaded' ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Handle adding / removing zoom classes.
	 * @param {Boolean} zoomIn
	 */
	function handleZoom( zoomIn ) {

		// If we've been dragging, run the reset.
		if ( this.state.dragging ) this.dragReset();

		// Remove the current class.
		this.els.lightBox.classList.remove( 'lb-zoom-' + this.state.zoom );

		// Move the zoom level either up or down and then set the new class.
		( zoomIn ) ? this.state.zoom += 1 : this.state.zoom -= 1
		this.els.lightBox.classList.add( 'lb-zoom-' + this.state.zoom );

	}

	/**
	 * Bring us in and out of fullscreen mode.
	 */
	function toggleFullscreen() {

		// If we've been dragging, run the reset.
		if ( this.state.dragging ) this.dragReset();

		// If we're not in fullscreen mode, go into it.
		if ( !document.fullscreenElement ) {
			this.els.lightBox.requestFullscreen();
			this.els.lightBox.classList.add( 'lb-fullscreen' );
		} else {
			// If we are and the exit full screen mode exists, then we should exit.
			if ( document.exitFullscreen ) {
				document.exitFullscreen();
				this.els.lightBox.classList.remove( 'lb-fullscreen' );
			}
		}

	}

	/**
	 * Open, close, and set the share links.
	 */
	function toggleShare() {

		if ( this.els.share.classList.contains( 'lb-active' ) ) {
			// Since the share is already open, let's close it up.
			this.els.share.classList.remove( 'lb-active' );
			this.els.share.setAttribute( 'aria-hidden', true );
		} else {

			// Since it's not open, let's open it.
			this.els.share.classList.add( 'lb-active' );
			this.els.share.setAttribute( 'aria-hidden', false );

			// Now that it's showing, let's set the links.
			for ( var i = 0; i < this.els.shareItems.length; i++ ) {
				var item = this.els.shareItems[i];
				item.setAttribute( 'href', item.getAttribute( 'data-url' ) + this.els.items[this.state.index].getAttribute( 'data-img' ) );
			}

		}

	}

	/**
	 * We've run ajax. Destroy the Lightbox and re-run.
	 */
	function ajaxReset() {

		// Call the closeBox just in case and the clean everything up.
		this.closeBox();

		// Remove event listeners from the gallery since it will stay.
		this.els.gal.removeEventListener( 'click', this.handleClick );
		this.els.gal.removeEventListener( 'keydown', this.handleKeyDown );

		// Remove the lightBox so we can make a new one.
		this.els.lightBox.remove();

		// Remove the instance of the lightBox Script on the gallery.
		delete this.els.gal.$lightBox;

		// Reinstantiate the lightBox JS on the gallery.
		window.USC.lightBox( this.els.gal );

	}

	/**
	 * Public lightBox creation.
	 * 
	 * @param {any} el
	 */
	window.USC.lightBox = function ( el ) {
		if ( !( el instanceof HTMLElement ) ) {
			throw new Error( "Need an HTMLElement to initialize a lightBox." )
		} else if ( el.$lightBox ) {
			console.log( "lightBox already initialized." );
			return;
		} else {
			el.$lightBox = new lightBox( el );
		}
	};

	if ( window.register ) {
		window.register( 'usc/p/lightbox' );
	}

} );