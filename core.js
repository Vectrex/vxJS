/**
 * core script for vxJS framework
 * 
 * @author Gregor Kofler, info@gregorkofler.at
 * @version 2.0.1 2012-06-22
 * 
 * kudos to David Mark's "My Library" at http://www.cinsoft.net
 * some code snippets are taken straight from his scripts
 *  
 * @todo purgeEvents() for removing listeners before removing DOM nodes
 * @todo cw us style
 * @todo gEBCN() for multiple class names
 * @todo optimize serve/custom event handling
 */ 

/**
 * Coord object
 */

"use strict";

var Coord = function(x, y) {
	this.x = !+x ? 0 : parseInt(x,10);
	this.y = !+y ? 0 : parseInt(y,10);
};

Coord.prototype = {
	add: function(c) {
		return new Coord(this.x+(!+c.x ? 0 : parseInt(c.x,10)), this.y+(!+c.y ? 0 : parseInt(c.y,10)));
	},
	sub: function(c) {
		return new Coord(this.x-(!+c.x ? 0 : parseInt(c.x,10)), this.y-(!+c.y ? 0 : parseInt(c.y,10)));
	},
	len: function() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
};

/**
 * Color object
 */
var Color = function(c) {
	var r, g, b, a;

	if(!c) {
		this.r = 0;
		this.g = 0;
		this.b = 0;
		this.a = 1;
		return;
	}
	if(/rgb\s*\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s(?:1|0)(?:\.\d+)?\s*)?\)/.test(c)) {
		c = c.slice(c.indexOf("(")+1, -1).split(",");
		r = +c[0];
		g = +c[1];
		b = +c[2];
		a = +c[3];
	}
	else if(c.slice(0, 1) === "#") {
		if(c.length === 4) {
			r = parseInt(c.slice(1, 2)+c.slice(1, 2), 16);
			g = parseInt(c.slice(2, 3)+c.slice(2, 3), 16);
			b = parseInt(c.slice(3)+c.slice(3), 16);
		}
		else {
			r = parseInt(c.slice(1, 3), 16);
			g = parseInt(c.slice(3, 5), 16);
			b = parseInt(c.slice(5, 7), 16);
			a = parseInt(c.slice(7), 16);
		}
	}
	this.r = isNaN(r) || r > 255 ? 255: r;
	this.g = isNaN(g) || g > 255 ? 255: g;
	this.b = isNaN(b) || b > 255 ? 255: b;
	this.a = isNaN(a) || a > 1 ? 1: a;
};

Color.prototype = {
	toHex: function() {
		return "#"+("00"+Math.round(this.r).toString(16)).slice(-2)+("00"+Math.round(this.g).toString(16)).slice(-2)+("00"+Math.round(this.b).toString(16)).slice(-2);
	},
	toRGB: function() {
		return "rgb("+Math.round(this.r)+","+Math.round(this.g)+","+Math.round(this.b)+")";
	}
};

/**
 * native object and prototype augmentation
 * 
 * Function.bind(newContext)
 * Array arr	= Object.keys()
 * Object obj	= Object.create()
 * Boolean res	= Array.isArray() 
 * Boolean res	= Array.prototype.inArray(needle)
 * number pos	= Array.prototype.indexOf(needle)
 * Array arr	= Array.prototype.copy()
 * Array arr	= Array.prototype.fill(value, count)
 * Array arr	= Array.prototype.map(callback[,this])
 * Array arr	= Array.prototype.filter(callback[,this])
 * Array.prototype.forEach(callback[,this])
 * 
 * Number sign	= Math.sgn(number)
 * String uuid	= Math.uuid()
 * 
 * String formatted Number = Number.toFormattedString(Number decimals, String dec_point, String thousands_sep)
 * (locale-free alternative for Number.toLocaleString()) 
 * 
 * String str	= String.trim()
 * String str	= String.lpad()
 * String str	= String.rpad()
 * String str	= String.shortenToLen(length)
 * String str | Date d	= String.toDateTime(locale, return as date object)
 * String str	= String.toUcFirst()
 */

if(typeof Function.prototype.bind !== "function") {
    Function.prototype.bind = function(context) {
    	var	slc = Array.prototype.slice, args = slc.call(arguments, 1), that = this, D = function() {},
    		f = function() { return that.apply(this instanceof D ? this : context, args.concat(slc.call(arguments, 0))); };
    	D.prototype = that.prototype;
        f.prototype = new D();
        return f;
    };
}

if(!Object.keys) {
	Object.keys = function(o) {
		var r = [], p;
		for(p in o) {
			if (o.hasOwnProperty(p)) {
				r.push(p);
			}
		}
		return r;
	};
}

if(!Object.create) {
	Object.create = function(o) {
		if(arguments.length > 1) {
			throw new Error("Object.create polyfill allows only one parameter.");
		}
		function F() {}
		F.prototype = o;
		return new F();
	};
}

if(!Array.isArray) {
	Array.isArray = function(a) { return Object.prototype.toString.call(a) == '[object Array]'; };
}

Array.prototype.copy = function () { return this.slice(0); };

Array.prototype.fill = function(val, cnt) {
	while(cnt--) {
		this.push(val);
	}
	return this;
};

if(!Array.prototype.forEach) {
	Array.prototype.forEach = function(f, that) {
		var i = 0, l = this.length;
		for(; i < l; ++i) {
			if (i in this) {
				f.call(that, this[i], i, this);
			}
	    }
	};
}

if(!Array.prototype.map) {
	Array.prototype.map = function(f, that) {
		var i = 0, l = this.length, r = new Array(l);
		for(; i < l; ++i) {
			if (i in this) {
				r[i] = f.call(that, this[i], i, this);
			}
	    }
		return r;
	};
}

if(!Array.prototype.filter) {  
	Array.prototype.filter = function(f, that) {  
		var i = 0, l = this.length, r = [], v;  
		for(; i < l; ++i) {
			if (i in this) {
				v = this[i];  
				if(f.call(that, v, i, this)) {  
					r.push(v);
				}
			}  
			return r;  
		}
	};
}

