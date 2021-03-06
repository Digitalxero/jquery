(function( jQuery ) {

var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rhash = /#.*$/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg, // IE leaves an \r character at EOL
	rinput = /^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,
	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app\-storage|.+\-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,
	rquery = /\?/,
	rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
	rselectTextarea = /^(?:select|textarea)/i,
	rspacesAjax = /\s+/,
	rts = /([?&])_=[^&]*/,
	rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/,

	// Keep a copy of the old load method
	_load = jQuery.fn.load,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Document location
	ajaxLocation,

	// Document location segments
	ajaxLocParts,

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = ["*/"] + ["*"];

// #8138, IE may throw an exception when accessing
// a field from window.location if document.domain has been set
try {
	ajaxLocation = location.href;
} catch( e ) {
	// Use the href attribute of an A element
	// since IE will modify it given document.location
	ajaxLocation = document.createElement( "a" );
	ajaxLocation.href = "";
	ajaxLocation = ajaxLocation.href;
}

// Segment location into parts
ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		if ( jQuery.isFunction( func ) ) {
			var dataTypes = dataTypeExpression.toLowerCase().split( rspacesAjax ),
				i = 0,
				length = dataTypes.length,
				dataType,
				list,
				placeBefore;

			// For each dataType in the dataTypeExpression
			for ( ; i < length; i++ ) {
				dataType = dataTypes[ i ];
				// We control if we're asked to add before
				// any existing element
				placeBefore = /^\+/.test( dataType );
				if ( placeBefore ) {
					dataType = dataType.substr( 1 ) || "*";
				}
				list = structure[ dataType ] = structure[ dataType ] || [];
				// then we add to the structure accordingly
				list[ placeBefore ? "unshift" : "push" ]( func );
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR,
		dataType /* internal */, inspected /* internal */ ) {

	dataType = dataType || options.dataTypes[ 0 ];
	inspected = inspected || {};

	inspected[ dataType ] = true;

	var list = structure[ dataType ],
		i = 0,
		length = list ? list.length : 0,
		executeOnly = ( structure === prefilters ),
		selection;

	for ( ; i < length && ( executeOnly || !selection ); i++ ) {
		selection = list[ i ]( options, originalOptions, jqXHR );
		// If we got redirected to another dataType
		// we try there if executing only and not done already
		if ( typeof selection === "string" ) {
			if ( !executeOnly || inspected[ selection ] ) {
				selection = undefined;
			} else {
				options.dataTypes.unshift( selection );
				selection = inspectPrefiltersOrTransports(
						structure, options, originalOptions, jqXHR, selection, inspected );
			}
		}
	}
	// If we're only executing or nothing was selected
	// we try the catchall dataType if not done already
	if ( ( executeOnly || !selection ) && !inspected[ "*" ] ) {
		selection = inspectPrefiltersOrTransports(
				structure, options, originalOptions, jqXHR, "*", inspected );
	}
	// unnecessary when only executing (prefilters)
	// but it'll be ignored by the caller in that case
	return selection;
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};
	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}
}

jQuery.fn.extend({
	load: function( url, params, callback ) {
		if ( typeof url !== "string" && _load ) {
			return _load.apply( this, arguments );
		}

		// Don't do a request if no elements are being requested
		if ( !this.length ) {
			return this;
		}

		var selector, type, response,
			self = this,
			off = url.indexOf(" ");

		if ( off >= 0 ) {
			selector = url.slice( off, url.length );
			url = url.slice( 0, off );
		}

		// If it's a function
		if ( jQuery.isFunction( params ) ) {

			// We assume that it's the callback
			callback = params;
			params = undefined;

		// Otherwise, build a param string
		} else if ( typeof params === "object" ) {
			type = "POST";
		}

		// Request the remote document
		jQuery.ajax({
			url: url,

			// if "type" variable is undefined, then "GET" method will be used
			type: type,
			dataType: "html",
			data: params,
			complete: function( jqXHR, status ) {
				if ( callback ) {
					self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
				}
			}
		}).done(function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			// See if a selector was specified
			self.html( selector ?

				// Create a dummy div to hold the results
				jQuery("<div>")

					// inject the contents of the document in, removing the scripts
					// to avoid any 'Permission Denied' errors in IE
					.append( responseText.replace( rscript, "" ) )

					// Locate the specified elements
					.find( selector ) :

				// If not, just inject the full result
				responseText );

		});

		return this;
	},

	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},

	serializeArray: function() {
		return this.map(function(){
			return this.elements ? jQuery.makeArray( this.elements ) : this;
		})
		.filter(function(){
			return this.name && !this.disabled &&
				( this.checked || rselectTextarea.test( this.nodeName ) ||
					rinput.test( this.type ) );
		})
		.map(function( i, elem ){
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val, i ){
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});

// Attach a bunch of functions for handling common AJAX events
jQuery.each( "ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split( " " ), function( i, o ){
	jQuery.fn[ o ] = function( f ){
		return this.on( o, f );
	};
});

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {
		// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return jQuery.ajax({
			type: method,
			url: url,
			data: data,
			success: callback,
			dataType: type
		});
	};
});

