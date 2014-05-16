/**
 * automatically structure content with a tab panel
 * searches for .vxJS_tabThis elements
 * .section elements within .vxJS_tabThis form the views
 * the first h2 element of a .section is used as tab label
 * tabs inherit both text content and classNames of their respective h2 elements
 * 
 * pushState() is used when config.setHash is set and browser support suffices
 * 
 * @version 0.3.1 2014-05-16
 * @author Gregor Kofler
 *
 * @param [{Object} HTMLElement]:
 * 		root elemement searched for tabs, defaults to document
 * @param [{Object} config]:
 *		tabWrap: {String | Array} nodeName(s) of extra container element(s) for each tab
 *		shortenLabelsTo: {Number} shorten labels to the given number of chars or preceeding word boundary
 *		setHash: {Boolean} when true, tab ids will modify URI hash
 *		spacersTop: {Object} additional DOM element(s) inserted before the ul element
 *		spacersBottom: {Object} additional DOM element(s) inserted after the ul element
 *
 * served events: "beforeTabClick", "afterTabClick"
 */

/*jslint browser: true, eqeq: true, plusplus: true, vars: true, white: true */

vxJS.widget.simpleTabs = (function() {

	"use strict";
	
	var conf, supportsHistory = vxJS.hasHostMethods(window.history, ["pushState", "replaceState"]), tabBars = [];

	var TabBar = function() {
		this.tabs = [];
	};

	TabBar.prototype = {

		enable: function() {
			this.inactive = false;
			vxJS.dom.removeClassName(this.element, "disabled");
		},

		disable: function() {
			this.inactive = true;
			vxJS.dom.addClassName(this.element, "disabled");
		},

		getTabByElement: function(elem) {
			var l = this.tabs.length;
			while(l--) {
				if(this.tabs[l].tab === elem) {
					return this.tabs[l];
				}
			}
		},

		getTabByNdx: function(ndx) {
			return this.tabs[ndx];
		},

		getTabById: function(id) {
			var l = this.tabs.length;
			while(l--) {
				if(this.tabs[l].id === id) {
					return this.tabs[l];
				}
			}
		},

		gotoTab: function(tab, pushState) {
			var l = this.last;

			if(!tab || this.tabs.indexOf(tab) === -1 || l === tab) {
				return;
			}

			l.visibility = false;
			vxJS.dom.removeClassName(l.tab, "shown");
			l.page.style.display = "none";

			vxJS.dom.addClassName(tab.tab, "shown");
			tab.visibility = true;
			tab.page.style.display = "";

			this.last = tab;
			
			if(pushState) {
				if(tab.id && conf.setHash) {
					if(supportsHistory) {
						window.history.pushState(tab.id, "", "#" + tab.id);
					}
					else {
						window.location = "#" + tab.id;
					}
				}
			}
		},

		gotoPrevTab: function(pushState) {
			this.gotoTab(this.last.prevTab, pushState);
		},

		gotoNextTab: function(pushState) {
			this.gotoTab(this.last.nextTab, pushState);
		},

		focus: function(tab, pushState) {
			var a;

			this.gotoTab(tab, pushState);
			a = this.last.tab.getElementsByTagName("a");
			if(a && a[0]) {
				a[0].focus();
			}
		}
	};

	if(supportsHistory) {
		vxJS.event.addListener(window, "popstate", function(e) {
			var l = tabBars.length, found;

			if(e.state) {
				while(l--) {
					if(found = tabBars[l].getTabById(e.state)) {
						break;
					}
				}
			}
			if(found) {
				tabBars[l].gotoTab(found, false);
			}
		});
	}

	return function(root, config) {
		var tabbed = vxJS.dom.getElementsByClassName("vxJS_tabThis", root), tbCount = tabbed.length, hash = window.location.hash.slice(1) || "";

		conf = config || {};

		var clickListener = function(e, bar) {
			var tab;
			
			if(!bar.inactive) {
				vxJS.event.serve(bar, "beforeTabClick");
				tab = bar.getTabByElement((!this.nodeName || this.nodeName.toUpperCase() !== "LI") ? vxJS.dom.getParentElement(this, "li") : this);
				bar.gotoTab(tab, true);
				vxJS.event.serve(bar, "afterTabClick");
			}

			vxJS.event.preventDefault(e);
		};

		while(tbCount--) {
			(function(container) {
				var secs = vxJS.dom.getElementsByClassName("section", container),
					ctrl = new TabBar(), h, ul, init, i, l, label = "", txt, id, t, li, a, w, wl;

				for(i = 0, l = secs.length; i < l; ++i) {
					h = secs[i].getElementsByTagName("h2");

					if(h[0]) {
						secs[i].style.display = "none";
						txt = vxJS.dom.concatText(h[0]);

						label = conf.shortenLabelsTo ? txt.shortenToLen(conf.shortenLabelsTo) : txt;

						if(label.length !== txt.length) {
							label += "...";
						}
						else {
							txt = "";
						}

						id = h[0].id;

						a = id ? "a".setProp("href", "#" + id).create(label) : document.createTextNode(label);

						li = "li".setProp("title", txt).create();

						if(!(w = conf.tabWrap)) {
							li.appendChild(a);
						}
						else if(typeof w == "string") {
							li.appendChild(w.create(a));
						}
						else {
							wl = w.length;
							while(wl--) {
								a = w[wl].create(a);
							}
							li.appendChild(a);
						}

						t = { page: secs[i], tab: li, id: id, visibility: false };
						ctrl.tabs.push(t);
						li.className = h[0].className;
						h[0].parentNode.removeChild(h[0]);

						if(id && id == hash) {
							init = t;
						}
						else if(!init && secs[i].className.indexOf("default") !== -1) {
							init = t;
						}
					}
				}

				if(!(l = ctrl.tabs.length)) {
					return;
				}
				if(!init) {
					init = ctrl.tabs[0];
				}

				ul = "ul".create();

				for(i = 0; i < l; ++i) {
					t = ctrl.tabs;

					if(t[i] == init) {
						t[i].page.style.display = "";
						vxJS.dom.addClassName(t[i].tab, "shown");
						t[i].visibility = true;
					}

					t[i].nextTab = t[i + 1] || null;
					t[i].prevTab = i - 1 >= 0 ? t[i - 1] : null;
					ul.appendChild(t[i].tab);
				}

				ctrl.last = init;
				ctrl.element = "div".setProp("class", "vxJS_tabBar").create([conf.spacersTop, ul, conf.spacersBottom]);
				container.insertBefore(ctrl.element, container.firstChild);

				vxJS.event.addListener(ctrl, "click", clickListener);
				tabBars.push(ctrl);
				
				if(supportsHistory && init.id && conf.setHash) {
					window.history.replaceState(init.id, "", "#" + init.id);
				}

			}(tabbed[tbCount]));
		}
		return tabBars;
	};
}());