/**
 * calendar widget
 * @version 2.99.0 2018-03-06
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
 *	alignTo:		{Object} element to which the calendar gets aligned to, defaults to formElem
 *
 * @return {Object} calendar widget
 *
 * served events: "datePick", "monthChange", "yearChange", "showWidget", "hideWidget"
 */

vxJS.widget.calendar = function(formElem, config) {

	"use strict";

	if(typeof config !== "object") {
		config = {};
	}

	var	layer, shown, input, mNode = document.createTextNode(""), alignTo = config.alignTo || formElem, that = {},
		triggerListenerId, docListenerId, dayCells,
		now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate()),
		marked = config.initDate && config.initDate.constructor === Date ? config.initDate : null, sheetDate,
		locale = config.inputLocale || "date_de",
		format = config.outputFormat || (locale === "date_de" ? "%D.%M.%Y" : "%Y-%M-%D"),
		months = (config.months || "Jan Feb M\u00E4rz Apr Mai Juni Juli Aug Sept Okt Nov Dez").split(" "),
		showCw = config.showCw, noPast, noFuture;

	if(config.noPast) {
		noPast = config.noPast.constructor === Date ? config.noPast : today;
	}
	if(config.noFuture) {
		noFuture = config.noFuture.constructor === Date ? config.noFuture : today;
	}

	//@todo  US style not implemented yet

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
		if(/^\d\d?[ \/\-.]+(?:\d{2}|\d{4})$/.test(v)) {
			v	= v.split(/[ \/\-.]+/);
			return getBeginOfCW(v[0], (""+(marked || today).getFullYear()).slice(0, 4-v[1].length) + v[1], locale === "date_us");
		}

		// "normal" date
		else if((v = v.toDateTime(locale, true))) {
			return v;
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

	var fillCalendar = function() {
		var	w, i, cN, rowNdx, calendarBody = "div".setProp("class", "calendar-body").create(), cellContent,
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

			cN = ["calendar-date"];
			loopDate = new Date(y, m, i);

			if((noPast && noPast > loopDate) || (noFuture && noFuture < loopDate)) {
				cN.push("disabled");
			}
			if(i < 1) {
                cN.push("prev-month");
			}
			else if(i > days) {
                cN.push("next-month");
			}
			else {
				cN.push("current-month");
			}

			if(cN.indexOf("disabled") === -1) {
			    cellContent = "button".setProp("class", "date-item").create(loopDate.getDate());

                dayCells[i + prevTrail - 1] = {
                    date: loopDate,
                    elem: cellContent,
                    disabled: cN.indexOf("disabled") !== -1
                };
            }
            else {
			    cellContent = "span".setProp("class", "date-item").create(loopDate.getDate());
            }

            if(loopDate.toString() === today.toString()) {
                cellContent.classList.add("date-today");
            }
            if(marked && loopDate.toString() === marked.toString()) {
                cellContent.classList.add("active");
            }

            calendarBody.appendChild("div".setProp("class", cN.join(" ")).create(cellContent));

		}

		if(showCw) {
		    rowNdx = 0;
			w = firstDay.getCW(locale === "date_us");

			while(calendarBody.childNodes[rowNdx]) {
                if(w > 52) {
                    w = dayCells[i * 7].date.getCW(locale === "date_us");
                }
                calendarBody.insertBefore("div".setProp("class", "calendar-date cw").create("span".setProp("class", "date-item").create(w++)), calendarBody.childNodes[rowNdx]);
                rowNdx += 8;
            }

		}

		layer.querySelector(".calendar-container").replaceChild(calendarBody, layer.querySelector(".calendar-container").lastChild);

	};

	var createCalendar = function() {

		var d;

        // navbar

        var bar = ["button".setProp("class", "btn btn-action btn-link btn-large prvMon").create(), "div".setProp("class", "month navbar-primary").create(mNode), "button".setProp("class", "btn btn-action btn-link btn-large nxtMon").create() ];
		var body = "div".setProp("class", "calendar-container").create(["div".setProp("class", "calendar-header").create(), "div".setProp("class", "calendar-body").create()]);

		if(!config.noYearInput) {
			input = "input".setProp([["maxLength", 4], ["class", "year"]]).create();
			bar = ["div".setProp("class", "select-month").create(bar), "div".setProp("class", "select-year").create(["span".setProp("class", "prvYear").create(), input,"span".setProp("class", "nxtYear").create()])];
		}

		layer = "div".setProp("class", config.skinClass || ("calendar" + (config.showCw ? " cw" : ""))).create(["div".setProp("class", "calendar-nav navbar").create(bar), body]);

		switch(locale) {
			case "date_us":
				d = "CW,S,M,T,W,T,F,S";
				break;
			case "date_iso":
				d = "CW,M,T,W,T,F,S,S";
				break;
			default:
				d = "KW,M,D,M,D,F,S,S";
		}
		d = d.split(",");
		if(!showCw) {
			d.shift();
		}

		for(var i = 0; i < d.length; ++i) {
            body.firstChild.appendChild("div".setProp("class", "calendar-date").create(d[i]));
        }

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
			var prev = body.querySelector(".active");
			if(prev) {
				vxJS.dom.removeClassName(prev, "active");
			}
			vxJS.dom.addClassName(n, "active");
		};

		vxJS.event.addListener(layer, "click", function(e) {
			var type, picked, c = this.classList;

            vxJS.event.cancelBubbling(e);

            if(this.nodeName.toLowerCase() === 'button') {

            	if(c.contains("prvMon")) {
                    sheetDate.setMonth(sheetDate.getMonth() - 1);
                    fillCalendar();
                    type = "monthChange";
                }
                else if(c.contains("nxtMon")) {
                    sheetDate.setMonth(sheetDate.getMonth() + 1);
                    fillCalendar();
                    type = "monthChange";
                }
                else if(c.contains("prvYear")) {
                    sheetDate.setFullYear(sheetDate.getFullYear() - 1);
                    fillCalendar();
                    type = "yearChange";
                }
                else if(c.contains("nxtYear")) {
                    sheetDate.setFullYear(sheetDate.getFullYear() + 1);
                    fillCalendar();
                    type = "yearChange";
                }
                else {
            	    for(var i = dayCells.length; i--;) {
            	        if(dayCells[i].elem === this) {
            	            type = "datePick";
            	            picked = dayCells[i].date;

                            if (config.dontHide) {
                                mark(this.parentNode);
                            }
                            break;
                        }
                    }
                }

                if (type) {
                    if (type === "datePick") {
                        marked = picked;

                        if (formElem) {
                            formElem.value = picked.format(format);
                        }
                        docListener();
                    }
                    vxJS.event.serve(that, type);
                }
            }

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

		layer.style.display = "";
		shown = true;
		vxJS.event.serve(that, "showWidget");
	};

	var hide = function() {
		if(shown) {
			layer.style.display = "none";
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

		if(kc === 13 && config.dontHide) {
			v = getElemDate();
			if(!marked || v.toString() !== marked.toString()) {
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
		else {
			setSheetDate();
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
	 * @param d Date
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