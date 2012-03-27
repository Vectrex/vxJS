/**
 * calendar widget
 * @version 2.2.2 2012-03-27
 * @author Gregor Kofler
 * 
 * @param {Object} (optional) formElem element receiving data value
 *
 * @param {Object} configuration (optional)
 * 	trigger:		{Object} triggering element
 *	eType:			{String} event type
 *	dontHide:		{Boolean} show permanently
 *  initDate:		{Object} initial date value	
 *	noPast:			{Boolean|Date} allows only future dates | date after Date
 *	noFuture:		{Boolean|Date} allows only past dates | date before Date
 *	showCw:			{Boolean} have calendar weeks displayed
 *	inputLocale:	{String} input date format (date_de|date_us|date_iso),
 *	outputFormat:	{String} format string to format output inserted in formElem
 *	months:			{String} months name of months separated by spaces
 *	skinClass:		{String} className of calendar div, defaults to vxJS_calendar
 *	customShow:		{Function} callback function applying fx, when element is shown
 *	customHide:		{Function} callback function applying fx, when element is hidden
 *	alignTo:		{Object} element to which the calendar gets aligned to, defaults to formElem
 *
 * @param {Object} XHR Parameters for adding additional via XHR retrieved information
 * 
 * @return {Object} calendar widget
 * 
 * served events: "datePick", "monthChange", "yearChange", "showWidget", "hideWidget"
 */