jQuery.extend({

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

<<<<<<< HEAD
	ajaxSetup: function( settings ) {
		jQuery.extend( true, jQuery.ajaxSettings, settings );
		if ( settings.context ) {
			jQuery.ajaxSettings.context = settings.context;
		}
=======
	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		if ( settings ) {
			// Building a settings object
			ajaxExtend( target, jQuery.ajaxSettings );
		} else {
			// Extending ajaxSettings
			settings = target;
			target = jQuery.ajaxSettings;
		}
		ajaxExtend( target, settings );
		return target;
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
	},

	ajaxSettings: {
		url: ajaxLocation,
		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
		global: true,
		type: "GET",
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		processData: true,
		async: true,
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		traditional: false,
		headers: {},
<<<<<<< HEAD
		crossDomain: null,
=======
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
		*/

		accepts: {
			xml: "application/xml, text/xml",
			html: "text/html",
			text: "text/plain",
			json: "application/json, text/javascript",
			"*": allTypes
		},

		contents: {
			xml: /xml/,
			html: /html/,
			json: /json/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText"
		},

		// List of data converters
		// 1) key format is "source_type destination_type" (a single space in-between)
		// 2) the catchall symbol "*" can be used for source_type
		converters: {

			// Convert anything to text
			"* text": window.String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": jQuery.parseJSON,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

<<<<<<< HEAD
		// Utility function that handles dataType when response is received
		// (for those transports that can give text or xml responses)
		determineDataType: function( ct , text , xml ) {

			var s = this,
				contents = s.contents,
				type,
				regexp,
				dataTypes = s.dataTypes,
				transportDataType = dataTypes[0],
				response;

			// Auto (xml, json, script or text determined given headers)
			if ( transportDataType === "*" ) {

				for ( type in contents ) {
					if ( ( regexp = contents[ type ] ) && regexp.test( ct ) ) {
						transportDataType = dataTypes[0] = type;
						break;
					}
				}
			}

			// xml and parsed as such
			if ( transportDataType === "xml" &&
				xml &&
				xml.documentElement /* #4958 */ ) {

				response = xml;

			// Text response was provided
			} else {

				response = text;

				// If it's not really text, defer to converters
				if ( transportDataType !== "text" ) {
					dataTypes.unshift( "text" );
				}

			}

			return response;
=======
		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			context: true,
			url: true
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
		}

	},

	ajaxPrefilter: function( a , b ) {
		ajaxPrefilterOrTransport( "prefilters" , a , b );
	},

	ajaxTransport: function( a , b ) {
		return ajaxPrefilterOrTransport( "transports" , a , b );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
<<<<<<< HEAD
	ajax: function( url , options ) {
=======
	ajax: function( url, options ) {
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

<<<<<<< HEAD
		// Get the url if provided separately
		options.url = url || options.url;

		var // Create the final options object
			s = jQuery.extend( true , {} , jQuery.ajaxSettings , options ),
			// jQuery lists
			jQuery_lastModified = jQuery.lastModified,
			jQuery_etag = jQuery.etag,
			// Callbacks contexts
			// We force the original context if it exists
			// or take it from jQuery.ajaxSettings otherwise
			// (plain objects used as context get extended)
			callbackContext =
				( s.context = ( "context" in options ? options : jQuery.ajaxSettings ).context ) || s,
			globalEventContext = callbackContext === s ? jQuery.event : jQuery( callbackContext ),
=======
		var // Create the final options object
			s = jQuery.ajaxSetup( {}, options ),
			// Callbacks context
			callbackContext = s.context || s,
			// Context for global events
			// It's the callbackContext if one was provided in the options
			// and if it's a DOM node or a jQuery collection
			globalEventContext = callbackContext !== s &&
				( callbackContext.nodeType || callbackContext instanceof jQuery ) ?
						jQuery( callbackContext ) : jQuery.event,
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),
			// Status-dependent callbacks
			statusCode = s.statusCode || {},
			// ifModified key
			ifModifiedKey,
			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},
			// Response headers
			responseHeadersString,
			responseHeaders,
			// transport
			transport,
			// timeout handle
			timeoutTimer,
			// Cross-domain detection vars
<<<<<<< HEAD
			loc = document.location,
			protocol = loc.protocol || "http:",
=======
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
			parts,
			// The jqXHR state
			state = 0,
			// To know if global events are to be dispatched
			fireGlobals,
			// Loop variable
			i,
			// Default abort message
			strAbort = "canceled",
			// Fake xhr
			jqXHR = {

				readyState: 0,

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( !state ) {
						var lname = name.toLowerCase();
						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return state === 2 ? responseHeadersString : null;
				},

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
<<<<<<< HEAD

					var match;

					if ( state === 2 ) {

						if ( !responseHeaders ) {

							responseHeaders = {};

=======
					var match;
					if ( state === 2 ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
							while( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
<<<<<<< HEAD

					}

					return match || null;
=======
					}
					return match === undefined ? null : match;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( !state ) {
						s.mimeType = type;
					}
					return this;
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
				},

				// Cancel the request
				abort: function( statusText ) {
<<<<<<< HEAD
					if ( transport ) {
						transport.abort( statusText || "abort" );
					}
					done( 0 , statusText );
=======
					statusText = statusText || strAbort;
					if ( transport ) {
						transport.abort( statusText );
					}
					done( 0, statusText );
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
					return this;
				}
			};

		// Callback for when everything is done
		// It is defined here because jslint complains if it is declared
		// at the end of the function (which would be more logical and readable)
		function done( status, nativeStatusText, responses, headers ) {

			// Called once
			if ( state === 2 ) {
				return;
			}

			// State is "done" now
			state = 2;

<<<<<<< HEAD
			// Dereference transport for early garbage collection
			// (no matter how long the jXHR transport will be used
			transport = undefined;

			// Set readyState
			jXHR.readyState = status ? 4 : 0;

			// Cache response headers
			responseHeadersString = headers || "";

=======
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
			// Clear timeout if it exists
			if ( timeoutTimer ) {
				clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			var isSuccess,
				success,
<<<<<<< HEAD
				// Stored error
				error,

				// Keep track of statusCode callbacks
				oldStatusCode = statusCode;

			statusCode = undefined;
=======
				error,
				statusText = nativeStatusText,
				response = responses ? ajaxHandleResponses( s, jqXHR, responses ) : undefined,
				lastModified,
				etag;
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c

			// If successful, handle type chaining
			if ( status >= 200 && status < 300 || status === 304 ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {

					if ( ( lastModified = jqXHR.getResponseHeader( "Last-Modified" ) ) ) {
						jQuery.lastModified[ ifModifiedKey ] = lastModified;
					}
					if ( ( etag = jqXHR.getResponseHeader( "Etag" ) ) ) {
						jQuery.etag[ ifModifiedKey ] = etag;
					}
				}

				// If not modified
				if ( status === 304 ) {

					statusText = "notmodified";
					isSuccess = true;

				// If we have data
				} else {

					try {
<<<<<<< HEAD

						var i,
							// Current dataType
							current,
							// Previous dataType
							prev,
							// Conversion expression
							conversion,
							// Conversion function
							conv,
							// Conversion functions (when text is used in-between)
							conv1,
							conv2,
							// Local references to dataTypes & converters
							dataTypes = s.dataTypes,
							converters = s.converters,
							// DataType to responseXXX field mapping
							responses = {
								"xml": "XML",
								"text": "Text"
							};

						// For each dataType in the chain
						for( i = 0 ; i < dataTypes.length ; i++ ) {

							current = dataTypes[ i ];

							// If a responseXXX field for this dataType exists
							// and if it hasn't been set yet
							if ( responses[ current ] ) {
								// Set it
								jXHR[ "response" + responses[ current ] ] = response;
								// Mark it as set
								responses[ current ] = 0;
							}

							// If this is not the first element
							if ( i ) {

								// Get the dataType to convert from
								prev = dataTypes[ i - 1 ];

								// If no catch-all and dataTypes are actually different
								if ( prev !== "*" && current !== "*" && prev !== current ) {

									// Get the converter
									conversion = prev + " " + current;
									conv = converters[ conversion ] || converters[ "* " + current ];

									conv1 = conv2 = 0;

									// If there is no direct converter and none of the dataTypes is text
									if ( ! conv && prev !== "text" && current !== "text" ) {
										// Try with text in-between
										conv1 = converters[ prev + " text" ] || converters[ "* text" ];
										conv2 = converters[ "text " + current ];
										// Revert back to a single converter
										// if one of the converter is an equivalence
										if ( conv1 === true ) {
											conv = conv2;
										} else if ( conv2 === true ) {
											conv = conv1;
										}
									}
									// If we found no converter, dispatch an error
									if ( ! ( conv || conv1 && conv2 ) ) {
										throw conversion;
									}
									// If found converter is not an equivalence
									if ( conv !== true ) {
										// Convert with 1 or 2 converters accordingly
										response = conv ? conv( response ) : conv2( conv1( response ) );
									}
								}
							// If it is the first element of the chain
							// and we have a dataFilter
							} else if ( s.dataFilter ) {
								// Apply the dataFilter
								response = s.dataFilter( response , current );
								// Get dataTypes again in case the filter changed them
								dataTypes = s.dataTypes;
							}
						}
						// End of loop

						// We have a real success
						success = response;
						isSuccess = 1;

					// If an exception was thrown
=======
						success = ajaxConvert( s, response );
						statusText = "success";
						isSuccess = true;
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
					} catch(e) {
						// We have a parsererror
						statusText = "parsererror";
						error = e;
					}
				}
			} else {
				// We extract error from statusText
				// then normalize statusText and status for non-aborts
				error = statusText;
				if ( !statusText || status ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = "" + ( nativeStatusText || statusText );

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
<<<<<<< HEAD
			jXHR.statusCode( oldStatusCode );
=======
			jqXHR.statusCode( statusCode );
			statusCode = undefined;
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajax" + ( isSuccess ? "Success" : "Error" ),
						[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		// Attach deferreds
		deferred.promise( jqXHR );
		jqXHR.success = jqXHR.done;
		jqXHR.error = jqXHR.fail;
		jqXHR.complete = completeDeferred.add;

		// Status-dependent callbacks
		jqXHR.statusCode = function( map ) {
			if ( map ) {
				var tmp;
<<<<<<< HEAD
				if ( statusCode ) {
					for( tmp in map ) {
						statusCode[ tmp ] = [ statusCode[ tmp ] , map[ tmp ] ];
					}
				} else {
					tmp = map[ jXHR.status ];
					jXHR.done( tmp ).fail( tmp );
=======
				if ( state < 2 ) {
					for ( tmp in map ) {
						statusCode[ tmp ] = [ statusCode[tmp], map[tmp] ];
					}
				} else {
					tmp = map[ jqXHR.status ];
					jqXHR.always( tmp );
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
				}
			}
			return this;
		};

		// Remove hash character (#7531: and string promotion)
<<<<<<< HEAD
		s.url = ( "" + s.url ).replace( rhash , "" );
=======
		// Add protocol if not provided (#5866: IE7 issue with protocol-less urls)
		// We also use the url parameter if available
		s.url = ( ( url || s.url ) + "" ).replace( rhash, "" ).replace( rprotocol, ajaxLocParts[ 1 ] + "//" );
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().split( rspacesAjax );

		// Determine if a cross-domain request is in order
		if ( s.crossDomain == null ) {
			parts = rurl.exec( s.url.toLowerCase() );
<<<<<<< HEAD
			s.crossDomain = !!(
					parts &&
					( parts[ 1 ] && parts[ 1 ] != protocol ||
						parts[ 2 ] != loc.hostname ||
						( parts[ 3 ] || ( ( parts[ 1 ] || protocol ) === "http:" ? 80 : 443 ) ) !=
							( loc.port || ( protocol === "http:" ? 80 : 443 ) ) )
=======
			s.crossDomain = !!( parts &&
				( parts[ 1 ] != ajaxLocParts[ 1 ] || parts[ 2 ] != ajaxLocParts[ 2 ] ||
					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? 80 : 443 ) ) !=
						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? 80 : 443 ) ) )
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
			);
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
<<<<<<< HEAD
			s.data = jQuery.param( s.data , s.traditional );
		}

		// Apply prefilters
		jQuery.ajaxPrefilter( s , options );

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = ! rnoContent.test( s.type );
=======
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c

		// If request was aborted inside a prefilter, stop there
		if ( state === 2 ) {
			return jqXHR;
		}

<<<<<<< HEAD
		// More options handling for requests with no content
		if ( ! s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.data;
			}

			// Add anti-cache in url if needed
			if ( s.cache === false ) {

				var ts = jQuery.now(),
					// try replacing _= if it is there
					ret = s.url.replace( rts , "$1_=" + ts );

				// if nothing was replaced, add timestamp to the end
				s.url = ret + ( (ret == s.url ) ? ( rquery.test( s.url ) ? "&" : "?" ) + "_=" + ts : "");
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			requestHeaders[ "content-type" ] = s.contentType;
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery_lastModified[ s.url ] ) {
				requestHeaders[ "if-modified-since" ] = jQuery_lastModified[ s.url ];
			}
			if ( jQuery_etag[ s.url ] ) {
				requestHeaders[ "if-none-match" ] = jQuery_etag[ s.url ];
			}
		}

		// Set the Accepts header for the server, depending on the dataType
		requestHeaders.accept = s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
			s.accepts[ s.dataTypes[ 0 ] ] + ( s.dataTypes[ 0 ] !== "*" ? ", */*; q=0.01" : "" ) :
			s.accepts[ "*" ];

		// Check for headers option
		for ( i in s.headers ) {
			requestHeaders[ i.toLowerCase() ] = s.headers[ i ];
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext , jXHR , s ) === false || state === 2 ) ) {

				// Abort if not done already
				done( 0 , "abort" );

				// Return false
				jXHR = false;

		} else {

			// Install callbacks on deferreds
			for ( i in { success:1, error:1, complete:1 } ) {
				jXHR[ i ]( s[ i ] );
=======
		// We can fire global events as of now if asked to
		fireGlobals = s.global;

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.data;
				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Get ifModifiedKey before adding the anti-cache parameter
			ifModifiedKey = s.url;

			// Add anti-cache in url if needed
			if ( s.cache === false ) {

				var ts = jQuery.now(),
					// try replacing _= if it is there
					ret = s.url.replace( rts, "$1_=" + ts );

				// if nothing was replaced, add timestamp to the end
				s.url = ret + ( ( ret === s.url ) ? ( rquery.test( s.url ) ? "&" : "?" ) + "_=" + ts : "" );
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
			}
		}

<<<<<<< HEAD
			// Get transport
			transport = jQuery.ajaxTransport( s , options );

			// If no transport, we auto-abort
			if ( ! transport ) {

				done( 0 , "notransport" );
=======
		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			ifModifiedKey = ifModifiedKey || s.url;
			if ( jQuery.lastModified[ ifModifiedKey ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ ifModifiedKey ] );
			}
			if ( jQuery.etag[ ifModifiedKey ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ ifModifiedKey ] );
			}
		}
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

<<<<<<< HEAD
				// Set state as sending
				state = jXHR.readyState = 1;
=======
		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
				// Abort if not done already and return
				return jqXHR.abort();

		}
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c

		// aborting is no longer a cancelation
		strAbort = "abort";

		// Install callbacks on deferreds
		for ( i in { success: 1, error: 1, complete: 1 } ) {
			jqXHR[ i ]( s[ i ] );
		}

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;
			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}
			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = setTimeout( function(){
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				state = 1;
				transport.send( requestHeaders, done );
			} catch (e) {
				// Propagate exception as error if not done
				if ( state < 2 ) {
					done( -1, e );
				// Simply rethrow otherwise
				} else {
					throw e;
				}
			}
		}

		return jqXHR;
	},

	// Serialize an array of form elements or a set of
	// key/values into a query string
	param: function( a, traditional ) {
		var s = [],
			add = function( key, value ) {
				// If value is a function, invoke it and return its value
				value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
				s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
			};

		// Set traditional to true for jQuery <= 1.3.2 behavior.
		if ( traditional === undefined ) {
			traditional = jQuery.ajaxSettings.traditional;
		}

		// If an array was passed in, assume that it is an array of form elements.
		if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
			// Serialize the form elements
			jQuery.each( a, function() {
				add( this.name, this.value );
			});

		} else {
			// If traditional, encode the "old" way (the way 1.3.2 or older
			// did it), otherwise encode params recursively.
			for ( var prefix in a ) {
				buildParams( prefix, a[ prefix ], traditional, add );
			}
		}

		// Return the resulting serialization
		return s.join( "&" ).replace( r20, "+" );
	}
});

