/**
 * XHR wrapper
 *
 * @version 6.0.0 2018-02-03
 * @author Gregor Kofler
 *
 * @param {Object} req, request { command: {string}, uri: {String}, echo: {Boolean}, timeout: {Number}, forceXMLResponse: {Boolean}
 * @param {Object} param, object containing all additional parameters needed by request
 * @param {Object} anim, animation object containing a node reference
 * @param {Object} cb, object containing callback functions { complete: {Function}, timeout: {Function}, fail: {Function} }
 *
 * served events: "timeout", "complete", "fail", "beforeSend"
 */
vxJS.xhr = function(req, param, anim, cb) {

    "use strict";

	if(!req)	{ req = {}; }
	if(!param)	{ param = {}; }
	if(!anim)	{ anim = {}; }

	var	timeout = req.timeout || 5000, timer, active,
		headers = {}, multipartBoundary = 'vxJS-xhr-boundary',
		xhrO = new XMLHttpRequest(), that = { response: {} };

	var abort = function() {
		if(anim.node) {
			vxJS.dom.removeClassName(anim.node, "loading");
		}
		if(timer) {
			window.clearTimeout(timer);
		}
		if(xhrO) {
			xhrO.onreadystatechange = function() {};
			if(xhrO.readyState !== 0 && xhrO.readyState !== 4) {
				xhrO.abort();
			}
		}
		active = false;
	};

	var startTimer = function() {
		if(timeout > 0) {
			timer = window.setTimeout( function() {
				abort();

				if(cb && typeof cb.timeout === "function") {
					cb.timeout.call(that);
				}

				vxJS.event.serve(that, "timeout");
				vxJS.event.serveXhr(that, "timeout");

			}, timeout);
		}
	};

	var stateChange = function () {

		if(xhrO.readyState === 4) {

			abort();

			if(xhrO.status >= 200 && xhrO.status < 300 || xhrO.status === 1223) {

				if(req.forcePlainTextResponse) {
					that.response = xhrO.responseText;
				}
				else if(req.forceXMLResponse) {
					that.response = xhrO.responseXML || xhrO.responseText;
				}
				else {
					that.response = JSON.parse(xhrO.responseText || "{}");
				}

				if(cb && typeof cb.complete === "function") {
					cb.complete.call(that);
				}

				vxJS.event.serve(that, "complete");
				vxJS.event.serveXhr(that, "complete");

			}
			else {
				if(cb && typeof cb.fail === "function") {
					cb.fail.call(that);
				}

				vxJS.event.serve(that, "fail");
				vxJS.event.serveXhr(that, "fail");
			}
		}
	};

	var setHeader = function(field, value) {
		headers[field] = value;
	};

    var buildQueryParameter = function(key, val) {

        var k, parameters = [], ndx;

        if (true === val) {
            return encodeURIComponent(key) + "=1";
        }
        if (false === val) {
            return encodeURIComponent(key) + "=0";
        }

        if (Array.isArray(val)) {
            ndx = 0;
            val.forEach(function(a) {
                parameters.push(buildQueryParameter(key + "[" + ndx++ + "]", a));
            });
            return parameters.join("&");
        }
        if (typeof(val) === "object") {
            for (k in val) {
                if(val.hasOwnProperty(k)) {
                    parameters.push(buildQueryParameter(key + "[" + k + "]", val[k]));
                }
            }
            return parameters.join('&');
        }

        return encodeURIComponent(key) + "=" + encodeURIComponent(val);
    };

	var buildQueryString = function(data) {

		var parameters = [], key;

		for (key in data) {
			if(data.hasOwnProperty(key)) {
				parameters.push(buildQueryParameter(key, data[key]));
			}
		}

	    return parameters.join("&");
	};

	var arrayBufferToString = function(arrayBuffer) {

        var bytes = new Uint8Array(arrayBuffer), binary = "", chunkSize = Math.pow(2, 16) - 1;

        for (var i = 0, l = bytes.length; i < l; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }

        return binary;
    };

	var submit = function() {
		var l = window.location, i, j, f, g, parameters, data,
			uri = encodeURI(req.uri || (l.hash ? l.href.substring(0, l.href.indexOf(l.hash)) : l.href));

		abort();

        vxJS.event.serve(that, "beforeSend");

		if(req.command) {
            (param.formData || param).httpRequest = req.command;
		}
		if(req.echo) {
			param.echo = 1;
		}

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

			data = null;
		}

		// do POST
		
		else {
			xhrO.open("POST",uri, true);

			// normal POST

			if(!req.upload && !req.multipart) {
				setHeader("Content-Type", "application/x-www-form-urlencoded");

				if(req.useJsonSerialization) {
					data = "xmlHttpRequest=" + encodeURIComponent(JSON.stringify(param));
				}
				else {
					data = buildQueryString(param);
				}
			}

			// multipart POST

			else if(req.multipart) {
				setHeader("Content-Type", "multipart/form-data; boundary=" + multipartBoundary);

                parameters = buildQueryString(param.formData).split("&");
				data = "";

				for(i = 0; i < parameters.length; ++i) {
                    data += "--" + multipartBoundary + "\r\n";
                    data += 'content-disposition: form-data; name="' + parameters[i].split("=")[0] + '"\r\n\r\n' + parameters[i].split("=")[1] + "\r\n";
				}
                for(i = 0, f = Object.keys(param.files); i < f.length; ++i) {
					if((g = param.files[f[i]]).length) {

                        for (j = 0; j < g.length; ++j) {
                            data += "--" + multipartBoundary + "\r\n";
                            data += 'content-disposition: form-data; name="' + f[i] + '"; ';
                            data += 'filename="' + g[j].file.name + '"\r\n';
                            data += "content-type: " + g[j].file.type + "\r\n\r\n";
                            data += arrayBufferToString(g[j].arrayBuffer) + "\r\n";
                        }
                    }
				}

                data += "--" + multipartBoundary + "--";

				var payload = new Uint8Array(data.length);
				for(var i = 0; i < data.length; ++i) {
					payload[i] = data.charCodeAt(i) & 0xFF;
				}
				data = payload.buffer;
			}

			// do POST with file upload
			
			else if(req.upload && param.file) {
				setHeader("X-File-Name", (param.filename || param.file.name).replace(/[^\x00-\x7F]/g, function(c) { return encodeURIComponent(c); }));
				setHeader("X-File-Size", param.file.size);
				setHeader("X-File-Type", param.file.type);

				data = param.file;
			}

        }

        // set headers

        for(i = 0, f = Object.keys(headers); i < f.length; ++i) {
            xhrO.setRequestHeader(f[i], headers[f[i]]);
        }

        // trigger request

        xhrO.onreadystatechange = stateChange;
        xhrO.send(data);

		active = true;

		startTimer();
		
		if(anim.node) {
			vxJS.dom.addClassName(anim.node, "loading");
		}
	};

	that.setHeader = function(field, value) {
		setHeader(field, value);
		return this;
	};

	that.use = function(r, p, a, c) {
		if(r) {
			req	= vxJS.merge(req, r);
		}
		if(p) {
			param = p;
		}
		if(a) {
			anim = a;
		}
		if(c) {
			cb	= c;
		}

		return this;
	};
	
	that.getRequestParameters = function() {
		return req;
	};
	
	that.getParameters = function() {
		return param;
	};

	that.getAnimationParameters = function() {
		return anim;
	};
	
	that.getCallbacks = function() {
		return cb;
	};
	
	that.isActive = function() {
		return active;
	};

	that.xhrObj	= xhrO;
	that.abort	= abort;
	that.submit = submit;

	return that;
};
