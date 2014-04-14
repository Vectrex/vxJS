/**
 * simple "confirm" dialog widget
 *
 * the widget is implemented as a singleton
 *
 * focus events of input, textarea, select and a elements are "captured"
 *
 * @version 0.1.9 2014-04-14
 * @author Gregor Kofler
 *
 * @param {Object} configuration (all properties are optional)
 *	overlay:	{Boolean} display overlay; requires vxJS.widget.shared.overlay()
 *	buttons:	{Array} buttons to display; each entry is an object with a key and label property
 *	content:	{Array} by vxJS.dom.parse() parseable array
 *	timeout:	{Number} seconds after which the dialog is automatically closed
 *	className:	{String} additional className of parent element
 *	decoration:	{Array} with vxJS.dom.parse() parseable array,
 *				which must contain two elements with "vxJS_confirm_content" and "vxJS_confirm_buttons" respectively
 *				the decoration is only parsed once, and cannot be altered by subsequent invocations of the widget
 *
 * @return {Object} confirm object
 *
 * served events: "showWidget", "hideWidget", "buttonClick", "focusLost"
 */

vxJS.widget.confirm = function() {
	var that, elem, c,
		overlay, buttons = [], frag, shown, lastPicked, boundListeners = [], reRender = false, listenerId, lastFocused, timeoutId;

	return function(config) {
		var body = vxJS.dom.getBody();

		var focus = function() {
			var i = buttons.length;

			if(lastFocused) {
				while(--i) {
					if(buttons[i].element == lastFocused) {
						lastFocused = buttons[++i % buttons.length].element;
						lastFocused.focus();
						return;
					}
				}
			}
			if(i) {
				buttons[0].element.focus();
				return;
			}

			vxJS.event.serve(that, "focusLost");
		};

		var bindFocus = function() {

			var focusListener = function(e) {
				vxJS.event.preventDefault(e);
				this.blur();
				focus();
			};

			var addFocusListener = function(tN) {
				Array.prototype.forEach.call(document.getElementsByTagName(tN), function(e) {
					boundListeners.push(vxJS.event.addListener(e, "focus", focusListener));
				});
			};

			["a", "input", "select", "textarea"].forEach(addFocusListener);
		};

		var releaseFocus = function() {
			boundListeners.forEach(function(l) { vxJS.event.removeListener(l); });
		};

		var setOverlay = function() {
			if(c.overlay) {
				overlay = vxJS.widget.shared.overlay();
			}
		};

		var setButtons = function() {
			if(c.buttons) {
				reRender = true;
				buttons = c.buttons;
			}
		};

		var setContent = function() {
			if(c.content) {
				reRender = true;
				frag = vxJS.dom.parse(c.content);
			}
		};

		var renderButtons = function() {
			var bb;

			var clickListener = function() {
				var l = buttons.length;

				if(this.nodeName.toLowerCase() == "button") {
					while(--l) {
						if(buttons[l].element == this) {
							break;
						}
					}
					lastPicked = buttons[l];
					vxJS.event.serve(that, "buttonClick");
					hide();
				}
			};

			if(listenerId) {
				vxJS.event.removeListener(listenerId);
			}

			if(!buttons || !buttons.length) {
				return;
			}

			bb = "div".setProp("class", "buttonBar").create();

			buttons.forEach(function(b) {
				var i;
				if(b.key && b.label) {
					i = "button".setProp( { type: "button", className: "button_" + b.key } ).create(b.label);
					bb.appendChild(i);
					b.element = i;
					b.listenerId = vxJS.event.addListener(i, "focus", function() { lastFocused = this; });
				}
			});

			listenerId = vxJS.event.addListener(bb, "click", clickListener);

			return bb;
		};

		var render = function() {
			var contentContainer	= vxJS.dom.getElementsByClassName("vxJS_confirm_content", elem)[0],
				buttonContainer		= vxJS.dom.getElementsByClassName("vxJS_confirm_buttons", elem)[0];

			elem.className = "vxJS_confirm" + (c.className ? " " + c.className : "");

			if(!reRender) {
				return;
			}
			
			if(contentContainer && buttonContainer) {
				vxJS.dom.deleteChildNodes(contentContainer);
				vxJS.dom.deleteChildNodes(buttonContainer);
				contentContainer.appendChild(frag);
				if(b = renderButtons()) {
					buttonContainer.appendChild(b);
				}
			}
			else {
				vxJS.dom.deleteChildNodes(elem);
				vxJS.dom.appendChildren(elem, [frag, renderButtons()]);
			}
		};

		var show = function() {
			var pos;

			if(shown) {
				return;
			}

			shown = true;
			lastPicked = null;

			bindFocus();

			if(overlay) {
				overlay.show();
			}

			body.appendChild(elem);

			pos = vxJS.dom.getViewportSize().sub(vxJS.dom.getElementSize(elem));
			pos.x /= 2;
			pos.y /= 2;
			vxJS.dom.setElementPosition(elem, pos);

			if(buttons[0]) {
				buttons[0].element.focus();
			}

			vxJS.event.serve(that, "showWidget");

			if(+c.timeout) {
				timeoutId = window.setTimeout(hide, c.timeout * 1000);
			}
		};

		var hide = function() {
			if(!shown) {
				return;
			}
			shown = false;

			releaseFocus();

			buttons.forEach(function(b) { vxJS.event.removeListener(b.listenerId); });

			if(overlay) {
				overlay.hide();
			}
			elem = body.removeChild(elem);
			vxJS.event.serve(that, "hideWidget");

			window.clearTimeout(timeoutId);
		};

		c = config || {};

		setOverlay();
		setButtons();
		setContent();

		if(that) {
			render();
			return that;
		}

		elem = function() {
			var d = "div".setProp("class", "vxJS_confirm").create(vxJS.dom.parse(config.decoration || []));
			d.style.position = vxJS.dom.allowsFixedPosition() ? "fixed" : "absolute";
			return d;
		}();

		render();

		that = {
			element: elem,
			show: show,
			hide: hide,
			getClickedButton: function() { return lastPicked; }
		};

		return that;
	};
}();