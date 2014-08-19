/**
 * Drag and Drop List
 * 
 * allows to rearrange list elements with drag and drop
 * 
 * @version 0.2.2a 2012-03-03
 * @author Gregor Kofler
 * 
 * @param {Object} UL or OL element
 *
 * @return {Object} ddList object
 * 
 * served events:
 * swapEntry, pick, _drop
 */
/*global vxJS*/

if(!this.vxJS || !this.vxJS.dnd) { throw new Error("ddList: vxJS core or vxJS.dnd missing."); }

vxJS.widget.ddList = function(list) {
	if(!/^[uo]l$/i.test(list.nodeName)) {
		return;
	}

	vxJS.dom.setElementSize(list, vxJS.dom.getElementSize(list));

	var i, dnd = vxJS.dnd.create(list), c = list.getElementsByTagName("li"),
		origOrder = [], that = {};

	var moveEntries = function(e) {
		var	c = this.getAllCoords(),
			dragged = e.elem.element, next = vxJS.dom.nextSameNodeNameSibling(dragged), prev = vxJS.dom.prevSameNodeNameSibling(dragged),
			swap;

		if(swap = (next && vxJS.dom.getElementOffset(next).add(c.grabSpot).y < c.oldPos.y)) {
			vxJS.dom.moveAfter(dragged, next);
			c.startPos.y = vxJS.dom.getElementPosition(next).y;
		}
		else if(swap = (prev && vxJS.dom.getElementOffset(prev).add(c.grabSpot).y > c.oldPos.y)) {
			vxJS.dom.moveBefore(dragged, prev);
			c.startPos.y = vxJS.dom.getElementPosition(prev).y;
		}
		if(swap) {
			vxJS.dom.setElementPosition(dragged, c.startPos);
			vxJS.event.serve(that, "swapEntry");
		}
	};

	var handlePick = function(e) {
		that.pickedElement = e.elem.element;
		vxJS.event.serve(that, "pick");
	};

	var handleDrop = function(e) {
		vxJS.dom.setElementPosition(that.pickedElement, this.getAllCoords().originalPos);
		vxJS.event.serve(that, "_drop");
		that.pickedElement = null;
	};

	var getOriginalElemOrder = function() {
		return origOrder;
	};
	
	var getCurrentOrder = function() {
		var c = [], e = list.getElementsByTagName("li"), i, l = e.length;
		for(i = 0; i < l; ++i) {
			c.push(origOrder.indexOf(e[i]));
		}
		return c;
	};

	for(i = 0; i < c.length; ++i) {
		c[i].style.position = "relative";
		dnd.addDraggable(c[i]);
		c[i].className += " vxJS_ddList_"+i;
		origOrder.push(c[i]);
	}

	vxJS.event.addListener(dnd, "afterMouseMove", moveEntries);
	vxJS.event.addListener(dnd, "pick", handlePick);
	vxJS.event.addListener(dnd, "_drop", handleDrop);

	that.getOriginalElemOrder = getOriginalElemOrder;
	that.getCurrentOrder = getCurrentOrder;
	that.element = list;
	that.pickedElement = null;

	return that;
};