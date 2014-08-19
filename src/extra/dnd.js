/**
 * drag and drop functionality
 * 
 * creates a drag and drop outlined by an (optional) bounding box
 * draggables and drop boxes can be added to this bounding box
 * 
 * @version 0.1.7 2010-09-12
 * @author Gregor Kofler
 * 
 * @param {Object} DOM element which provides bounding box (defaults to the body element)
 *
 * @return {Object} dnd object
 * 
 * served events:
 * "pick" (draggables, dnd object)
 * "_drop" (draggables, drop boxes, dnd object)
 * "beforeMouseMove", "afterMouseMove" (dnd object)
 * 
 */
/*global vxJS, Coord*/

vxJS.dnd = {};

(function() {

	var	dragged, body, mmId,
		containers = [], lookup = [],
		coords = {
			startPos: null,
			originalPos: null,
			oldPos: null,
			grabSpot: null,
			offset: null,
			draggedSize: null,
			containerPos: null,
			containerSize: null
		}; 

	var alignToDropBox = function(box) {
		var	o = coords.offset, d = new Coord(),
			tl = box.topLeft.add(coords.containerPos),
			br = box.bottomRight.add(coords.containerPos);
		
		if (o.x < tl.x) {
			d.x = tl.x - o.x;
		}
		else if (o.x + coords.draggedSize.x > br.x) {
			d.x = br.x - o.x - coords.draggedSize.x;
		}
		if (o.y < tl.y) {
			d.y = tl.y - o.y;
		}
		else if (o.y + coords.draggedSize.y > br.y) {
			d.y = br.y - o.y - coords.draggedSize.y;
		}

		vxJS.dom.setElementPosition(dragged.elem.element, coords.startPos.add(d));
	};

	var mousemoveListener = function(e) {
		var	dm = coords.oldPos,
			b1 = coords.containerPos,
			b2 = b1.add(coords.containerSize),
			d1 = coords.offset,
			d2 = d1.add(coords.draggedSize);

		vxJS.event.serve(dragged.ref, "beforeMouseMove", dragged);

		coords.oldPos = vxJS.event.getAbsMousePos(e);
		dm = coords.oldPos.sub(dm);

		if (d1.x + dm.x < b1.x) {
			dm.x = b1.x - d1.x;
		}
		else if (d2.x + dm.x > b2.x) {
			dm.x = b2.x - d2.x;
		}
		if (d1.y + dm.y < b1.y) {
			dm.y = b1.y - d1.y;
		}
		else if (d2.y + dm.y > b2.y) {
			dm.y = b2.y - d2.y;
		}
		
		if (d1.x <= b1.x && coords.oldPos.x < d1.x + coords.grabSpot.x) {
			dm.x = 0;
		}
		else if (d2.x >= b2.x && coords.oldPos.x > d1.x + coords.grabSpot.x) {
			dm.x = 0;
		}
		if (d1.y <= b1.y && coords.oldPos.y < d1.y + coords.grabSpot.y) {
			dm.y = 0;
		}
		else if (d2.y >= b2.y && coords.oldPos.y > d1.y + coords.grabSpot.y) {
			dm.y = 0;
		}

		coords.startPos = coords.startPos.add(dm);
		coords.offset =  coords.offset.add(dm);

		vxJS.dom.setElementPosition(dragged.elem.element, coords.startPos);
		
		vxJS.event.serve(dragged.ref, "afterMouseMove", dragged);
	};

	var mouseupListener = function(e) {
		var i, m, boxes, tl, br;

		if(mmId) {
			vxJS.event.removeListener(mmId);
			mmId = null;
		}

		if(!dragged) {
			return;
		}
		
		boxes = dragged.ref.dropBoxes; 
		dragged.ref.droppedInto = null;

		if (boxes.length) {
			m = vxJS.event.getAbsMousePos(e);

			for (i = boxes.length; i--;) {
				tl = boxes[i].topLeft.add(coords.containerPos);
				br = boxes[i].bottomRight.add(coords.containerPos);
				if (m.x > tl.x && m.x < br.x && m.y > tl.y && m.y < br.y) {
					dragged.ref.droppedInto = boxes[i].element;
					alignToDropBox(boxes[i]);
					vxJS.event.serve(dragged.ref.droppedInto, "_drop", dragged.ref);
					break;
				}
			}
		}

		vxJS.event.serve(dragged.elem, "_drop", dragged.ref);
		vxJS.event.serve(dragged.ref, "_drop", dragged);

		dragged = null;
		document.onselectstart = null;
	};

	var mousedownListener = function(e, t) {
		var i, elem, ref, box;

		for(i = lookup.length; i--;) {
			if(lookup[i].db === t) {
				dragged = lookup[i];
				break;
			}
		}

		ref = dragged.ref;
		elem = dragged.elem.element;

		elem.style.zIndex = ref.zIndex++;

		coords.oldPos			= vxJS.event.getAbsMousePos(e);
		coords.startPos			= coords.originalPos = vxJS.dom.getElementPosition(elem);
		coords.offset			= vxJS.dom.getElementOffset(elem);
		coords.grabSpot			= coords.oldPos.sub(coords.offset);
		coords.draggedSize		= vxJS.dom.getElementSize(elem);
		coords.containerSize	= vxJS.dom.getElementSize(ref.container);
		coords.containerPos		= vxJS.dom.getElementOffset(ref.container);

		for(i = ref.dropBoxes.length; i--;) {
			box = ref.dropBoxes[i];
			box.topLeft		= vxJS.dom.getElementOffset(box.element.element, ref.container);
			box.bottomRight	= box.topLeft.add(vxJS.dom.getElementSize(box.element.element));
		}

		if (!/INPUT|TEXTAREA/.test(this.nodeName.toUpperCase())) {
			document.onselectstart = function(){
				return false;
			};
			vxJS.event.preventDefault(e);
		}

		if(!mmId) {
			mmId = vxJS.event.addListener(body, "mousemove", mousemoveListener);
		}

		vxJS.event.serve(dragged.elem, "pick", dragged.ref);
		vxJS.event.serve(dragged.ref, "pick", dragged);
	};

	var mouseoutListener = function(e) {
		var to = e.relatedTarget || e.toElement;
		if(!to || to == window.document.documentElement || to == body) {
			mouseupListener(e);
		}
	};

	var addDraggable = function(elem) {

		var db, e = vxJS.element.register(elem), el = e.element, s = el.style, p, d = this.draggables, l = d.length;

		while(l--) {
			if(d[l].element == e) {
				return e;
			}
		}
		p = s.position || vxJS.dom.getStyle(el, "position");

		if(!p || p == "static") {
			s.position = "absolute";
			vxJS.dom.setElementPosition(el, vxJS.dom.getElementOffset(el, this.container));
		}
		else if(p != "relative") {
			vxJS.dom.setElementPosition(el, vxJS.dom.getElementOffset(el, this.container));
		}
		else {
			// deal with non-pixel units of relative positioned elements
		}

		db = vxJS.dom.getElementsByClassName("vxJS_dragBar", el)[0] || el;
		db.style.cursor = "move";
		db.className += " __vxJS_draggable";

		d.push({ element: e, dragbar: db });

		vxJS.event.addListener(db, "mousedown", mousedownListener);

		lookup.push({db: db, ref: this, elem: e });
		return e;
	};

	var addDropBox = function(elem) {
		var e = vxJS.element.register(elem);

		this.dropBoxes.push( { element: e } );
		return e;
	};

	var getMaxZIndex = function(container) {
		var i, e = container.getElementsByTagName("*"), z = 0;
		for (i = e.length; i--;) {
			z = e[i].style.zIndex > z ? e[i].style.zIndex + 1 : z + 1; 
		}
		return z;
	};

	vxJS.dnd.create = function(container) {
		var i, ref;

		if(!body) {
			body = window.document.body;
			vxJS.event.addListener(body, "mouseup", mouseupListener);
			vxJS.event.addListener(body, "mouseout", mouseoutListener);
		}

		if(!container || !container.nodeType || container.nodeType != 1) {
			container = body;
		}

		for(i = containers.length; i--; ) {
			if(containers[i].container === container) {
				return containers[i];
			}
		}

		ref = {
			container: container,
			draggables: [],
			dropBoxes: [],
			zIndex: getMaxZIndex(container),
			addDraggable: addDraggable,
			addDropBox: addDropBox,
			getAllCoords: function() { return coords; }
		};

		containers.push(ref);
		return ref;
	};
})();