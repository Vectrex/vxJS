/**
 * Provides custom elements and functionality used with widgets
 * 
 * @version 0.6.10b 2012-05-04
 * @author Gregor Kofler
 *
 * currently providing
 *
 * vxJS.widget.shared.overlay()
 * vxJS.widget.shared.hiLite(text, node, className)
 * vxJS.widget.shared.shadeTableRows(parameterObject)
 * vxJS.widget.shared.list(parameterObject)
 * 
 * @todo list: Safari doesn't follow keystrokes
 */

"use strict";

vxJS.widget.shared = {

	overlay: function() {
		var that;

		return function(config) {
			var size, resizeListenerId, shown, elem, body = vxJS.dom.getBody();

			if(that) {
				return that;
			}

			var resize = function() {
				var sizeTo = vxJS.dom.getViewportSize();
				
				if(sizeTo.x <= size.x && sizeTo.y <= size.y) {
					return;
				}

				size = sizeTo;
				vxJS.dom.setElementSize(elem, size);
			};

			var show = function() {
				if(shown || !body) {
					return;
				}
				
				shown = true;

				if(!elem) {
					elem = "div".setProp("class", "vxJS_overlay").create();
					vxJS.dom.setElementPosition(elem, new Coord());

					body.appendChild(elem);									// IE requires attached element to check properties
					elem.style.position = vxJS.dom.allowsFixedPosition() ? "fixed" : "absolute";
				}
				
				else {
					body.appendChild(elem);
				}
				size = vxJS.dom.getViewportSize();
				vxJS.dom.setElementSize(elem, size);

				resizeListenerId = vxJS.event.addListener(window, "resize", resize);
			};

			var hide = function() {
				if(!shown || !elem) {
					return;
				}

				shown = false;
				vxJS.event.removeListener(resizeListenerId);
				elem = body.removeChild(elem);
			};

			that = {
				show: show,
				hide: hide
			};

			return that;
		};
	}(),

	/**
	 * hilight text beneath a given node
	 */
	hiLite: function(text, node, cN) {

		var	rex = new RegExp(text, "gi"), fixRex = new RegExp("^" + text, "i"),
			chunks, hits, frag = document.createDocumentFragment(), i;

		if(!cN)		{ cN = "hiLite"; }
		if(!node)	{ node = document; }

		vxJS.dom.walk(node, function(n) {
			if(n.nodeType !== 3) {
				return;
			}

			hits = n.nodeValue.match(rex);

			if(hits && hits.length) {

				chunks = n.nodeValue.split(rex);

				if(chunks.length < 2) {
					if(fixRex.test(n.nodeValue)) {
						frag.appendChild("span".setProp("class", cN).create(hits[0]));
						frag.appendChild(document.createTextNode(chunks[0]));
					}
					else {
						frag.appendChild(document.createTextNode(chunks[0]));
						frag.appendChild("span".setProp("class", cN).create(hits[0]));
					}
				}
				else {
					for(i = 0; i < chunks.length-1; ++i) {
						frag.appendChild(document.createTextNode(chunks[i]));
						frag.appendChild("span".setProp("class", cN).create(hits.shift()));
					}
					frag.appendChild(document.createTextNode(chunks[i]));
				}
				n.parentNode.replaceChild(frag, n);
			}
		});
	},

	/**
	 * shade table rows by assigning alternating class names
	 */
	shadeTableRows: function(param) {
		var t, r, c, i, j, l;
		if(!param || !(t = param.element)) {
			return;
		}

		if (t.nodeName.toUpperCase() !== "TBODY") {
			if (!t.tBodies || !(t = t.tBodies[0])) {
				return;
			}
		}
		if(!(r = t.rows)) {
			return;
		}
		c = param.classNames && param.classNames.length && param.classNames.length > 1 ? param.classNames : ["row0", "row1"];

		for(i = 0, j = 0, l = r.length; l--; ++j) {
			if(r[j].style.display !== "none") {
				r[j].className = c[i++ % c.length];
			}
		}
	},

	/**
	 * a list widget, used with vxJS.widget.autoSuggest(), vxJS.widget.queryPopup(), etc.
	 *
	 * served events: "choose", "toggle", "cancel"
	 */
	list: function(param) {
		param = param || {};

		var	ul = "ul".setProp("class", param.className || "vxJS_list").create(),
			entries, multiple = param.multiple || false, selected = [], current, that = {},
			kc, kdFlag;
		
		ul.style.position = "relative";
		
		var setCurrent = function(n) {
			if(current === n) {
				return;
			}
			if(current) {
				vxJS.dom.removeClassName(current, "current");
			}
			vxJS.dom.addClassName(n, "current");
			current = n;

			if(!multiple) {
				selected[0] = n;
			}
		};
		
		var focus = function() {
			ul.tabIndex = -1;
			ul.focus();
		};
		
		var toggleSelected = function(n) {
			var i;
			if(!multiple) {
				return;
			}
			for(i = selected.length; i--;) {
				if(selected[i] === n) {
					selected.splice(i, 1);
					n.className = n.className.replace(/([ ]?selected)/, "");
					vxJS.serve(that, "toggle");
					return;
				}
			}
			n.className += n.className ? " selected" : "selected";
			selected.push(n);
			vxJS.serve(that, "toggle");
		};

		var scrollIn = function() {
			var	d = vxJS.dom.getElementOffset(current, ul).y,
				liH = d + vxJS.dom.getElementSize(current).y,
				ulH = vxJS.dom.getElementSize(ul).y;

			if(d < ul.scrollTop) {
				ul.scrollTop = d;
			}
			
			else if(liH > ulH + ul.scrollTop) {
				ul.scrollTop = liH - ulH;
			}
		};

		var hiLite = function(n) {
			if(n !== ul) {
				setCurrent(n.nodeName.toUpperCase() !== "LI" ? vxJS.dom.getParentElement(n, "li") : n);
			}
		};

		var findEntry = function(n) {
			var i;
			for(i = entries.length; i--;) {
				if(entries[i].elem === n) {
					return entries[i];
				}
			}
		};

		var fill = function(newEntries) {
			var i;
			entries = newEntries || [];
			
			if(!entries.length) {
				ul.style.display = "none";
				return;
			}

			vxJS.dom.deleteChildNodes(ul);
			for(i = 0; i < entries.length; ++i) {
				entries[i].elem = "li".create(entries[i].elements ? vxJS.dom.parse(entries[i].elements) : entries[i].text);
				entries[i].elem.style.position = "relative";
				ul.appendChild(entries[i].elem);
			}

			ul.style.display = "";
			setCurrent(ul.firstChild);
			scrollIn();
		};

		var keypress = function(e) {
			if(!kdFlag) {
				switch (kc) {
					case 38:
						that.up();
						break;
					case 40:
						that.down();
						break;
				}
			}
			kdFlag = false;
			vxJS.event.preventDefault(e);
		};

		var mousedown = function() {
			if(!param.hoverSelect) {
				hiLite(this);
			}
			if(this !== ul) {
				vxJS.event.serve(that, "choose");
			}
		};

		var click = function() {
			if(this !== ul) {
				toggleSelected(this.nodeName.toUpperCase() !== "LI" ? vxJS.dom.getParentElement(this, "li") : this);
			}
		};

		var keydown = function(e) {

			kdFlag = true;
			kc = e.keyCode;

			switch (kc) {
				case 13:
					vxJS.event.serve(that, "choose"); break;
				case 27:
					vxJS.event.serve(that, "cancel"); break;
				case 38:
					that.up(); break;
				case 40:
					that.down(); break;
				case 36:
					that.first(); break;
				case 35:
					that.last(); break;
				case 32:
					toggleSelected(current); break;
			}
			vxJS.event.preventDefault(e);
		};

		vxJS.event.addListener(ul, "mousedown", mousedown);
		vxJS.event.addListener(ul, "click", click);
		vxJS.event.addListener(ul, "keydown", keydown);
		vxJS.event.addListener(ul, "keypress", keypress);
		
		vxJS.event.addMousewheelListener(ul, function(e) { that[vxJS.event.getMousewheelDirection(e)](); });

		if(param.hoverSelect) {
			vxJS.event.addListener(ul, "mouseover", function() {
					hiLite(this);
				}
			);
		}
		fill(param.entries);

		/**
		 * public properties and functions
		 */
		that.getSelected = function() {
			var s = [], i;
			if(selected.length) {
				for(i = 0; i < selected.length; ++i) {
					s.push(findEntry(selected[i]));
				}
				return s;
			}
		};

		that.up = function() {
			if(current === ul.firstChild) {
				return;
			}
			if(!current && ul.lastChild) {
				setCurrent(ul.lastChild);
			}
			else {
				setCurrent(current.previousSibling);
			}
			scrollIn();
		};

		that.down = function() {
			if(current === ul.lastChild) {
				return;
			}
			if(!current && ul.firstChild) {
				setCurrent(ul.firstChild);
			}
			else {
				setCurrent(current.nextSibling);
			}
			scrollIn();
		};
		
		that.first = function() {
			if(current === ul.firstChild) {
				return;
			}
			setCurrent(ul.firstChild);
			scrollIn();
		};

		that.last = function() {
			if(current === ul.lastChild) {
				return;
			}
			setCurrent(ul.lastChild);
			scrollIn();
		};

		that.getRows	= function() { return entries ? entries.length : 0; };
		that.focus		= focus;
		that.fill		= fill;
		that.element	= ul;

		return that;
	}
};