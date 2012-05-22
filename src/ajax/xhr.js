(function( jQuery ) {

<<<<<<< HEAD
var // Next active xhr id
	xhrId = jQuery.now(),

	// active xhrs
	xhrs = {},

	// #5280: see below
	xhrUnloadAbortInstalled,

	// XHR used to determine supports properties
	testXHR;

// Create the request object; Microsoft failed to properly
// (This is still attached to ajaxSettings for backward compatibility reasons)
=======
var // #5280: Internet Explorer will keep connections alive if we don't abort on unload
	xhrOnUnloadAbort = window.ActiveXObject ? function() {
		// Abort all pending requests
		for ( var key in xhrCallbacks ) {
			xhrCallbacks[ key ]( 0, 1 );
		}
	} : false,
	xhrId = 0,
	xhrCallbacks;

// Functions to create xhrs
function createStandardXHR() {
	try {
		return new window.XMLHttpRequest();
	} catch( e ) {}
}

function createActiveXHR() {
	try {
		return new window.ActiveXObject( "Microsoft.XMLHTTP" );
	} catch( e ) {}
}

// Create the request object
// (This is still attached to ajaxSettings for backward compatibility)
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
jQuery.ajaxSettings.xhr = window.ActiveXObject ?
	/* Microsoft failed to properly
	 * implement the XMLHttpRequest in IE7 (can't request local files),
	 * so we use the ActiveXObject when it is available
	 * Additionally XMLHttpRequest can be disabled in IE7/IE8 so
	 * we need a fallback.
	 */
	function() {
<<<<<<< HEAD
		if ( window.location.protocol !== "file:" ) {
			try {
				return new window.XMLHttpRequest();
			} catch( xhrError ) {}
		}

		try {
			return new window.ActiveXObject("Microsoft.XMLHTTP");
		} catch( activeError ) {}
	} :
	// For all other browsers, use the standard XMLHttpRequest object
	function() {
		return new window.XMLHttpRequest();
	};

// Test if we can create an xhr object
try {
	testXHR = jQuery.ajaxSettings.xhr();
} catch( xhrCreationException ) {}

//Does this browser support XHR requests?
jQuery.support.ajax = !!testXHR;

// Does this browser support crossDomain XHR requests
jQuery.support.cors = testXHR && "withCredentials" in testXHR;

// No need for the temporary xhr anymore
testXHR = undefined;

// Create transport if the browser can provide an xhr
if ( jQuery.support.ajax ) {
	jQuery.ajaxTransport( function( s ) {

		// Cross domain only allowed if supported through XMLHttpRequest
		if ( ! s.crossDomain || jQuery.support.cors ) {
=======
		return !this.isLocal && createStandardXHR() || createActiveXHR();
	} :
	// For all other browsers, use the standard XMLHttpRequest object
	createStandardXHR;

// Determine support properties
(function( xhr ) {
	jQuery.extend( jQuery.support, {
		ajax: !!xhr,
		cors: !!xhr && ( "withCredentials" in xhr )
	});
})( jQuery.ajaxSettings.xhr() );

// Create transport if the browser can provide an xhr
if ( jQuery.support.ajax ) {

	jQuery.ajaxTransport(function( s ) {
		// Cross domain only allowed if supported through XMLHttpRequest
		if ( !s.crossDomain || jQuery.support.cors ) {
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c

			var callback;

			return {
<<<<<<< HEAD

				send: function(headers, complete) {

					// #5280: we need to abort on unload or IE will keep connections alive
					if ( ! xhrUnloadAbortInstalled ) {

						xhrUnloadAbortInstalled = 1;

						jQuery(window).bind( "unload" , function() {

							// Abort all pending requests
							jQuery.each(xhrs, function(_, xhr) {
								if ( xhr.onreadystatechange ) {
									xhr.onreadystatechange( 1 );
								}
							});

						});
					}

					// Get a new xhr
					var xhr = s.xhr(),
						handle;
=======
				send: function( headers, complete ) {

					// Get a new xhr
					var xhr = s.xhr(),
						handle,
						i;
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c

					// Open the socket
					// Passing null username, generates a login popup on Opera (#2865)
					if ( s.username ) {
<<<<<<< HEAD
						xhr.open(s.type, s.url, s.async, s.username, s.password);
					} else {
						xhr.open(s.type, s.url, s.async);
					}

					// Requested-With header
					// Not set for crossDomain requests with no content
					// (see why at http://trac.dojotoolkit.org/ticket/9486)
					// Won't change header if already provided
					if ( ! ( s.crossDomain && ! s.hasContent ) && ! headers["x-requested-with"] ) {
						headers["x-requested-with"] = "XMLHttpRequest";
					}

					// Need an extra try/catch for cross domain requests in Firefox 3
					try {

						jQuery.each(headers, function(key,value) {
							xhr.setRequestHeader(key,value);
						});

					} catch(_) {}

					// Do send the request
					try {
						xhr.send( ( s.hasContent && s.data ) || null );
					} catch(e) {
						complete(0, "error", "" + e);
						return;
					}

					// Listener
					callback = function( _ , isAbort ) {

						// Was never called and is aborted or complete
						if ( callback && ( isAbort || xhr.readyState === 4 ) ) {

							// Only called once
							callback = 0;

							// Do not keep as active anymore
							if (handle) {
								xhr.onreadystatechange = jQuery.noop;
								delete xhrs[ handle ];
							}

							// If it's an abort
							if ( isAbort ) {

								// Abort it manually if needed
								if ( xhr.readyState !== 4 ) {
									xhr.abort();
								}
							} else {

								// Get info
								var status = xhr.status,
									statusText,
									response,
									responseHeaders = xhr.getAllResponseHeaders();

								try { // Firefox throws an exception when accessing statusText for faulty cross-domain requests

									statusText = xhr.statusText;

								} catch( e ) {

									statusText = ""; // We normalize with Webkit giving an empty statusText

								}

								// Filter status for non standard behaviours
								// (so many they seem to be the actual "standard")
								status =
									// Opera returns 0 when it should be 304
									// Webkit returns 0 for failing cross-domain no matter the real status
									status === 0 ?
										(
											! s.crossDomain || statusText ? // Webkit, Firefox: filter out faulty cross-domain requests
											(
												responseHeaders ? // Opera: filter out real aborts #6060
												304
												:
												0
											)
											:
											302 // We assume 302 but could be anything cross-domain related
										)
										:
										(
											status == 1223 ?	// IE sometimes returns 1223 when it should be 204 (see #1450)
												204
												:
												status
										);

								// Guess response & update dataType accordingly
								response =
									s.determineDataType(
										xhr.getResponseHeader("content-type"),
										xhr.responseText,
										xhr.responseXML );

								// Call complete
								complete(status,statusText,response,responseHeaders);
							}
						}
					};

					// if we're in sync mode
					// or it's in cache and has been retrieved directly (IE6 & IE7)
					// we need to manually fire the callback
					if ( ! s.async || xhr.readyState === 4 ) {

						callback();

					} else {

						// Add to list of active xhrs
						handle = xhrId++;
						xhrs[ handle ] = xhr;
						xhr.onreadystatechange = callback;
					}
				},

=======
						xhr.open( s.type, s.url, s.async, s.username, s.password );
					} else {
						xhr.open( s.type, s.url, s.async );
					}

					// Apply custom fields if provided
					if ( s.xhrFields ) {
						for ( i in s.xhrFields ) {
							xhr[ i ] = s.xhrFields[ i ];
						}
					}

					// Override mime type if needed
					if ( s.mimeType && xhr.overrideMimeType ) {
						xhr.overrideMimeType( s.mimeType );
					}

					// X-Requested-With header
					// For cross-domain requests, seeing as conditions for a preflight are
					// akin to a jigsaw puzzle, we simply never set it to be sure.
					// (it can always be set on a per-request basis or even using ajaxSetup)
					// For same-domain requests, won't change header if already provided.
					if ( !s.crossDomain && !headers["X-Requested-With"] ) {
						headers[ "X-Requested-With" ] = "XMLHttpRequest";
					}

					// Need an extra try/catch for cross domain requests in Firefox 3
					try {
						for ( i in headers ) {
							xhr.setRequestHeader( i, headers[ i ] );
						}
					} catch( _ ) {}

					// Do send the request
					// This may raise an exception which is actually
					// handled in jQuery.ajax (so no try/catch here)
					xhr.send( ( s.hasContent && s.data ) || null );

					// Listener
					callback = function( _, isAbort ) {

						var status,
							statusText,
							responseHeaders,
							responses,
							xml;

						// Firefox throws exceptions when accessing properties
						// of an xhr when a network error occured
						// http://helpful.knobs-dials.com/index.php/Component_returned_failure_code:_0x80040111_(NS_ERROR_NOT_AVAILABLE)
						try {

							// Was never called and is aborted or complete
							if ( callback && ( isAbort || xhr.readyState === 4 ) ) {

								// Only called once
								callback = undefined;

								// Do not keep as active anymore
								if ( handle ) {
									xhr.onreadystatechange = jQuery.noop;
									if ( xhrOnUnloadAbort ) {
										delete xhrCallbacks[ handle ];
									}
								}

								// If it's an abort
								if ( isAbort ) {
									// Abort it manually if needed
									if ( xhr.readyState !== 4 ) {
										xhr.abort();
									}
								} else {
									status = xhr.status;
									responseHeaders = xhr.getAllResponseHeaders();
									responses = {};
									xml = xhr.responseXML;

									// Construct response list
									if ( xml && xml.documentElement /* #4958 */ ) {
										responses.xml = xml;
									}

									// When requesting binary data, IE6-9 will throw an exception
									// on any attempt to access responseText (#11426)
									try {
										responses.text = xhr.responseText;
									} catch( _ ) {
									}

									// Firefox throws an exception when accessing
									// statusText for faulty cross-domain requests
									try {
										statusText = xhr.statusText;
									} catch( e ) {
										// We normalize with Webkit giving an empty statusText
										statusText = "";
									}

									// Filter status for non standard behaviors

									// If the request is local and we have data: assume a success
									// (success with no data won't get notified, that's the best we
									// can do given current implementations)
									if ( !status && s.isLocal && !s.crossDomain ) {
										status = responses.text ? 200 : 404;
									// IE - #1450: sometimes returns 1223 when it should be 204
									} else if ( status === 1223 ) {
										status = 204;
									}
								}
							}
						} catch( firefoxAccessException ) {
							if ( !isAbort ) {
								complete( -1, firefoxAccessException );
							}
						}

						// Call complete if needed
						if ( responses ) {
							complete( status, statusText, responses, responseHeaders );
						}
					};

					if ( !s.async ) {
						// if we're in sync mode we fire the callback
						callback();
					} else if ( xhr.readyState === 4 ) {
						// (IE6 & IE7) if it's in cache and has been
						// retrieved directly we need to fire the callback
						setTimeout( callback, 0 );
					} else {
						handle = ++xhrId;
						if ( xhrOnUnloadAbort ) {
							// Create the active xhrs callbacks list if needed
							// and attach the unload handler
							if ( !xhrCallbacks ) {
								xhrCallbacks = {};
								jQuery( window ).unload( xhrOnUnloadAbort );
							}
							// Add to list of active xhrs callbacks
							xhrCallbacks[ handle ] = callback;
						}
						xhr.onreadystatechange = callback;
					}
				},

>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
				abort: function() {
					if ( callback ) {
						callback(0,1);
					}
				}
			};
		}
	});
}

})( jQuery );
