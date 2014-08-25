/**
 * xhrForm
 *
 * submits form values via XHR
 * responses can trigger a "normal" submit, a redirect or
 * will contain objects with name of elements, new values and
 * possible error messages
 *
 * @version 0.4.10 2014-08-25
 * @author Gregor Kofler, info@gregorkofler.com
 *
 * @param {Object} form element
 * @param {Object} XHR configuration object
 * @param {Object} additional configuration settings 
 *
 * @todo improve enableSubmit(), disableSubmit()
 *
 * served events: "ifuResponse", "check", "beforeSubmit", "apcUpdate", "apcFinish" (only relevant when using APC in a PHP environment)
 */

vxJS.widget.xhrForm = function(form, xhrReq, config) {

	"use strict";

	if (!form.nodeName || form.nodeName.toLowerCase() != "form") {
		throw new Error("widget.xhrForm: no form element specified!");
	}
	if(!config) {
		config = {};
	}

	var	prevErr = [], msgBoxes = [], that = {}, payload,
		apcHidden, apcProgressBar, apcPercentage, apcPollTimeout, immediateSubmit,
		submittedValues, submittingElement, ifrm, submittedByApp, submittingNow,
		xhr = vxJS.xhr(xhrReq || {}), lastXhrResponse, throbberSize,
		throbber = function() {
			var i = "div".setProp("class", "vxJS_xhrThrobber").create();
			i.style.position = "absolute";
			vxJS.dom.setElementPosition(i,  { x: -100, y: -100 } );
			document.body.appendChild(i);
			return i;
		}();

	var posThrobber = function() {
		var p, s;

		if(!submittingElement) {
			return;
		}
		if(!throbberSize) {

			// ensure that the dimensions can be calculated

			throbber.style.display = "block";
			throbberSize = vxJS.dom.getElementSize(throbber);
			throbber.style.display = "";
		}
		p = vxJS.dom.getElementOffset(submittingElement);
		s = vxJS.dom.getElementSize(submittingElement);
		p.x += s.x+4;
		p.y += (s.y-throbberSize.y)/2;
		vxJS.dom.setElementPosition(throbber, p);
	};

	var disableSubmit = function() {
		submittingNow = true;
	};

	var enableSubmit = function() {
		submittingNow = false;
	};

	var ifuLoaded = function() {
		var response;

		if(submittedByApp) {
			try			{ response = JSON.parse((ifrm.contentDocument || ifrm.contentWindow.document).body.innerHTML); }
			catch(e)	{ response = {}; }

			if(apcPollTimeout) {
				window.clearTimeout(apcPollTimeout);
				hideApcInfo();
			}

			vxJS.dom.removeClassName(throbber, "active");
			enableSubmit();

			vxJS.event.serve(that, "ifuResponse", response);

			handleXhrResponse(response);
		}
	};

	var prepareIfu = function() {
		var action = form.action, div, s, name = "ifu_" + new Date().getTime();

		if(ifrm) { return; }

		ifrm = "iframe".setProp([["name", name], ["src", "javascript:false;"]]).create();
		div = "div".create(ifrm);
		s = div.style;
		s.visibility = "hidden";
		s.overflow = "hidden";
		vxJS.dom.setElementSize(div, new Coord(0, 0));
		document.body.appendChild(div);

		form.target = name;

		if(xhrReq.command) {
			form.action = action + (action.indexOf("?") == -1 ? "?" : "&") +"ifuRequest=" + xhrReq.command;
		}

		vxJS.event.addListener(ifrm, "load", ifuLoaded);
	};

	var setValues = function(v) {
		var val, l = v.length, m, e;

		while(l--) {
			if(!(e = form.elements[v[l].name])) {
				continue;
			}

			val = v[l].value;

			switch(e.type) {
				case "textarea":
				case "text":
				case "hidden":
				case "select-one":
					e.value = val || "";
					break;

				case 'radio':
				case 'checkbox':
					e.checked = !!val;
					break;

				case 'select-multiple':
					if(Array.isArray(val)) {
						for(m = e.options.length; m--;) {
							 e.options[m].selected = val.indexOf(e.options[m].value) !== -1;
						}
					}
					break;

			}
		}
	};

	var clearErrors = function() {
		prevErr.forEach(function(e) {
			var n;
			e.elements.forEach(function(elem) { vxJS.dom.removeClassName(elem, "error"); });
			if((n = document.getElementById("error_" + e.name))) {
				vxJS.dom.removeClassName(n, "error");
				if(e.text && n.lastChild) {
					n.removeChild(n.lastChild);
				}
			}
		});

		prevErr = [];
	};

	var setErrors = function(err) {
		err.forEach(function(e) {
			var element = form.elements[e.name], n;

			if(!element) {
				e.elements = [];
			}
			else if(element.nodeName) {
				e.elements = [element];
				vxJS.dom.addClassName(element, "error");
			}
			else {
				e.elements = vxJS.collectionToArray(element);
				e.elements.forEach(function(elem) {vxJS.dom.addClassName(elem, "error"); });
			}

			if((n = document.getElementById("error_" + e.name))) {
				vxJS.dom.addClassName(n, "error");
				if(e.text) {
					n.appendChild(document.createTextNode(e.text));
				}
			}
		});

		prevErr = err;
	};

	var getValues = function(fe, submit) {
		var	 i, v, j, o, vals = {}, e, name, ndx, hashRex = /^(.*?)\[(.*?)\]$/, matches, arrValue;

		for (i = fe.length; i--;) {

			v		= null;
			ndx		= null;
			e		= fe[i];
			name	= e.name;

			if(config.namesToHashes && (matches = name.match(hashRex))) {
				name	= matches[1];
				ndx		= matches[2];
				v		= {};
			}

			if (e.type && !e.disabled) {
				switch (e.type) {
					case "radio":
					case "checkbox":
						if (e.checked) {
							if(ndx) {
								v[ndx] = e.value;
							}
							else {
								v = e.value;
							}
						}
						break;

					case "textarea":
					case "text":
					case "password":
					case "hidden":
						if(ndx) {
							v[ndx] = e.value;
						}
						else {
							v = e.value;
						}
						break;

					case "select-multiple":
						if(vxJS.dom.hasClassName(e, "vxJS_dualSelectBox_source")) {
							continue;
						}
						o = e.options;
						
						arrValue = [];
						for (j = o.length; j--;) {
							if (o[j].selected || vxJS.dom.hasClassName(e, "vxJS_dualSelectBox_dest")) {
								arrValue.push(o[j].value);
							}
						}
						if(ndx) {
							v[ndx] = arrValue;
						}
						else {
							v = arrValue;
						}
						break;

					case "select-one":
						if(ndx) {
							v[ndx] = e.options[e.selectedIndex].value;
						}
						else {
							v = e.options[e.selectedIndex].value;
						}
						break;

					case "submit":
					case "image":
					case "button":
						if (submit && e === submit) {
							v = e.value;
						}
				}

				// continue, when no value was detected

				if (v === null || (typeof v === "object" && !Object.keys(v).length)) {
					continue;
				}

				// element name not previously found

				if(!vals[name]) {
					vals[name] = v;
				}

				// found same name without hash

				else if(!ndx) {
					if(!Array.isArray(vals[name])) {
						vals[name] = [vals[name]];
					}
					vals[name].push(v);
				}
				
				// found same name with hash

				else {
					vals[name][ndx] = v[ndx];
				}
			}
		}

		return vals;
	};

	var clearMsgBoxes = function() {
		msgBoxes.forEach(function(b) {vxJS.dom.deleteChildNodes(b.container);});
	};

	var findMsgBox = function(id) {
		for(var i = msgBoxes.length; i--;) {
			if (id === msgBoxes[i].id) {
				return msgBoxes[i].container;
			}
		}
	};

	// APC functionality

	var hideApcInfo = function(){
		if(!apcPercentage && !apcProgressBar) {
			return;
		}
		if(apcPercentage)	{ apcPercentage.style.display = "none"; }
		if(apcProgressBar)	{ apcProgressBar.style.display = "none"; }
	};

	var showApcInfo = function() {
		if(!apcPercentage && !apcProgressBar) {
			return;
		}
		if(apcPercentage)	{ apcPercentage.style.display = ""; }
		if(apcProgressBar)	{ apcProgressBar.style.display = ""; }
	};

	var updateApcInfo = function(r) {
		if(!apcPercentage && !apcProgressBar) {
			return;
		}

		var	p = (r.total && r.current) ? (r.current/r.total * 100).toFixed() : 0,
			f = r.filename;

		if(apcPercentage) {
			apcPercentage.firstChild.nodeValue = p + "%";
		}
		if(apcProgressBar) {
			apcProgressBar.firstChild.style.width = p + "%";
		}
	};

	var apcPoll = function() {
		var xhr;

		showApcInfo();

		var parseApc = function() {
			var r = this.response;

			if(!r || r.cancel_upload) {
				window.clearTimeout(apcPollTimeout);
				vxJS.event.serve(that, "apcFinish");
				hideApcInfo();
			}
			else {
				vxJS.event.serve(that, "apcUpdate");
				updateApcInfo(r);
			}
		};

		(function() {
			if(!xhr) {
				xhr = vxJS.xhr({ command: "apcPoll" }, { id: apcHidden.value });
				vxJS.event.addListener(xhr, "complete", parseApc);
			}
			else {
				xhr.use();
			}
			apcPollTimeout = window.setTimeout(arguments.callee, 1000);
		})();
	};

	/**
	 * handle response
	 *
	 * can handle commands (redirect, submit),
	 * set values of elements and corresponding errors
	 * fill message boxes, serve event
	 */
	var handleXhrResponse = function(response) {
		var l, n, v = [], e = [], m, c, cmd, r = response || this.response;

		clearMsgBoxes();
		clearErrors();
		enableSubmit();

		if(r) {
			if((cmd = r.command)) {
				if(cmd == "redirect" && r.location) {
					window.location.href = r.location;
					return;
				}
				if(cmd == "submit") {
					if(apcHidden) {
						apcPoll();
					}
					posThrobber();
					vxJS.dom.addClassName(throbber, "active");
					submittedByApp = true;
					disableSubmit();
					form.submit();
					return;
				}
			}

			if(r.elements) {
				l = r.elements.length;
				while(l--) {
					n = r.elements[l].name;
					if(r.elements[l].value) { v.push({name: n, value: r.elements[l].value }); }
					if(r.elements[l].error) { e.push({name: n, text: r.elements[l].errorText || null}); }
				}
				setValues(v);
				setErrors(e);
			}

			if((m = r.msgBoxes)) {
				l = m.length;
				while(l--) {
					if(m[l].id && (c = findMsgBox(m[l].id))) {
						c.appendChild(vxJS.dom.parse(m[l].elements));
					}
				}
			}
		}

		lastXhrResponse = r;
		vxJS.event.serve(that, "check", r);
	};

	var handleClick = function(e) {
		var v;

		vxJS.event.preventDefault(e);

		if(submittingNow) {
			return;
		}
		submittingElement = this;

		vxJS.event.serve(that, "beforeSubmit");

		disableSubmit();

		if(immediateSubmit) {
			handleXhrResponse( { command: "submit"} );
		}
		else {
			posThrobber();

			v = getValues(form.elements, this);
			vxJS.merge(v, payload);

			xhr.use(null, v, { node: throbber }).submit();

			submittedValues = v;
		}
	};

	that.addSubmit = function(elem) {
		if(elem.nodeName.toUpperCase() === "INPUT" && elem.form !== form) {
			throw Error("widget.xhrForm: form element not found!");
		}

		vxJS.event.addListener(elem, "click", handleClick);
	};

	that.addMessageBox = function(elem, id) {
		if(!elem) { return; }
		msgBoxes.push({
			container: elem,
			id: id || "MsgBox" + msgBoxes.length
		});
	};

	that.clearErrors = function() {
		clearErrors();
	};

	that.getErrors = function() {
		return prevErr;
	};

	that.clearFileInputs = function() {
		var inp = form.getElementsByTagName("input"), i;

		if(!inp || !(i = inp.length)) { return; }

		for(; --i;) {
			if(inp[i].type == "file") {
				inp[i].parentNode.replaceChild(
					"input".setProp([["type", "file"], ["name", inp[i].name]]).create(),
					inp[i]);
			}
		}
	};

	that.forceRequest = function() {
		var v;

		vxJS.event.serve(that, "beforeSubmit");

		v = getValues(form.elements, this);
		vxJS.merge(v, payload);

		xhr.use(null, { elements: v }, { node: null } ).submit();

		submittedValues = v;
	};

	that.disableImmediateSubmit = function() {
		immediateSubmit = false;
	};

	that.enableImmediateSubmit = function() {
		immediateSubmit = true;
	};

	that.enableApcUpload = function() {
		if(typeof apcHidden === "undefined") {
			apcHidden = function() {
				var apc;
				if(form.enctype !== "multipart/form-data" || !(apc = form.elements["APC_UPLOAD_PROGRESS"])) {
					return false;
				}
				return apc;
			}();

			if(apcHidden) {
				apcProgressBar = function() {
					var e = vxJS.dom.getElementsByClassName("apcProgressBar", form, "div")[0];
					if(e) {
						vxJS.dom.cleanDOM(e);
						return e;
					}
				}();

				apcPercentage = function() {
					var e = vxJS.dom.getElementsByClassName("apcPercentage", form, "span")[0];
					if(e) {
						e.appendChild(document.createTextNode(""));
						return e;
					}
				}();

				hideApcInfo();
			}
		}
	};

	that.enableIframeUpload = function() {
		prepareIfu();
	};

	that.getSubmittedValues = function() {
		return submittedValues;
	};
	
	/**
	 * allows setting of form values - "normalizes" data for internal function
	 */
	that.setValues = function(v) {
		var k = Object.keys(v), l = k.length, formData = [];
		
		while(l--) {
			formData.push({name: k[l], value: v[k[l]]}); 
		}
		
		setValues(formData);
	};

	that.getLastXhrResponse = function() {
		return lastXhrResponse;
	};

	that.setPayload = function(pl) {
		payload = pl;
	};

	that.clearPayload = function() {
		payload = null;
	};

	that.isSubmittingNow = function() {
		return submittingNow;
	};

	vxJS.event.addListener(xhr, "complete", handleXhrResponse);
	vxJS.event.addListener(xhr, "timeout", function() {
		vxJS.dom.removeClassName(throbber, "active");
		enableSubmit();
		window.alert("Response took to long!");
	});

	that.element = form;

	return that;
};