if ( window.registerLoading ) {
	registerLoading( "form" );
}

( function ( factory ) {
	if ( typeof rrequire === "function" ) {
		// CMS7 rrequire function.
		rrequire( ["j/jquery", "j/jquery.ui", "j/ui.touch", "m/date", "extensions", "c/loading", "behaviors", "m/masked"], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
}( function ( $ ) {
	var parseJson = function ( text, reviver ) { return ( window.JSON2 || JSON ).parse( text, reviver ) };

	// Default validity object to use as a polyfill for non-native html5 validation.
	var validityObj = {
		badInput: false,
		compareMismatch: false,
		customError: false,
		notUnique: false,
		patternMismatch: false,
		rangeOverflow: false,
		rangeUnderflow: false,
		stepMismatch: false,
		tooLong: false,
		tooShort: false,
		typeMismatch: false,
		valid: true,
		valueMissing: false
	};

	// Check a date input by parsing it.
	var checkDate = function ( date ) {
		var parsed = new Date().parse( date );
		if ( date && typeof date === 'string' && parsed ) {
			parsed = parsed.getFullYear();
			if ( parsed > 1753 && parsed < 9999 ) {
				// Return an array with the original date (matches the regex exec structure).
				return [date];
			}
		}
		return null;
	};

	// Luhn mod 10. (credit to PawelDecowski).
	var luhn10 = function ( cc ) {
		var len, mul, prod, sum;

		// Allow for a masked value (e.g. xxxx-xxxx-xxxx-1234)
		if ( cc && /[x\-]{10,16}\d{3,6}/.exec(cc) == cc ) {
			return true;
		}

		cc = ( cc || "" ).replace( /\D+/g, "" );
		if ( cc.length < 15 || cc.le > 16 ) {
			return null;
		}

		len = cc.length;
		mul = 0;
		prod = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 2, 4, 6, 8, 1, 3, 5, 7, 9]];
		sum = 0;

		while ( len-- ) {
			sum += prod[mul][parseInt( cc.charAt( len ), 10 )];
			mul ^= 1;
		}

		return ( sum && sum % 10 === 0 );
	};

	// Regex patterns for input type="<type>"
	var regx = {
		email: /[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/i,
		url: /^(((ht|f)tp(s?))\:\/\/)?(www.|[a-zA-Z0-9].)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,6}(\:[0-9]+)*(\/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$/i,
		number: /\d+/,
		date: { exec: checkDate },
		datetime: { exec: checkDate },
		"datetime-local": { exec: checkDate },
		time: { exec: checkDate }
	};

	// Add valHooks for containers on a radiobutton list or a checkbox list.
	var listHelper = {
		// Get the value from the list of child input elements.
		get: function ( el ) {
			var elements, val,
				id = el.getAttribute( 'id' );
			if ( !id ) {
				// If the current element doesn't have an id, there's nothing to do.
				return undefined;
			}

			// Search for child input elements that have an id that STARTS with the main element id.
			elements = $( el ).find( "input[id^='" + id + "_']" ).filter( ':checkbox,:radio' );
			if ( !elements.length ) {
				return undefined;
			}
			// Add each checked element into the array.
			val = [];
			elements.filter( ':checked' ).each( function ( i ) {
				val.push( $( this ).val() );
			} );

			return val.join( "," );
		},
		// Set the checked state of child input elements based on the supplied value.
		set: function ( el, val ) {
			var id = el.getAttribute( 'id' ),
				checked = false;
			if ( !id ) {
				return;
			}

			// Make the value into a string array.
			val = Make.Array( val );

			// Find each of the elemements.
			$( el ).find( "input[id^='" + id + "_']" ).filter( ':checkbox,:radio' ).each( function ( i ) {
				var input = $( this );

				if (// If the value is contained in the array.
					val.indexOf( input.val() ) >= 0 &&
					// And this is a checkbox, or a radio button with no previous selection.
					( input.is( ':checkbox' ) || !checked ) ) {
					// Check it.
					input.prop( 'checked', true );
					checked = true;
				} else {
					// Otherwise, uncheck it.
					input.prop( 'checked', false );
				}
			} );

			return val;
		}
	};

	var keyState = {
		shiftKey: false,
		altKey: false,
		ctrlKey: false
	};
	if ( document.addEventListener ) {
		document.addEventListener( 'keydown', function ( e ) {
			keyState.shiftKey = e.shiftKey;
			keyState.altKey = e.altKey;
			keyState.ctrlKey = e.ctrlKey;
		}, true );

		document.addEventListener( 'keyup', function ( e ) {
			keyState.shiftKey = e.shiftKey;
			keyState.altKey = e.altKey;
			keyState.ctrlKey = e.ctrlKey;
		}, true );
	}

	$.valHooks.div = listHelper;
	$.valHooks.ul = listHelper;
	$.valHooks.ol = listHelper;
	$.valHooks.dl = listHelper;
	$.valHooks.table = listHelper;
	$.valHooks.input = {
		set: function ( el, val ) {
			// Before setting a datetime input, ensure it is formatted correctly.
			switch ( el.getAttribute( 'type' ) ) {
				case 'date':
				case 'time':
				case 'datetime':
				case 'datetime-local':
					Date.setInputValue( el, val );
					return val;
			}
		}
	};

	// Define static html5 form methods.
	$.html5form = {
		// Validate a specific item.
		validate: function ( input, form, submitted ) {
			var related, match, validators, every, index,
				required = Modernizr.input.required ? input.prop( 'required' ) : !!input.attr( 'required' ),
				conditional = input.data( 'conditional' ),
				conditionalValue = input.data('conditionalValue'),
				conditionalNotValue = input.data('conditionalNotValue'),
				pattern = input.prop( 'pattern' ) || input.attr( 'pattern' ),
				min = input.prop( 'min' ) || Make.Int( input.attr( 'min' ) ),
				max = input.prop( 'max' ) || Make.Int( input.attr( 'max' ) ),
				step = input.prop( 'step' ) || Make.Int( input.attr( 'step' ) ),
				val = input.val(),
				placeholder = input.attr( 'placeholder' ),
				compare = input.data( 'compare' ),
				unique = input.data( 'unique' ),
				val2 = compare && $( '#' + compare ).val(),
				custom = input.data( 'customValidator' ),
				group = ( input.closest( 'li' ).length > 0 ) ? input.closest( 'li' ) : input.closest('.input-text, .input-select, .input-mark, .input-html'),
				name = input.attr( 'name' ) && input.attr( 'name' ).split( '$' ).pop().replace( /([a-z])([A-Z])/g, "$1 $2" ),
				alert = input.data( 'alert' ),
				validity = $.extend( {}, validityObj );

			if ( input.is( '.ui-novalidate' ) ) {
				return;
			}

			if ( input.is( ':checkbox,:radio' ) ) {
				// Find all related elements.
				related = form.find( "input[name='" + input.attr( 'name' ) + "']" );

				if ( related.length > 1 ) {
					// Update the group.
					group = related
						// Find all the inputs except our current one
						.not( input )
						// Find all the parent elements of all related inputs (until the form).
						.parentsUntil( form )
						// Filter out any that aren't LIs.
						.filter( 'li' )
						// Make sure that each of these LIs contain the starting input element as a child.
						.has( input )
						// Get the first one.
						.first();
				}

				if ( !input.is( ":checked" ) ) {
					// If the current input isn't checked, null out the value.
					val = null;
				} else if ( !val && input.is( ":checkbox" ) ) {
					// If the current checkbox IS checked, but doesn't have a named value, use "on".
					val = "on";
				}
			}

			// If we have a conditional element.
			if ( conditional ) {
				// Find it and get the value.
				if ( form.find( '#' + conditional ).is( ':checkbox' ) ) {
					conditional = form.find( '#' + conditional ).prop( 'checked' );
				} else {
					conditional = form.find( '#' + conditional ).val();
				}
				// Check to see if the conditional requirements are met
				if (conditionalValue) {
					match = Behaviors.Conditional.Match(conditional, conditionalValue);
				} else if (conditionalNotValue) {
					match = !Behaviors.Conditional.Match(conditional, conditionalNotValue);
				}
				if ( match ) {
					// Set this input element as required.
					if ( Modernizr.input.required ) {
						( related || input ).prop( 'required', true );
					}
					( related || input ).attr( 'required', 'required' );
					required = true;
				} else {
					// Set this input element as not required.
					if ( Modernizr.input.required ) {
						( related || input ).prop( 'required', false );
					}
					( related || input ).removeAttr( 'required' );
					required = false;
				}
			}

			// We will try to use native formvalidation except for 'required' and 'pattern' and any custom validation.

			if ( required && ( !val || val === placeholder ) ) {
				// We have a required value, and it is either missing, or it matches the placeholder.

				if (// If the input isn't a checkbox or radio, then we're missing a value.
					!input.is( ':checkbox,:radio' ) ||
					// if the input IS a checkbox or radio, and no other input element
					// with the SAME NAME that is CHECKED cannot be found, then we're missing a value.
					!related.filter( ":checked" ).length ) {

					// Required field.
					validity.valid = false;
					validity.valueMissing = true;
					if ( !alert ) {
						alert = name + ' is required';
					}
				}
			} else if ( pattern && !$.html5form._pattern( input, pattern, val ) ) {
				// Pattern doesn't match.
				validity.valid = false;
				validity.patternMismatch = true;
				if ( !alert ) {
					alert = name + ' is not valid';
				}
			} else if ( compare && val != val2 ) {
				// Compare value doesn't match.
				validity.valid = false;
				validity.compareMismatch = true;
				if ( !alert ) {
					alert = name + ' does not match';
				}
			} else if ( unique && false ) {
				// Check unique.
			} else if ( custom && !$.html5form._custom( input, custom, val ) ) {
				// Custom validator evaluates to false.
				validity.valid = false;
				validity.customError = true;
				if ( !alert ) {
					alert = name + ' has an invalid value.';
				}
			} else if ( Modernizr.formvalidation ) {
				pattern = regx[input.attr( 'type' )];
				if (// We have an input element.
					input.length &&
					// With a checkvalidity method.
					input[0].checkValidity &&
					// That failed.
					!input[0].checkValidity() ) {
					// Update the validity object.
					$.extend( validity, input[0].validity );
					if ( !alert ) {
						alert = name + ' is not valid';
					}
				} else if ( input.length && val && pattern ) {
					match = pattern.exec( val );
					if ( !match || !match.length || match[0] !== val ) {
						validity.valid = false;
						validity.typeMismatch = true;
					}
				}
			} else if ( min && Make.Float( val ) < Make.Float( min ) ) {
				// Check min.
				validity.valid = false;
				validity.rangeUnderflow = true;
				if ( !alert ) {
					alert = name + ' is too low';
				}
			} else if ( max && Make.Float( val ) > Make.Float( max ) ) {
				// Check min.
				validity.valid = false;
				validity.rangeOverflow = true;
				if ( !alert ) {
					alert = name + ' is too high';
				}
			} else {
				// If the browser doesn't support a native type mismatch check, do it manually.
				pattern = regx[input.attr( 'type' )];
				if ( val && pattern ) {
					match = pattern.exec( val );
					if ( !match || !match.length || match[0] !== val ) {
						validity.valid = false;
						validity.typeMismatch = true;
					}
				}
			}

			// Hide the validators for this group.
			name = ( input.attr( 'name' ) || "" ).replace( /\$/g, '_' ) || input.attr( 'id' );
			validators = group.find( ".validation[for='" + name + "']" ).hide();

			if ( !validity.valid ) {
				// Mark the group as invalid.
				group.removeClass( 'valid' ).addClass( 'invalid' );

				// Check for a message matching the specific validity failure.
				for ( var p in validity ) {
					if ( p != 'valid' && validity.hasOwnProperty( p ) && validity[p] === true ) {

						// If we haven't yet done a full validation, and we're about to show a valueMissing.
						if ( !submitted && p === 'valueMissing' ) {
							// Find all invalid groups.
							every = form.find( 'li.invalid' );
							// What is the position of the current group?
							index = every.index( group );
							// Slice out the invalid groups before the current.
							every = every.slice( 0, index );
							// If any of the previous groups have a visible validation message.
							if ( every.find( '.validation:visible' ).length ) {
								// Exit, as we won't be showing this one.
								break;
							}
						}

						validators.filter( "[data-type='" + p + "']" ).show();
						break;
					}
				}

				// Return the control (so it can be focused).
				return { error: input, alert: alert };
			} else {
				// Mark the group as valid.
				group.removeClass( 'invalid' );
				if ( val ) {
					group.addClass( 'valid' );
				}

				// Look for any compare value.
				input = form.find( "input[data-compare='" + input.attr( 'id' ) + "']" );
				if ( input.val() ) {
					return $.html5form.validate( input, form, submitted );
				}
			}
		},
		// Validate a group of inputs.
		validateGroup: function ( form, inputs, useNative ) {
			var input, name, data, panel, tab, customFn,
				message = [],
				checked = {},
				first = null;

			if ( form && form[0] && form[0].getAttribute( 'data-html5' ) === '1' && window.$8 && $8.FORM && $8.FORM.Init ) {
				return form[0].reportValidity();
			}

			// If we don't have inputs already, grab them.
			if ( !inputs ) {
				inputs = form.find( ":input:not(.ui-dialog-titlebar-close,.ui-novalidate,button)" );
			}

			// Iterate through the form elements.
			for ( var i = 0, len = inputs.length; i < len; i++ ) {
				// Checkbox and radio button lists only need to be handled once.
				input = inputs.eq( i );
				name = input.attr( 'name' );
				if ( checked[name] ) {
					continue;
				} else {
					checked[name] = true;
				}

				data = $.html5form.validate( input, form, true );
				if ( data && data.error ) {
					first = first || data.error;
					if ( data.alert ) {
						message.push( data.alert );
					}
				}
			}

			if ( first ) {
				if (// If the first error element isn't visible.
					!first.is( ':visible' ) &&
					// It's inside a panel.
					( panel = first.closest( '.ui-tab-panel' ) ).length &&
					// That isn't marked as active.
					!panel.is( '.active' ) &&
					// And has a named tab.
					( tab = panel.data( 'tab' ) ) ) {
					// Find the first tab that matches this panel and click it.
					panel.closest( '.ui-tabs' )
						.find( ".ui-tab[data-tab='" + tab + "']:not(.active)" )
						.eq( 0 )
						.click();
				}

				// If we need to a do a native HTML5 error message, but the browser doesn't support it.
				if ( useNative && !Modernizr.formvalidation ) {
					alert( 'The form is incomplete.\n' + message.join( '\n' ) );
				}

				// If we have a bad element, focus on it.
				first.scrollIntoView( 1200 );
				try {
					first.focus();
				} catch ( ex ) {; }
				return false;
			} else {
				// If the form otherwise validated as correct, check for custom validation.
				customFn = form.data( 'customValidation' );
				if ( $.isFunction( customFn ) ) {
					return customFn.apply( this, arguments );
				}
			}
		},
		// Match a regex pattern.
		_pattern: function ( input, pattern, val ) {
			// Build the regex.
			var reg, m;
			try {
				reg = new RegExp( pattern );
			} catch ( ex ) {
				// Log the error and fail gracefully.
				console.log( 'Illegal RegExp - "' + pattern + '"' );
				return true;
			}

			if ( !val ) {
				// An empty value will not be tested.
				return true;
			} else {
				// Pattern must match.
				m = reg.exec( val );
				return m && m[0] == val;
			}
		},
		// Match a custom function.
		_custom: function ( input, custom, val ) {
			if ( typeof custom === 'string' ) {
				custom = $.html5form.customValidators[custom];
			}
			if ( custom && $.isFunction( custom ) ) {
				return !!custom( input, val );
			}
		},
		// Static custom validators for the HTML5 form.
		customValidators: {
			ssn: function ( input, val ) {
				// Valid social security number.
				return val && /^(?!000)([0-6]\d{2}|7([0-6]\d|7[012]))([ -]?)(?!00)\d\d\3(?!0000)\d{4}$/.exec( val ) === val;
			},
			creditcard: function ( input, val ) {
				// Valid credit card.
				return val && luhn10( val );
			}
		}
	};

	// Build the HTML5 form controls.
	$.fn.html5form = function ( options ) {
		return this.filter( function () { return $( this ).data( 'html5form' ) === undefined; } ).each( function ( i ) {

			if ( this.getAttribute( 'data-html5' ) === '1' && window.$8 && $8.FORM && $8.FORM.Init ) {
				$8.FORM.Init( this );
				return;
			}

			var	// Selector for form buttons.
				buttons = "button[type='submit'],input[type='image'],input[type='submit']",
				// Main element.
				element = $( this ).data( 'html5form', true ),
				// Form the element is contained in.
				form = element.closest( 'form' ),
				// Form input elements.
				inputs = element.find( ":input:not(.ui-dialog-titlebar-close,.ui-novalidate,button)" ),
				// The last button clicked before a form submission.
				_lastButton = null,
				// By default, we will not be using the native HTML5 validation behavior.
				_native = false,
				// Has the user tried to submit the form?
				submitted = false,
				// Validate and submit the form.
				_validateAll = function () {
					// Note that a full validation has been performed.
					submitted = true;

					// Perform a validation on each of the inputs.
					return $.html5form.validateGroup( form, inputs, _native );
				},
				// Handle any specialized focus actions.
				_handleFocus = function ( e ) {
					if ( Modernizr.touch ) {
						return;
					}
					switch ( this.getAttribute( 'type' ) ) {
						case 'date':
						case 'datetime':
						case 'datetime-local':
							//case 'time':
							$.cms.date.choose( this );
							break;
					}
				},
				// Delegate events in the form.
				_handleEvents = function ( e ) {
					var li, data, button, confirm, opened,
						target = $( e.target );

					switch ( e.type ) {
						case 'focusin':
							li = ( target.closest( 'li' ).length > 0 ) ? target.closest( 'li' ) : target.parent();
							if ( li.is( '.readonly' ) ) {
								return StopAll( e );
							}
							li.addClass( 'focused' );

							// If the browser doesn't support placeholders, remove any placeholer value in the box on focus.
							if ( !Modernizr.placeholder && target.val() === target.attr( 'placeholder' ) ) {
								target.val( "" );
							}

							_handleFocus.call( e.target, arguments );
							break;
						case 'focusout':
							li = ( target.closest( 'li' ).length > 0 ) ? target.closest( 'li' ) : target.parent();
							li.removeClass( 'focused' );

							// Track whether or not the input has a value so we can control whether the label shows in front.
							if ( !target.val() ) {
								li.removeClass( 'filled' );
							} else {
								li.addClass( 'filled' );
			                }

							// If the browser doesn't support placeholders (and this input has one), restore it if the value is blank.
							if ( !Modernizr.placeholder && !target.val() && ( placeholder = target.attr( 'placeholder' ) ) ) {
								target.val( placeholder );
							}

							// Trigger validation on focus out.
							$.html5form.validate( target, form, submitted );

							break;
						case 'click':
							// Clear the last button, in case we clicked on something else.
							_lastButton = null;

							data = Get.LinkData( e );
							switch ( data.action ) {
								case 'Expand':
									$( data.link ).closest( 'li' ).toggleClass( 'expand' );
									return;
							}

							// Update the target, in case we click on a link, or the contents of a button.
							if ( data.link ) {
								target = $( data.link );
							} else {
								target = $( e.target );
								button = target.closest( 'button' );
								if ( button.length ) {
									target = button;
								}
							}

							if ( target.is( ':disabled' ) ) {
								// Cancel a click on a disabled element.
								console.log( 'disabled' );
								return StopAll( e );
							} else if ( target.closest( 'li' ).is( '.readonly' ) ) {
								// And a readonly element.
								return StopAll( e );
							}

							// Check for a 'confirm' message before executing this click.
							confirm = target.data( 'confirm' );
							if ( confirm ) {
								if ( !target.data( 'confirmed' ) ) {
									// If the target is not already marked as confirmed, run the popup first.
									$confirm( confirm, function () {
										// When confirmed, set that it is confirmed and re-trigger the event.
										target.data( 'confirmed', true );
										target.click();
									} );
									return StopAll( e );
								} else {
									// If the button WAS confirmed, reset this flag (just in case we need to retrigger this event later).
									target.data( 'confirmed', false );
								}
							}

							if ( target.is( buttons ) ) {
								// Note the button click.
								_lastButton = target;

								if ( target.prop( 'formnovalidate' ) === undefined &&
									 target.attr( 'formnovalidate' ) === undefined &&
									 _validateAll() === false ) {
									// Invalid form, cancel the event.
									if ( _native ) {
										if ( Modernizr.formvalidation ) {
											// Browser supports html5 form validation, let it run.
											return;
										} else {
											// Doesn't support it, but we alerted a popup box.
											return false;
										}
									} else {
										return StopAll( e );
									}
								}
							} else if ( target.is( 'div' ) ) {
								// If we clicked on the container div of a text input, focus on it.
								target = target.children( "input:visible:first, textarea:visible:first" );
								if ( !target.length ) {
									return;
								}

								// Check if the date picker is open before focusing.
								opened = $.cms.date.isOpen();

								// Focus on the element.
								target.focus();

								if ( opened ) {
									// If we clicked on the parent container div, and the date picker is open, close it.
									$.cms.date.picker.close();
								} else if ( target.is( "input[type='time']" ) ) {
									// The time picker is enabled on click.  The others are enabled on focus.
									$.cms.date.choose( target[0] );
								}
								return false;
							}
							break;
						case 'change':
							// Prevent change on a readonly element.
							if ( $( e.target ).closest( 'li' ).is( '.readonly' ) ) {
								return StopAll( e );
							}
							// Validate a specific input element on change.
							return $.html5form.validate( target, form, submitted );
					}
				},
				// Auto-create any specialized controls in the html5 form.
				_buildContents = function ( e ) {
					var captcha;

					// Update the form input elements.
					if ( e && e.type === 'reload' ) {
						inputs = element.find( ":input:not(.ui-dialog-titlebar-close,button)" );
					}

					// Set up any comboboxes.
					element.find( '.cms-combobox' ).combobox();

					// And Any uploaders.
					element.find( '.cms-uploader' ).uploader();

					// And Any slide captchas.
					captcha = element.find( '.cms-slide-captcha' ).slideCaptcha();
					if ( !captcha.length ) {
						// Set the code.
						element.find( "input:hidden[id$='_FFD6']" ).val( new Date().getTime() );
						element.find( buttons ).on( 'mousedown', function ( e ) {
							// Update the code on click.
							element.find( "input:hidden[id$='_FFD6']" ).val( new Date().getTime() );
						} );
					}

					element.find( ":input[data-masking]" ).masked();

					// And ckeditor replacements.
					element.find( "textarea[data-editor='ckeditor']" )
						.ckeditor()
						.closest( 'li' )
						.find( 'a.expand' )
						.on( 'click', function ( e ) {
							$( this ).closest( 'li' ).find( '.input-html' ).toggleClass( 'expand' );
						} );

					// And ckeditor replacements.
					element.find( "textarea[data-editor='ace']" ).ace();

					// CMS8 CKEDITOR.
					element.find( "textarea[data-editor='ck']" ).ck();

					// google auto-suggest widget
					var ga = element.find( "[data-ga-search]" );
					if ( ga && ga.length ) {
						rrequire( 'm/google-address-lookup', function () {
							element.GoogleAddressLookup();
						} );
					}
				};

			if ( options && options.useNative !== undefined ) {
				// If the native option was defined, note it.
				_native = !!options.useNative;
			} else if ( !element.find( 'li :input' ).length || !element.find( 'li .validation' ).length ) {
				// If we do not have any input elements inside an LI or we do not have any custom validation messages, we'll assume that we need to use the native HTML5 validation.
				_native = true;
			}

			if ( !Modernizr.placeholder ) {
				element.find( "input[placeholder]" ).each( function ( i ) {
					var input = $( this );
					input.val( input.attr( 'placeholder' ) );
				} );
			}

			// If we have multiple required checkboxes in a single group (e.g. a CheckBoxList), the native
			// HTML5 validation actually getes in the way.  Add a novalidate attribute to the parent form.
			var names = {};
			inputs.filter( "input:checkbox[required]" ).each( function ( i ) {
				var name = $( this ).attr( 'name' );
				if ( names[name] ) {
					form.attr( 'novalidate', 'novalidate' ).prop( 'novalidate', true );
					// Disable native validation -- this form script needs to take care of everything.
					_native = false;
					return false;
				} else {
					names[name] = 1;
				}
			} );

			// Set up the forum events.
			element.on( 'focusin focusout change click', _handleEvents );

			if ( !_native ) {
				// Cancel the default invalid event.
				inputs.on( 'invalid', false );
			}

			// When the reload event is fired, rebuild the contents.
			element.on( 'reload', _buildContents );

			// Add a modal loading to the page during a form submit.
			element.closest( 'form' ).on( 'submit', function ( e ) {
				// Make sure nothing on the page has focus (don't want an ENTER to resubmit).
				if ( document.activeElement ) {
					try {
						document.activeElement.blur();
					} catch ( ex ) {; }
				}
				if ( _lastButton && _lastButton.data( 'noloading' ) ) {
					// If we submitted the form with a noloading button, exit now.
					return;
				} else if ( !keyState.ctrlKey && !this.getAttribute( 'data-search' ) ) {
					// Modal the page to prevent double clicks.
					$( document.body ).loading();
				}
			} );

			// If the current browser doesn't support date time inputs.
			if ( !Modernizr.inputtypes.date ) {
				element.find( "input[type]" ).each( function ( i ) {
					var pattern, date,
						type = this.getAttribute( 'type' );

					switch ( type ) {
						case 'date':
							pattern = 'M/d/yyyy';
							break;
						case 'time':
							break;
						case 'datetime':
						case 'datetime-local':
							pattern = 'M/d/yyyy h:mm tt';
							break;
						default:
							return;
					}

					if ( !Modernizr.inputtypes[type] ) {
						// Set a friendly version of the date.
						date = Date.parse( this.value );
						if ( !isNaN( date ) ) {
							this.value = new Date( date ).formatted( pattern );
						}
					}
				} );
			}

			// Handle any initial content build.
			_buildContents();

			Behaviors.On();

		} );
	};

	// Lazy-load the upload scripts and initialize it.
	$.widget( 'cms.uploader', {

		options: {
		},

		_create: function () {
			var up = this;
			rrequire( 'c/uploadable', function () {
				up._setup();
			} );

		},

		_setup: function () {
			// Get the file type (as an enum value or parse the string).
			var type = this.element.data( 'filetype' ) || CMS.Files.IMAGE,
                input = this.element.find( "input:hidden" ),
                path = input.val(),
                ext = path && ( '.' + path.split( '.' ).pop() ),
			    href = /^http/.test(path) ? path : CMS.Files.getThumbnail( "", path, ext ),
                thumb = this.element.find("[data-role='thumbnail']"),
                s3 = !!this.element.data('s3');
			if ( typeof type === 'string' ) {
				type = CMS.Files[type.toUpperCase()] || CMS.Files.IMAGE;
			}

			this.element.uploadable( {
				filetype: type,
				folder: this.element.data( 'folder' ),
				input: input,
				thumbnail: thumb,
				dialog: !this.element.data( 'nodialog' ),
				maxFiles: this.element.data( 'maxFiles' ) || 0,
				drop: this.element.find( "[data-role='drop']" ),
				browse: this.element.find( "[data-role='browse']" ),
				media: this.element.find( "[data-role='media']" ),
                cancel: this.element.find("[data-role='cancel']"),
                s3: s3
			} );

			if ( thumb && thumb.length && href ) {
				thumb.attr( 'src', href ).addClass( 'show' );
				this.element.addClass( 'uploaded' );
			}

			// Trigger the fact that the uploader has been set up.
			// This is a placeholder event until a decent promise/future pattern is set up.
			this._trigger( 'uploader' );
		}

	} );

	// Lazy-load the upload scripts and initialize it.
	$.widget( 'cms.slideCaptcha', {

		options: {
			enabledAt: 0.7
		},

		_create: function () {

			// Get the submit buttons and disable them.
			this.submit = this.element.closest( 'form' )
				.find( "button[type='submit'],button[type='image']" )
				.prop( 'disabled', true );

			// Find the hidden input element.
			this.input = this.element.find( 'input:hidden' );

			// Get any message element.
			this.message = this.element.find( "[data-role='message']" );
			this.options.message = this.message.html();

			// And the drag handle.
			this.handle = this.element
				.find( "[data-role='handle']" )
					.draggable( {
						start: $.proxy( this._start, this ),
						drag: $.proxy( this._drag, this ),
						stop: $.proxy( this._stop, this )
					} );

			// Default is not enabled.
			this._enabled = false;
		},

		// Measure the max left position.
		_start: function ( e, ui ) {
			ui.helper.w = this.handle.parent().outerWidth() - this.handle.width();
		},

		// Set the position while dragging.
		_drag: function ( e, ui ) {
			var width = ui.helper.w,
				left = Math.limit( ui.position.left, 0, width ),
				percent = width ? left / width : 0;

			ui.position.top = 0;
			ui.position.left = left;

			// Enable or disable as needed.
			if ( percent > this.options.enabledAt && !this._enabled ) {
				this.enable();
			} else if ( percent <= this.options.enabledAt && this._enabled ) {
				this.disable();
			}
		},

		// If we didn't drag all the way to one side or the other, animate it into position.
		_stop: function ( e, ui ) {
			var width = ui.helper.w,
				left = Math.limit( ui.position.left, 0, width ),
				percent = width ? left / width : 0;

			if ( percent > this.options.enabledAt && percent < 1 ) {
				ui.helper.animate( { left: width }, 150 );
			} else if ( percent > 0 && percent <= this.options.enabledAt ) {
				ui.helper.animate( { left: 0 }, 250 );
			}

		},

		// Enable the form submission.
		enable: function () {
			this._enabled = true;
			this.element.addClass( 'enabled' );
			this.submit.prop( 'disabled', false );
			this.input.val( new Date().getTime() );

			if ( this.message.length ) {
				this.message.html( this.message.data( 'enabled' ) || this.options.message );
			}
		},

		// Disable the form submission.
		disable: function () {
			this._enabled = false;
			this.element.removeClass( 'enabled' );
			this.submit.prop( 'disabled', true );
			this.input.val( "" );

			if ( this.message.length ) {
				this.message.html( this.options.message );
			}
		}

	} );

	// Lazy-load the ace editor scripts and initialize it.
	$.widget( 'cms.ace', {

		_create: function () {
			// Ensure the initial value is HTML encoded.
			var val = this.element.val();
			if ( val && val.indexOf( '<' ) >= 0 ) {
				this.element.val( Encode.HTML( val ) );
			}

			// Once the required scripts are loaded.
			var onload = function () {
				// Initialize the element when it has been rendered anywhere on the page.
				this.element.onvisible( this._setup.bind( this ) );
				setTimeout( function () { $( window ).trigger( 'resize' ); }, 250 );
			}.bind( this );

			// Require the ace scripts and then run the setup.
			rrequire( ['ace'], onload );
		},

		// Set up the ace editor.
		_setup: function () {
			var id = Compute.UUID();
			var data = this.element.data( 'ace' );
			if ( !$.isPlainObject( data ) ) {
				data = {};
			}
			this.state = {
				ctimer: 0,
				ptimer: 0
			};
			this.element.css( { visibity: 'hidden', opacity: 0 } );
			this.div = $( '<div></div>' ).insertAfter( this.element );
			this.div.attr( 'id', id ).css( { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' } );

			// Build the ace editor.
			this.code = ace.edit( id );
			this.code.setTheme( 'ace/theme/dreamweaver' );
			this.code.getSession().setMode( data.mode || 'ace/mode/html' );

			// Set the other defaults.
			this.code.setSelectionStyle( "text" );
			this.code.setHighlightActiveLine( true );
			this.code.setShowInvisibles( false );
			this.code.setDisplayIndentGuides( false );
			this.code.renderer.setShowGutter( true );
			this.code.setPrintMarginColumn( false );
			this.code.setHighlightSelectedWord( true );
			this.code.renderer.setHScrollBarAlwaysVisible( false );
			this.code.renderer.setVScrollBarAlwaysVisible( true );
			this.code.setAnimatedScroll( false );
			this.code.session.setUseSoftTabs( false );
			this.code.setBehavioursEnabled( true );
			this.code.setFadeFoldWidgets( false );
			this.code.setReadOnly( false );
			this.code.setOption( 'scrollPastEnd', false );
			this.code.$blockScrolling = Infinity;

			// Reset the state.
			this.code.on( 'focus', function ( e ) {
				this.dirty = false;
			}.bind( this ) );

			// Update the base element when the ace editor changes.
			this.code.on( 'change', function ( e, ace ) {
				var val;
				if ( ace.silent ) {
					return;
				}
				val = ace.getValue();
				this.element.val( Encode.HTML( val || "" ) );
				this.dirty = true;

				// Trigger an input event.
				this.element.trigger( 'input' );
			}.bind( this ) );

			// When bluring the editor, trigger a change if the contents have been updated.
			this.code.on( 'blur', function ( e ) {
				if ( this.dirty ) {
					this.element.trigger( 'change' );
					this.dirty = false;
				}
				this.dirty = false;
			}.bind( this ) );

			// Update the HTML in the ace editor.
			this.update = function () {
				var val = Decode.HTML( this.element.val() || "" );
				this.code.silent = true;
				this.code.setValue( val || "", -1 );
				this.code.focus();
				this.code.silent = false;
			}.bind( this );

			// When updating the textarea, refresh the view in the ace editor as well.
			this.element.on( 'update', this.update );

			// Set the initial state.
			this.update();

			// Add a native "getValue" method.
			this.element[0].getValue = this.code.getValue.bind( this.code );
		},

		// Clean up the ace editor.
		_destroy: function () {
			var id = this.element.attr( 'id' );
			this.code.edit( id ).destroy();
		}
	} );

	// Lazy-load the ckeditor scripts and initialize it.
	$.widget( 'cms.ckeditor', {

		options: {
			properties: false,
			toolbar: [
				{ name: 'basicstyles', items: ['Bold', 'Italic', 'Underline'] },
		        { name: 'lists', items: ['NumberedList', 'BulletedList'] },
		        { name: 'links', items: ['Links', 'Media'] },
		        { name: 'spell', items: ['SpellChecker'] },
				{ name: 'format', items: ['Format'] },
				{ name: 'styles', items: ['Styles'] },
		        { name: 'blocks', items: ['JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock', 'Indent', 'Outdent'] },
		        { name: 'special', items: [/*'SpecialChar', */'ShowBlocks'] },
				{ name: 'clip', items: ['Undo', 'Redo'] },
				{ name: 'maximize', items: ['Maximize'] }
			],
			toolbarHTML: [
                { name: 'basicstyles', items: ['Bold', 'Italic', 'Underline'] },
		        { name: 'lists', items: ['NumberedList', 'BulletedList'] },
		        { name: 'links', items: ['Links', 'Media'] },
		        { name: 'blocks', items: ['JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock', 'Indent', 'Outdent'] },
		        { name: 'spell', items: ['SpellChecker'] },
				{ name: 'format', items: ['Format'] },
				{ name: 'styles', items: ['Styles'] },
		        { name: 'special', items: [/*'SpecialChar', */'ShowBlocks'] },
				{ name: 'clip', items: ['Undo', 'Redo', 'SourceEdit'] },
				{ name: 'maximize', items: ['Maximize'] }
			],
			toolbarSimple: [
				{ name: 'basicstyles', items: ['Bold', 'Italic', 'Underline'] },
		        { name: 'lists', items: ['NumberedList', 'BulletedList'] },
		        { name: 'links', items: ['Links'] },
				{ name: 'format', items: ['Format'] },
				{ name: 'styles', items: ['Styles'] },
				{ name: 'clip', items: ['Undo', 'Redo'] },
				{ name: 'maximize', items: ['Maximize'] }
			],
			simpleHTML: [
				{ name: 'basicstyles', items: ['Bold', 'Italic', 'Underline'] },
		        { name: 'lists', items: ['NumberedList', 'BulletedList'] },
		        { name: 'links', items: ['Links'] },
		        { name: 'format', items: ['Format'] },
				{ name: 'clip', items: ['Undo', 'Redo', 'SourceEdit'] },
				{ name: 'maximize', items: ['Maximize'] }
			]
		},

		_create: function () {
			// Ensure the initial value is HTML encoded.
			var val = this.element.val();
			if ( val && val.indexOf( '<' ) >= 0 ) {
				this.element.val( Encode.HTML( val ) );
			}

			// Once the required scripts are loaded.
			var onload = function () {
				// Initialize the element when it has been rendered anywhere on the page.
				this.element.onvisible( this._setup.bind( this ) );
				setTimeout( function () { $( window ).trigger( 'resize' ); }, 250 );
			}.bind( this );

			// Require the ckeditor scripts and then run the setup.
			rrequire( ['ckeditor', 'html'], ['opensans', 'cms-form', 'cms-tools', 'cms-wizards'], onload );
		},

		// Get or set the value of the ckeditor.
		val: function ( value ) {
			if ( value === undefined ) {
				return this.editor ? this.editor.getData() : this.value;
			}
			// Normalize the value.
			this.value = value ? new HTML.Page( value ).render() : "";
			if ( this.editor ) {
				// Update the editor.
				this.editor.setData( value );
				this.editor.updateElement();
			} else {
				// Or, update the textarea directly.
				this.element.val( Encode.HTML( this.value ) );
			}
		},

		// Clean up the CKEDITOR instance.
		_destroy: function () {
			if ( this.editor && this.editor.destroy ) {
				this.editor.destroy();
				this.editor = null;
			}
		},

		// Set up the CKEditor
		_setup: function () {
			var fullPage, toolbar,
				ck = this,
				textarea = this.element,
                data = textarea.data(),
				id = textarea.attr( 'id' ),
				required = textarea.is( "[required]" ),
				val = textarea.val(),
				remove = undefined;

			this.state = {
				last: null,
				ctimer: 0
			};

			if ( this.initialized ) {
				// Already initialized.
				return;
			} else {
				// Set the state so this doesn't get run twice.
				this.initialized = true;
			}

			this.value = textarea.val() || "";
			if ( this.value ) {
				// Decode and normalize the HTML.
				this.value = new HTML.Page( Decode.HTML( this.value ) ).render();
				// RESAVE the UNencoded value so that the CKEDITOR renders properly.
				textarea.val( this.value );
			}

			// Are we doing a full-page edit?
			fullPage = data.fullPage === true || ( this.value && this.value.indexOf( '</head>' ) >= 0 );

			if ( !id ) {
				id = Compute.UUID();
				textarea.attr( 'id', id );
			}

			// Add the widget class.
			this.element.addClass( 'ui-ckeditor' );

			if ( data && data.simple && data.html ) {
				toolbar = this.options.simpleHTML;
				remove = 'properties';
			} else if ( data && data.simple ) {
				toolbar = this.options.toolbarSimple;
				remove = 'properties,acesource';
			} else if ( data && data.html ) {
				toolbar = this.options.toolbarHTML;
			} else {
				toolbar = this.options.toolbar;
				remove = 'acesource';
			}

			if ( this.options.properties ) {
				remove = undefined;
			}

			this.editor = CKEDITOR.replace( id, {
				htmlEncodeOutput: true,
				fullPage: fullPage,
				toolbar: toolbar,
				removePlugins: remove,
				on: {
					instanceReady: function () {
						var editor,
							ua = window.navigator.userAgent;
						if ( required ) {
							textarea.attr( 'required', 'required' );
						}

						ck.ready = true;
						textarea.trigger( 'ready' );

						if ( ua && /MSIE 10\.0/.test( ua ) && /NT 6\.1/.test( ua ) ) {
							console.log( 'IE10 on Windows 7 detected.' );
							console.log( 'Warning! There are browser rendering bugs with this version that may affect CKEDITOR.' );
							console.log( 'If the CKEDITOR tools cannot be seen, F5 to refresh the page.' );
						}

						// Trigger the initial update so that any HTML is properly encoded into the textarea.
						editor = CKEDITOR.instances[id];
						editor && editor.updateElement();

						// Replace any SVG use elements.
						if ( window.USE && USE.Replace ) {
							USE.Replace();
						}
					}
				}
			} );

			// If we have a properties pane, note it.
			if ( this.options.properties && this.options.properties.nodeType === 1 ) {
				this.editor.propertiesPane = this.options.properties;
			}

			// On focus, add our focused class so things look pretty.
			this.editor.on( 'focus', function ( e ) {
				textarea.closest( 'li' ).addClass( 'focused' );
			} );

			// On blur, update the element so we can run validation.
			this.editor.on( 'blur', function ( e ) {
				textarea.closest( 'li' ).removeClass( 'focused' );
				if ( !e.editor.sourceCode ) {
					e.editor.updateElement();
				}
			} );

			// Wire up the autosave.
			switch ( this.element.data( 'autosave' ) ) {
				case 'form':
					// See if we had something in autosave.
					this.checkAutosave();

					// Wire up the auto-save event.
					this.editor.on( 'change', $.proxy( this.autosave, this ) );

					// Remove the auto-saved post when it is submitted.
					this.element.closest( 'form' ).on( 'submit', function ( e ) {
						var key = 'autosave:' + window.location.pathname;
						localStorage.removeItem( key );
					} );
					break;
				case 'input':

					// The change is expensive, so run it on a timer.
					this.onchange = function () {
						clearTimeout( this.state.ctimer );
						this.state.ctimer = setTimeout( this.change, 250 );
					}.bind( this );

					// When a change has occurred, update the related textarea.
					this.change = function () {
						var changed;

						// Don't fire the change event during a source code edit.
						if ( this.editor.sourceCode ) {
							return;
						}

						// Get the current value.
						this.editor.updateElement();
						changed = textarea.val();

						// If we went from something to nothing or nothing to something, it is a change.
						if ( ( this.value && !changed ) || ( !this.value && changed ) ) {
							textarea.trigger( 'input' );
							return;
						}

						// Normalize the value.
						changed = new HTML.Page( Decode.HTML( changed ) ).render();

						// If it changed.
						if ( this.value != changed ) {
							this.value = changed;
							textarea.trigger( 'input' );
						}
					}.bind( this );

					this.editor.on( 'change', this.onchange );
			}

			// When the textbox has an update triggered, update the underlying ckeditor.
			this._on( this.element, {
				update: function ( e ) {
					this.editor.updateElement();
				}
			} );
		},

		// Fire the auto-save on a 2-second timeout.
		autosave: function () {
			if ( this._atimeout ) {
				clearTimeout( this._atimeout );
			}
			this._atimeout = setTimeout( $.proxy( this._autosave, this ), 2000 );
		},

		// Auto-save the contents of the form.
		_autosave: function () {
			var json, ck,
				key = 'autosave:' + window.location.pathname,
				data = {};

			// Cannot do an autosave while editing source code.
			if ( this.editor && this.editor.sourceCode ) {
				return;
			}

			// Get the values of all input elemens in the form.
			this.element.closest( 'form' ).find( "[name]" ).each( function ( i ) {

				var array,
					input = $( this ),
					name = input.attr( 'name' ).split( '$' ).pop(),
					value = input.val();

				if ( !value ) {
					// Need a value to do anything.
					return;
				} else if ( input.is( ":radio" ) && !input.prop( 'checked' ) ) {
					// Unselected radio button.
					return;
				} else if ( input.is( ":checkbox" ) ) {
					if ( !input.prop( 'checked' ) ) {
						// Unselected checkbox.
						return;
					} else {
						// Add the checked value to the array.
						array = data[name] || [];
						array.push( value );
						data[name] = array;
					}
				} else if ( input.is( 'textarea' ) ) {
					// Check for a ckeditor instance and use the getData as appropriate.
					ck = CKEDITOR.instances[input.attr( 'id' )];
					if ( ck ) {
						value = ck.getData();
						if ( value && /^\s*<p\b[^>]*>\s*<\/p>\s*$/.test( value ) ) {
							// A value of a single empty paragraph tag is treated as null.
							value = null;
						}
					}
					if ( value ) {
						data[name] = value;
					}
				} else {
					// Save the value.
					data[name] = value;
				}

			} );

			// Don't save blank data.
			if ( $.isEmptyObject( data ) ) {
				return;
			}

			// Replace any encoded textarea data with the actual html from the content editor.
			data[this.element.attr( 'name' ).split( '$' ).pop()] = this.editor.getData();

			// Note the date it was autosaved.
			data['AutoSaved'] = new Date();

			// Serialize the data.
			json = JSON.stringify( data );

			// Save the value in local storage.
			localStorage.setItem( key, json );

			// Update the underlying textarea as a helper to any required attributes.
			this.editor.updateElement();

			// Trigger any autosave event on the original textarea.
			this.element.trigger( 'autosave' );
		},

		// Check for an autosave to restore.
		checkAutosave: function () {
			var ck = this,
				key = 'autosave:' + window.location.pathname,
				json = localStorage.getItem( key ),
				data = json && parseJson( json );

			if ( data && data.AutoSaved ) {
				$confirm(
					'<h2>Restore Content</h2>You have content auto-saved on <strong>' +
					data.AutoSaved.formatted( 'MMMM d, yyyy h:mmtt' ) +
					'</strong>.<br>Would you like to continue with this edit?',
					function () {
						ck._restoreAutosave( data );
					},
					function () {
						localStorage.removeItem( key );
					}
					);
			}
		},

		// Restore an autosave.
		_restoreAutosave: function ( data ) {

			// Get the values of all input elemens in the form.
			this.element.closest( 'form' ).find( "[name]" ).each( function ( i ) {

				var array,
					input = $( this ),
					name = input.attr( 'name' ).split( '$' ).pop(),
					value = input.val();

				if ( input.is( ":radio" ) ) {
					if ( data[name] ) {
						input.prop( 'checked' );
					}
				} else if ( input.is( ":checkbox" ) ) {
					array = data[name];
					if ( array && array.indexOf( value ) >= 0 ) {
						input.prop( 'checked', true );
					}
				} else if ( input.is( 'textarea' ) ) {
					// Check for a ckeditor instance and use the setData as appropriate.
					ck = CKEDITOR.instances[input.attr( 'id' )];
					if ( ck ) {
						ck.setData( data[name] || "" );
					} else {
						input.val( data[name] || "" );
					}
				} else {
					input.val( data[name] || "" );
				}

			} );
		}

	} );

	$.widget( 'cms.ck', $.cms.ckeditor, {

		_create: function () {
			// Ensure the initial value is HTML encoded.
			var val = this.element.val();
			if ( val && val.indexOf( '<' ) >= 0 ) {
				this.element.val( Encode.HTML( val ) );
			}

			// Once the required scripts are loaded.
			var onload = function () {
				// Initialize the element when it has been rendered anywhere on the page.
				this.element.onvisible( this._setup.bind( this ) );
				setTimeout( function () { $( window ).trigger( 'resize' ); }, 250 );
			}.bind( this );

			// Require the ckeditor scripts and then run the setup.
			if(!window.location.href.includes('_admin'))
				rrequire( ['ck', 'html'], [], onload );
		}
	} );

	$.widget( 'cms.combobox', {

		options: {
			insert: false,
			fields: null,
			searchTimer: 100
		},

		_create: function () {
			var fields;

			// Get the select panel.
			this.id = this.element.attr( 'id' );
			this.panel = this.element.find( "[data-role='select']" );
			if ( !this.panel.length ) {
				return;
			}

			var element = this.element.addClass( 'ui-noselect' );
			rrequire( 'c/scrollbar', function () {
				element.find( '.ui-scroll' ).scrollbar().captureScroll();
			} );

			// Can new elements be added to the combo box items.
			if ( this.element.data( 'allowinsert' ) ) {
				this.options.insert = true;
			}

			// An array of fields to use for searching.
			if ( ( fields = this.element.data( 'fields' ) ) != null ) {
				this.options.fields = fields;
			}

			// When focusing on the searchbox, activate the search panel.
			this.element.on( 'focusin.combobox', $.proxy( this._onFocus, this ) );

			// Show and hide matching elements.
			this.element.onidle( 'input.combobox', $.proxy( this._handleSearch, this ), this.options.searchTimer );

			// Show and hide matching elements.
			this.element.on( 'change.combobox', $.proxy( this._handleChange, this ) );

			// Check for a 'remove' click.
			this.element.on( 'click.combobox', $.proxy( this._handleClick, this ) );

			// Navigate up and down the list if items.
			this.element.on( 'mouseover.combobox mouseleave.combobox', $.proxy( this._hover, this ) );

			// Navigate up and down the list if items.
			this.element.on( 'keydown.combobox', $.proxy( this._navigate, this ) );

		},

		_destroy: function () {
			// Unbind any events.
			this.element.off( '.combobox' );
		},

		// Get the value of a label matching a particular id.
		getLabel: function ( id ) {
			var label = null;

			// In case there are more than one label for this input element, check each one.
			this.element.find( "label[for='" + id + "']" ).each( function ( i ) {
				// The longest label text wins.
				var text = $( this ).text();
				if ( !label || text.length > label.length ) {
					label = text;
				}

			} );

			return label || "";
		},

		// Focusing on element in the combobox.
		_onFocus: function ( e ) {
			var role = $( e.target ).data( 'role' );

			// Did we focus on a search box?
			if ( role != 'search' ) {
				return;
			}

			this.activate();
		},

		// Search for elements in the list.
		_handleSearch: function ( e ) {
			var value, index, count, val, show, inputs,
                exact = false,
				// We're looking for a textbox with a search role.
				input = $( e.target ),
				role = input.data( 'role' );

			// Did we input into a search box?
			if ( role != 'search' ) {
				return;
			}
			// Save the correct user input to return as the suggested category to add
			term = ( input.val() || "" );
			// Get a lower-cased version of the current 'search' value.
			value = term.toLowerCase();

			// Get all of the inputs to run the search against.
			inputs = this.element.find( "input:checkbox,input:radio" );

			if ( !value ) {
				// Show everything.
				inputs.closest( 'li' ).show();
				this.element.find( '.ui-select-add, .no-results' ).hide();
				this.panel.removeClass( 'adding' );
				return;
			}

			//var t1 = new Date().getTime();

			// Look through the input elements.
			count = 0;
			index = inputs.length;
			while ( index-- ) {
				// Get the next input element.
				show = false;
				input = inputs.eq( index );

				// if we are searching by multiple fields
				if ( this.options.fields && this.options.fields.length ) {
					// Look through each of the fields.
					fIndex = this.options.fields.length;
					while ( fIndex-- ) {
						// get the field value and compare it to our search term
						val = input.data( this.options.fields[fIndex] ).toLowerCase();
						if ( val && val.indexOf( value ) >= 0 ) {
							// If we have a match, show this item.
							show = true;
							// If this is an exact match, flag it
							if ( val == value ) {
								exact = true;
							}
							break;
						}
					}
				} else {
					// Find the matching label.
					val = this.getLabel( input.attr( 'id' ) ).toLowerCase();
					show = val && val.indexOf( value ) >= 0;
					// if this is an exact match, flag it
					if ( val == value ) {
						exact = true;
					}
				}

				// Show or hide the parent LI, as appropriate.
				if ( show ) {
					count++;
					input.closest( 'li' ).show();
				} else {
					input.closest( 'li' ).hide();
				}

				// if we have an exact match
				if ( exact ) {
					// don't show the add button
					this.element.find( '.ui-select-add' ).hide();
					this.panel.removeClass( 'adding' );
				}
			}

			if ( !count ) {
				this.element.find( '.no-results' ).show();
				// otherwise show the add button and update with the term 
				this.element.find( '.ui-select-add' ).html( 'Add "' + term + '" as a category' ).show();
				this.panel.addClass( 'adding' );
			} else {
				this.element.find( '.no-results' ).hide();
			}

			// Handle any search event.
			this._trigger( 'search', { value: value } );
		},

		_addNew: function ( value ) {
			var li, listitem,
                panel = this.element.find( "div[data-role='select']" ),
                panelname = this.element.data( 'uniqueid' ),
                insertfield = this.element.data( 'insertfield' ),
                list = this.element.find( "ul[data-role='items']" ),
                inputid = this.element.attr( 'id' ),
                newid = '0|' + value;

			li = $( '<li><input type="checkbox" class="cms">\
	                    <label class="cms-replace"></label>\
	                    <label class="cms"></label>\
                    </li>' )
                .find( 'input:checkbox' )
					.attr( {
						'name': panelname,
						'id': inputid + newid,
						'value': newid
					} )
                    .prop( 'checked', 'checked' )
                    .data( insertfield, value )
				.end()
                .find( 'label' )
                    .attr( 'for', inputid + newid )
                .end()
				.find( 'label.cms' )
					.text( value )
				.end();

			panel.children( 'ul' ).append( li );
			panel.removeClass( 'adding' ).find( '.ui-select-add, .no-results' ).hide();

			// Create and add the new li to our selected items
			listitem = $( "<li></li>" ).addClass( 'button' ).appendTo( list );
			listitem.data( 'value', newid );
			listitem.text( value );
			listitem.append( '<a href="javascript:void(\'Remove\');" class="cancel"></a>' );

		},

		// When a radio button or checkbox element is changed.
		_handleChange: function ( e ) {
			var list, inputs, input, li, selected,
				input = $( e.target );

			if ( !input.is( "input:checkbox,input:radio" ) ) {
				// We only care about changes to a radio or checkbox.
				return;
			}

			// Look for a matching items panel.
			list = this.element.find( "ul[data-role='items']" );
			if ( !list.length ) {
				return;
			} else {
				// Remove any existing items.
				list.empty();
			}

			// Get all of the inputs to run the search against.
			inputs = this.element.find( "input:checkbox,input:radio" );
			selected = [];
			for ( var i = 0, len = inputs.length; i < len; i++ ) {
				// Skip over unchecked elements.
				input = inputs.eq( i );
				if ( !input.prop( 'checked' ) ) {
					continue;
				}

				// Add the input to the selected array.
				selected.push( inputs[i] );

				// Create and add the new li.
				li = $( "<li></li>" ).addClass( 'button' ).appendTo( list );
				li.data( 'value', input.attr( 'value' ) );
				li.text( this.getLabel( input.attr( 'id' ) ) );
				li.append( '<a href="javascript:void(\'Remove\');" class="cancel"></a>' );
			}

			this._trigger( 'change', { selected: $( selected ) } );
		},

		// Check for a click on a 'remove' link.
		_handleClick: function ( e ) {
			var li, val, target,
				data = Get.LinkData( e );

			switch ( data.action ) {
				case 'Remove':
					// Find the parent LI, and get the matching value of the item.
					li = $( data.link ).closest( 'li' );
					val = li.data( 'value' );

					// Remove the LI.
					li.remove();

					// Find the matching checkbox or radio button, and 'uncheck' it.
					this.element.find( "input:checkbox,input:radio" ).filter( "[value='" + val + "']" ).prop( 'checked', false );
					break;
				case 'Add':
				case 'AddNew':
					// Get the value we are trying to add
					var val = this.element.find( '[data-role=search]' ).val();
					// then add it
					this._addNew( val );
					break;
				default:
					target = $( e.target );
					if ( target.is( 'li' ) ) {
						target.find( "input:checkbox,input:radio,label" ).eq( 0 ).click();
					}
					break;
			}

		},

		// Activate the hover state of an element.
		_hover: function ( e ) {
			var item;
			if ( e.type === 'mouseleave' ) {
				this.over = false;
				return;
			} else {
				this.over = true;
			}

			// Get the nearest LI that is inside the select panel.
			item = $( e.target ).closest( 'li' );
			if ( item.length && $.contains( this.panel[0], item[0] ) ) {
				this.focused( item );
			}
		},

		_navigate: function ( e ) {

			if ( e.shiftKey || e.ctrlKey ) {
				return;
			}

			switch ( e.which ) {
				case $.ui.keyCode.ESCAPE:
					this.deactivate();
					$( e.target ).blur();
					break;
				case $.ui.keyCode.DOWN:
					this.navigate( 1 );
					break;
				case $.ui.keyCode.UP:
					this.navigate( -1 );
					break;
				case $.ui.keyCode.PAGE_DOWN:
					this.navigate( 10 );
					break;
				case $.ui.keyCode.PAGE_UP:
					this.navigate( -10 );
					break;
				case $.ui.keyCode.HOME:
					this.focused( this.panel.find( 'li:first' ) );
					break;
				case $.ui.keyCode.END:
					this.focused( this.panel.find( 'li:last' ) );
					break;
				case $.ui.keyCode.ENTER:
					//case $.ui.keyCode.SPACE:
					this.toggle( this.panel.find( '.focused:first' ) );
					break;
				default:
					// If it wasn't one of the above, let the native event happen.
					return;
			}

			// Kill the default event.
			return StopAll( e );

		},

		// Move up and down the list of focused items.
		navigate: function ( amount ) {
			var	// Get all of the items in the panel.
				items = this.panel.find( 'li:visible' ),
				// Which one is currently focused.
				focused = items.filter( '.focused' ),
				// Add the amount and limit it to a min / max.
				index = Math.limit( items.index( focused ) + amount, 0, items.length - 1 );

			// Focus the new item.
			this.focused( items.eq( index ) );
		},

		// Toggle the selection state of an item.
		toggle: function ( item ) {
			var input;

			// If we don't have an item, fuck off.
			if ( !item || !item.length ) {
				return;
			}

			// Get the actual checkbox or radio button.
			input = item.find( "input:checkbox,input:radio" );
			if ( !input.length ) {
				return;
			} else {
				// Depending on the type.
				switch ( input.attr( 'type' ) ) {
					case 'checkbox':
						// Toggle the checkbox and trigger the change.
						input.prop( 'checked', !input.prop( 'checked' ) ).trigger( 'change' );
						break;
					case 'radio':
						// Do nothing if it is already checked.
						if ( !input.prop( 'checked' ) ) {
							// Otherwise, trigger the click event to 'check' this one and 'uncheck' other radio button elements.
							input[0].click();
						}
						break;
				}
			}
		},

		// Set the current focused item.
		focused: function ( item ) {
			if ( item.is( '.focused' ) ) {
				return;
			} else {
				// Add the focus class.
				this.panel.find( '.focused' ).removeClass( 'focused' );
				item.addClass( 'focused' ).scrollIntoView();

				// Trigger any event.
				this._trigger( 'focused', { item: item } );
			}
		},

		// Activate the select items panel.
		activate: function () {
			// Already active.
			if ( this.panel.is( '.active' ) ) {
				return;
			}

			// Activate the select panel.
			this.panel.addClass( 'active' ).trigger( 'update' ).find( '.ui-scroll' ).trigger( 'update' );;

			if ( !this._documentClick ) {
				// Create a simple closure to see if we clicked off of the combobox.
				var combo = this;
				this._documentClick = function () {
					if ( !combo.over ) {
						// If we clicked on something while NOT over the combobox, deactivate it.
						combo.deactivate();
					}
				};
			}
			$( document ).on( 'click.combobox', this._documentClick );

			if ( !this._documentFocus ) {
				// Create a simple closure to see if we focused outside of the combobox.
				var combo = this;
				this._documentFocus = function ( e ) {
					if ( !$.contains( combo.element[0], e.target ) && !$( e.target ).is( '.ui-dialog' ) ) {
						// Focused on something else (note that the dialog box broadcasts it's own focus event.
						// Need to ignore it.
						combo.deactivate();
					}
				};
			}
			$( document ).on( 'focusin.combobox', this._documentFocus );

			this._trigger( 'activate', { panel: this.panel } );
		},

		// Deactivate the select items panel.
		deactivate: function () {
			if ( this.panel.is( '.active' ) ) {
				// Deactivate the select panel.
				this.panel.removeClass( 'active' );

				// Unbind the document events.
				$( document ).off( 'click.combobox', this._documentClick );
				$( document ).off( 'focusin.combobox', this._documentFocus );

				this._trigger( 'deactivate', { panel: this.panel } );
			}
		}

	} );

	// CMS7 register script.
	if ( window.register ) {
		window.register( "form" );
	}

} ) );