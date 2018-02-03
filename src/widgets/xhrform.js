/**
 * xhrForm
 *
 * submits form values via XHR
 * responses can trigger a "normal" submit, a redirect or
 * will contain objects with name of elements, new values and
 * possible error messages
 *
 * @version 0.11.0 2018-02-03
 * @author Gregor Kofler, info@gregorkofler.com
 *
 * @param {Object} form element
 * @param {Object} xhrReq configuration object
 * @param {Object} config configuration settings
 *
 * @todo improve enableSubmit(), disableSubmit()
 *
 * served events: "ifuResponse", "beforeResponseCheck", "check", "beforeSubmit"
 */

vxJS.widget.xhrForm = function(form, xhrReq, config) {

	"use strict";

	if (!form.nodeName || form.nodeName.toLowerCase() !== "form") {
		throw new Error("widget.xhrForm: no form element specified!");
	}
	if(!config) {
		config = {};
	}

	var	prevErr = [], msgBoxes = [], that = {}, payload,
		immediateSubmit,
		submittedValues, submittingElement, ifrm, submittedByApp, submittingNow, submissionCancelled,
		xhr = vxJS.xhr(xhrReq || {}), lastXhrResponse;

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

            if(submittingElement) {
                vxJS.dom.removeClassName(submittingElement, "loading");
            }
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

		if(xhrReq && xhrReq.command) {
			form.action = action + (action.indexOf("?") == -1 ? "?" : "&") +"ifuRequest=" + xhrReq.command;
		}

		vxJS.event.addListener(ifrm, "load", ifuLoaded);
	};

	var setValues = function(v) {
		var val, l = v.length, e, i, j;

		while(l--) {
			if(!(e = form.elements[v[l].name])) {
				continue;
			}

			val = v[l].value;

			// NodeList requires an array of values; same types of elements are assumed

			if(e instanceof NodeList && Array.isArray(val) && e.length === val.length) {

				switch(e.item(0).type) {
					case "radio":
					case "checkbox":
						for(i = 0; i < val.length; ++i) {
							e[i].checked = !!val[i];
						}
						break;

					// select-multiple expects an array with option values that are selected 

					case 'select-multiple':
						for(i = 0; i < val.length; ++i) {
							if(Array.isArray(val[i])) {
								for(j = e[i].options.length; j--;) {
									 e[i].options[j].selected = val[i].indexOf(e[i].options[j].value) !== -1;
								}
							}
						}
						break;
	
					default:
						for(i = 0; i < val.length; ++i) {
							e[i].value = val[i] || "";
						}
				}

			}
			
			else if(e instanceof Node) {
				switch(e.type) {
					case "radio":
					case "checkbox":
						e.checked = !!val;
						break;
	
					case 'select-multiple':
						if(Array.isArray(val)) {
							for(j = e.options.length; j--;) {
								 e.options[j].selected = val.indexOf(e.options[j].value) !== -1;
							}
						}
						break;
	
					default:
						e.value = val || "";
				}
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
			
			// single element

			else if(element.nodeName) {
				e.elements = [element];
				vxJS.dom.addClassName(element, "error");
			}
			
			// elements collection

			else {
				e.elements = vxJS.collectionToArray(element);
				e.elements.forEach(function(elem, ndx) {
					if(!e.ndx || e.ndx[ndx]) {
						vxJS.dom.addClassName(elem, "error");
					}
				});
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

		for (i = 0; i < fe.length; ++i) {

			v		= null;
			matches	= null;
			e		= fe[i];
			name	= e.name;

			if(config.namesToHashes && (matches = name.match(hashRex))) {
				name	= matches[1];
				ndx		= matches[2];	// can also evaluate to empty string
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
						break;

					default:
						if(matches) {
							v[ndx] = e.value;
						}
						else {
							v = e.value;
						}
				}

				// continue, when no value was detected

				if (v === null || (typeof v === "object" && !Object.keys(v).length)) {
					continue;
				}

				// element name not previously found

				if(typeof vals[name] === "undefined") {

					// when has was detected, store it as array

					vals[name] = matches ? [v] : v;

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

	/**
	 * wrap form.submit()
	 * place throbber, disable submit buttons
	 */
	var submit = function() {
        if(submittingElement) {
            vxJS.dom.addClassName(submittingElement, "loading");
        }
		submittedByApp = true;
		disableSubmit();
		form.submit();
	};

	/**
	 * handle response
	 *
	 * can handle commands (redirect, submit),
	 * set values of elements and corresponding errors
	 * fill message boxes, serve events before and after parsing response
	 */
	var handleXhrResponse = function(response) {
		var l, elem, v = [], e = [], m, c, cmd, r, ndx = null;

		if(!response) {
			response = this.response;
		}

		vxJS.event.serve(that, "beforeResponseCheck", response);

		clearMsgBoxes();
		clearErrors();
		enableSubmit();

		if((r = response.response && response.echo ? response.response : response)) {

			if((cmd = r.command)) {
				if(cmd === "redirect" && r.location) {
					window.location.href = r.location;
					return;
				}
				if(cmd === "submit") {
					submit();
					return;
				}
			}

			if(r.elements) {
				l = r.elements.length;
				while(l--) {
					elem = r.elements[l];
					if(elem.value) {
						v.push({
							name: elem.name,
							value: elem.value
						});
					}
					if(elem.error) {
						if(typeof elem.error === "object") {
							ndx = [];
							Object.keys(elem.error).forEach(function(k) {
								if(elem.error[k]) {
									ndx[k] = true;
								}
							});
						}

						e.push({
							name: elem.name,
							text: elem.errorText || null,
							ndx: ndx
						});
					}
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

		lastXhrResponse = response;
		vxJS.event.serve(that, "check", response);
	};

	var handleClick = function(e) {
		var v;

		vxJS.event.preventDefault(e);

		if(submittingNow) {
			return;
		}
		submittingElement = this;

		vxJS.event.serve(that, "beforeSubmit");

		if(submissionCancelled) {
		    submissionCancelled = false;
		    return;
        }

		disableSubmit();

		if(immediateSubmit) {
			handleXhrResponse( { command: "submit"} );
		}
		else {
			v = getValues(form.elements, this);
			vxJS.merge(v, payload);

			xhr.use(null, v, { node: submittingElement }).submit();

			submittedValues = v;
		}
	};

	that.addSubmit = function(elem) {
		vxJS.event.addListener(elem, "click", handleClick);
		return this;
	};

	that.addMessageBox = function(elem, id) {
		msgBoxes.push({
			container: elem,
			id: id || "MsgBox" + msgBoxes.length
		});
		return this;
	};

	that.clearErrors = function() {
		clearErrors();
		return this;
	};

	that.getErrors = function() {
		return prevErr;
	};

	that.clearFileInputs = function() {
		var inp = form.getElementsByTagName("input"), i;

		if(!inp || !(i = inp.length)) { return; }

		for(; --i;) {
			if(inp[i].type === "file") {
				inp[i].parentNode.replaceChild(
					"input".setProp([["type", "file"], ["name", inp[i].name]]).create(),
					inp[i]);
			}
		}
		return this;
	};

	that.forceRequest = function() {
		var v;

		vxJS.event.serve(that, "beforeSubmit");

        if(submissionCancelled) {
            submissionCancelled = false;
            return;
        }

        disableSubmit();
		v = getValues(form.elements, this);
		vxJS.merge(v, payload);

		xhr.use(null, v, { node: submittingElement || null }).submit();

		submittedValues = v;
		return this;
	};

	that.disableImmediateSubmit = function() {
		immediateSubmit = false;
		return this;
	};

	that.enableImmediateSubmit = function() {
		immediateSubmit = true;
		return this;
	};

	that.enableIframeUpload = function() {
		prepareIfu();
		return this;
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
		return this;
	};

	that.getSubmittedValues = function() {
		return submittedValues;
	};

	that.getLastXhrResponse = function() {
		return lastXhrResponse;
	};

	that.setPayload = function(pl) {
		payload = pl;
		return this;
	};

	that.getPayload = function() {
		return payload;
	};

	that.clearPayload = function() {
		payload = null;
		return this;
	};

	that.isSubmittingNow = function() {
		return submittingNow;
	};

	that.cancelSubmission = function() {
        submissionCancelled = true;
    }

	vxJS.event.addListener(xhr, "complete", handleXhrResponse);
	vxJS.event.addListener(xhr, "fail", enableSubmit);
	vxJS.event.addListener(xhr, "timeout", enableSubmit);

	that.element	= form;
	that.submit		= submit;
	that.xhr		= xhr;

	return that;
};