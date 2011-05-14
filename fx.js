/**
 * vxJS.fx simple effects library
 * @author Gregor Kofler
 * @version 0.4.8 2011-03-13
 * 
 * entries in registry {
 * 	element:	DOM object reference,
 * 	fx:			function object,
 * 	param:		object containing effects parameter and status
 * }
 * 
 * served events "finishFx", "finishFxGroup", "finishFxQueue"
 */
/*global vxJS */

if(!this.vxJS) { throw new Error("fx: vxJS core missing."); }

vxJS.fx = function() {
	var	im, timeoutId, registry = vxJS.element.registry, delay = 33;

	var	di = function() { window.clearTimeout(timeoutId); im = false; };

	var ei = function() { if(!im) { im = true; irq(); }};

	var add = function(obj, fx, param) {
		var addTo, last = obj.fxQueue.length;

		if(!last) {
			addTo = {};
			obj.fxQueue.push(addTo);
		}
		else {
			addTo = obj.fxQueue[--last];
		}

		if(!last) {
			if(!addTo[fx]) {
				if(vxJS.fx[fx].init) {
					vxJS.fx[fx].init.call(obj, param);
				}
				addTo[fx] = param;
			}
			else {
				if(vxJS.fx[fx].update) {
					vxJS.fx[fx].update.call(obj, addTo[fx], param);
				}
				else {
					addTo[fx] = vxJS.merge(addTo[fx], param);
				}
			}
		}
		else {
			addTo[fx] = param;
		}
		ei();
	};

	var pause = function(obj, duration) {
		obj.fxQueue.push({ pause: +duration || 0 });
		ei();
	};

	var irq = function() {
		var i, p, r, e, t = new Date().getTime(), d, cont = false;

		for(i = registry.length; i--;) {
			r = registry[i];

			if((e = r.fxQueue[0])) {
				if(typeof e.pause !== "undefined") {
					e.pause -= delay/1000;
					if(e.pause < 0) {
						delete e.pause;
					}
				}
				
				if(!e.pause) {
					for(p in e) {
						if(e.hasOwnProperty(p)) {
							if(!vxJS.fx[p].callback.call(r, e[p])) {
								if(vxJS.fx[p].destroy) {
									vxJS.fx[p].destroy.call(r, e[p]);
								}
								vxJS.event.serve(r, "finishFx", vxJS.merge({fx: p}, e[p]));
								delete e[p];
							}
						}
					}
					if(vxJS.isEmpty(e)) {
						r.fxQueue.shift();
						if((e = r.fxQueue[0])) {
							for(p in e) {
								if(e.hasOwnProperty(p) && vxJS.fx[p].init) {
									vxJS.fx[p].init.call(r, e[p]);
								}
							}
						}
						vxJS.event.serve(r, "finishFxGroup");
					}
				}
			}

			if(r.fxQueue.length) {
				cont = true;
			}
		}

		if((im = cont)) {
			d = new Date().getTime() - t;
			window.setTimeout(irq, delay - d > delay/2 ? delay - d : delay/2);
		}
		else {
			vxJS.event.serve(r, "finishFxQueue");
		}
	}; 

	return {
		setDelay:	function(d) { delay = parseInt(d, 10) || 33; },
		getDelay:	function() { return delay; },
		add:		add,
		pause:		pause,
		ei:			ei,
		di:			di
	};
}();

vxJS.fx.transition = function(){
	var pi = Math.PI;

	return {
		none:		function(x) { return x; },
		accel:		function(x) { return x * x * x; },
		decel:		function(x) { return 1 - (1- x) * (1- x) * (1- x); },
		easeInOut:	function(x) { return (Math.atan(x * pi - pi/2) + 1) / 2; },
	    boing :		function(x) { return 1 - (Math.cos(x * 4.5 * pi) * Math.exp(-x * 6)); }
	};
}();