vxJS.widget.calendar = function(formElem, config, xhrReq) {

	"use strict";

	if(typeof config !== "object") {
		config = {};
	}

	var	layer, shown, input, mNode = document.createTextNode(""), table, alignTo = config.alignTo || formElem, docFrag = document.createDocumentFragment(), that = {},
		triggerListenerId, docListenerId, dayCells, weekCells,
		now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate()),
		marked = config.initDate && config.initDate.constructor === Date ? config.initDate : null, sheetDate,
		locale = config.inputLocale || "date_de",
		format = config.outputFormat || (locale === "date_de" ? "%D.%M.%Y" : "%Y-%M-%D"),
		months = (config.months || "Jan Feb M\u00E4rz Apr Mai Juni Juli Aug Sept Okt Nov Dez").split(" "),
		showCw = config.showCw, noPast, noFuture, xhr, xhrActive;

	if(config.noPast) {
		noPast = config.noPast.constructor === Date ? config.noPast : today;
	}
	if(config.noFuture) {
		noFuture = config.noFuture.constructor === Date ? config.noFuture : today;
	}

	// US style not implemented yet
	var getBeginOfCW = function(cw, year, usStyle) {
		year = year || new Date().getFullYear();
			
		var	b = new Date(year, 0, 1),
			c = (cw - 1) * 7 + 1,
			d = b.getDay() || 7;
		return new Date(year, 0, (c - d) + (d > 4 ? 8 : 1));
	};

	var getElemDate = function() {
		var v = formElem.value.trim();

		// cw/year?
		if(/^\d\d?[ \/\-\.]+(?:\d{2}|\d{4})$/.test(v)) {
			v	= v.split(/[ \/\-\.]+/);
			return getBeginOfCW(v[0], (""+(marked || today).getFullYear()).slice(0, 4-v[1].length) + v[1], locale === "date_us");
		}

		// "normal" date
		else if((v = v.toDateTime(locale, true))) {
			return v;
		}
	};

	var getFirstEnabledDay = function(rowIndex) {
		var i;

		for (i = 0; i < 7; ++i) {
			if(!dayCells[rowIndex * 7 + i].disabled) {
				return dayCells[rowIndex * 7 + i];
			}
		}
	};

	var setSheetDate = function(d) {
		if(!d || d.constructor !== Date) {
			d = new Date();
		}
		if(sheetDate) {
			sheetDate.setMonth(d.getMonth());
			sheetDate.setFullYear(d.getFullYear());
		}
		else {
			sheetDate = new Date(d.getFullYear(), d.getMonth(), 1);
		}
	};

	var handleXhrResponse = function() {
		var	r = this.response.entries, l, d, firstDay = dayCells[0].date, m = firstDay.getMonth(),
			trail = m !== sheetDate.getMonth() ? new Date(firstDay.getFullYear(), m + 1, 0).getDate() - firstDay.getDate() : -1;

		xhrActive = false;
		vxJS.dom.removeClassName(table, "xhrActive");

		if(r && (l = r.length)) {
			while(l--) {
				if((d = +r[l].day) && d + trail >= 0 && dayCells[d + trail]) {
					if(r[l].disabled) {
						vxJS.dom.addClassName(dayCells[d + trail].elem, "disabled");
						dayCells[d + trail].disabled = true;
					}
					if(r[l].label) {
						dayCells[d + trail].elem.appendChild("div".create(r[l].label));
					}
				}
			}
		}
	};

	var fillCalendar = function() {
		var	w, r, i, cN, rows,
			m = sheetDate.getMonth(), y = sheetDate.getFullYear(), eom = new Date(y, m + 1, 0), days = eom.getDate(),
			prevTrail = new Date(y, m, (locale === "date_us" ? 1 : 0) ).getDay(),
			nextTrail = ((locale === "date_us" ? 6 : 7) - eom.getDay()) % 7,
			firstDay = new Date(y, m, 1 - prevTrail), loopDate;
		
		if(config.noYearInput) {
			mNode.nodeValue = months[m] + " " + y;
		}
		else {
			mNode.nodeValue = months[m];
			input.value = y;
		}

		dayCells = [];
		
		for(i = -prevTrail + 1; i <= days + nextTrail; ++i) {
			cN = [];
			loopDate = new Date(y, m, i);

			if(!((i + prevTrail - 1) % 7)) {
				r = "tr".create();
				docFrag.appendChild(r);
			}
			if((noPast && noPast > loopDate) || (noFuture && noFuture < loopDate)) {
				cN.push("disabled");
			}
			if(i < 1 || i > days) {
				cN.push("trail");
			}
			if(loopDate.toString() === today.toString()) {
				cN.push("today");
			}
			if(marked && loopDate.toString() === marked.toString()) {
				cN.push("marked");
			}

			r.appendChild("td".setProp("class", cN.join(" ")).create(loopDate.getDate()));

			dayCells[i + prevTrail - 1] = {
				date: loopDate,
				elem: r.lastChild,
				disabled: cN.indexOf("disabled") != -1
			};
		}

		docFrag.appendChild(r);

		if(showCw) {
			weekCells = [];
			w = w || firstDay.getCW(locale === "date_us");
			rows = docFrag.childNodes;

			for(i = 0; i < rows.length; ++i) {
				if(w > 52) {
					w = dayCells[i * 7].date.getCW(locale === "date_us");
				}
				rows[i].appendChild("td".create(w++));
				rows[i].lastChild.className = "weekCell" + (!getFirstEnabledDay(i) ? " disabled" : "");
				weekCells.push(rows[i].lastChild);
			}
		}

		table.replaceChild("tbody".create(docFrag), table.childNodes[1]);

		if(xhr) {
			xhr.use(xhrReq, { date: sheetDate.getFullYear() + "-" + ("0" + (sheetDate.getMonth() + 1)).slice(-2) + "-01" });
			xhr.submit();
			xhrActive = true;
			vxJS.dom.addClassName(table, "xhrActive");
		}
	};

	var createCalendar = function() {
		var d, bar = ["span".setProp("class", "prevMon").create("\u00AB"), "span".setProp("class", "mon").create(mNode), "span".setProp("class", "nextMon").create("\u00BB") ];

		table	= "table".create(["thead".create(), "tbody".create()]);

		if(!config.noYearInput) {
			input = "input".setProp([["maxLength", 4], ["class", "year"]]).create();
			bar = ["div".setProp("class", "selMon").create(bar), "div".setProp("class", "selYear").create(["span".setProp("class", "prevYear").create("\u00AB"), input,"span".setProp("class", "nextYear").create("\u00BB")])];
		}
 
		layer = "div".setProp("class", config.skinClass || "vxJS_calendar").create("div".create(["div".setProp("class", "vxJS_dragBar").create(bar), table]));

		switch(locale) {
			case "date_us":
				d = "S,M,T,W,T,F,S,CW";
				break;
			case "date_iso":
				d = "M,T,W,T,F,S,S,CW";
				break;
			default:
				d = "M,D,M,D,F,S,S,KW";
		}
		d = d.split(",");
		if(!showCw) {
			d.pop();
		}

		table.firstChild.appendChild("tr".create(d.domWrapWithTag("th")));

		if(input) {
			vxJS.event.addListener(input, "blur", function() {
				var y;
				if(/^\d{2,}$/.test(this.value)) {
					y = parseInt((""+new Date().getFullYear()).slice(0, 4-this.value.length) + this.value, 10);
					if(y !== sheetDate.getFullYear()) {
						sheetDate.setFullYear(y);
						fillCalendar();
						vxJS.event.serve(that, "yearChange");
					}
				}
				this.value = sheetDate.getFullYear();
			});
	
			vxJS.event.addListener(input, "keydown", function(e) {
				switch(e.keyCode) {
					case 27:
						this.value = sheetDate.getFullYear();
					case 13:
						this.blur();
				}
			});
		}

		var mark = function(n) {
			var prev = vxJS.dom.getElementsByClassName("marked", table)[0];
			if(prev) {
				vxJS.dom.removeClassName(prev, "marked");
			}
			vxJS.dom.addClassName(n, "marked");
		};

		vxJS.event.addListener(layer, "click", function(e) {
			var type, n, picked, c = this.className;

			switch(c) {
				case "prevMon":
					sheetDate.setMonth(sheetDate.getMonth() - 1);
					fillCalendar();
					type = "monthChange";
					break;

				case "nextMon":
					sheetDate.setMonth(sheetDate.getMonth() + 1);
					fillCalendar();
					type = "monthChange";
					break;

				case "prevYear":
					sheetDate.setFullYear(sheetDate.getFullYear() - 1);
					fillCalendar();
					type = "yearChange";
					break;

				case "nextYear":
					sheetDate.setFullYear(sheetDate.getFullYear() + 1);
					fillCalendar();
					type = "yearChange";
					break;

				default:
					if(xhrActive) {
						return;
					}
					if(this.nodeName.toLowerCase() == "td") {
						n = this;
					}
					else {
						n = vxJS.dom.getParentElement(this, "td");
					}
					if(n) {
						if(n.cellIndex == 7 && (picked = getFirstEnabledDay(n.parentNode.rowIndex - 1).date)) {
							type = "datePick";
						}
						else {
							c = dayCells[(n.parentNode.rowIndex - 1) * 7 + n.cellIndex]; 
							if(!c.disabled) {
								picked = c.date;
								type = "datePick";
								if(config.dontHide) {
									mark(n);
								}
							}
						}
					}
			}
			if(type) {
				if(type === "datePick") {
					marked = picked;

					if(formElem) {
						formElem.value = picked.format(format);
					}
					docListener();
				}
				vxJS.event.serve(that, type);
			}

			vxJS.event.cancelBubbling(e);
		});

		if(!config.dontHide) {
			layer.style.display = "none";
			layer.style.position = "absolute";
			document.body.appendChild(layer);
		}
	};

	var placeLayer = function() {
		var ePos = vxJS.dom.getElementOffset(alignTo), eSize = vxJS.dom.getElementSize(alignTo),
			scroll = vxJS.dom.getDocumentScroll(), size, s = layer.style, y;

		s.visibility = "hidden";
		s.display = "";
		size = vxJS.dom.getElementSize(layer);
		s.display = "none";
		s.visibility = "visible";

		if((ePos.y + eSize.y + size.y > vxJS.dom.getViewportSize().y + scroll.y) && (ePos.y - size.y > scroll.y)) {
			y = ePos.y - size.y;
		}
		else {
			y = ePos.y + eSize.y;
		}
		vxJS.dom.setElementPosition(layer, new Coord(ePos.x, y));
	};

	var show = function() {
		var v;

		if(shown) {
			return;
		}
		if(formElem) {
			v = getElemDate();
			if(v) {
				marked = v;
			}
		}
		setSheetDate(marked);
		fillCalendar();

		if(alignTo) {
			placeLayer();
		}
		if(typeof config.customShow == "function") {
			config.customShow.apply(that);
		}
		else {
			layer.style.display = "";
		}

		shown = true;
		vxJS.event.serve(that, "showWidget");
	};

	var hide = function() {
		if(shown) {
			if(typeof config.customHide == "function") {
				config.customHide.apply(that);
			}
			else {
				layer.style.display = "none";
			}
			shown = false;
			vxJS.event.serve(that, "hideWidget");
		}
	};

	var triggerListener = function(e) {
		if(formElem && formElem.disabled) {
			return;
		}

		vxJS.event.cancelBubbling(e);
		vxJS.event.removeListener(triggerListenerId);
		docListenerId = vxJS.event.addListener(document, "click", docListener);
		show();
	};

	var keydownListener = function(e) {
		var kc = e.keyCode, v;

		if(kc == 13 && config.dontHide) {
			v = getElemDate();
			if(!marked || v.toString() != marked.toString()) {
				marked = v;
				setSheetDate(v);
				fillCalendar();
			}
		}

		if([9, 13, 27].indexOf(kc) !== -1) {
			docListener();
		}
	};

	createCalendar();

	if(xhrReq) {
		xhr = vxJS.xhr();
		vxJS.event.addListener(xhr, "complete", handleXhrResponse);
		vxJS.event.addListener(xhr, "timeout", function() { xhrActive = false; vxJS.dom.removeClassName(table, "xhrActive"); });
	}

	if(config.trigger && !config.dontHide) {
		triggerListenerId = vxJS.event.addListener(config.trigger, config.eType || "click", triggerListener);

		var docListener = function() {
			vxJS.event.removeListener(docListenerId);
			triggerListenerId = vxJS.event.addListener(config.trigger, config.eType || "click", triggerListener);
			hide();
		};
	}
	else {
		if(formElem) {
			if(!marked) {
				marked = getElemDate();
			}
			setSheetDate(marked);
		}
		fillCalendar();

		docListener = function() {
			hide();
		};
	}

	if(formElem) {
		vxJS.event.addListener(formElem, "keydown", keydownListener);
	}
	
	/**
	 * expose container element, show(), hide()
	 */
	that.element = layer;
	that.show = show;
	that.hide = hide;

	/**
	 * get currently selected date from calendar as date object
	 */
	that.getDate = function() {
		return marked;
	};

	/**
	 * set date of calendar explicitly
	 * @param Date d
	 */
	that.setDate = function(d) {
		if(d && d.constructor === Date && !isNaN(d)) {
			marked = d;
			setSheetDate(d);
			fillCalendar();
		}
	};

	/**
	 * explicitly clear marked calendar date
	 */
	that.clearDate = function() {
		marked = null;
		setSheetDate(today);
		fillCalendar();
	};

	return that;
};