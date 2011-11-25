/**
 * @todo complete rework of handleDrop
 * @todo complete rework of makeDraggable
 * @todo mousedown listener
 */
if(!this.vxJS) { throw new Error("ddHandler: vxJS core missing."); }

if (!vxJS.ddHandler) {
	vxJS.ddHandler = function(){
	
		var dragged, lastZIndex, mmId,
			coords = {
				startPos: null,
				originalPos: null,
				oldPos: null,
				grabSpot: null
			};
		
		var alignToDropBox = function(box){
			var p = vxJS.dom.getElementOffset(dragged),
				b = vxJS.dom.getElementOffset(box), d = new Coord();
			
			if (p.x < b.x) {
				d.x = b.x - p.x;
			}
			else if (p.x + dragged.offsetWidth > b.x + box.offsetWidth) {
					d.x = b.x + box.offsetWidth - p.x - dragged.offsetWidth;
			}
			if (p.y < b.y) {
				d.y = b.y - p.y;
			}
			else if (p.y + dragged.offsetHeight > b.y + box.offsetHeight) {
				d.y = b.y + box.offsetHeight - p.y - dragged.offsetHeight;
			}
			
			vxJS.dom.setElementPosition(dragged, coords.startPos.add(d));
		};

		var getMaxZIndex = function(){
			var i, e = document.getElementsByTagName("*");
			for (i = e.length; i--;) {
				if (e[i].style.zIndex > lastZIndex) {
					lastZIndex = e[i].style.zIndex;
				}
				else {
					lastZIndex++;
				}
			}
			lastZIndex++;
		};

		var mmListener = function(e) {

			var dm, b1, b2, d1, d2;
			
			dm = coords.oldPos;
			coords.oldPos = vxJS.event.getAbsMousePos(e);
			dm = coords.oldPos.sub(dm);
			
			if (dragged.boundingBox) {
				b1 = vxJS.dom.getElementOffset(dragged.boundingBox.elem);
				b2 = b1.add(vxJS.dom.getElementSize(dragged.boundingBox.elem));
				d1 = vxJS.dom.getElementOffset(dragged.elem);
				d2 = d1.add(vxJS.dom.getElementSize(dragged.elem));
				
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
			}
			
			coords.startPos = coords.startPos.add(dm);
			vxJS.dom.setElementPosition(dragged.elem, coords.startPos);
		};

		vxJS.event.addListener(document, "mousedown", function(e){
			//check ob draggable Element then assign it dragged
			
			coords.oldPos = vxJS.event.getAbsMousePos(e);
			coords.startPos = coords.originalPos = vxJS.dom.getElementPosition(dragged);
			coords.grabSpot = coords.oldPos.sub(vxJS.dom.getElementOffset(dragged));

			vxJS.dom.setElementPosition(dragged, coords.startPos);
					
			if (!/INPUT|TEXTAREA/.test(this.nodeName)) {
				document.onselectstart = function(){
					return false;
				};
				vxJS.event.preventDefault(e);
			}
			
			mmId = vxJS.event.addListener(document, "mousemove", mmListener);
		});

		vxJS.event.addListener(document, "mouseup", function(e){
			if (!dragged) {
				return;
			}
			vxJS.event.removeListener(mmId);
			handleDrop(e);
			dragged = null;
			document.onselectstart = null;
		});

		var handleDrop = function(e){
			var i, m, box, p1, p2;
			
			if (typeof that.handleDrop == "function") {
				that.handleDrop(e);
				return;
			}
			
			if (elems.dropBoxes.length) {
				m = vxJS.event.getAbsMousePos(e);
				
				for (i = 0; i < elems.dropBoxes.length; i++) {
					box = elems.dropBoxes[i];
					p1 = vxJS.dom.getElementOffset(box);
					p2 = p1.add(vxJS.dom.getElementSize(box));
					if (m.x > p1.x && m.x < p2.x && m.y > p1.y && m.y < p2.y) {
						alignToDropBox(box);
						if (typeof elems.draggedElem.onDrop == "function") {
							elems.draggedElem.onDrop(box);
						}
						if (typeof box.onDrop == "function") {
							box.onDrop(draggedElem);
						}
						return;
					}
				}
				vxJS.dom.setElementPosition(elems.draggedElem, coords.originalPos);
				if (typeof elems.draggedElem.onBounceBack == "function") {
					elems.draggedElem.onBounceBack();
				}
			}
		};

		return  {
			// mousdown handler moves to element again
			makeDraggable: function(r){
				var db, e = r.element;
				
				if (e.style.position !== "absolute") {
					e.style.position = "relative";
				}
				if (e.style.position === "relative") {
					vxJS.dom.setElementPosition(e, { x: 0, y: 0 });
				}

				db = vxJS.dom.getElementsByClassName("vxJS_dragBar", e)[0] || e;
				db.style.cursor = "move";
				r.dragBar = db;

				vxJS.event.addListener(e, "mousedown", function(){
					this.style.zIndex = lastZIndex++;
				});
			}
		};
	}();
}