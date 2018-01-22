/**
 * sorTable widget
 * adds headers to table which allow sorting
 * 
 * @version 0.5.2 2018-01-21
 * @author Gregor Kofler
 *
 * @param {Object}	HTMLTableElement or tbody element which will have functionality added
 * @param {Object}	array columnFormat optional describing column format, core.js String.toDateTime()
 * 					number activeHeaderRowIndex select row, which will listen to click events; defaults to last row in table header
 *
 * served events: "beginSort", "finishSort", "dragStart", "dragStop"
 *
 * @todo provide optional column to sort upon startup
 *
 * @todo manual sort interferes with addRow(), removeRow()
 */
vxJS.widget.sorTable = function(table, config) {

	"use strict";

	if(!config) {
		config = {};
	}

	var	columnFormat = config.columnFormat && config.columnFormat.length ? config.columnFormat : [],
		th, tb, rows = [], cols = [], w, activeColumn, origSort = [], that = {},
		draggedRow, ind = {}, mouseUpId, mouseMoveId, clickListenerId;

	// drag and drop functionality

	var mouseMoveListener = function(e) {
		var mPos = vxJS.event.getAbsMousePos(e), y = draggedRow.pos.y, elem = draggedRow.elem, sib, next;

		if(mPos.y < y && (sib = vxJS.dom.prevSameNodeNameSibling(elem)) && mPos.y < (y -= sib.offsetHeight/2)) {
			while((next = vxJS.dom.prevSameNodeNameSibling(sib))) {
				if(mPos.y > y - sib.offsetHeight/2 - next.offsetHeight/2) {
					break;
				}
				y -= sib.offsetHeight;
				sib = next;
			}
			if(ind == sib) {
				return;
			}
			removeIndicator();
			ind.above = sib;
			vxJS.dom.addClassName(sib, "insertAbove");
		}
		else if(mPos.y > (y += elem.offsetHeight) && (sib = vxJS.dom.nextSameNodeNameSibling(elem)) && mPos.y > (y += sib.offsetHeight/2)) {
			while((next = vxJS.dom.nextSameNodeNameSibling(sib))) {
				if(mPos.y < y + sib.offsetHeight/2 + next.offsetHeight/2) {
					break;
				}
				y += sib.offsetHeight;
				sib = next;
			}
			if(ind == sib) {
				return;
			}
			removeIndicator();
			ind.below = sib;
			vxJS.dom.addClassName(sib, "insertBelow");
		}
		else {
			removeIndicator();
		}
		vxJS.event.preventDefault(e);
	};

	var stopDrag = function() {
		vxJS.event.removeListener(mouseUpId);
		vxJS.event.removeListener(mouseMoveId);

		if(ind.above) {
			ind.above.parentNode.insertBefore(draggedRow.elem, ind.above);
		}
		else if(ind.below) {
			ind.below.parentNode.insertBefore(draggedRow.elem, ind.below.nextSibling);
		}

		if(ind.below || ind.above) {
			loliteColumn(activeColumn);
			activeColumn = null;
		}

		vxJS.event.serve(that, "dragStop");

		vxJS.dom.removeClassName(draggedRow.elem, "dragged");
		removeIndicator();
		draggedRow = null;
	};

	var startDrag = function(e) {
		var p = this;

		while(p) {
			if(p.parentNode.parentNode == tb) {
				break;
			}
			p = p.parentNode;
		}

		if(!p || cols[p.cellIndex].format !== "manual") {
			return;
		}

		mouseMoveId	= vxJS.event.addListener(document, "mousemove", mouseMoveListener);
		mouseUpId	= vxJS.event.addListener(document, "mouseup", stopDrag);

		draggedRow = {
			elem: p.parentNode,
			pos: vxJS.dom.getElementOffset(p.parentNode)
		};

		vxJS.dom.addClassName(draggedRow.elem, "dragged");

		vxJS.event.serve(that, "dragStart");
		vxJS.event.preventDefault(e);
	};

	var removeIndicator = function() {
		if(ind.above) {
			vxJS.dom.removeClassName(ind.above, "insertAbove");
			ind.above = null;
		}
		else if(ind.below) {
			vxJS.dom.removeClassName(ind.below, "insertBelow");
			ind.below = null;
		}
	};

	// core functionality

	var hiliteColumn = function(col) {
		var i = rows.length;

		if (col) {
			vxJS.dom.removeClassName(col.elem, col.asc ? "desc" : "asc");
			vxJS.dom.addClassName(col.elem, col.asc ? "asc" : "desc");
			while(i--) {
				vxJS.dom.addClassName(rows[i].cells[col.ndx], "active");
			}
		}
	};

	var loliteColumn = function(col) {
		var i = rows.length;

		if (col) {
			vxJS.dom.removeClassName(col.elem, col.asc ? "asc" : "desc");
			while(i--) {
				vxJS.dom.removeClassName(rows[i].cells[col.ndx], "active");
			}
		}
	};

	var getColumnValues = function(ndx) {
		var i = rows.length, f = cols[ndx].format, vals = [], r;

		var valFuncs = {
				"float":		function(v) { return (/^[+\-]?(?:\d{1,3}(?:[ ,\x27]\d{3})+|\d+)(?:\.\d+)?$/).test(v) ? v.replace(/[^0-9.\-]/g, "") : v; },
				"float_comma":	function(v) { return (/^[+\-]?(?:\d{1,3}(?:[ .\x27]\d{3})+|\d+)(?:,\d+)?$/).test(v) ? v.replace(/[^0-9,\-]/g, "").replace(",", ".") : v; },
				"date":			function(v, f) { var d = v.toDateTime(f, true); return d ? d.format("%Y-%M-%D") : v; },
				"time":			function(v, f) { return v.toDateTime(f); }
			};

		if(f && /^(date_|time_)[a-z]+$/.test(f)) {
			f = f.split("_")[0];
		}

		if(!f || typeof f == "function") {
			while(i--) {
				r = rows[i];
				vals[i] = { element: r, value: vxJS.dom.concatText(r.cells[ndx]).toLowerCase() };
			}
		}
		else {
			while(i--) {
				r = rows[i];
				vals[i] = { element: r, value: valFuncs[f](vxJS.dom.concatText(rows[i].cells[ndx]), cols[ndx].format) };
			}
		}

		return vals;
	};

	var buildTable = function(vals) {
		var t = document.createDocumentFragment(), i = 0;

		rows = [];
		while(vals[i]) {
			rows[i] = vals[i].element;
			t.appendChild(rows[i++]);
		}
		tb.appendChild(t);
	};

	var doSort = function() {

		var cbSort = function() {
			var s = this.asc ? 1 : -1;

			if(/^(?:float|float_comma)$/.test(this.format)) {
				return function(a, b) {
					a = parseFloat(a.value);
					if(isNaN(a)) { return 1; }
					b = parseFloat(b.value);
					if(isNaN(b)) { return -1; }
					return (a - b) * s;
				};
			}

			return function(a, b) {
				if(a.value === b.value) { return 0; }
				return a.value < b.value ? -s : s;
			};
		};

		if(activeColumn) {

			vxJS.event.serve(that, "beginSort");

			buildTable(
				getColumnValues(activeColumn.ndx).
					sort(typeof activeColumn.format == "function" ? activeColumn.format.bind(activeColumn) : cbSort.bind(activeColumn)()
				)
			);

			vxJS.event.serve(that, "finishSort");

		}
	};

	var sortOnClick = function() {
		var c, n = this, ndx;

		while(!/th|td/i.test(n.nodeName) && n.parentNode) {
			n = n.parentNode;
		}

		if(typeof (ndx = n.cellIndex) == "undefined") {
			return;
		}
		c = cols[ndx];
		if(!/^no_sort|manual$/.test(c.format)) {
			loliteColumn(activeColumn);
			if(c === activeColumn) {
				c.asc = !c.asc;
			}
			else {
				activeColumn = c;
			}
			hiliteColumn(c);
			doSort();
		}
	};

	that.getActiveColumn = function() {
		return activeColumn;
	};

	that.initSort = function() {
		rows = vxJS.collectionToArray(tb.rows);
		origSort = [].concat(rows);

		if(activeColumn) {
			hiliteColumn(activeColumn);
		}
	};

	that.getCurrentOrder = function() {
		var i, l = rows.length, order = [];

		for(i = 0; i < l; ++i) {
			order.push(origSort.indexOf(tb.rows[i]));
		}
		return order;
	};

	that.insertRow = function(tr, ndx) {
		if(+ndx > rows.length || typeof ndx == "undefined") {
			ndx = rows.length;
		}
		origSort.splice(ndx, 0, tr);
		rows.splice(ndx, 0, tr);
		tb.insertBefore(tr, rows[ndx + 1] || null);
		if(activeColumn) {
			vxJS.dom.addClassName(tr.cells[activeColumn.ndx], "active");
		}
	};

	that.removeRow = function(tr) {
		origSort.splice(origSort.indexOf(tr), 1);
		rows.splice(rows.indexOf(tr), 1);
		tb.removeChild(tr);
	};

	that.replaceRow = function(newTr, oldTr) {
		origSort.splice(origSort.indexOf(oldTr), 1, newTr);
		rows.splice(rows.indexOf(oldTr), 1, newTr);
		tb.replaceChild(newTr, oldTr);

		if(activeColumn) {
			vxJS.dom.addClassName(newTr.cells[activeColumn.ndx], "active");
		}
	};

	that.removeAllRows = function() {
		var lc;

		origSort = [];
		rows = [];
		while(lc = tb.lastChild) {
			tb.removeChild(lc);
		}
	};

	that.updateRow = function(row, data) {
		if(!Array.isArray(data)) {
			return;
		}
		if(!row.nodeName || !row.nodeName.toLowerCase() == "tr") {
			row = rows[+ndx];
		}
		data.forEach(function(d, ndx) {
			var td = row.cells[ndx];

			if(d !== null) {
				vxJS.dom.deleteChildNodes(td);

				if(d.nodeType) {
					td.appendChild(d);
				}
				else {
					td.appendChild(document.createTextNode(d));
				}
			}
		});
	};

	that.sortBy = function(colNdx, dir) {
		var c = cols[colNdx];

		if(!/^no_sort|manual$/.test(c.format)) {

			c.asc = !dir || dir.toLowerCase() == "asc";

			if(c !== activeColumn) {
				loliteColumn(activeColumn);
				activeColumn = c;
			}
			hiliteColumn(c);
			doSort();
		}
	};

	that.enableSort = function() {
		if(!clickListenerId) {
			clickListenerId = vxJS.event.addListener(th.rows[typeof config.activeHeaderRowIndex === "undefined" ? th.rows.length - 1 : config.activeHeaderRowIndex], "click", sortOnClick);
			vxJS.dom.removeClassName(th, "disabled");
		}
	};

	that.disableSort = function() {
		if(clickListenerId) {
			vxJS.event.removeListener(clickListenerId);
			vxJS.dom.addClassName(th, "disabled");
			clickListenerId = null;
		}
	};
	
	that.getDraggedRow = function() {
		return draggedRow.elem;
	};

	that.reSort = doSort;

	(function() {
		var i, activeRowNdx;

		if (table.nodeName.toLowerCase() === "tbody") {
			tb = table;
			table = tb.parentNode;
		}
		else if (table.nodeName.toLowerCase() === "table") {
			tb = table.tBodies[0];
		}
		else {
			throw new Error("vxJS.widget.sorTable: No valid table or tbody element.");
		}

		th = table.getElementsByTagName("thead")[0];

		if(!th && !tb) {
			throw new Error("vxJS.widget.sorTable: neither tbody nor thead element found.");
		}

		// create missing thead

		if(!th) {
			th = "thead".create();
			tb.parentNode.insertBefore(th, tb);
			th.appendChild(tb.rows[0]);
		}

		// create missing tbody

		if(!tb) {
			tb = "tbody".create();
			th.parentNode.appendChild(tb);
		}

		activeRowNdx = typeof config.activeHeaderRowIndex === "undefined" ? th.rows.length - 1 : config.activeHeaderRowIndex;

		w = th.rows[activeRowNdx].cells.length;

		if(columnFormat.indexOf("manual") !== -1) {
			vxJS.event.addListener(tb, "mousedown", startDrag);
		}

		for (i = 0; i < w; ++i) {
			cols.push( { ndx: i, elem: th.rows[activeRowNdx].cells[i], format: columnFormat[i], asc: true } );
		}

		that.initSort();
		that.enableSort();
	}());

	that.element = tb;

	return that;
};