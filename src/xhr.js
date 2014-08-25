/**
 * provide XHR functionality
 *
 * @version 5.0.1 2014-08-25
 * @author Gregor Kofler
 * 
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code
*/

"use strict";

/**
 * get host XHR object 
 */
vxJS.xhrObj = function() {
	var	ok;

	// any reasonable browser

	try { ok = new XMLHttpRequest(); }						catch (e) { }
	if(ok) {
		return function() { return new XMLHttpRequest(); };
	}
	// IE6

	try { ok = new ActiveXObject("Microsoft.XMLHTTP"); }	catch (e) { }
	if(ok) {
		return function() { return new ActiveXObject("Microsoft.XMLHTTP"); };
	}
	throw Error("vxJS.xhr: Can't instantiate XMLHttpRequest!");
}();

/**
 * XHR wrapper
 * 
 * @param {Object} request, { command: {string}, uri: {String}, echo: {Boolean}, timeout: {Number}, forceXMLResponse: {Boolean}
 * @param {Object} param, object containing all additional parameters needed by request
 * @param {Object} animation, object containing a node reference
 * @param {Object} container with callback functions { completed: {Function}, timeout: {Function} }
 *
 * served events: "timeout", "complete", "fail", "beforeSend"
 */
vxJS.xhr = function(req, param, anim, cb) {
	if(!req)	{ req = {}; }
	if(!param)	{ param = {}; }
	if(!anim)	{ anim = {}; }

	var	timeout = req.timeout || 5000, timer,
		headers = {},
		xhrO = vxJS.xhrObj(), that = { response: {} };

	var stopTimer = function() {
		if(timer) {
			window.clearTimeout(timer);
		}
		if(anim.node) {
			vxJS.dom.removeClassName(anim.node, "active");
		}
	};

	var abort = function() {
		stopTimer();
		if(xhrO) {
			xhrO.onreadystatechange = function() {};
			if(xhrO.readyState !== 0 && xhrO.readyState !== 4) {
				xhrO.abort();
			}
		}
	};

	var startTimer = function() {
		if(timeout > 0) {
			timer = window.setTimeout( function() {
					abort();
					vxJS.event.serve(that, "timeout");
					if(cb && typeof cb.timeout === "function") {
						cb.timeout.call(that);
					}
				}, timeout);
		}
		if(anim.node) {
			vxJS.dom.addClassName(anim.node, "active");
		}
	};

	var stateChange = function () {
		if(xhrO.readyState === 4) {
			if(xhrO.status >= 200 && xhrO.status < 300 || xhrO.status === 1223) {
				abort();

				if(req.forcePlainTextResponse) {
					that.response = xhrO.responseText;
				}
				else if(req.forceXMLResponse) {
					that.response = xhrO.responseXML || xhrO.responseText;
				}
				else {
					that.response = JSON.parse(xhrO.responseText || "{}");
				}

				vxJS.event.serve(that, "complete");
				if(cb && typeof cb.complete === "function") {
					cb.complete.call(that);
				}
			}
			else {
				vxJS.event.serve(that, "fail");
				if(cb && typeof cb.fail === "function") {
					cb.fail.call(that);
				}
			}
		}
	};

	var setHeader = function(field, value) {
		headers[field] = value;
	};
	
	/**
	 * try to build query string from mixed and nested data as it is done by PHP
	 */
	var buildQueryString = function(data) {

		var parameters = [], key, ndx;

		var builQueryParameter = function(key, val) {

			var k, parameters = [];

			if(typeof val === "function") {
				return "";
			}
			if (true === val) {
				return encodeURIComponent(key) + "=1";
			}
			if (false === val) {
				return encodeURIComponent(key) + "=0";
			}
			if (val === null) {
				return encodeURIComponent(key) + "=";
			}
			if (Array.isArray(val)) {
				ndx = 0;
	            val.forEach(function(a) {
	            	parameters.push(builQueryParameter(key + "[" + ndx++ + "]", a));
	            });
	            return parameters.join("&");
	        }
			if (typeof(val) === "object") {
				for (k in val) {
					if(val.hasOwnProperty(k)) {
						parameters.push(builQueryParameter(key + "[" + k + "]", val[k]));
					}
				}
				return parameters.join('&');
			}

			return encodeURIComponent(key) + "=" + encodeURIComponent(val);
	    };

		for (key in data) {
			if(data.hasOwnProperty(key)) {
				parameters.push(builQueryParameter(key, data[key]));
			}
		}

	    return parameters.join("&");
	};

	var submit = function() {
		var l = window.location, i, f,
			uri = encodeURI(req.uri || (l.hash ? l.href.substring(0, l.href.indexOf(l.hash)) : l.href));

		abort();

		param.httpRequest = req.command || "";
		param.echo = req.echo ? 1 : 0;

		setHeader("X-Requested-With", "XMLHttpRequest");

		if(req.forceXMLResponse && xhrO.overrideMimeType) {
			xhrO.overrideMimeType("text/xml");
		}

		// do GET

		if(req.method && req.method.toUpperCase() == "GET") {
			xhrO.open( "GET",
					uri += (uri.indexOf("?") !== -1 ? "&" : "?") +
					(new Date()).getTime() +
					"&" +
					(req.useJsonSerialization ?
						"xmlHttpRequest=" + encodeURIComponent(JSON.stringify(param)) :
						buildQueryString(param)
					)
			, true);

			for(i = 0, f = Object.keys(headers); i < f.length; ++i) {
				xhrO.setRequestHeader(f[i], headers[f[i]]);
			}

			xhrO.onreadystatechange = stateChange;
			vxJS.event.serve(that, "beforeSend");
			xhrO.send(null);
		}

		// do POST
		
		else {
			xhrO.open("POST",uri, true);

			if(!req.upload) {
				setHeader("Content-Type", "application/x-www-form-urlencoded");
				for(i = 0, f = Object.keys(headers); i < f.length; ++i) {
					xhrO.setRequestHeader(f[i], headers[f[i]]);
				}
				xhrO.onreadystatechange = stateChange;
				vxJS.event.serve(that, "beforeSend");
				
				if(req.useJsonSerialization) {
					xhrO.send("xmlHttpRequest="+encodeURIComponent(JSON.stringify(param)));
				}
				else {
					xhrO.send(buildQueryString(param));
				}
			}

			// do POST with file upload
			
			else if(param.file) {
				setHeader("X-File-Name", param.filename || param.file.name);
				setHeader("X-File-Size", param.file.size);
				setHeader("X-File-Type", param.file.type);
				for(i = 0, f = Object.keys(headers); i < f.length; ++i) {
					xhrO.setRequestHeader(f[i], headers[f[i]]);
				}
				xhrO.onreadystatechange = stateChange;
				vxJS.event.serve(that, "beforeSend");
				xhrO.send(param.file);
			}
		}
		startTimer();
	};

	that.setHeader = function(field, value) {
		setHeader(field, value);
		return this;
	};

	that.use = function(r, p, a, c) {
		vxJS.merge(req,		r);
		vxJS.merge(param,	p);
		vxJS.merge(anim,	a);
		if(typeof cb === "object") {
			vxJS.merge(cb, c);
		}
		else {
			cb = c;
		}
		return this;
	};

	that.xhrObj	= xhrO;
	that.abort	= abort;
	that.submit = submit;

	return that;
};