Array.prototype.swap = function(a, b) {
	if(typeof b === "undefined") { b = ++a; }
	if(a < 0 || a >= this.length || b < 0 || b >= this.length) { return; }
	var c = this[a];
	this[a] = this[b];
	this[b] = c;
};

if(!Array.prototype.indexOf) {
	Array.prototype.inArray = function(needle) {
		for (var i = this.length; i--;) { if(this[i] === needle) { return true; }}
		return false;
	};
	Array.prototype.indexOf = function(s, from) {
		var l = this.length, f = +from || 0;
		f = f < 0 ? Math.ceil(f) + l : Math.floor(f);
		for(; f < l; ++f) {
			if(f in this && this[f] === s) {
				return f;
			}
		}
		return -1;
	};
}
else {
	Array.prototype.inArray = function(needle) {
		return !(this.indexOf(needle) == -1);
	};
}

Math.sgn = function(n){
	n = typeof n !== "number"? parseFloat(n) : n;
	if(isNaN(n)) {
		return NaN;
	}
	return n < 0 ? -1 : 1;
};

Math.uuid = function() {
	var u = [], r, i = 36;
	u[8] = u[13] = u[18] = u[23] = "-"; u[14] = "4";
	while(i--) {
		if(!u[i]) {
			r = 0 | Math.random() * 16;
			u[i] = "0123456789ABCDEF"[i == 19 ? (r & 0x3 | 0x8) : r];
		}
	}
	return u.join("");
};

Number.prototype.toFormattedString = function(dec, decPoint, thdSep) {
	var f, p, t = "";

	decPoint = decPoint || ".";
	thdSep = thdSep || ",";
	dec = typeof dec === "number" ? Math.round(dec) : 0;

	f = this.toFixed(dec).toString();
	p = f.split(".");

	if(thdSep) {
		while(p[0].length > 3) {
			t = thdSep + p[0].slice(-3)+t;
			p[0] = p[0].slice(0, -3);
		}
		p[0] = p[0]+t;
	}
	return (Math.sgn(this) < 0 ? "-" : "") + p[0] + (p[1] ? (decPoint + p[1]) : "");
};

if(!String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/^\s\s*/, "").replace(/\s+$/, "");
	};
}

String.prototype.lpad = function(len, fchar) {
	var i = len-this.length, pad = "", f = fchar || " ";
	while(--i >= 0) { pad += f; }
	return pad+this;
};

String.prototype.rpad = function(len, fchar) {
	var i = len-this.length, pad = "", f = fchar || " ";
	while(--i >= 0) { pad += f; }
	return this+pad;
};

String.prototype.shortenToLen = function(len) {
	if(this.length < len) {
		return String(this);
	}
	var p = this.lastIndexOf(" ", len);
	if(p == -1) {
		return this.slice(0, len);
	}
	return this.slice(0, p).replace(/\s+$/g, "");
};

String.prototype.toFloat = function(decSep) {
	var d, f, i;

	d = this.split(decSep || ".");

	if(d.length > 2) {
		return NaN;
	}
	if(d[1] && !(f = parseInt(d[1], 10))) {
		return NaN;
	}
	if(!(i = d[0].replace(/[^0-9]/g, ""))) {
		return NaN;
	}
	return parseFloat(i+"."+f);
};

String.prototype.toDateTime = function(locale, asObj) {
	var del, erg, d, t, m, j, hr, min, sec, s = this.trim();

	locale = locale || "date_de";

	switch (locale) {
		case "date_us":

		case "date_de":
			del = s.match(/^\d{1,2}([\/.\-])\d{1,2}\1\d{0,4}$/);

			if(!del &&  /^([0-9]{4}|[0-9]{6}|[0-9]{8})$/.test(s)) {
				erg = [s.slice(0,2), s.slice(2,4), s.slice(4)];
			}
			else if(del && del.length === 2) {
				erg = s.split(del[1]);
				if(erg.length !== 3){ return false; }
			}
			else					{ return false; }

			d	= [	("00"+erg[0]).slice(-2),
					("00"+erg[1]).slice(-2),
					(""+new Date().getFullYear()).slice(0, 4-erg[2].length)+erg[2]];

			if(locale == "date_us") {
				t = +d[1];
				m = +d[0];
			}
			else {
				t = +d[0];
				m = +d[1];
			}
			j = +d[2];

			if(m < 1 || m > 12)								{ return false; }
			if(t < 1 || t > new Date(j, m, 0).getDate())	{ return false; }

			if(asObj) { return new Date(j, m-1, t); }
			del = locale == "date_de" ? "." : "/";
			return d[0]+del+d[1]+del+d[2];
		
		case "date_iso":
			del = s.match(/^\d{2}(\d{2})?([\/.\-])\d{1,2}\2\d{1,2}$/);

			if(!del && /^([0-9]{6}|[0-9]{8})$/.test(s)) {
				erg = [s.slice(0,2), s.slice(2,4), s.slice(4)];
			}
			else if(del && del.length === 3) {
				erg = s.split(del[2]);
				if(erg.length !== 3){ return false; }
			}
			else					{ return false; }

			d	= [
				(""+new Date().getFullYear()).slice(0, 4-erg[0].length)+erg[0],
				("00"+erg[1]).slice(-2),
				("00"+erg[2]).slice(-2)
			];

			j = +d[0];
			m = +d[1];
			t = +d[2];

			if(m < 1 || m > 12)								{ return false; }
			if(t < 1 || t > new Date(j, m, 0).getDate())	{ return false; }

			if(asObj) { return new Date(j, m-1, t); }
			return d[0]+"-"+d[1]+"-"+d[2];

		case "time_hm":
			del = s.match(/^\d{1,2}([:.\-])\d{1,2}$/);

			if(!del && /^[0-9]{4}$/.test(s)) {
				erg = [s.slice(0,2), s.slice(2)];
			}
			else if(del && del.length === 2) {			
				erg = s.split(del[1]);
				if(erg.length !== 2){
					return false;
				}
			}
			else {
				return false;
			}
			
			if(+erg[0] > 23 || +erg[1] > 59) {
				return false;
			}
			return ("00"+erg[0]).slice(-2)+":"+("00"+erg[1]).slice(-2);

		case "time_hms":
			del = s.match(/^\d{1,2}([:.\-])\d{1,2}\1\d{1,2}$/);
			if(!del &&  /^([0-9]{4}|[0-9]{6})$/.test(s)) {
				erg = [s.slice(0,2), s.slice(2,4), s.slice(4)];
			}
			else if(del && del.length === 2) {			
				erg = s.split(del[1]);
				if(erg.length !== 3){ return false; }
			}
			else 					{ return false; }

			hr = +erg[0];
			min = +erg[1];
			sec = +erg[2];

			if(hr > 23 || min > 59 || sec > 59) { return false; }
			return ("00"+hr).slice(-2)+":"+("00"+min).slice(-2)+":"+("00"+sec).slice(-2);
	}
};

