if ( !window.USC ) { window.USC = {}; }
( function () {
    var parseJson = function ( text, reviver ) { return ( window.JSON2 || JSON ).parse( text, reviver ) };

    /**
     * Create Parallax for Animating Elements.
     * 
     * @param {Array} els
     */
	USC.parallax = function ( els ) {
        
        // Create active array and passive array.
        this.els = {
			items: [],
            passiveItems: []
		}
        
        // Iterate through the elements and setup our passive objects.
        for ( var el = 0; el < els.length; el++ ) {
            this.els.passiveItems.push( getItems( els[el] ) );
        }

        // Set Settings to Track.
        this.state = {
            scrollFx: false,
            mouseFx: false,
            animInProgress: false,
            scrollInit: false,
            mouseEventQueue: [],
            scrollEventQueue: []
        }


        // If we weren't able to add any parallax items into our object, exit the script entirely.
		if ( !this.els.passiveItems.length ) return;

        // Bind these methods to this instance.
        this._getFx = _getFx.bind( this );
        this._handleScroll = _handleScroll.bind( this );
        this._handleMouse = _handleMouse.bind( this );
        this._passiveScroll = _passiveScroll.bind( this );
        this._activeInit = _activeInit.bind( this );
        this._frameHandler = _frameHandler.bind( this );
        

        // Call the function to set the initial state for anything in view.
        this._passiveScroll();
        this._handleScroll();
        

        // Handle Events
        window.addEventListener( 'scroll', _getAnimationFrame.bind( this ), { passive: true } );
        window.addEventListener( 'mousemove', _getAnimationFrame.bind( this ), { passive: true } );
        window.addEventListener( 'scroll', this._passiveScroll, { passive: true } );

    }

    /**
     * Set Styles on a Parallax Item.
     * 
     * @param {Object} item 
     */
    function setStyles( item ) {



        // Create string of variables and values to be added
        var variables = 
            item.css.transform.translateX.variable + ': ' + item.css.transform.translateX.value + '; '
             + item.css.transform.translateY.variable + ': ' + item.css.transform.translateY.value + '; '
             + item.css.transform.rotate.variable + ': ' + item.css.transform.rotate.value + '; '
             + item.css.transform.scale.variable + ': ' + item.css.transform.scale.value + '; '
             + item.css.opacity.variable + ': ' + item.css.opacity.value + '; '
             + item.css.blur.variable + ': ' + item.css.blur.value + '; '
             + item.css.grayscale.variable + ': ' + item.css.grayscale.value + '; '
             + item.css.hueRotate.variable + ': ' + item.css.hueRotate.value + '; ';

        // If we don't already have the initial declarations, set them up.
        if ( !item.css.props ) {
            item.css.props = ' transform-origin: ' + item.origin.x + ' ' + item.origin.y + '; will-change: transform, opacity; transform: translateX( var(' + item.css.transform.translateX.variable + ')) translateY( var(' + item.css.transform.translateY.variable + ')) rotate( var(' + item.css.transform.rotate.variable + ')) scale( var(' + item.css.transform.scale.variable + '));  opacity: var(' + item.css.opacity.variable + '); filter: blur(var(' + item.css.blur.variable + ')) grayscale(var(' + item.css.grayscale.variable + ')) hue-rotate(var(' + item.css.hueRotate.variable + ')); ';         
        }

        // Set the CSS!!!
        item.item.setAttribute( 'style', variables + item.css.props );

    }


    /**
     * Set Up Data for a Parallax Item.
     * 
     * @param {HTMLElement} el
     * @returns {Object}
     */
    function getItems( el ) {

        var item = {
            item: el,
            name: el.getAttribute( 'id' ),
            dim: el.getBoundingClientRect(),
            scrollFx: el.dataset.scrollFx && parseJson( el.dataset.scrollFx ),
            mouseFx: el.dataset.mouseFx && parseJson( el.dataset.mouseFx ),
            origin: el.dataset.origin && parseJson( el.dataset.origin ) || { x: 'center', y: 'center' },
            activeInit: false
        }

        return item;

    }

    /**
     * Get Item CSS Ready
     * 
     * @param {HTMLElement} item
     */
    function getCSS( item ) {

        var el = item.item;
		var styles = getComputedStyle( el );

        el.classList.add( 'p-active' );

        item.css = {
            transform: {
                translateX: {
                    variable: '--' + item.name + '-' + item.item.tagName + '-translateX',
                    value: 0 
                },
                translateY: {
                    variable: '--' + item.name + '-' + item.item.tagName + '-translateY',
                    value: 0 
                },
                rotate: {
                    variable: '--' + item.name + '-' + item.item.tagName + '-rotate',
                    value: 0 
                },
                scale: {
                    variable: '--' + item.name + '-' + item.item.tagName + '-scale',
                    value: 1 
                },
                values: styles.transform
            },
            opacity: {
                variable: '--' + item.name + '-opacity',
                value: 1       
            },
            blur: {
                variable: '--' + item.name + '-blur',
                value: styles.blur || 0    
            },
            grayscale: {
                variable: '--' + item.name + '-grayscale',
                value: styles.grayscale || 0    
            },
            hueRotate: {
                variable: '--' + item.name + '-hueRotate',
                value: styles.hueRotate || 0    
            }
        };

        // If we started with a translate on the item, let's preserve it.
        if ( item.css.transform.values !== 'none' ) {

            // Parse the values of the matrix into an array,
            // Grab the 5th and 6th computed numbers (translate values) and get the equivalent percentage value for the item.
            // Add those values into the CSS object for this item.
            var values = item.css.transform.values.match( /[\d\-]+\.?\d+|\d+/g );
            item.css.transform.translateX.value = ( values && values[4] !== 0 ) ? ( values[4] / item.dim.width ) * 100 + '%' : 0;
            item.css.transform.translateY.value = ( values && values[5] !== 0 ) ? ( values[5] / item.dim.height ) * 100 + '%' : 0;

        }

        // Now that we've completed the getting of the initial CSS, let's call the function to set the variables and their values.
		setStyles( item );

    }

    /**
     * Get Parallax Effects.
     *  
     * @param {Object} item 
     */
    function _getFx( item, fxType ) {

        for ( var sfx in item[fxType] ) {

            var fx = item[fxType][sfx];
            var values = getAnimationAmount( fx.effect, fx.speed, item.dim, item.item );

            // Store the amount we want to animate and what our base value is. 
            fx.amount = values.amount;
            fx.baseValue = values.baseValue;
            fx.state = undefined;

            // Check resposive and set the effect to inactive if needed.
            fx.active = ( fx.responsive.desktop !== true && window.innerWidth > 1024 ) ? false : true; 
            fx.active = ( fx.responsive.tablet !== true && window.innerWidth < 1025 && window.innerWidth > 500 ) ? false : fx.active; 
            fx.active = ( fx.responsive.mobile !== true && window.innerWidth < 501 ) ? false : fx.active; 

            // Set the state to true so we know that we need to bind the event for scroll.
            this.state[fxType] = true;

        }

    }

    /**
     * Helper function to calculate where we are in the scroll window and return the amount we want to animate based off of that.
     * Accepts the scroll window top position, the distance between the top and bottom of the window, and the full amount that we want to animate over that time.
     * 
     * @param {Number} winOffset
     * @param {Number} scrollWinTop
     * @param {Number} distance
     * @param {Number} amount
     * @param {Number} effect
     * @param {Number} baseValue
     * @param {Boolean} outEffect
     * @returns {String}
     */
    function getAnimationPosition( winOffset, scrollWinTop, distance, amount, effect, baseValue, outEffect ) {

        // Get the unit of measurement we're using for the effect.
        var unit = getUnit( effect );
        var winPercentage = ( outEffect ) ? ( ( winOffset - scrollWinTop ) / distance ) : ( 1 - ( ( winOffset - scrollWinTop ) / distance ) );
       
        // ( Percentage through scroll effect window   )   
        return  baseValue + winPercentage * amount + unit;

    }

    /**
     * Set the p-ready class on a delay so that the item has time to move before the transition goes on.
     * 
     * @param {HTMLElement} item
     */
    function setReady( item ) {
				
        setTimeout( function() {
            item.classList.add( 'p-ready' );
        }, 100 );
        
    }

    /**
     * 
     * @param {String} effect
     * @param {Number} speed
     * @param {Object} dim
     * @param {HTMLElement} item
     */
    function getAnimationAmount( effect, speed, dim, item ) {

        // Convert the speed into a decimal and setup the amount varibale to store our value. 
        var speed = speed / 10,
            values = {
                amount: speed,
                baseValue: 0        
            };

        // See which type of effect we're using and get relevant data
        switch ( effect ) {

            case 'translateX':
                // A speed of 10 will start your item all the way off the left side of the screen and move in to the right.
                // A speed of -10 will start your item all the way off the right side of the screen and move in to the left.
                values.amount = ( speed > 0 ) ? ( ( dim.left + dim.width ) * speed )  : ( window.innerWidth - dim.left ) * speed;
                values.amount = -values.amount;
                break;
            case 'translateY':
                // Get parent data so we can calculate the amount we need to move.
                var par = item.closest( 'section' ) || item,
                parDim = par.getBoundingClientRect(),
                parOffset = window.pageYOffset + parDim.top,
                offset = window.pageYOffset + dim.top,
                itemOffset = offset - parOffset;

                // A speed of 10 will start your item pulled up outside of it's section and move in downward.
                // A speed of -10 will start your pushed down outside of it's section and move in upward.
                values.amount = ( speed > 0 ) ? ( ( dim.height + itemOffset ) * speed )  : ( parDim.height - itemOffset ) * speed;
                values.amount = -values.amount;
                break;         
            case 'opacity':
                // A speed of 10 will start your item at 0 opacity and fade it in.
                // A speed of -10 will start your item at full opacity and fade it out.
                values.amount = -speed;
                values.baseValue = ( speed > 0 ) ? speed : 1 + speed;
                break;
            case 'blur':
                // A speed of 10 will start your item at a 10px blur and focus it in.
                // A speed of -10 will start your item at full focus and blur the item out.
                speed = speed * 10;
                values.amount = ( speed > 0 ) ? speed : speed;
                values.baseValue = ( speed > 0 ) ? 10 + -speed : -speed;
                break;                                
            case 'rotate':
                // A positive speed will rotate to the right and a negative will rotate to the left.
                // Every .5 of speed = 45 degrees
                values.amount = ( 900 * speed );
                break; 
            case 'scale':
                // A positive speed will start scaled down and then scale up to 1 as you scroll.
                // A negative speed will start scaled up and then scale down to 1 as you scroll.
                values.amount = -speed;
                values.baseValue = 1;
                break;
            case 'grayscale':
                // A speed of 10 will start your item at a 100% grayscale and color it in.
                // A speed of -10 will start your item at full color and grayscale the item out.
                speed = speed * 100;
                values.amount = ( speed > 0 ) ? speed : speed;
                values.baseValue = ( speed > 0 ) ? 100 + -speed : -speed;
                break;
            case 'hueRotate':
                // A positive speed will rotate the hue starting from the normal hue, moving to the inverted hue.
                // A negative speed will rotate the hue starting from the inverted hue, moving to the normal hue.
                values.amount = ( 180 * speed );
                values.baseValue = ( speed > 0 ) ? 180 + -speed : -speed;
                break;                
        }

        // Return the calculated values.
        return values;

    }


    /**
     * Handle Passive Scroll Events
     */
    function _passiveScroll() {
     
        // Iterate through the passive items to see if we're ready to push to our active array
        for (var i = 0; i < this.els.passiveItems.length; i++) {
            var item = this.els.passiveItems[i];

            // Update the item dimensions so we can get the updated top position.
            item.dim = item.item.getBoundingClientRect();

            // Confirm if the items are close enough to move to the [active items array]
            var inViewRange = window.innerHeight + (window.innerHeight * 0.5);

            if (item.dim.top <= inViewRange) {
                // if the item is in range, remove the item from our passive array, shift the [i], and push [i] to our active array.
                i--;
                this.els.passiveItems.shift();
                this.els.items.push( item );
            } else {
                return;
            }

        }
    }


    /**
     * Get Animation Frame
     */  

    function _getAnimationFrame( e, type ) {
        // Set up a queue of events

        if (e.type === 'mousemove' || type === 'mousemove') {
            this.state.mouseEventQueue.push( e );
        } else {
            this.state.scrollEventQueue.push( e );
        } 

        if ( !this.state.animInProgress ) {
            this.state.animInProgress = true;
                requestAnimationFrame( this._frameHandler );  
        }
    }

    function _frameHandler() {

        // Check our scroll Queue, if we have events queued, fire the event in RAF
        if ( this.state.scrollEventQueue && this.state.scrollEventQueue.length ) {
            var evt = this.state.scrollEventQueue[this.state.scrollEventQueue.length -1];
            this._handleScroll( evt );
        }

        // Check our mouse Queue, if we have events queued, fire the event in RAF
        if ( this.state.mouseEventQueue && this.state.mouseEventQueue.length ) {
            var evt = this.state.mouseEventQueue[this.state.mouseEventQueue.length -1];
            this._handleMouse( evt );
        }

        // Empty our queues
        this.state.scrollEventQueue = [];
        this.state.mouseEventQueue = [];
    }

    /**
     * Handle Mouse Events
     */    

    function _handleMouse( e ) {

        this.state.animInProgress = false;
        
        // Mouse information
        this.state.x = e.type === 'scroll' ? this.state.x : e.clientX;
        this.state.y = e.type === 'scroll' ? this.state.y : e.clientY;
        
         // Iterate through the items to see if there are any in view.
         for ( var i = 0; i < this.els.items.length; i++ ) {
                var item = this.els.items[i]; 

                // Check to see if our item has MouseFx, if not move to the next item in the loop
                if (!item.mouseFx) continue

                // Check to see if the item has been initialized.
                this._activeInit(item);

                // Store initial position before we initialize
                item.dim = item.item.getBoundingClientRect();

                // Lets do some maths to figure out the position of the mouse relative to the item
                // :) https://usc-lite.scorpmaster.com/images/parallax-explained.png
                item.centerX = item.dim.left + (item.dim.width * 0.5);
                item.centerY = item.dim.top + (item.dim.height * 0.5);
                
                // Calculate the distance between our mouse and the center of our item
                var distance = {
                    x: item.centerX - this.state.x,
                    y: item.centerY - this.state.y
                }
                distance.h = Math.sqrt(Math.pow(distance.x, 2) + Math.pow(distance.y, 2));
                
                // Calculate the max distance between our mouse and our item
                var flip = distance.x > 0 ? false : true
                var maxDistance = {
                    x: !flip ? item.centerX : window.innerWidth - item.centerX
                }
                maxDistance.y = (distance.y / distance.x) * maxDistance.x;
                maxDistance.h = e.type === 'scroll' ? item.maxDistance : Math.sqrt(Math.pow(maxDistance.x, 2) + Math.pow(maxDistance.y, 2));

                item.maxDistance = maxDistance.h;

                for ( var mfx in item.mouseFx ) {

                    // Store the current effect
                    var fx = item.mouseFx[mfx];

                    // Get the range of our distance based on the start of our effect
                    if (fx.start > 0) {
                        maxDistance.h = (fx.start / 100) * maxDistance.h;
                    }
                    
                    var rangePosition = (distance.h / maxDistance.h);
                    if (flip && fx.effect !== 'blur' && fx.effect !== 'grayscale' &&  fx.effect !== 'opacity') {
                        rangePosition *= -1
                    }
                    
                    var newPosition = fx.baseValue + rangePosition * fx.amount + getUnit(fx.effect);
                    
                    
                    // Add the CSS into our stored object.
                    pushCSS( fx.effect, item, newPosition );
                }

                // Apply the new CSS values.
                setStyles( item );

                // If the item hasn't been marked as ready, do so. This is important for CSS transitions.
                if ( !item.item.classList.contains( 'p-ready' ) ) { 
                    setReady( item.item );
                }

            }    
    }

    /**
     * Handle Scroll Events
     */
    function _handleScroll( e ) {

        this.state.animInProgress = false;

        // Iterate through the items to see if there are any in view.
        for ( var i = 0; i < this.els.items.length; i++ ) {

            var item = this.els.items[i]; 

            // Check to see if our item has ScrollFx, if not move to the next item in the loop
            if (!item.scrollFx) continue
            
            // Check to see if the item has been initialized.
            this._activeInit(item);
            
            // Update the item dimensions so we can get the updated top position.
            item.dim = item.item.getBoundingClientRect();

            // Get the scroll window so we can decide whether or not the item is in view
            var winOffset = window.pageYOffset;
            var maxOffset = document.documentElement.scrollHeight - window.innerHeight;
            var itemOffset = winOffset + item.dim.top;
            var scrollWin = { top: ( itemOffset - window.innerHeight >= 0 ) ? ( itemOffset - window.innerHeight ) : 0, bottom: itemOffset + item.dim.height };
            var distance = scrollWin.bottom - scrollWin.top;

            
            // Iterate through the scoll effects applied to the item and push the needed CSS into an object to apply once we're done.
            for ( var sfx in item.scrollFx ) {

                // Store the current effect
                var fx = item.scrollFx[sfx];

                // If the current effect isn't active, let's move on to the next one.
                if ( fx.active !== true ) continue;
                
                // Get the scroll window for the current effect.
                var	fxScrollWin = {
                        top: ( scrollWin.top + ( distance * ( fx.start / 100 ) ) ),
                        bottom: ( scrollWin.top + ( distance * ( fx.stop / 100 ) ) )
                    };
                var newPosition;

                // If our bottom is further down than the page bottom, reset the value to the max allowed.
                if ( fxScrollWin.bottom > maxOffset ) fxScrollWin.bottom = maxOffset;

                // Add the distance into the fx scroll window object 
                fxScrollWin.distance = fxScrollWin.bottom - fxScrollWin.top;

                // If we're using an out effect, also calculate the window for that
                if ( fx.inout === true ) {

                    var fxScrollWinOut = {
                        top: ( fxScrollWin.bottom - ( fxScrollWin.distance * ( ( 100 - fx.outstart ) / 100 ) ) ),
                        bottom: fxScrollWin.bottom 
                    }

                    // Add the distance for the out effect
                    fxScrollWinOut.distance = fxScrollWin.bottom - fxScrollWinOut.top;

                    // Reset the bottom and distance for the main scroll window since we've adjusted for having an out effect.
                    fxScrollWin.bottom = fxScrollWinOut.top;
                    fxScrollWin.distance -= fxScrollWinOut.distance;
                
                }

                // See if we're in our normal scroll window or if we're in an out effect window.
                // If we're not in either, then there's nothing to do so let's continue on to the next effect.
                if ( winOffset >= fxScrollWin.top && winOffset <= fxScrollWin.bottom ) {

                    // Call the function to get the amount we want to move and create a variable to store the value.
                    newPosition = getAnimationPosition( winOffset, fxScrollWin.top, fxScrollWin.distance, fx.amount, fx.effect, fx.baseValue );
                    fx.state = undefined;

                } else if ( fx.inout === true && winOffset >= fxScrollWinOut.top && winOffset <= fxScrollWinOut.bottom ) {

                    // Since we're in an out effect, call the function to get the amount and turn it negative
                    newPosition = getAnimationPosition( winOffset, fxScrollWinOut.top, fxScrollWinOut.distance, fx.amount, fx.effect, fx.baseValue, true );
                    fx.state = undefined;

                } else {

                    // Decide what the bottom of the scroll window is based on whether or not we have an out position.
                    var bottom = ( fx.inout == true ) ? fxScrollWinOut.bottom : fxScrollWin.bottom;

                    if ( winOffset < fxScrollWin.top && fx.state !== 0 ) {
                    
                        // Since we're above the scroll effect and our state isn't the start position, let's move to it and set the state. 
                        newPosition = fx.baseValue + fx.amount;
                        fx.state = 0;

                    }  else if ( winOffset > bottom && fx.state !== 100 ) {

                        // Since we're below the scroll effect and our state isn't the end position, let's move to it and set the state. 
                        newPosition = ( fx.inout == true ) ? fx.amount : fx.baseValue;
                        fx.state = 100;       

                    } else {
                        // Continue to the next effect.
                        continue;
                    }    

                    // Get our unit of measurement.
                    var unit = getUnit(fx.effect);

                    // Add the unit of measurement to the position.
                    newPosition += unit;

                } 
                
                // Add the CSS into our stored object.
                pushCSS( fx.effect, item, newPosition );

            }    

            // Apply the new CSS values.
            setStyles( item );

            // If the item hasn't been marked as ready, do so. This is important for CSS transitions.
            if ( !item.item.classList.contains( 'p-ready' ) ) { 
                setReady( item.item );
            }

       }

       // Check to see if this is the setup for handleScroll
       if (this.state.scrollInit && typeof( e ) !== 'number') {
            _getAnimationFrame.bind( this )( e, 'mousemove' );
        } else {
            this.state.scrollInit = true;
        }
       
    }

    function getUnit (effect) {
        if ( effect === 'rotate' || effect === 'hueRotate' ) {
            return 'deg';
        } else if ( effect === 'grayscale' ) {
            return '%';
        } else if ( effect !== 'opacity' && effect !== 'scale' ) {
            return 'px';
        } else {
            return ''
        }
    }

    function pushCSS(effect, item, newPosition) {
        // Add the CSS into our stored object.
        // If our effect isn't opacity or a filter, it means we're adjusting the transform.
        if ( effect !== 'opacity' && effect !== 'blur' && effect !== 'grayscale' && effect !== 'hueRotate' ) {
            item.css.transform[effect].value = newPosition;
        } else {
            item.css[effect].value = newPosition;
        }
    }

    function _activeInit(item) {
        
        // Check to see if the item has been initialized. If not, do some setup and initialize
        if (item.activeInit == false) {
            
            // Grab the CSS
            getCSS( item );

            // Check to see if there are scroll effects, then call it
            if ( item.scrollFx ) this._getFx( item, 'scrollFx' );
            if ( item.mouseFx ) this._getFx( item, 'mouseFx' );
            
            item.activeInit = true;
        }
    }
	
	if ( window.register ) {
		window.register( 'usc/p/passive-parallax' );
    }
    
} )();