function buildParams( prefix, obj, traditional, add ) {
	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// If array item is non-scalar (array or object), encode its
				// numeric index to resolve deserialization ambiguity issues.
				// Note that rack (as of 1.0.0) can't currently deserialize
				// nested arrays properly, and attempting to do so may cause
				// a server error. Possible fixes are to modify rack's
				// deserialization algorithm or to provide an option or flag
				// to force array serialization to be shallow.
				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( var name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}

// This is still on the jQuery object... for now
// Want to move this to jQuery.ajax some day
jQuery.extend({

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {}

});

<<<<<<< HEAD
// Base function for both ajaxPrefilter and ajaxTransport
function ajaxPrefilterOrTransport( arg0 , arg1 , arg2 ) {

	var type = jQuery.type( arg1 ),
		structure = jQuery.ajaxSettings[ arg0 ],
		i,
		length;

	// We have an options map so we have to inspect the structure
	if ( type === "object" ) {

		var options = arg1,
			originalOptions = arg2,
			// When dealing with prefilters, we execute only
			// (no selection so we never stop when a function
			// returns a non-falsy, non-string value)
			executeOnly = ( arg0 === "prefilters" ),
			inspect = function( dataType, tested ) {

				if ( ! tested[ dataType ] ) {

					tested[ dataType ] = true;

					var list = structure[ dataType ],
						selected;

					for( i = 0, length = list ? list.length : 0 ; ( executeOnly || ! selected ) && i < length ; i++ ) {
						selected = list[ i ]( options , originalOptions );
						// If we got redirected to a different dataType,
						// we add it and switch to the corresponding list
						if ( typeof( selected ) === "string" && selected !== dataType ) {
							options.dataTypes.unshift( selected );
							selected = inspect( selected , tested );
							// We always break in order not to continue
							// to iterate in previous list
							break;
						}
					}
					// If we're only executing or nothing was selected
					// we try the catchall dataType
					if ( executeOnly || ! selected ) {
						selected = inspect( "*" , tested );
					}
					// This will be ignored by ajaxPrefilter
					// so it's safe to return no matter what
					return selected;
				}

			};

		// Start inspection with current transport dataType
		return inspect( options.dataTypes[ 0 ] , {} );

	} else {

		// We're requested to add to the structure
		// Signature is ( dataTypeExpression , function )
		// with dataTypeExpression being optional and
		// defaulting to catchAll (*)
		type = type === "function";

		if ( type ) {
			arg2 = arg1;
			arg1 = undefined;
		}
		arg1 = arg1 || "*";

		// We control that the second argument is really a function
		if ( type || jQuery.isFunction( arg2 ) ) {

			var dataTypes = arg1.split( /\s+/ ),
				functor = arg2,
				dataType,
				list,
				placeBefore;

			// For each dataType in the dataTypeExpression
			for( i = 0 , length = dataTypes.length ; i < length ; i++ ) {
				dataType = dataTypes[ i ];
				// We control if we're asked to add before
				// any existing element
				placeBefore = /^\+/.test( dataType );
				if ( placeBefore ) {
					dataType = dataType.substr( 1 );
				}
				list = structure[ dataType ] = structure[ dataType ] || [];
				// then we add to the structure accordingly
				list[ placeBefore ? "unshift" : "push" ]( functor );
			}
		}
	}
=======
/* Handles responses to an ajax request:
 * - sets all responseXXX fields accordingly
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var contents = s.contents,
		dataTypes = s.dataTypes,
		responseFields = s.responseFields,
		ct,
		type,
		finalDataType,
		firstDataType;

	// Fill responseXXX fields
	for ( type in responseFields ) {
		if ( type in responses ) {
			jqXHR[ responseFields[type] ] = responses[ type ];
		}
	}

	// Remove auto dataType and get content-type in the process
	while( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "content-type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {
		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}
		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

// Chain conversions given the request and the original response
function ajaxConvert( s, response ) {

	// Apply the dataFilter if provided
	if ( s.dataFilter ) {
		response = s.dataFilter( response, s.dataType );
	}

	var dataTypes = s.dataTypes,
		converters = {},
		i,
		key,
		length = dataTypes.length,
		tmp,
		// Current and previous dataTypes
		current = dataTypes[ 0 ],
		prev,
		// Conversion expression
		conversion,
		// Conversion function
		conv,
		// Conversion functions (transitive conversion)
		conv1,
		conv2;

	// For each dataType in the chain
	for ( i = 1; i < length; i++ ) {

		// Create converters map
		// with lowercased keys
		if ( i === 1 ) {
			for ( key in s.converters ) {
				if ( typeof key === "string" ) {
					converters[ key.toLowerCase() ] = s.converters[ key ];
				}
			}
		}

		// Get the dataTypes
		prev = current;
		current = dataTypes[ i ];

		// If current is auto dataType, update it to prev
		if ( current === "*" ) {
			current = prev;
		// If no auto and dataTypes are actually different
		} else if ( prev !== "*" && prev !== current ) {

			// Get the converter
			conversion = prev + " " + current;
			conv = converters[ conversion ] || converters[ "* " + current ];

			// If there is no direct converter, search transitively
			if ( !conv ) {
				conv2 = undefined;
				for ( conv1 in converters ) {
					tmp = conv1.split( " " );
					if ( tmp[ 0 ] === prev || tmp[ 0 ] === "*" ) {
						conv2 = converters[ tmp[1] + " " + current ];
						if ( conv2 ) {
							conv1 = converters[ conv1 ];
							if ( conv1 === true ) {
								conv = conv2;
							} else if ( conv2 === true ) {
								conv = conv1;
							}
							break;
						}
					}
				}
			}
			// If we found no converter, dispatch an error
			if ( !( conv || conv2 ) ) {
				jQuery.error( "No conversion from " + conversion.replace(" "," to ") );
			}
			// If found converter is not an equivalence
			if ( conv !== true ) {
				// Convert with 1 or 2 converters accordingly
				response = conv ? conv( response ) : conv2( conv1(response) );
			}
		}
	}
	return response;
>>>>>>> e0151e5827d7091f311c82d9f951aaaa2688ba8c
}

})( jQuery );