String.prototype.toUcFirst = function() {
	return this.slice(0, 1).toUpperCase()+this.slice(1);
};

Date.prototype.format = function(format) {
	var	d = ""+this.getDate(),
		m = (this.getMonth()+1),
		y = this.getFullYear(),
		w = this.getCW(),
		z = ""+(w === 1 && m === 12 ? y+1 : w >= 52 && m === 1 ? y-1 : y);

	var c = {
		"%d": d,
		"%D": d.lpad(2, "0"),
		"%m": ""+m,
		"%M": (""+m).lpad(2, "0"),
		"%y": (""+y).slice(-2),
		"%Y": ""+y,
		"%w": ""+w,
		"%W": (""+w).lpad(2, "0"),
		"%z": z,
		"%Z": z.lpad(2, "0")
	};
	return format.replace(/%[dDmMyYwWzZ]{1}/g, function(m) { return c[m]; });	
};

Date.prototype.getAbsoluteDays = function() {
	return Math.floor(0.1 + this.getTime()/864e5);
};

Date.prototype.getCW = function(usStyle) {
	if (!usStyle) {
		var wt = this.getDay() || 7;
		var t = this.getAbsoluteDays();
		var y = new Date(new Date((t + 4 - wt) * 864e5).getFullYear(), 0, -10);
		return Math.floor((t - wt - y.getAbsoluteDays()) / 7);
	}

	var startDays = new Date(this.getFullYear(), 0, 1).getAbsoluteDays();

	if(new Date(this.getFullYear(), 0, 1).getDay() === 0) {
		return Math.floor((this.getAbsoluteDays() - startDays)/7) + 1;
	}
};

/**
 * creates DOM element, adds previously set attributes and adds optional child node(s) or text node
 * e.g. "div".create("p".create("Ich bin ein Absatz"));
 */
String.prototype.create = function(children) {
	var i, a, e = document.createElement(this);

	if(this.attr) {
		for(i = this.attr.length; i--;) {
			if(this.attr[i].name === "name") {
				try	{ e = document.createElement("<"+this+" name="+this.attr[i].value+">"); } catch(err) { }
				break;
			}
		}

		for(i = this.attr.length; i--;) {
			a = this.attr[i];
			if(a.name === "class") {
				e.className = a.value;
			}
			else if(a.name === "type") {
				e.setAttribute(a.name, a.value);
			}
			else {
				e[a.name] = a.value;
			}
		}
	}
	return vxJS.dom.appendChildren(e, children);
};

/**
 * sets one or more properties of a yet to create DOM element
 * e.g.: "img".setProp("src","test.jpg");
 * e.g.: "input".setProp[["class", "format"], ["type", "submit"]]);
 * returning a new string object is required by Google Chrome
 */
String.prototype.setProp = function(n, v) {
	var i, s = new String(this);
	if (!s.attr) { s.attr = []; }

	if (arguments.length > 1) {
		s.attr.push({name: n, value: v});
	}
	else if (arguments.length === 1 && Array.isArray(n)) {
		for (i = n.length; i--;) {
			s.attr.push({name : n[i][0], value : n[i][1]});
		}
	}
	return s;
};

/**
 * creates DOM elements for each element in array
 * e.g. ["td","td","td"].create();
 */
Array.prototype.create = function(children) {
	var i, e = [];
	for (i = 0; i < this.length; ++i) {
			e[i] = this[i].create(children);
	}
	return e;
};

/**
 * sets one or more attributes for each element in array
 * e.g. ["td","td"].setProp("class","myClass");
 */
Array.prototype.setProp = function(n, v) {
	for (var i = this.length; i--;) {
		this[i] = this[i].setProp(n, v);
	}
	return this;
};

/**
 * encloses array elements with given tags
 * if argument is an array every element is enclosed in all tags given in array
 * e.g. ["id","name","address"].domWrapWithTag("th");
 *      ["id","name","address"].domWrapWithTag(["a","strong","div"]);
 */
Array.prototype.domWrapWithTag = function(tag) {
	var i, j;
	var tags = "acronym|address|applet|area|a|base|basefont|big|blockquote|body|br|b|caption|center|cite|code|dd|dfn|dir|div|dl|dt|em|font|form|h1|h2|h3|h4|h5|h6|head|hr|html|img|input|i|kbd|link|li|map|menu|meta|ol|option|param|pre|p|q|samp|script|select|small|strike|strong|style|sub|sup|table|tbody|td|textarea|th|title|tr|tt|ul|u|var".split("|");
	if (typeof tag === "string") {
		for (i = 0; i < this.length; ++i) {
			if (tags.inArray(this[i]))	{ this[i] = tag.create(this[i].create()); }
			else						{ this[i] = tag.create(this[i]); }
		}
	}
	else {
		for (i = 0; i < this.length; ++i) {
			for (j = 0; j < tag.length; ++j) { this[i] = tag[j].create(this[i]); }
		}
	}
	return this;
};

