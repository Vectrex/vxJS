/**
 * scrollable widget
 * 
 * @version 0.1.6 2010-12-28
 * @author Gregor Kofler
 *
 * @param {Object} parent DOM element; childNodes are searched for elements with className "scrollableItem"; defaults to document
 * @param {Object} configuration (all properties are optional)
 *	dir:		{String} direction of scrollable; allowed values are "x" and "y"; defaults to "x"
 *	buttons:	{Boolean} add buttons on both end of scrollable; defaults to false
 *	transition:	{String} scrolling transition, defaults to "decel"
 *
 * @return {Object} scrollable object
 * 
 * served events: none
 */
vxJS.widget.scrollable = function(parent, config) {
	var maskSize = new Coord(), ndx = 0, items = [], dir, pN, pS, prevButton, nextButton, moveQueue = [], active;

	if(!config) {
		config = {};
	}

	dir = config.dir === "y" ? "y" : "x";

	var wrap = function() {
		var d = "div".setProp("class", "wrapper").create(), s = d.style;
		s.position = "relative";
		s[dir == "x" ? "width" : "height"] = "30000em";
		return vxJS.element.register(d);
	}();

	var mask = function() {
		var d = "div".setProp("class", "mask").create(wrap.element), s = d.style; 
		s.position = "relative";
		s.overflow = "hidden";
		return d;
	}();

	vxJS.dom.getElementsByClassName("scrollableItem", parent || document).forEach( function(e) { items.push( { element: e, size: vxJS.dom.getElementSize(e) } ); });

	if(!items.length) {
		return;
	}

	pN = items[0].element.parentNode;
	pS = items[0].element.previousSibling;

	var updateButtons = function() {
		vxJS.dom[ndx ? "removeClassName" : "addClassName"](prevButton, "disabled");
		vxJS.dom[ndx < items.length - 1 ? "removeClassName" : "addClassName"](nextButton, "disabled");
	};

	var move = function(add, fromQueue) {
		if(active && !fromQueue) {
			moveQueue.push(add);
			return;
		}

		var nextNdx = ndx + add, delta = new Coord(), i, item, offset;

		if(nextNdx < 0)				{ nextNdx = 0; }
		if(nextNdx >= items.length)	{ nextNdx = items.length - 1; }

		if(nextNdx == ndx) {
			workQueue();
			return;
		}

		active = true;

		if(add > 0) {
			for(i = ndx; i++ < nextNdx;) {
				item = items[i];
				delta[dir] -= item.size[dir];
	
				offset = vxJS.dom.getElementOffset(item.element, mask);
				if(offset[dir] < maskSize[dir]) {
					delta[dir] += maskSize[dir] - offset[dir];
				}
			}
		}
		else {
			for(i = ndx; i-- > nextNdx;) {
				item = items[i];
				delta[dir] += item.size[dir];
	
				offset = vxJS.dom.getElementOffset(item.element, mask);
				if(offset[dir] + item.size[dir] > 0) {
					delta[dir] -= offset[dir] + item.size[dir];
				}
			}
		}

		wrap.pause(0).fx("moveRelative", { transition: config.transition || "decel", duration: delta.len()/1000, to: delta });

		ndx = nextNdx;

		if(config.buttons) {
			updateButtons();
		}
	};

	var workQueue = function(f) {
		if(moveQueue.length) {
			move(moveQueue.shift(), true);
		}
		else {
			active = false;
		}
	};

	vxJS.event.addListener(wrap, "finishFx", workQueue);


	var gotoPrev = function() {
		move(-1);
	};

	var gotoNext = function() {
		move(1);
	};

	var prepItem = function(i) {
		items.forEach(function(i) {
			wrap.element.appendChild(i.element);
			if(i.size.x > maskSize.x) { maskSize.x = i.size.x; }
			if(i.size.y > maskSize.y) { maskSize.y = i.size.y; }
		});
	};

	var handleKeydown = function(e) {
		var kc = e.keyCode;
		
		vxJS.event.preventDefault(e);

		if(dir == "x") {
			switch(kc) {
				case 37:
					gotoPrev();
					return;
				case 39:
					gotoNext();
					return;
			}
		}
		else {
			switch(kc) {
				case 38:
					gotoPrev();
					return;
				case 40:
					gotoNext();
					return;
			}
		}
	};

	var prepContainer = function() {
		var floatProp = typeof items[0].element.style.cssFloat == "string" ? "cssFloat" : "styleFloat", container;

		if(config.buttons) {
			prevButton	= "div".setProp("class", "prev disabled").create("a".create());
			nextButton	= "div".setProp("class", "next").create("a".create());

			vxJS.event.addListener(prevButton, "click", gotoPrev);
			vxJS.event.addListener(nextButton, "click", gotoNext);

			container = "div".setProp("class", "vxJS_scrollable").create([prevButton, mask, nextButton]);
		}
		else {
			container = "div".setProp("class", "vxJS_scrollable").create(mask);
		}

		container.tabIndex = -1;

		wrap.element.appendChild("div".setProp("class", "footer").create());
		vxJS.dom.setElementSize(mask, maskSize);

		pN.insertBefore(container, pS ? pS.nextSibling : pN.firstChild);
		if(dir == "x") {
			items.forEach(function(i) {
				i.element.style[floatProp] = "left";
			});
		}
		vxJS.event.addListener(container, "keydown", handleKeydown);
		vxJS.event.addMousewheelListener(container, function(e) { vxJS.event.getMousewheelDirection(e) == "up" ? gotoPrev() : gotoNext(); });

		return container;
	};

	var gotoNdx = function(newNdx) {
		move(newNdx - ndx);
	};

	items.forEach(prepItem);

	return {
		element: prepContainer(),
		gotoPrev: gotoPrev,
		gotoNext: gotoNext,
		gotoNdx: gotoNdx,
		gotoElem: function(elem) {
			var l = items.length;
			while(l--) {
				if(items[l].element === elem) {
					gotoNdx(l);
					return;
				}
			}
		},
		getCurrentItem: function() { return items[ndx]; }
	};
};