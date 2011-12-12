/**
 * simple "scorebar"
 * 
 * @version 0.1.9 2010-12-02
 * @author Gregor Kofler
 * 
 * @param {Object} configuration (all properties are optional)
 *	min:	{Number} lower bound
 *	max:	{Number} upper bound
 *	value:	{Number} initial value
 *	onGfx:	{String} image source property when element is "on"
 *	offGfx:	{String} image source property when element is "off"
 *	hoverGfx:{String} image source property when element is in hover state
 *
 * @return {Object} scorebar object
 * 
 * served events: "valueChange"
 * 
 */
/*global vxJS*/

if(!this.vxJS) { throw new Error("widget.scoreBar: vxJS core missing."); }

vxJS.widget.scoreBar = function(config) {
	var min, max, value, shown, v, len, bar, elements = [], hasGfx, that = {},
		hoverRex = /\s*(ndx_\d+_)?hover/g, onOffRex = /(off|on)/g, barOnRex = /\s*bar_\d+_on/, barHoverRex = /\s*bar_\d+_hover/;

	var blurBar = function(e) {
		var i, n, to = e.relatedTarget || e.toElement;

		if(!to || to === bar || vxJS.dom.getParentElement(to, "div.vxJS_scoreBar") === bar) {
			return;
		}

		for(i = len; i--;) {
			n = elements[i];
			n.elem.className = n.elem.className.replace(hoverRex, "");
			if(hasGfx) {
				n.img.src = (typeof value === "undefined" || i > value - min) ? config.offGfx : config.onGfx;
			}
		}
	};

	var hover = function() {
		var i, e;

		if(this === bar) {
			return;
		}

		for(i = len; i--;) {
			if(elements[i].elem === this || hasGfx && (elements[i].img === this)) {
				bar.className = bar.className.replace(barHoverRex, "") + " bar_" + i + "_hover";
				shown = i;
				break;
			}
		}
		if(i === -1) {
			return;
		}

		for(i = len; i--;) {
			e = elements[i];
			if(i > shown) {
				e.elem.className = e.elem.className.replace(hoverRex, "");
				if(hasGfx) {
					e.img.src = (typeof value === "undefined" || i > value - min) ? config.offGfx : config.onGfx;
				}
			}
			else if(e.elem.className.indexOf("hover") === -1) {
				vxJS.dom.addClassName(e.elem, "hover ndx_" + i + "_hover");
				if(hasGfx) {
					e.img.src = config.hoverGfx;
				}
			}
		}
	};

	var setBar = function(v) {
		var i, n, c;
		
		for(i = len; i--;) {
			n = elements[i];
			c = i > v ? "off" : "on";
			n.elem.className = n.elem.className.replace(onOffRex, c);
			if(hasGfx && i > v) {
				n.img.src = config.offGfx;
			}
		}

		bar.className = bar.className.replace(barOnRex, "") + " bar_" + v + "_on";
	};

	var setValue = function() {
		if(value === shown + min) {
			return;
		}
		value = shown + min;
		setBar(shown);
		vxJS.event.serve(that, "valueChange");
	};

	var makeBar = function() {
		var i, e, c;
		bar = "div".setProp("class", "vxJS_scoreBar" + (typeof value != "undefined" ? " bar_" + v + "_on" : "")).create();

		for (i = min; i <= max; ++i) {
			c = typeof value !== "undefined" && i <= value ? "on" : "off";
			e = { elem : "div".setProp("class", c + " " + " ndx_" + c + "_" + (i - min)).create() };
			if(hasGfx) {
				e.img = "img".setProp([["src", c === "on" ? config.onGfx : config.offGfx], ["alt", i], ["title", i]]).create();
				e.elem.appendChild(e.img);
			}
			elements.push(e);
			bar.appendChild(e.elem);
		}

		vxJS.event.addListener(bar, "mouseout", blurBar);
		vxJS.event.addListener(bar, "click", setValue);
		vxJS.event.addListener(bar, "mouseover", hover);
	};

	if(!config || typeof config !== "object") {
		config = {};
	}

	min = parseInt(config.min, 10) || 0;
	max = parseInt(config.max, 10) || 9;
	hasGfx = !!(config.offGfx && config.onGfx && config.hoverGfx);
	v = parseInt(config.value, 10);
	if(!isNaN(v)) {
		value = v < min ? min : (v > max ? max : v);
	}
	len = max - min + 1;

	makeBar();

	that.setValue = function(v) {
		var int = parseInt(v, 10);
		if(isNaN(int)) {
			value = null;
			setBar(-1);
		}
		else {
			value = int < min ? min : (int > max ? max : int);
			setBar(int - min);
		}
	};
	that.getValue = function() { return value; };
	that.element = bar;
	
	return that;
};