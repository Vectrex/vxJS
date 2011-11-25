/**
 * simple "slider" widget
 * 
 * @version 0.3.2 2011-06-06
 * @author Gregor Kofler
 * 
 * @param {Object} configuration (all properties are optional)
 *	min:		{Number} lower bound
 *	max:		{Number} upper bound
 *  dir:		{String} direction "x" or "y"
 *	steps:		{Number} allow only a defined number of steps between min and max
 *	value:		{Number} initial value
 *
 * @return {Object} slider object
 * 
 * served events: "valueChange", "grab", "release"
 */

vxJS.widget.slider = function(config) {
	if(!config) {
		config = {};
	}

	var min = config.min && +config.min || 0, max = config.max && +config.max || 1, len = max - min,
		steps = config.steps && parseInt(config.steps, 10),	dir = /^[xy]$/i.test(config.dir) ? config.dir.toLowerCase() : "x",
		hasRange = config.rangeMin || config.rangeMax, rangeMin, rangeMax,
		handles, value = [],
		element, eSize, eOffs, lastPos = [0, 0], s = {}, mmListenerId, muListenerId;

	var theLeft = (function() {
		var d = "div".setProp("class", "theLeft").create(), s = d.style;
		s.position = "absolute";
		s[dir === "y" ? "height" : "width"] = "0px";
		return d;
	}());

	var theRange = (function() {
		if(!hasRange) {
			return null;
		}
		var d = theLeft.cloneNode(true); 
		d.className = "theRange";
		return d;
	}());

	var handle = (function() {
		var d = "div".setProp("class", "handle").create("a".setProp("href", "#").create()), s = d.style;
		s.position = "absolute";
		s[dir === "y" ? "top" : "left"] = "0px";
		return d;
	}());

	var setHandlePos = function(pos, ndx) {
		if(steps) {
			pos = (pos*(steps - 1)).toFixed()/(steps - 1);
		}

		pos = Math.max(Math.min(pos, 1), 0);

		if(hasRange) {
			if(ndx && pos < rangeMin) {
				pos = rangeMin;
			}
			else if(!ndx && pos > 1 - rangeMin) {
				pos = 1 - rangeMin;
			}
		}

		if(lastPos[ndx] === pos) {
			return false;
		}

		if(hasRange) {
			if(ndx && pos - lastPos[0] < rangeMin) {
				setHandlePos(pos - rangeMin, 0);
			}
			else if(!ndx && lastPos[1] - pos < rangeMin) {
				setHandlePos(pos + rangeMin, 1);
			}
		}
		if(rangeMax) {
			if(ndx && pos - lastPos[0] > rangeMax) {
				setHandlePos(pos - rangeMax, 0);
			}
			else if(!ndx && lastPos[1] - pos > rangeMax) {
				setHandlePos(pos + rangeMax, 1);
			}
		}

		lastPos[ndx] = pos;

		if(dir == "y") {
			handles[ndx].style.top = (pos * 100) + "%";
			theLeft.style.height = (lastPos[0] * 100) + "%";
			if(hasRange) {
				theRange.style.top = (lastPos[0] * 100) + "%";
				theRange.style.height = ((lastPos[1] - lastPos[0])) * 100 + "%";
			}
		}
		else {
			handles[ndx].style.left = (pos * 100) + "%";
			theLeft.style.width = (lastPos[0] * 100) + "%";
			if(hasRange) {
				theRange.style.left = (lastPos[0] * 100) + "%";
				theRange.style.width = (lastPos[1] - lastPos[0]) * 100 + "%";
			}
		}

		value[ndx] = pos * len + min;
		return true;
	};

	var setValue = function(v) {
		eSize = vxJS.dom.getElementSize(element);
		if(hasRange) {
			if(!v.length) {
				v = [v, v];
			}
			if(isNaN(v[0]) || isNaN(v[1])) {
				return;
			}
			v = [(v[0] - min)/len, (v[1] - min)/len];

			if(rangeMin) {
				v[1] = Math.max(v[1], v[0] + rangeMin);
			}
			if(rangeMax) {
				v[1] = Math.min(v[1], v[0] + rangeMax);
			}

			setHandlePos(Math.max(v[0], 0), 0);
			setHandlePos(Math.min(v[1], 1), 1);
			return;
		}

		if(!isNaN(+v)) {
			setHandlePos((v-min)/len, 0);
		}
	};

	var mouseMove = function(ndx) {
		return function(e) {
			if(setHandlePos((vxJS.event.getAbsMousePos(e)[dir] - eOffs[dir])/eSize[dir], ndx)) {
				vxJS.event.serve(s, "valueChange");
			}
			vxJS.event.preventDefault(e);
		};
	};

	var mouseUp = function(ndx) {
		return function() {
			vxJS.event.removeListener(mmListenerId);
			vxJS.event.removeListener(muListenerId);
			vxJS.event.serve(s, "release");
			vxJS.dom.removeClassName(handles[ndx], "active");
		}
	};

	var mouseDown = function(e) {
		eSize = vxJS.dom.getElementSize(element);
		eOffs = vxJS.dom.getElementOffset(element);

		var pos = (vxJS.event.getAbsMousePos(e)[dir] - eOffs[dir])/eSize[dir], ndx = 0;

		if(hasRange) {
			if(Math.abs(pos - (lastPos[0] || 0)) >= Math.abs(pos - (lastPos[1] || 0))) {
				ndx = 1;
			}
		}

		if(setHandlePos(pos, ndx)) {
			vxJS.event.serve(s, "valueChange");
		}
		vxJS.dom.addClassName(handles[ndx], "active");
		vxJS.event.serve(s, "grab");

		mmListenerId = vxJS.event.addListener(document, "mousemove", mouseMove(ndx));
		muListenerId = vxJS.event.addListener(document, "mouseup", mouseUp(ndx));

		handles[ndx].firstChild.focus();

		vxJS.event.preventDefault(e);
	};

	var keyDown = function(e) {
		var kc = e.keyCode, ndx, d;

		if(kc == 37 || kc == 39) {
			ndx = this.parentNode == handles[1] ? 1 : 0;

			d = kc == 39 ? 1 : -1;

			if(steps) {
				if(setHandlePos(lastPos[ndx] + 1/steps * d, ndx)) {
					vxJS.event.serve(s, "valueChange");
				}
			}
			else {
				eSize = vxJS.dom.getElementSize(element);
				if(setHandlePos(lastPos[ndx] + 1/eSize[dir] * d, ndx)) {
					vxJS.event.serve(s, "valueChange");
				}
			}
			vxJS.event.preventDefault(e);
		}
	};

	handles = [handle];

	rangeMin = config.rangeMin/len || 0;
	rangeMax = config.rangeMax/len || 0;

	if(hasRange) {
		handles.push(handle.cloneNode(true));
	}

	element = "div".setProp("class", "vxJS_slider").create([theLeft, theRange].concat(handles));
	element.style.position = "relative";
	setValue(config.value || min);

	vxJS.event.addListener(element, "mousedown", mouseDown);
	vxJS.event.addListener(element, "keydown", keyDown);
	vxJS.event.addListener(element, "click", function(e) { vxJS.event.preventDefault(e); });

	s.element = element;
	s.setValue = setValue;
	s.getValue = function() { return hasRange ? value : value[0]; };
	
	return s;
};