/**
 * the namespaced functions
 */
if(!this.vxJS) {
	var vxJS = {};
}

(function(global) {
	var Rex = {
		isHM: /^(object|function)$/i,
		isNumberOrString: /^(string|number)$/,
		blanks: /\s+/
	};

	var win		= global,
		doc		= global.document,
		html	= doc.documentElement;

	var isHostMethod = function(o, m) {
		var t = typeof o[m];
		return !!((Rex.isHM.test(t) && o[m]) || t === "unknown");
	};

	var isHostProperty = function(o, p) {
		var t = typeof o[p];
		return !!(Rex.isHM.test(t) && o[p]);
	};

	var hasHostMethods = function(o, m) {
		for(var i = m.length; i--;) {
			if(!isHostMethod(o, m[i])) { return false; }
		}
		return true;
	};

	var isEmpty = function(o) {
		var p;

		if(typeof o !== "object") {
			return true;
		}
		for(p in o) {
			if(o.hasOwnProperty(p)) {
				return false;
			}
		}
		return true;
	};

	var merge = function(o, add) {
		var p;
		if(typeof o !== "object" || typeof add !== "object") {
			return;
		}
		for(p in add) {
			o[p] = add[p];
		}
		return o;
	};

	var collectionToArray = function(o) {
		return Array.prototype.slice.call(o, 0);
	};

	/**
	 * localStorage for IE lifted, simplified and updated from Wojo Design's solution
	 * https://github.com/wojodesign/local-storage-js/blob/master/storage.js
	 */
	if(!global.localStorage) {
		var div = "div".create(), attrKey = "localStorage";

		div.style.display = "none";
		doc.getElementsByTagName("head")[0].appendChild(div); // body not available yet

		if(div.addBehavior) {
			div.addBehavior("#default#userdata");

			div.load(attrKey);

			global.localStorage = {
				setItem: function(key , val) {
					div.load(attrKey);
				
					if(!div.getAttribute(key)){
						++this.length;
					}
					div.setAttribute(key , val);
					div.save(attrKey);
				},

				getItem: function(key) {
					div.load(attrKey);
					return div.getAttribute(key);
				},

				removeItem: function(key) {
					div.load(attrKey);
					div.removeAttribute(key);
					div.save(attrKey);
					if(this.length) {
						--this.length;
					}
				},

				clear: function() {
					var i = 0, attr;
					div.load(attrKey);
					while (attr = div.XMLDocument.documentElement.attributes[i++]) {
						div.removeAttribute(attr.name);
					}
					div.save(attrKey);
					this.length = 0;
				},

				key: function(key){
					div.load(attrKey);
					return div.XMLDocument.documentElement.attributes[key];
				},

				length: div.XMLDocument.documentElement.attributes.length
			};
		} 
	}
	
	/**
	 * wrapper functionality for both DOM elements and widgets,
	 * allowing fx, drag and drop, etc.
	 */
	vxJS.element = function() {
		var registry = [];

		var getElement = function(e) {
			var i = registry.length, r, ndx = e.nodeType && e.nodeType === 1 ? "element" : "widget";

			while(i--) {
				r = registry[i];
				if(r[ndx] && r[ndx] === e) {
					return r;
				}
			}
		};

		/**
		 * register element; element can either be dom element
		 * or widget that exposes an element property
		 */
		var register = function(e) {
			var o = getElement(e);
			if(!o) {
				o = new vxJS.E();

				if(e.element && e.element.nodeType === 1) {
					o.element = e.element;
					o.widget = e;
				}
				else if(e.nodeType && e.nodeType === 1) {
					o.element = e;
				}
				o.fxQueue = [];
				registry.push(o);
			}
			return o;
		};

		return {
			register: register,
			registry: registry
		};
	}();
	
	vxJS.E = function() {};

	vxJS.E.prototype = {

		/**
		 * simple wrapper for event.addListener()
		 * @param {String} event type
		 * @param {Function} listener function
		 */
		addListener: function(type, f) {
			vxJS.event.addListener(this, type, f);
			return this;
		},

		/**
		 * simple wrapper for event.removeListener()
		 * @param {Mixed} event type or reference of listener function
		 */
		removeListener: function(f) {
			vxJS.event.removeListener(this, f);
			return this;
		},
		
		/**
		 * add effect element
		 * @param {String} effect name
		 * @param {Object} effect parameters
		 */
		fx: function(effect, param) {
			if(vxJS.fx[effect]) {
				vxJS.fx.add(this, effect, param);
			}
			return this;
		},

		/**
		 * add pause effect element
		 * @param {Number} seconds to wait
		 */
		pause: function(duration) {
			vxJS.fx.pause(this, duration);
			return this;
		},

		/**
		 * clear entire fx queue
		 * effects freeze in current state
		 */
		clearFxQueue: function() {
			this.fxQueue = []; 
			return this;
		},

		/**
		 * retrieve active entry in fx queue 
		 */
		getActiveFx: function() {
			if(this.fxQueue && this.fxQueue.length) {
				return this.fxQueue[0];
			}
		}
	};

	vxJS.event = function() {
		var	model = function() {
				if		(hasHostMethods(document, ["createEvent", "addEventListener", "removeEventListener"]))	{ return "W3C"; }
				else if	(hasHostMethods(document, ["fireEvent", "attachEvent", "detachEvent"]))					{ return "MS"; }
				return "legacy";
			}(),
			registry = [], legacyInit = {}, regNdx = 0, suppEvts = {}, domReadyReg = [];

		var addLegacyListener = function(obj, type) {

			var attachTo = obj.element || obj;

			if(!legacyInit[type]) {
				legacyInit[type] = [];
			}

			if(!legacyInit[type].inArray(attachTo)) {

				legacyInit[type].push(attachTo);

				if(typeof attachTo["on" + type] === "function") {
					registry.push({ id: 0, elem: obj, type: type, callback: attachTo["on"+type], custom: false });
				}

				attachTo["on"+type] = function(e) {
					if(!e) {
						e = global.event;
					}
					var t = e.target || e.srcElement || attachTo, i, l;

					for(i = 0, l = registry.length; i < l; ++i) {
						if(registry[i].elem === obj && registry[i].type === e.type) {
							registry[i].callback.apply(t, [e, obj]);
						}
					}
					if(type == "mousewheel") {
						vxJS.event.preventDefault(e);
					}
				};
			}
			return attachTo["on"+type];
		};

		return {
			/**
			 * trigger event
			 * @param {Object} DOM element
			 * @param {String} type of event
			 */
			fireEvent: function(el, type) {
				switch (model) {
					case "W3C":
						var e = document.createEvent("Event");
						e.initEvent(type, true, true);
						el.dispatchEvent(e);
						return;
					case "MS":
						el.fireEvent("on" + type, document.createEventObject());
						return;
					default:
						el["on"+type]();
				}
			},

			addDomReadyListener: function() {
				var drListener = function(e) {
					var i = 0, l = domReadyReg.length;
					for(;i < l; ++i) {
						domReadyReg[i](e);
					}
				};

				if(isHostMethod(doc, "addEventListener")) {
					doc.addEventListener("DOMContentLoaded", drListener, false);
				}
				else if(isHostMethod(global, "addEventListener")) {
					global.addEventListener("load", drListener, false);
				}
				else if(isHostMethod(global, "attachEvent")) {
					global.attachEvent("onload", drListener);
				}
				else {
					if(typeof global.onload == "function") {
						domReadyReg.push(global.onload);
					}
					global.onload = drListener;
				}

				return function(cb) {
					domReadyReg.push(cb);
				};
			}(),

			/**
			 * add mousewheel listener - gets special treatment
			 * 
			 * @param {Object} DOM object to which event gets attached
			 * @param {Function} callback
			 */
			addMousewheelListener: function(obj, cb) {
				var n = "__ID__" + (regNdx++), f, type = "mousewheel";

				switch(model) {
					case "W3C":
						f = function(e) { cb.apply(e.target, [e, obj]); vxJS.event.preventDefault(e); };
						obj.addEventListener(type, f, false);
						obj.addEventListener("DOMMouseScroll", f, false);
						type = ["mousewheel", "DOMMouseScroll"];
						break;
					case "MS":
						obj.attachEvent("onmousewheel", f = function() { cb.apply(global.event.srcElement, [global.event, obj]); vxJS.event.preventDefault(global.event); });
						break;
					default:
						f = addLegacyListener(obj, "mousewheel");
				}

				registry.push({ id: n, elem: obj, type: type, fn: f, callback: cb, custom: false });
				return n;
			},

			removeMousewheelListener: function(id, f) {
				this.removeListener(id, (typeof id != "string" && !f) ? "mousewheel" : f);
			},

			/**
			 * add listener
			 * @param {Object} DOM or widget object to which event gets attached
			 * @param {String} type of event
			 * @param {Function} callback
			 */
			addListener: function(obj, type, cb) {
				var n = "__ID__" + (regNdx++), f, nat, elem = obj.element;

				if(nat = (obj.nodeType && obj.nodeType === 1 || obj === doc || obj === win || elem && !this.isCustomEvent(elem, type))) {
					switch (model) {
						case "W3C":
							(elem || obj).addEventListener(type, f = function(e) { cb.apply(e.target, [e, obj]); }, false);
							break;
						case "MS":
							(elem || obj).attachEvent("on"+type, f = function() { cb.apply(global.event.srcElement, [global.event, obj]); });
							break;
						default:
							f = addLegacyListener(obj, type);
					}
				}
				else {
					f = function(e) { cb.call(obj, e); };
				}

				registry.push({ id: n, elem: obj, type: type, fn: f, callback: cb, custom: !nat });
				return n;
			},

			/**
			 * remove listener
			 * @param {String} registry ID or {Object} listening element or widget
			 * @param {String} eventType or callback function, required if first parameter is no id
			 */
			removeListener: function(id, f) {
				var i, r;

				//remove by id
				if(typeof id == "string") {
					for(i = registry.length; i--;) {
						r = registry[i];
						if(r.id === id) { break; }
					}
				}
				else {
					// remove by element & type
					if(typeof f == "string") {
						if(id.element && !this.isCustomEvent(id.element, f)) {
							id = id.element;
						}
						for(i = registry.length; i--;) {
							r = registry[i];
							if(r.elem === id) {
								if(typeof r == "string" && r.type == f || r.type.indexOf(f) != -1) { break; } 
							}
						}
					}
					else {
						// remove by element & callback function
						for(i = registry.length; i--;) {
							r = registry[i];
							if((r.elem === id || r.elem.element && r.elem.element === id) && r.callback === f) { break; }
						}
					}
				}

				if(i < 0) {
					return;
				}

				registry.splice(i, 1);

				if(r.custom) {
					return;
				}

				switch (model) {
					case "W3C":
						if(typeof r.type == "string") {
							(r.elem.element || r.elem).removeEventListener(r.type, r.fn, false);
						}
						else {
							r.type.forEach(function(t) { (r.elem.element || r.elem).removeEventListener(t, r.fn, false); });
						}
						break;
					case "MS":
						if(typeof r.type == "string") {
							(r.elem.element || r.elem).detachEvent("on"+r.type, r.fn);
						}
						else {
							r.type.forEach(function(t) { (r.elem.element || r.elem).detachEvent("on"+t, r.fn); });
						}
						delete r.fn;
				}
			},

			/**
			 * allow custom event listeners for widgets
			 * @param {object} widget object
			 * @param {String} event type
			 * @param {object} optional parameters
			 */
			serve: function(obj, type, e) {
				var i = 0, r;
				while((r = registry[i++])) {
					if(r.elem === obj && r.type === type) {
						r.fn(e);
					}
				}
			},

			isCustomEvent: function(el, type) {
				var ndx;

				type = "on" + type;
				ndx = type + (el.tagName || "");

				if(typeof suppEvts[ndx] == "undefined") {
					suppEvts[ndx] = true;
					if(isHostMethod(el, "setAttribute")) {
			        	if(typeof el[type] == "undefined") {
			        		el.setAttribute(type, "return true;");
			        		suppEvts[ndx] = isHostMethod(el, type);
			        	}
			        }
				}
				return !suppEvts[ndx];
			},

			getAbsMousePos: function(e) {
				 return new Coord(e.clientX, e.clientY).add(vxJS.dom.getDocumentScroll());
			},

			getMouseButtons: function(e) {
				var b = e.which;
				if(typeof b !== "undefined") {
					return { left: b == 1, right: b == 2, middle: b == 3 };
				}
				b = e.button;
				return { left: b & 1, right: b & 2, middle: b & 4 };
			},

			getMousewheelDirection: function(e) {
				if(e.detail) {
					return e.detail < 1 ? "up" : "down";
				}
				return e.wheelDelta > 1 ? "up" : "down";
			},

			cancelBubbling: function(e) {
				if(isHostMethod(e, "stopPropagation")) {
					e.stopPropagation();
				}
				e.cancelBubble = true;
			},
			
			preventDefault: function(e) {
				if(isHostMethod(e, "preventDefault")) {
					e.preventDefault();
				}
				e.returnValue = false;
			}
		};
	}();

	vxJS.dom = {
		getBody: function() {
			var body;

			return function() {
				if(!body) {
					body = (doc.body && typeof doc.body === "object") ? doc.body : (doc.getElementsByTagName("body")[0] || null);
				}
				return body;
			};
		}(),

		unitToPixels: function() {
			var	e = document.createElement("div"), s = e.style,
				props = { position: "absolute", border: "none", margin: "0", padding: "0", height: "1px", visibility: "hidden" };

			Object.keys(props).forEach(function(p) { s[p] = props[p]; });

			return function(unit) {
				var w, b = this.getBody();

				s.width = "10" + unit;
				b.appendChild(e);
				w = e.offsetWidth/10;
				b.removeChild(e);

				return w;
			};
		}(),

		allowsFixedPosition: function() {
			var fixed;

			return function() {
				if(typeof fixed == "undefined") {
					var d = "div".create(), s = d.style, b = vxJS.dom.getBody(), o;

					s.position = "fixed";
					s.top = "0px";
					s.left = "0px";

					b.appendChild(d);
					o = vxJS.dom.getElementOffset(d);
					b.removeChild(d);

					fixed = !o.x && !o.y;

				}
				return fixed;
			};
		}(),

		setOpacity: function(elem, opac) {
			var s = elem.style, o = opac > 1 ? 1 : (opac < 0 ? 0 : opac);

			if(typeof s.opacity  === "string") {
				s.opacity = ""+o;
			}
			else if(typeof s.filter  === "string") {
				s.filter = "alpha(opacity="+(o * 100)+")";
			}
		},

		getOpacity: function(elem) {
			var s = elem.style, o;

			if(typeof s.opacity  === "string") {
				return !s.opacity ? 1 : +s.opacity;
			}

			if(elem.filters && typeof elem.filters.Alpha.opacity  !== "undefined") {
				return elem.filters.Alpha.opacity/100;
			}

			if(typeof s.filter  === "string") {
				o = s.filter.match(/\s*opacity\s*=\s*(\d+)/i);
				return o && o[1] ? o[1]/100 : 1;
			}

			return 1;
		},

		getStyle: function(elem, styleProp) {
			if(global.getComputedStyle) {
				return global.getComputedStyle( elem, "")[styleProp]; 
			}
			if(elem.currentStyle) {
				return elem.currentStyle[styleProp];
			}
			return false;
		},

		hasClassName: function(elem, cN) {
			return (" " + elem.className + " ").indexOf(" " + cN + " ") !== -1;
		},

		addClassName: function(elem, cN) {
			if(!this.hasClassName(elem, cN)) {
				elem.className += (elem.className.trim().length ? " " : "") + cN;
			}
		},

		removeClassName: function(elem, cN) {
			var c = elem.className.split(Rex.blanks), i = c.indexOf(cN);
			if(i !== -1) {
				c.splice(i ,1);
				elem.className = c.join(" ");
			}
		},

		appendChildren: function(elem, c) {
			var i;
		
			if (Rex.isNumberOrString.test(typeof c)) {
				elem.appendChild(document.createTextNode(c));
			}
			else if(c) {
				if(typeof c.length !== "undefined" && typeof c.nodeName === "undefined") {
					for (i = 0; i < c.length; ++i) {
						if (Rex.isNumberOrString.test(typeof c[i])) {
							elem.appendChild(document.createTextNode(c[i]));
						}
						else if(c[i]) { 
							elem.appendChild(c[i]);
						}
					}
				}
				else {
					elem.appendChild(c);
				}
			}
			return elem;
		},

		deleteChildNodes: function(n) {
			while(n.hasChildNodes()) {
				n.removeChild(n.lastChild);
			}
		},

		cleanDOM: function() {
			var r = /\S/;

			return function(n) {
				var i;

				if(n.nodeType === 8 || (n.nodeType === 3 && !r.test(n.data))) {
					n.parentNode.removeChild(n);
					return;
				}
				if(n.childNodes) {
					for(i = n.childNodes.length; i--;) {
						arguments.callee(n.childNodes[i]);
					}
				}
			};
		}(),

		walk: function (n, f) {
			f(n);
			n = n.firstChild;
			while (n) {
				this.walk(n, f);
				n = n.nextSibling;
			}
		},

		/**
		 * @param {String} class name
		 * @param {Object} parent node (optional)
		 * @param {String} nodeName, restricts selection to this node name (optional) 
		 */
		getElementsByClassName: function() {
			var regExpCache = {};

			if(isHostMethod(document, "getElementsByClassName")) {
				return function(c, parent, nn) {
					var nl = (parent || document).getElementsByClassName(c);
					if(!nn) {
						return collectionToArray(nl);
					}
					else {
						nn = nn.toUpperCase();
						return Array.prototype.filter.call(nl, function(e) { return e.nodeName == nn; });
					}
				};
			}

			if(isHostMethod(document, "evaluate")) {
				return function(c, parent, nn) {
					var	list = [], elem, nl, i = 0;

					nl = document.evaluate(
						".//" + (nn || "*").toLowerCase() + "[contains(concat(' ', @class, ' '), ' " + c + " ')]",
						parent || document,
						function(prefix) { return prefix === "html" ? "http://www.w3.org/1999/xhtml" : null; },
						XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
						null);

					while((elem = nl.snapshotItem(i))) {
						list[i++] = elem;
					}
					return list;
				};
			}

			return function(c, parent, nn) {
				var list = [], i = 0, elem, rex, ce = (parent ? parent : document).getElementsByTagName(nn ? nn.toLowerCase() : "*"), eCN;

				if(regExpCache[c]) {
					rex = regExpCache[c];
				}
				else {
					rex = new RegExp("(^|\\s)" + c + "(\\s|$)");
					regExpCache[c] = rex;
				}
				while ((elem = ce[i++])) {
					if((eCN = elem.className) && (eCN == c || rex.test(eCN))) {
						list.push(elem);
					}
				}
				return list;
			};
		}(),

		getParentElement: function(elem, tag) {
			var t, m, r;
			if(!tag) { return elem.parentNode || null; }

			if (/^[a-z0-9]+$/i.test(tag)) {
				t = tag.toUpperCase();
				while ((elem = elem.parentNode)) {
					if (elem.nodeName.toUpperCase() === t) {
						return elem;
					}
				}
			}
			else {
				m = tag.match(/^([a-z0-9]+)([\.#])(\w+)$/i);
				if(!m || m.length < 3) {
					return null;
				}
				t = m[1].toUpperCase();
				r = m[2] === "." ? new RegExp("\\b"+m[3]+"\\b") : null;
				while ((elem = elem.parentNode)) {
					if (elem.nodeName.toUpperCase() === t && (!r && elem.id === m[3] || r.test(elem.className))) {
						return elem;
					}
				}
			}
			return null;
		},

		getElementOffset: function(elem, container) {
			var pos, p, oP, doc = elem.ownerDocument, body = this.getBody();

			if(!container) {
				container = doc;
			}
			if(elem === container) {
				return new Coord(0, 0);
			}

			oP = isHostProperty(elem, "offsetParent") ? elem.offsetParent : null;
			p = elem.parentNode;
			pos = new Coord(elem.offsetLeft, elem.offsetTop);

			while(p && p !== container) {
				if(p !== body && p !== html) {
					pos.x -= p.scrollLeft;
					pos.y -= p.scrollTop;
				}
				if(p === oP) {
					if(p !== body) {
						pos.x += oP.offsetLeft;
						pos.y += oP.offsetTop;
						oP = p.offsetParent;
					}
				}
				p = p.parentNode;
			}

			return pos;
		},

		getElementPosition: function(elem) {
			return new Coord(parseInt(this.getStyle(elem, "left"), 10), parseInt(this.getStyle(elem, "top"), 10));
		},

		setElementPosition: function(elem, pos) {
			var s	= elem.style;
			s.left	= pos.x+"px";
			s.top	= pos.y+"px";
		},

		getElementSize: function(elem) {
			return new Coord(elem.offsetWidth, elem.offsetHeight);
		},

		getElementStyleSize: function(elem) {
			var s = elem.style, w = s.width, h = s.height, os = this.getElementSize(elem), size = new Coord(os.x, os.y);

			s.height = os.y + "px";
			size.y -= elem.offsetHeight - os.y;
			s.height = h;

			s.width = os.x + "px";
			size.x -= elem.offsetWidth - os.x;
			s.width = w;

			return size;
		},

		setElementSize: function(elem, dim) {
			var s	= elem.style;
			s.width	= dim.x+"px";
			s.height= dim.y+"px";
		},

		nextSameNodeNameSibling: function(n) {
			var nN = n.nodeName;
			while((n = n.nextSibling)) {
				if(n.nodeName === nN) {
					return n;
				}
			}
		},

		prevSameNodeNameSibling: function(n) {
			var nN = n.nodeName;
			while((n = n.previousSibling)) {
				if(n.nodeName === nN) {
					return n;
				}
			}
		},

		moveBefore: function(n1, n2) {
			var p = n1.parentNode;
			p.removeChild(n1);
			p.insertBefore(n1, n2);
		},
	
		moveAfter: function(n1, n2) {
			var p = n1.parentNode;
			p.removeChild(n1);
			p.insertBefore(n1, n2 ? n2.nextSibling : null);
		},

		concatText: function(n) {
			var t = "", i, j, c = n.childNodes;
			
			for (i = 0; i < c.length; i++){
				switch (c[i].nodeType){
					case 1:
						n = c[i].nodeName.toUpperCase();
						if (n === "INPUT" && c[i].type === "text") {
							t += c[i].value;
						}
						else if (n === "SELECT" && c[i].type === "select-one" && c[i].options && c[i].selectedIndex >= 0 && c[i].options[c[i].selectedIndex]) {
							t += this.concatText(c[i].options[c[i].selectedIndex]);
							break;
						}
						else if (n === "SELECT" && c[i].type === "select-multiple" && c[i].options) {
							for (j = c[i].options.length; j--;) {
								t += c[i].options[j].selected ? this.concatText(c[i].options[j]) : "";
							}
						}
						else if(n === "IMG") {
							t += c[i].title ? c[i].title : (c[i].alt ? c[i].alt : c[i].src);
						}
						else {
							t += this.concatText(c[i]);
						}	
						break;
					case 3:
						t += c[i].nodeValue;
				}
			}
			return t;
		},

		parse: function(elem) {
			var insertTree = function(n, p) {
				var i, l, e, pr = n.properties, d;

				if(n.node) {
					e = n.node.create();
				}
				else if(n.text){
					p.appendChild(document.createTextNode(n.text));
					return;
				}
				else if(n.html) {
					d = "div".create();
					d.innerHTML = n.html;
					while(d.firstChild) {
						p.appendChild(d.firstChild);
					}
					return;
				}
				else if(n.fragment){
					p.appendChild(n.fragment);
					return;
				}
				else {
					return;
				}

				if (typeof pr === "object") {
					for (i in pr) {
						if (pr.hasOwnProperty(i)) {
							if(i === "text") {
								e.appendChild(document.createTextNode(pr[i]));
							}
							else {
								e[i] = pr[i];
							}
						}
					}
				}
				if(n.childnodes && (l = n.childnodes.length)) {
					for(i = 0; i < l; i++) {
						insertTree(n.childnodes[i], e);
					}
				}
				p.appendChild(e);
			};

			var d = document.createDocumentFragment(), i;
			if(Array.isArray(elem)) {
				for(i = 0; i < elem.length; i++) {
					insertTree(elem[i], d);
				}
			}
			else {
				insertTree(elem, d);
			}
			return d;
		},

		getViewportSize: function() {
			var f;

			return function() {
				var body = this.getBody();

				if(f){
					return f();
				}
				var getRoot = typeof doc.compatMode === "string" ?
					function() {
						return (html && doc.compatMode.toLowerCase().indexOf("css") !== -1) ? html : body;
					} :
					function() {
						return (!html || html.clientWidth === 0) ? body : html;
					};

				if(html) {
					var scrollChecks = function() {
						var storeBorder, res = { compatMode: doc.compatMode },
							clH = html.clientHeight, bodyClH = body.clientHeight,
							div = doc.createElement("div");
		
						div.style.height = "100px";
						body.appendChild(div);
						res.body = !clH || clH != html.clientHeight;
						res.html = bodyClH != body.clientHeight;
						body.removeChild(div);
						if (res.body || res.html && (res.body != res.html)) {
							if (typeof body.clientTop == "number" && body.clientTop && html.clientWidth) {
								storeBorder = body.style.borderWidth;
								body.style.borderWidth = "0px";
								res.includeBordersInBody = body.clientHeight != bodyClH;
								body.style.borderWidth = storeBorder;
							}
							return res;
						}
					}();
				}

				if (typeof doc.clientWidth === "number") {
					f = function() {
						return new Coord(doc.clientWidth, doc.clientHeight);
					};
				}
				else if (html && typeof html.clientWidth === "number") {
					f = function() {
						var root = getRoot(), clH, clW;
	
						if(scrollChecks) {
							root = scrollChecks.body ? body : html;
						}
	
						clH = root.clientHeight;
						clW = root.clientWidth;
	
						if (scrollChecks && scrollChecks.body && scrollChecks.includeBordersInBody) {
							clH += body.clientTop * 2;
							clW += body.clientLeft * 2;
						}
						
						return new Coord(clW, clH);
					};
				}
				else if(typeof window.innerWidth === "number") {
					f = function() {
						return new Coord(win.innerWidth, win.innerHeight);
					};
				}
				if(f) {
					return f();
				}
			};
		}(),
		
		getDocumentScroll: (function() {
			return function() {
				if(typeof global.pageXOffset == "number") {
					this.getDocumentScroll = function() {
						return new Coord(
							global.pageXOffset,
							global.pageYOffset
						);
					};
				}

				else {
					this.getDocumentScroll = function() {
						return new Coord(
							Math.max(vxJS.dom.getBody().scrollLeft, html.scrollLeft),
							Math.max(vxJS.dom.getBody().scrollTop, html.scrollTop)
						);
					};
				}
				return this.getDocumentScroll();
			};
		}())
	};

	vxJS.selection = {
		getSelection: function() {
			if(isHostMethod(global, "getSelection")) {
				return function() { return global.getSelection(); };
			}
			else if(isHostMethod(doc, "selection")) {
				return function() { return doc.selection; };
			}}(),

		set: function(elem, s, len) {
			var r;
			
			s = s || 0;

			if(typeof len === "undefined") {
				len = elem.value.length - s;
			}

			if (isHostMethod(elem, "setSelectionRange")) {
				elem.setSelectionRange(s, s+len);
			}
			else if (isHostMethod(elem, "createTextRange")) {
				r = elem.createTextRange();
				r.moveStart("character", s);
				r.moveEnd("character", s + len - elem.value.length);
				r.select();
			}
			elem.focus();
		},

		get: function(elem) {
			var r, s;

			if(typeof elem.selectionStart !== "undefined") {
				return elem.value.substring(elem.selectionStart, elem.selectionEnd);
			}
			else {
				s = this.getSelection();
				if(s && isHostMethod(s, "createRange")) {
					r = s.createRange();
					if(r.parentElement == elem) {
						return r.text;
					}
				}
				else {
					return '';
				}
			}
		},
		
		getCaretPosition: function(elem) {
			var s, r, t, c;

			if(typeof elem.selectionStart !== "undefined") {
				return elem.selectionStart;
			}
			if((s = this.getSelection()) && isHostMethod(s, "createRange")) {
				elem.focus();
				r = s.createRange();
				t = elem.createTextRange();
				c = t.duplicate();
				t.moveToBookmark(r.getBookmark());
				c.setEndPoint("EndToStart", t);
				return c.text.length;
			}
		},

		setCaretPosition: function(elem, pos) {
			if (pos === "end") {
				this.set(elem, elem.value.length);
			}
			else {
				this.set(elem, +pos || 0, 0);
			}
		}
	};

	vxJS.isHostMethod		= isHostMethod;
	vxJS.isEmpty			= isEmpty;
	vxJS.merge				= merge;
	vxJS.collectionToArray	= collectionToArray;

	vxJS.widget = {};
})(this);
