if ( window.registerLoading ) {
	registerLoading( "m/masked" );
}

( function ( factory ) {
	if ( typeof rrequire === "function" ) {

		// CMS7 rrequire function.
		rrequire( ["jquery", "static"], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
}( function ( $ ) {

	$.widget( 'cms.masked', {
		options: {
			masks: {
				time: {
					mask: "h:s t\\m",
					placeholder: "hh:mm am",
					alias: "datetime",
					hourFormat: "12"
				},
				percent: {
					alias: "numeric",
					digits: 2,
					digitsOptional: !0,
					radixPoint: ".",
					placeholder: "0",
					autoGroup: !1,
					min: 0,
					max: 100,
					suffix: "%",
					allowMinus: !1
				},
				money: "currency"
			}
		},
		_create: function () {
			var mask = this,
				attr;
			if ( this.element.attr( 'data-masking' ) ) {
				rrequire( 'm/masking', function () {
					mask.element.masking();
				} );
			} else if ( attr = this.element.attr( 'data-mask' ) ) {
				if ( !mask.options.masks[attr] ) return;
				rrequire( 'm/inputmask', function () {
					mask.element.inputmask( mask.options.masks[attr] );
				} );
			}
		}

	} );


	// CMS7 register script.
	if ( window.register ) {
		window.register( "m/masked" );
	}

} ) );