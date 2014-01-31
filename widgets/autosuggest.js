/**
 * autoSuggest
 *
 * @version 0.6.11 2014-01-31
 * @author Gregor Kofler
 *
 * @param {Object} elem input element
 * @param {Object} xhr request object containing command and URI
 * @param {Object} config additional parameters to configure dropdown
 *	maxEntries:			{Number} max entries in list
 *	keyElem:			{Object} optional input element for storing key values
 *	keyProp:			{String} property name, which identifies the property stored as key value
 *	searchMode:			{Boolean} switches from suggest to search mode
 *	restrict:			{Boolean} restrict to provided entries when true (suggest mode only)
 *	minLength:			{Number} minimum length of search string, which triggers a request (search mode only)
 *	customShow:			{Function} callback function applying fx, when element is shown
 *	customHide:			{Function} callback function applying fx, when element is hidden
 *	enterIsCancelled:	{Boolean} when true, and no list shown, the default action of the enter key will be prevented
 *
 * served events: "choose", "showWidget", "hideWidget", "submitNoMatch"
 */

vxJS.widget.autoSuggest = function(elem, xhrReq, config) {

	config = config || {};

	var	typeAheadTimeout = 250, timeoutId,
		keyProp = config.keyProp || "key", keyElem = config.keyElem,
		minLength = typeof config.minLength == "undefined" ? 3 : +config.minLength,

		enableTypeAhead, keyListened, sentString, chosen, that = {}, shown,
		searchMode = !!config.searchMode,
		initData = {
			text: elem.value,
			key: keyElem ? keyElem.value : null
		},
		list = vxJS.widget.shared.list({hoverSelect: !searchMode }),
		layer = function() {
			var l = "div".setProp("class", "vxJS_autoSuggest").create(list.element);
			l.style.display = "none";
			return l;
		}(),
		generateEntriesCallback, mousedownOnList,
		xhr = vxJS.xhr(xhrReq || {}, { limit: config.maxEntries || 10, text: "" }),
		xhrImg = function() {
			var i = "div".setProp("class", "vxJS_xhrThrobber").create();
			i.style.position = "absolute";
			vxJS.dom.setElementPosition(i,  { x: -100, y: -100 } );
			vxJS.dom.getBody().appendChild(i);
			return i;
		}(), xhrImgSize;

	var setValue = function(v) {
		elem.value = v.text;
		if(keyElem) {
			keyElem.value = v[keyProp];
		}
	};

	var placeLayer = function() {
		var ePos = vxJS.dom.getElementOffset(elem), eSize = vxJS.dom.getElementSize(elem),
			scroll = vxJS.dom.getDocumentScroll(), size, s = layer.style, y;

		if(shown) {
			size = vxJS.dom.getElementSize(layer);
		}
		else {
			s.visibility = "hidden";
			s.display = "";
			size = vxJS.dom.getElementSize(layer);
			s.display = "none";
			s.visibility = "visible";
		}

		if((ePos.y + eSize.y + size.y > vxJS.dom.getViewportSize().y + scroll.y) && (ePos.y - size.y > scroll.y)) {
			y = ePos.y - size.y;
		}
		else {
			y = ePos.y + eSize.y;
		}
		layer.style.width = eSize.x+"px";
		vxJS.dom.setElementPosition(layer, new Coord(ePos.x, y));
	};

	var show = function() {
		placeLayer();

		if(!shown) {
			if(typeof config.customShow == "function") {
				config.customShow.apply(that);
			}
			else {
				layer.style.display = "";
			}
			shown = true;
			vxJS.event.serve(that, "showWidget");
		}
	};

	var hide = function() {
		if(shown) {
			if(typeof config.customHide == "function") {
				config.customHide.apply(that);
			}
			else {
				layer.style.display = "none";
			}
			shown = false;
			vxJS.event.serve(that, "hideWidget");
		}
	};

	var handleXhrResponse = function() {
		var txt, r = this.response, v = elem.value.toUpperCase(), i;

		if(sentString !== v || !r || !r.entries || !r.entries.length) {
			list.fill();
			hide();
			return;
		}

		if(searchMode) {
			list.fill(r.entries);
			if(vxJS.widget.shared.hiLite) {
				if(!r.hiLite || r.hiLite == "string") {
					vxJS.widget.shared.hiLite(r.hiLite || sentString, list.element);
				}
				else {
					while(i = r.hiLite.shift()) {
						vxJS.widget.shared.hiLite(i, list.element);
					}
				}
			}
			show();
			return;
		}

		if(config.restrict) {
			txt = r.entries[0].text.toUpperCase();
			while(v.length && txt.indexOf(v) != 0) {
				v = v.slice(0, -1);
			}
			sentString = v;
		}

		if (enableTypeAhead) {
			setValue(r.entries[0]);
			vxJS.selection.set(elem, sentString.length);
		}

		list.fill(r.entries);
		show();
	};

	var initRequest = function() {
		var p, s, v = elem.value, response;

		if(sentString === v.toUpperCase()) {
			return;
		}

		if(/*!v || */(searchMode && v.length < minLength)) {
			hide();
			return;
		}

		sentString = v.toUpperCase();

		// if provided retrieve matching suggestions not from server, but by custom callback

		if(generateEntriesCallback) {
			handleXhrResponse.call({
				response: generateEntriesCallback( {
					text: v,
					limit: config.maxEntries || 10
				} )
			});
		}

		// else retrieve data by XHR

		else {
			if(!xhrImgSize) {
				xhrImg.style.display = "block";
				xhrImgSize = vxJS.dom.getElementSize(xhrImg);
				xhrImg.style.display = "";
			}
			p = vxJS.dom.getElementOffset(elem);
			s = vxJS.dom.getElementSize(elem);
			p.x += s.x-xhrImgSize.x-4;
			p.y += (s.y-xhrImgSize.y)/2;
			vxJS.dom.setElementPosition(xhrImg, p);

			xhr.use(null, { text: v }, { node: xhrImg }).submit();
		}
	};

	var handleChoose = function() {
		chosen = list.getSelected()[0];
		setValue(chosen);
		initData = { text: elem.value, key: keyElem ? keyElem.value : null };

		if(!searchMode) {
			vxJS.selection.setCaretPosition(elem, "end");
		}

		vxJS.event.serve(that, "choose");
		sentString = null;
		hide();
	};

	var handleKeyDown = function(e) {
		var kc = e.keyCode;

		keyListened = true;

		if(kc < 32 && kc != 13 && kc != 27 && kc != 8 && kc != 0) {
			return;
		}

		switch (kc) {
			case 38:
				list.up();
				break;

			case 40:
				list.down();
				break;

			case 27:
				if(!searchMode) {
					setValue(initData);
				}
				sentString = null;
				hide();
				break;

			case 13:
				if(shown) {
					handleChoose();
					vxJS.event.preventDefault(e);
				}
				else {
					vxJS.event.serve(that, "submitNoMatch");
					if(config.enterIsCancelled) {
						vxJS.event.preventDefault(e);
					}
				}
				break;

			default:
				keyListened = false;
		}
	};

	var handleKeyUp = function(e) {
		var kc = e.keyCode;

		if(elem.value.toUpperCase() !== sentString) {
			sentString = null;
		}

		if (keyListened || (kc < 32 && kc != 8 && kc != 0) || (kc >= 33 && kc < 46) || (kc >= 112 && kc <= 123)) {
			return;
		}
		enableTypeAhead = !(kc == 8 || kc == 46);	// BS & DEL - Suggestions without Typeahead

		window.clearTimeout(timeoutId);
		timeoutId = window.setTimeout(initRequest, typeAheadTimeout);
	};

	elem.setAttribute("autocomplete", "off");
	vxJS.dom.getBody().appendChild(layer);

	vxJS.event.addListener(elem,	"keydown",		handleKeyDown);
	vxJS.event.addListener(elem,	"keyup",		handleKeyUp);

	// workaround required for IE and Chrome, which lose focus, when scrollbar of list is clicked

	vxJS.event.addListener(layer,	"mousedown", 	function() { mousedownOnList = true; });
	vxJS.event.addListener(layer,	"mouseup", 		function() { mousedownOnList = false; });
	vxJS.event.addListener(elem,	"blur",			function() {
														if(!mousedownOnList) {
															hide();
														}
														else {
															elem.focus();
															mousedownOnList = false;
														}
													});

	vxJS.event.addListener(list,	"choose",		handleChoose);

	vxJS.event.addListener(xhr,		"complete",		handleXhrResponse);
	vxJS.event.addListener(xhr,		"timeout",		function() { window.alert("Response took to long!");});

	that.element = layer;
	that.xhr = xhr;

	that.setGenerateEntriesCallback	= function(cb) { generateEntriesCallback = cb; };
	that.getChosen					= function() { return chosen; };

	return that;
};