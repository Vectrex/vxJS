/**
 * provides xmlHttpRequest object
 *
 * @param {Object} request, { command: {string}, uri: {String}, echo: {Boolean}, timeout: {Number}, forceXMLResponse: {Boolean}
 * @param {Object} param, object containing all additional parameters needed by request
 * @param {Object} animation, object containing a node reference
 * @param {Object} container with callback functions { completed: {Function}, timeout: {Function} }
 *
 * @returns xhr object
 *
 * @version 4.0.0 2014-05-17
 * @author Gregor Kofler
 *
 * served events: "timeout", "complete", "fail", "beforeSend"
 */

"use strict";

vxJS.xhrObj = function() {
	var	ms = ["Msxml2.XMLHTTP", "Msxml2.XMLHTTP.3.0", "Msxml2.XMLHTTP.6.0"], i, ok;

	try { ok = new XMLHttpRequest(); } catch (e) {}
	if(ok) {
		return function() { return new XMLHttpRequest(); };
	}
	for (i = ms.length; i--;) {
		try { ok = new ActiveXObject(ms[i]); } catch (e) { }
		if(ok) {
			return function() { return new ActiveXObject(ms[i]); };
		}
	}
	if(window.createRequest) {
		return function() { return window.createRequest(); };
	}
	throw Error("vxJS.xhr: Can't instantiate XMLHttpRequest!");
}();

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

		if(req.method && req.method.toUpperCase() == "GET") {
			xhrO.open( "GET", uri += (uri.indexOf("?") !== -1 ? "&" : "?") + (new Date()).getTime() + "&xmlHttpRequest=" + encodeURIComponent(JSON.stringify(param)), true);
			for(i = 0, f = Object.keys(headers); i < f.length; ++i) {
				xhrO.setRequestHeader(f[i], headers[f[i]]);
			}
			xhrO.onreadystatechange = stateChange;
			vxJS.event.serve(that, "beforeSend");
			xhrO.send(null);
		}

		else {
			xhrO.open("POST",uri, true);

			if(!req.upload) {
				setHeader("Content-Type", "application/x-www-form-urlencoded");
				for(i = 0, f = Object.keys(headers); i < f.length; ++i) {
					xhrO.setRequestHeader(f[i], headers[f[i]]);
				}
				xhrO.onreadystatechange = stateChange;
				vxJS.event.serve(that, "beforeSend");
				xhrO.send("xmlHttpRequest="+encodeURIComponent(JSON.stringify(param)));
			}

			else if(param.file) {
				setHeader("X-Filename", param.filename || param.file.name);
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