vxJS.fx.moveRelative = {
	init: function(p) {
		var e = this.element;

		if(!p.to) {
			p.to = {};
		}
		if(!p.to.x || isNaN(+p.to.x)) {
			p.to.x = 0;
		} 
		if(!p.to.y || isNaN(+p.to.y)) {
			p.to.y = 0;
		} 
		if(!+p.duration) {
			p.duration = 1;
		}
		if(vxJS.dom.getStyle(e, "position") !== "absolute") {
			e.style.position = "relative";
		}
		p.from = vxJS.dom.getElementPosition(e);

		if(!p.transition || !vxJS.fx.transition[p.transition]) {
			p.transition = "none";
		}

		p._inc = 1/(p.duration * vxJS.fx.getDelay());
		p._add = 0;
	},

	update: function(p, change) {
		if(change.to && change.to.x && !isNaN(change.to.x)) {
			p.to.x = +change.to.x;
		}
		if(change.to && change.to.y && !isNaN(change.to.y)) {
			p.to.y = +change.to.y;
		}
		if(change.transition && !vxJS.fx.transition[change.transition]) {
			p.transition = change.transition;
		}
		if(+change.duration) {
			p.duration = change.duration;
			p._inc = p.duration/vxJS.fx.getDelay();
		}
	},

	callback: function(p) {
		var c = {}, t;

		p._add += p._inc;

		if(p._add >= 1) {
			c = p.to;
		}
		else {
			t = vxJS.fx.transition[p.transition](p._add);
			c.x = p.to.x * t;
			c.y = p.to.y * t;
		}
		vxJS.dom.setElementPosition(this.element, p.from.add(c));
		return p._add < 1;
	}
};

vxJS.fx.fade = {
	init: function(p) {
		var e = this.element, s = e.style;

		if(isNaN(+p.to)) {
			p.to = 1;
		}
		if(isNaN(+p.from)) {
			p.from = s.display == "none" ? 0 : vxJS.dom.getOpacity(e);
		}
		if(!+p.duration) {
			p.duration = 1;
		}
		p._inc = 1/(p.duration * vxJS.fx.getDelay());
		p._add = 0;
	},

	callback: function(p) {
		var e = this.element, o;

		p._add += p._inc;

		o = p._add >= 1 ? p.to : p.from + (p.to - p.from) * p._add;

		e.style.display = o > 0 ? "" : "none";
		vxJS.dom.setOpacity(e, o);

		return p._add < 1;
	},

	update: function(p, change) {
		var to = change.to;

		if(!isNaN(to)) {
			p.from = vxJS.dom.getOpacity(this.element);
			p.to = to; 
			p._add = 1 - p._add;
		}
	}
};

vxJS.fx.tweenColor = {
	init: function(p) {
		p.what = p.what !== "backgroundColor" ? "color" : "backgroundColor";

		if(!p.to || p.to.constructor !== Color) {
			p.to = new Color(p.to);
		}
		
		p.from = new Color(vxJS.dom.getStyle(this.element, p.what));

		if(!+p.duration) {
			p.duration = 1;
		}
		p._inc = 1/(p.duration * vxJS.fx.getDelay());
		p._add = 0;
	},

	callback: function(p) {
		var c;

		p._add += p._inc;

		c = p._add >= 1 ?
			p.to : {
				r: p.from.r + (p.to.r - p.from.r) * p._add,
				g: p.from.g + (p.to.g - p.from.g) * p._add,
				b: p.from.b + (p.to.b - p.from.b) * p._add
			};
		this.element.style[p.what] = Color.prototype.toHex.call(c);
		
		return p._add < 1;
	},

	update: function(p, change) {
		var to = change.to;

		if(to) {
			p.from = new Color(vxJS.dom.getStyle(this.element, p.what));
			if(to.constructor !== Color) {
				to = new Color(to);
			}
			p.to = to; 
			p._add = 1 - p._add;
		}
	}
};

