if ( window.registerLoading ) {
	registerLoading( "m/date" );
}

( function ( factory ) {
    if ( typeof rrequire === "function" ) {

        // CMS7 rrequire function.
        rrequire( ["j/jquery", "j/jquery.ui", "static", "extensions", "j/ui.wheel", "j/jquery.cookie", "j/timezone"], factory );
    } else {

        // Browser globals
        factory( jQuery );
    }
}( function ( $ ) {

    if ( !$.cms ) {
        $.cms = {};
    }

    function DatePicker() {

        var	// Current date.
			_date = new Date(),
			// Date picker panel.
			_panel = $( '<div class="cms-popunder cms-datepicker ui-noselect cms-d cms-t">\
	<div class="cms-date">\
		<div class="cms-date-years" data-segment="years"><ul><li>2000</li><li>2000</li><li class="active">2000</li><li>2000</li><li>2000</li></ul></div>\
		<ul class="cms-date-months" data-segment="months"><li>Jan</li><li>Feb</li><li>Mar</li><li>Apr</li><li>May</li><li>Jun</li><li>Jul</li><li>Aug</li><li>Sep</li><li>Oct</li><li>Nov</li><li>Dec</li></ul>\
		<ul class="cms-date-days weekdays">\
			<li>S</li><li>M</li><li>T</li><li>W</li><li>T</li><li>F</li><li>S</li>\
		</ul>\
		<ul class="cms-date-days" data-segment="days"><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li><li> </li></ul>\
	</div>\
	<div class="cms-time">\
		<time data-segment="time">\
			<strong>10:14</strong>\
			<span>PM</span>\
		</time>\
		<h3>Hour</h3>\
		<div class="cms-time-drag hours" data-segment="hours">\
			<ul><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li></ul>\
			<span></span>\
		</div>\
		<h3>Minute</h3>\
		<div class="cms-time-drag minutes" data-segment="minutes">\
			<ul><li></li><li></li><li></li><li></li></ul>\
			<span></span>\
		</div>\
		<ul class="cms-time-ampm">\
			<li>\
				<input type="radio" name="datepicker$ampm" class="cms" value="AM" id="date_picker_am">\
				<label class="cms-replace" for="date_picker_am"></label>\
				<label class="cms" for="date_picker_am">AM</label>\
			</li>\
			<li>\
				<input type="radio" name="datepicker$ampm" class="cms" value="PM" id="date_picker_pm">\
				<label class="cms-replace" for="date_picker_pm"></label>\
				<label class="cms" for="date_picker_pm">PM</label>\
			</li>\
		</ul>\
		<h3>Time Zone</h3>\
		<p>Pacific Standard Time</p>\
	</div>\
	<div class="cms-date-footer">\
        <a class="cms-simple" href="javascript:void(\'Today\');" tabindex="-1">Today</a>\
		<a class="cms-simple right" href="javascript:void(\'Reset\');" tabindex="-1">Reset</a>\
		<button class="button" type="button" tabindex="-1">Save</button>\
	</div>\
</div>' ).captureScroll( true ),
			_years = _panel.find( '.cms-date-years ul li' ),
			_months = _panel.find( '.cms-date-months li' ),
			_days = _panel.find( '.cms-date-days:eq(1) li' ),
			_time = _panel.find( 'time>*' ),
			_hour = _panel.find( '.cms-time-drag.hours span ' ),
			_minute = _panel.find( '.cms-time-drag.minutes span ' ),
			_ampm = _panel.find( '.cms-time-ampm input:radio' ),
			_tz = _panel.find( '.cms-time p' ),
			// State.
			_isOpen = false,
			// Options.
			_options = {},
			// Current element.
			_element = null,
			// Value at the time the date picker opened.
			_startingValue = null;

        // Static method to find if the DatePicker is open or not.
        DatePicker.isOpen = function () {
            return _isOpen;
        };

        // Get or date the selected date.
        this.date = function ( value ) {
            if ( value === undefined ) {
                return _date;
            } else {
                _date = Make.DateTime( value ) || new Date();
            }
        };

        // Get or set the options.
        this.options = function ( options ) {
            if ( options === undefined ) {
                return _options;
            } else if ( $.isPlainObject( options ) ) {
                $.extend( _options, options );

                this.update();
            }
        };

        // Put the date picker on the page.
        this.open = function ( el, options ) {
            // If the date picker is already open.
            if ( _isOpen ) {
                if ( el === _element ) {
                    // And we're no the same item, exit.
                    return;
                } else {
                    // Otherwise, clean up the last item.
                    $.cms.date.picker.close();
                }
            }

            // Update the state.
            _isOpen = true;

            // Nope.
            if ( !el ) {
                return;
            }

            // Get the underlying element.
            if ( el.jquery ) {
                if ( !el.length ) {
                    return;
                } else {
                    el = el[0];
                }
            }

            // Must be a DOMElement.
            if ( el.nodeType !== 1 || !el.parentNode ) {
                return;
            }

            switch ( el.getAttribute( 'type' ) ) {
                case 'time':
                    _panel.removeClass( 'cms-d' ).addClass( 'cms-t' );
                    break;
                case 'datetime':
                case 'datetime-local':
                    _panel.addClass( 'cms-d cms-t' );
                    break;
                case 'date':
                default:
                    _panel.addClass( 'cms-d' ).removeClass( 'cms-t' );
                    break;
            }

            // Set any options.
            $.cms.date.picker.options( options );

            // Add the date picker to the page right next to the input element.
            el.parentNode.appendChild( _panel[0] );
            _element = el;
            _startingValue = _element.value;

            // Get the date from the element.
            _date = new Date();
            if ( !_date.parse( _startingValue ) && el.getAttribute( 'type' ) == 'time' ) {
                // If we couldn't successfully parse a date string, but we're dealing with a time,
                // see if it will parse by prepending it with a date.
                _date.parse( '1/1/1900 ' + _startingValue );
            }

            // Update the display.
            $.cms.date.picker.update();
            $.cms.date.picker.updateTime();

            // Set the time zone display.
            _tz.text( jstz.olson.friendly[$.cookie( '_tz' )] || 'Pacific Standard Time' );

            // Set up the events.
            $( _element ).on( 'change.datepicker', this.update );
            $( document ).on( 'keydown.datepicker', function ( e ) {
                if ( e.which === $.ui.keyCode.ESCAPE ) {
                    $.cms.date.picker.close();
                }
            } );
            $( document ).on( 'focusin.datepicker', function ( e ) {
                if ( e.target !== _element && !$.contains( _panel[0], e.target ) && !$.contains( e.target, _panel[0] ) ) {
                    $.cms.date.picker.close();
                }
            } );

            // On click closure.
            $.cms.date.picker._onClick = function ( e ) {
                if ( _panel[0] === e.target || $.contains( _panel[0], e.target ) ) {
                    return;
                } else if ( _element.parentNode === e.target || $.contains( _element.parentNode, e.target ) ) {
                    return;
                } else {
                    $.cms.date.picker.close();
                    return false;
                }
            };

            if ( document.addEventListener ) {
                // Use capture, if available.
                document.addEventListener( 'click', $.cms.date.picker._onClick, true );
            } else {
                // Otherwise, standard jquery event.
                $( document ).on( 'click.datepicker', $.cms.date.picker._onClick );
            }

        };

        // Close the date picker and clean up the events.
        this.close = function () {
            // Don't close if we already are.
            if ( !_isOpen ) {
                return;
            }
            _isOpen = false;

            if ( _panel[0].parentNode ) {
                _panel[0].parentNode.removeChild( _panel[0] );
            }
            if ( _element && _element.value !== _startingValue ) {
                $( _element ).blur().off( '.datepicker' ).trigger( 'change' );
            }
            _element = null;
            _startingValue = null;

            // Clean up the general date picker events off of the document.
            $( document ).off( '.datepicker' );

            // Remove the click capture event.
            if ( document.removeEventListener && $.cms.date.picker._onClick ) {
                document.removeEventListener( 'click', $.cms.date.picker._onClick, true );
            }

            // Null out the closure.
            $.cms.date.picker._onClick = null;
        };

        // Update the state of the date picker based on the current date.
        this.update = function () {
            var index, d,
				year = _date.getFullYear() - 2,
				month = _date.getMonth(),
				day = _date.getDate(),
				p = _years[0].parentNode,
				first = new Date( _date ),
				last = new Date( _date );

            // Set the years.
            for ( index = 0; index < 5; index++ ) {
                _years[index].childNodes[0].data = ( year + index );
                if ( index === 2 ) {
                    _years[index].classList.add( 'active' );
                } else {
                    _years[index].classList.remove( 'active' );
                }
            }
            // Position the scrollbar in the center.
            p.scrollLeft = ( p.scrollWidth - p.offsetWidth ) / 2;

            // Set the active month.
            for ( index = 0; index < 12; index++ ) {
                if ( index === month ) {
                    _months[index].classList.add( 'active' );
                } else {
                    _months[index].classList.remove( 'active' );
                }
            }

            // Get the day of the week of the first day of the month.
            first.setDate( 1 );
            first = first.getDay();

            // How many days in the month?
            last.setDate( 1 );
            last = last.addMonths( 1 ).addDays( -1 ).getDate();

            // Set the days.
            for ( index = 0; index < 42; index++ ) {
                d = index + 1 - first;
                if ( d < 1 || d > last ) {
                    d = "";
                }
                _days[index].childNodes[0].data = d;
                if ( d === day ) {
                    _days[index].classList.add( 'active' );
                } else {
                    _days[index].classList.remove( 'active' );
                }
            }
        };

        // Update the position of the time sliders.
        this.updateTime = function () {
            var hLeft, mLeft,
				h = _date.getHours() - 1,
				minute = _date.getMinutes(),
				hWidth = _hour[0].parentNode.offsetWidth - _hour[0].offsetWidth,
				mWidth = _minute[0].parentNode.offsetWidth - _minute[0].offsetWidth,
				am = h < 11;

            // Adjust the hour to fit the 1-11 block.
            if ( h >= 12 ) {
                h -= 12;
            } else if ( h < 0 ) {
                h = 11;
            }

            // Calculate and assign.
            hLeft = hWidth / 11 * h;
            mleft = mWidth / 59 * minute;
            _hour[0].style.left = hLeft + 'px';
            _minute[0].style.left = mleft + 'px';

            // Check the am/pm.
            _ampm[0].checked = am;
            _ampm[1].checked = !am;

            // Update the time string.
            $.cms.date.picker.updateTimeString();
        };

        // Update the name of the time.
        this.updateTimeString = function () {
            var time = _date.formatted( 'h:mm tt' ).split( ' ' );
            _time[0].childNodes[0].data = time[0];
            _time[1].childNodes[0].data = time[1];
        };

        // Update the value of any input element to match.
        this.sync = function () {
            Date.setInputValue( _element, _date );
        };

        // When clicking on the date picker panel.
        _panel.on( 'click.datepicker', function ( e ) {
            var d, m,
				data = Get.LinkData( e ),
				target = $( e.target ),
				text = target.text(),
				num = +( text ),
				isDate = false;

            if ( data.action ) {
                switch ( data.action ) {
                    case 'Today':
                        _date = new Date();
                        $.cms.date.picker.updateTime();
                        break;
                    case 'Reset':
                        $( _element ).val( '' );
                        $.cms.date.picker.close();
                        break;
                    case 'Reset Date':
                        d = new Date();
                        _date.setFullYear( d.getFullYear() );
                        _date.setMonth( d.getMonth() );
                        _date.setDate( d.getDate() );
                        break;
                    case 'Reset Time':
                        d = new Date();
                        _date.setHours( d.getHours(), d.getMinutes(), d.getSeconds() );
                        $.cms.date.picker.updateTime();
                        break;
                    default:
                        return;
                }
            } else if ( num > 0 && num <= 31 ) {
                // Set the date.
                isDate = true;
                _date.setDate( num );
            } else if ( num > 1900 && num < 3000 ) {
                // Set the year.
                _date.setYear( num );
            } else {
                // Set the month.
                m = monthIds[text];
                if ( m === undefined ) {
                    if ( target.is( 'button' ) ) {
                        $.cms.date.picker.sync();
                        $.cms.date.picker.close();
                        return StopAll( e );
                    }
                    return;
                } else {
                    _date.setMonths( m );
                }
            }

            // Update the related values.
            $.cms.date.picker.sync();
            $.cms.date.picker.update();

            // If we clicked on a date, close it.
            if ( isDate && _element && _element.getAttribute( 'type' ) === 'date' ) {
                $.cms.date.picker.close();
            }

            return StopAll( e );
        } );

        _panel.on( 'change.datepicker', function ( e ) {

            var val = $( e.target ).val();

            h = _date.getHours();
            if ( val === 'AM' && h > 12 ) {
                _date.setHours( h - 12 );
            } else if ( val === 'PM' && h < 12 ) {
                _date.setHours( h + 12 );
            } else {
                return;
            }

            // Update the related values.
            $.cms.date.picker.sync();
            $.cms.date.picker.update();
            $.cms.date.picker.updateTimeString();

        } );

        // Scroll the date picker with the mouse wheel.
        _panel.find( "[data-segment]" ).on( 'mousewheel', function ( e ) {
            var minutes,
				delta = e.deltaY || e.deltaX,
				amount = -delta,
				d = new Date( _date ),
				time = false;

            // Adjust the date.
            switch ( this.getAttribute( 'data-segment' ) ) {
                case 'days':
                    _date.addDays( amount );
                    break;
                case 'months':
                    _date.addMonths( amount );
                    break;
                case 'years':
                    _date.addYears( amount );
                    break;
                case 'hours':
                    _date.setHours( _date.getHours() + amount );
                    time = true;
                    break;
                case 'minutes':
                    _date.setMinutes( _date.getMinutes() + amount );
                    time = true;
                    break;
                case 'time':
                    minutes = _date.getMinutes() + ( amount * 5 );
                    _date.setMinutes( Math.round( minutes / 5 ) * 5 );
                    time = true;
                    break;
                default:
                    return;
            }

            if ( time ) {
                // If the date rolled over while changing the time.
                if ( d.getDate() != _date.getDate() || d.getMonth != _date.getMonth() || d.getFullYear() != _date.getFullYear() ) {
                    // Reset the date, leaving the time alone.
                    _date.setFullYear( d.getFullYear() );
                    _date.setMonth( d.getMonth() );
                    _date.setDate( d.getDate() );
                }
                // Update the time position and text.
                $.cms.date.picker.updateTime();
            }

            // Update any input element.
            $.cms.date.picker.sync();

            // Refresh the state of the date picker.
            $.cms.date.picker.update();

        } );

        _hour.draggable( {
            axis: 'x',
            containment: 'parent',
            start: function ( e, ui ) {
                // Calculate the width of the draggable area.
                ui.helper.elWidth = ui.helper[0].parentNode.offsetWidth - ui.helper[0].offsetWidth;
            },
            drag: function ( e, ui ) {
                // Get the nearest hour to the current drag.
                var hour = ( Math.round( ui.position.left / ui.helper.elWidth * 11 ) );
                ui.position.left = ui.helper.elWidth / 11 * hour;
                hour++;

                // Update the hours.
                _date.setHours( hour );
                $.cms.date.picker.sync();
                $.cms.date.picker.updateTimeString();
            }
        } );

        _minute.draggable( {
            axis: 'x',
            containment: 'parent',
            start: function ( e, ui ) {
                // Calculate the width of the draggable area.
                ui.helper.elWidth = ui.helper[0].parentNode.offsetWidth - ui.helper[0].offsetWidth;
            },
            drag: function ( e, ui ) {
                // Get the nearest minute.
                var minute = Math.round( ui.position.left / ui.helper.elWidth * 59 );
                if ( e.shiftKey ) {
                    // Round it to the nearest 15 minutes.
                    minute = Math.round( minute / 15 ) * 15;
                    ui.position.left = ui.helper.elWidth / 60 * minute;
                    if ( minute > 59 ) {
                        minute = 59;
                    }
                }

                // Update the minutes.
                _date.setMinutes( minute );
                $.cms.date.picker.sync();
                $.cms.date.picker.updateTimeString();
            }
        } );
    }


    // Static properties and methods
    $.cms.date = {

        picker: null,

        isOpen: function () {
            return DatePicker.isOpen && DatePicker.isOpen();
        },

        choose: function ( el, options ) {

            // Activate the date picker.
            if ( !$.cms.date.picker ) {
                $.cms.date.picker = new DatePicker();
            }
            $.cms.date.picker.open( el, options );
        }

    };

    // Set the start of the week (Monday).
    Date.prototype.weekStart = function () {
        var dw = this.getDay();
        switch ( dw ) {
            case 0:
                this.addDays( -6 );
                break;
            case 1:
                break;
            default:
                this.addDays( 1 - dw );
                break;
        }
        return this;
    };

    // Parse a date / time string into the current date object, fixing a non-UTC date string in ISO format.
    Date.prototype.parse = function ( str ) {
        if ( str ) {
            // Parse the date.
            var d = Date.parse( str );
            if ( isNaN( d ) ) {
                return false;
            }
            d = new Date( d );

            // If we had an ISO format.
            if ( /^\d{4}\-\d{2}\-\d{2}($|T\d{2}:\d{2})/.test( str ) ) {
                // And it didn't end in a named hour offset or Z for universal time.
				if ( !/([\-+]\d?\d:\d\d|Z)$/i.test( str ) ) {
					// Adjust for the current time zone.
					d.setMinutes( d.getMinutes() + d.getTimezoneOffset() );
				}
            }

            // Set the date to 1, to prevent rollovers from mistmatched month endings.
            this.setDate( 1 );

            // Set the date and time.
            this.setFullYear( d.getFullYear() );
            this.setMonth( d.getMonth() );
            this.setDate( d.getDate() );
            this.setHours( d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds() );
        }

        return this;
	};

	var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	var monthIds = { "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12 };

	// Format the date, readble.
	Date.prototype.formatted = function ( pattern ) {
		var local = new Date( this );
		local.setMinutes( local.getMinutes() - local.getTimezoneOffset() );

		var a, upper,
			text = local.toJSON(),
			y = text.slice( 0, 4 ),
			M = text.slice( 5, 7 ),
			d = text.slice( 8, 10 ),
			H = text.slice( 11, 13 ),
			h = +( H ),
			m = text.slice( 14, 16 ),
			s = text.slice( 17, 19 ),
			f = text.slice( 20, 23 ),
			day = this.getDay();

		return ( pattern || "M/d/yyyy" ).replace( /\\.|y{2,4}|M{1,4}|d{1,4}|H{1,2}|h{1,2}|m{1,2}|s{1,2}|t{1,2}|T{1,2}|f{1,3}|rr|RR|ZZZ/g, function ( match ) {
			switch ( match ) {
				case 'yy':
					return y.slice( 2, 4 );
				case 'yyyy':
					return y;
				case 'M':
					return +( M );
				case 'MM':
					return M;
				case 'MMM':
					return monthNames[+( M ) - 1].slice( 0, 3 );
				case 'MMMM':
					return monthNames[+( M ) - 1];
				case 'd':
					return +( d );
				case 'dd':
					return d;
				case 'ddd':
					return dayNames[day].slice( 0, 3 );
				case 'dddd':
					return dayNames[day];
				case 'H':
					return +( H );
				case 'HH':
					return H;
				case 'h':
					if ( h === 0 ) {
						return 12;
					} else if ( h > 12 ) {
						return h - 12;
					} else {
						return h;
					}
				case 'hh':
					if ( h < 10 ) {
						return '0' + h;
					} else {
						return h;
					}
				case 'm':
					return +( m );
				case 'mm':
					return m;
				case 's':
					return +( s );
				case 'ss':
					return s;
				case 't':
					return H > 11 ? 'p' : 'a';
				case 'tt':
					return H > 11 ? 'pm' : 'am';
				case 'T':
					return H > 11 ? 'P' : 'A';
				case 'TT':
					return H > 11 ? 'PM' : 'AM';
				case 'f':
					return f.slice( 0, 1 );
				case 'ff':
					return f.slice( 0, 2 );
				case 'fff':
					return f;
				case 'rr':
				case 'RR':
					upper = match === 'RR';
					switch ( Make.Int( d ) ) {
						case 1:
						case 21:
						case 31:
							return upper ? "ST" : "st";
						case 2:
						case 22:
							return upper ? "ND" : "nd";
						case 3:
						case 23:
							return upper ? "RD" : "rd";
						default:
							return upper ? "TH" : "th";
					}
					break;
				case 'ZZZ':
					if ( Date.timeZoneAbbreviation ) {
						return Date.timeZoneAbbreviation( local );
					} else {
						return "";
					}
				default:
					return match[0] === '\\' ? match[1] : match;
			}
		} );
	};

	Date.isLeapYear = function ( year ) {
		return ( ( ( year % 4 === 0 ) && ( year % 100 !== 0 ) ) || ( year % 400 === 0 ) );
	};

	Date.getDaysInMonth = function ( year, month ) {
		return [31, ( Date.isLeapYear( year ) ? 29 : 28 ), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
	};

	Date.prototype.isLeapYear = function () {
		return Date.isLeapYear( this.getFullYear() );
	};

	Date.prototype.getDaysInMonth = function () {
		return Date.getDaysInMonth( this.getFullYear(), this.getMonth() );
	};

	// Add years to the current date object and return it.
	Date.prototype.addYears = function ( yyyy ) {
		if ( !yyyy || isNaN( yyyy = +( yyyy ) ) ) {
			return this;
		}
		this.setFullYear( this.getFullYear() + yyyy );
		return this;
	};

	// Add months to the current date object and return it.
	Date.prototype.addMonths = function ( M ) {
		var d = this.getDate();
		if ( !M || isNaN( M = +( M ) ) ) {
			return this;
		}
		this.setMonth( this.getMonth() + M );
		// Ensure the days won't push us to the next month.
		d = Math.max( 0, Math.min( this.getDaysInMonth(), d ) );
		// Set the days.
		this.setDate( d );
		return this;
	};

	// Add days to the current date object and return it.
	Date.prototype.addDays = function ( d ) {
		if ( !d || isNaN( d = +( d ) ) ) {
			return this;
		}
		this.setDate( this.getDate() + d );
		return this;
	};

	// Set the years, ensuring the day doesn't exceed the end of the month.
	Date.prototype.setYears = function ( yyyy ) {
		var d = this.getDate();
		if ( !yyyy || isNaN( yyyy = +( yyyy ) ) ) {
			return;
		}
		// Reset the date to the beginning of the month so we stay in the same month.
		this.setDate( 1 );
		this.setFullYear( yyyy );
		// Ensure the days won't push us to the next month.
		d = Math.max( 0, Math.min( this.getDaysInMonth(), d ) );
		// Set the days.
		this.setDate( d );
		return this;
	};

	// Set the years, ensuring the day doesn't exceed the end of the month.
	Date.prototype.setMonths = function ( M ) {
		var d = this.getDate();
		if ( !M || isNaN( M = +( M ) ) ) {
			return;
		}
		// Reset the date to the beginning of the month so we stay in the same month.
		this.setDate( 1 );
		// Set the month.
		M = Math.max( 1, Math.min( 12, M ) );
		this.setMonth( M - 1 );
		// Ensure the days won't push us to the next month.
		d = Math.max( 0, Math.min( this.getDaysInMonth(), d ) );
		// Set the days.
		this.setDate( d );
		return this;
	};

	// Set the days as a 1-31, ensuring the day doesn't exceed the end of the month.
	Date.prototype.setDays = function ( d ) {
		if ( !d || isNaN( d = +( d ) ) ) {
			return;
		}
		// Ensure the days won't push us to the next month.
		d = Math.max( 0, Math.min( this.getDaysInMonth(), d ) );
		// Set the days.
		this.setDate( d );
		return this;
	};

	// Set an exact date and time.
	Date.prototype.set = function ( yyyy, M, d, H, m, s ) {
		this.setYears( yyyy );
		this.setMonths( M );
		this.setDays( d );
		H = Math.max( 0, Math.min( 23, +( H ) || 0 ) );
		m = Math.max( 0, Math.min( 59, +( m ) || 0 ) );
		s = Math.max( 0, Math.min( 59, +( s ) || 0 ) );
		this.setHours( H, m, s, 0 );
		return this;
	};

	// Set the input value of a html5 date element.
    Date.setInputValue = function ( input, date ) {
    	// Make sure we have a date time input object.
    	date = Make.DateTime( date );

    	if ( !input ) {
    		// No input.
    		return;
    	} else if ( !date ) {
    		// No date, blank it out.
    		input.value = '';
    		return;
    	}

    	// Set the value based on the input type.
    	switch ( input.getAttribute( 'type' ) ) {
    		case 'date':
    			if ( Modernizr.inputtypes['date'] ) {
    				input.value = date.formatted( 'yyyy-MM-dd' );
    			} else {
    				input.value = date.formatted( 'M/d/yyyy' );
    			}
    			break;
    		case 'time':
    			if ( Modernizr.inputtypes['time'] ) {
    				input.value = date.formatted( 'HH:mm' );
    			} else {
    				input.value = date.formatted( 'h:mm tt' );
    			}
    			break;
    		case 'datetime':
    			if ( Modernizr.inputtypes['datetime'] ) {
    				input.value = date.toJSON();
    			} else {
    				input.value = date.formatted( 'M/d/yyyy h:mm tt' );
    			}
    			break;
    		case 'datetime-local':
    			if ( Modernizr.inputtypes['datetime-local'] ) {
    				input.value = date.formatted( 'yyyy-MM-dd\\THH:mm' );
    			} else {
    				input.value = date.formatted( 'M/d/yyyy h:mm tt' );
    			}
    			break;
    		default:
    			if ( typeof input.value !== 'undefined' ) {
    				input.value = date.formatted( 'M/d/yyyy' );
    			}
    			break;
    	}
    };

    // CMS7 register script.
    if ( window.register ) {
        window.register( "m/date" );
    }

} ) );