vxJS.fx.roll = {
	init: function(p) {
		var e = this.element, s = e.style;

		if(!p.direction || !/^(up|down)$/.test(p.direction)) { 
			p.direction = "down";
		}
		if(!+p.duration) {
			p.duration = 1;
		}

		p._oldOverflow = s.overflow; 

		s.overflow = "hidden";
		s.display = "";
		s.height = "";

		if(p.direction === "down") {
			p.from = 0;
			p.to = vxJS.dom.getElementStyleSize(e).y;
		}
		else {
			p.from = vxJS.dom.getElementStyleSize(e).y;
			p.to = 0;
		}

		s.height = p.from + "px";

		if(!p.transition || !vxJS.fx.transition[p.transition]) {
			p.transition = "none";
		}

		p._inc = 1/(p.duration * vxJS.fx.getDelay());
		p._add = 0;
	},
	
	callback: function(p) {
		var r, t;

		p._add += p._inc;

		if(p._add >= 1) {
			r = p.to;
		}
		else {
			t = vxJS.fx.transition[p.transition](p._add);
			r = p.from + (p.to - p.from) * t;
		}
		this.element.style.height = r + "px";
		return p._add < 1;
	},

	update: function(p, change) {
		var e = this.element;

		if(change.direction && /^(up|down)$/.test(change.direction)) { 
			if(change.direction === "down") {
				p.from = 0;
				p.to = vxJS.dom.getElementStyleSize(e).y;
			}
			else {
				p.from = vxJS.dom.getElementStyleSize(e).y;
				p.to = 0;
			}
		}

		if(+change.duration) {
			p.duration = +change.duration;
			p._inc = 1/(p.duration * vxJS.fx.getDelay());
		}
	},

	destroy: function(p) {
		var s = this.element.style;

		s.overflow = p._oldOverflow;
		if(p.direction === "up") {
			s.display = "none";
		}
	}
};

vxJS.fx.slide = {
	init: function(p) {
		var e = this.element, s = e.style, ms, size, d = p.direction, axis = "y";

		s.display = "";
		size = vxJS.dom.getElementSize(e);

		if(!d || !/^(up|down|left|right)$/.test(d)) { 
			p.direction = d = "down";
		}
		if(!+p.duration) {
			p.duration = 1;
		}

		if(!p.transition || !vxJS.fx.transition[p.transition]) {
			p.transition = "none";
		}

		if(d == "up" || d == "down") {
			p._margin = "marginTop";
			p._dim = "height";
			ms = new Coord(size.x, d == "down" ? 0 : size.y);
		}
		else {
			axis = "x";
			p._margin = "marginLeft";
			p._dim = "width";
			ms = new Coord(d == "right" ? 0 : size.x, size.y);
		}
		if(d == "down" || d == "right") {
			p.from = 0;
			p.to = size[axis];
		}
		else {
			p.from = size[axis];
			p.to = 0;
		}

		p._mask = "div".create();
		vxJS.dom.setElementSize(p._mask, ms);
		p._mask.style.overflow = "hidden";
		p._mask[p._margin] = s[p._margin];
		s[p._margin] = -p.to + "px";

		e.parentNode.replaceChild(p._mask, e);
		p._mask.appendChild(e);

		p._inc = 1/(p.duration * vxJS.fx.getDelay());
		p._add = 0;
	},

	callback: function(p) {
		var s = this.element.style, r;

		p._add += p._inc;

		if(p._add >= 1) {
			r = p.to;
		}
		else {
			r = p.from + (p.to - p.from) * vxJS.fx.transition[p.transition](p._add);
		}

		p._mask.style[p._dim] = r + "px";
		if(p.direction == "down" || p.direction == "right") {
			s[p._margin] = (r - p.to) + "px";
		}
		else {
			s[p._margin] = (r - p.from) + "px";
		}

		return p._add < 1;
	},

	update: function() {
	},

	destroy: function(p) {
		var e = this.element, s = e.style;
		if(p.direction == "up" || p.direction == "left") {
			s.display = "none";
		}
		s[p._margin] = p._mask[p._margin];
		p._mask.parentNode.replaceChild(e, p._mask);
	}
};
