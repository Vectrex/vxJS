/**
 * automatically structure content with a tab panel
 * searches for .vxJS_tabThis elements
 * .section elements within .vxJS_tabThis form the views
 * the first h2 element of a .section is used as tab label
 * tabs are labeled with text content of their respective h2 elements
 * 
 * pushState() is used when config.setHash is set and browser support suffices
 * 
 * @version 0.7.0 2018-01-18
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

/*jslint browser: true, plusplus: true, vars: true, white: true */

vxJS.widget.simpleTabs = (function() {

	"use strict";

	var conf = {}, tabBars = [],
		supportsHistory = vxJS.hasHostMethods(window.history, ["pushState", "replaceState"]);

	/**
	 * Represents a single tab.
	 * @constructor
	 * @param {TabBar} tabBar - the bar, the tab belongs to
	 * @param {string} label - label on tab
	 * @param {HTMLElement} page - the "content" of a tab page
	 * @param {string} [id] - id of tab
	 */
	var Tab = function(tabBar, label, page, id) {
		this.tabBar		= tabBar;
		this.label		= label.trim();
		this.page		= page;
		this.id			= id;
		this.render();
	};

	Tab.prototype = {

		/**
		 * create element of a single tab element, populates Tab.element
		 * @returns {Tab}
		 */
		render: function() {
			
			// shorten tabs, retain first and last characters

			var shorten = function(txt, len) {
				return txt.slice(0, Math.ceil(len / 2)) + "..." + txt.slice(-Math.floor(len / 2));
			};

			var li, a, l,
				w		= conf.tabWrap,
				label	= (conf.shortenLabelsTo  && this.label.length > conf.shortenLabelsTo) ? shorten(this.label, conf.shortenLabelsTo) : this.label,
				title	= (conf.shortenLabelsTo  && this.label.length > conf.shortenLabelsTo) ? this.label : "";

			a = this.id ? "a".setProp("href", conf.setHash ? "#" + this.id : "").create(label) : document.createTextNode(label);

			li = "li".setProp( { "title": title, "class": "tab-item"} ).create();

			if(!w) {
				li.appendChild(a);
			}
			else if(typeof w === "string") {
				li.appendChild(w.create(a));
			}
			else {
				l = w.length;
				while(l--) {
					a = w[l].create(a);
				}
				li.appendChild(a);
			}

			this.element = li;
			return this;
		},

		/**
		 * focus A element in tab, when present; does not show/hide pages
		 * @returns {Tab}
		 */
		focus: function() {
			var a = this.element.getElementsByTagName("a");
			if(a && a[0]) {
				a[0].focus();
			}
			return this;
		},

		/**
		 * show page of tab, does not hide previously shown page
		 * @returns {Tab}
		 */
		show: function() {
			this.visibilty = true;
			vxJS.dom.addClassName(this.element, "active");
			this.page.style.display = "";
			return this;
		},

		/**
		 * hide page of tab
		 * @returns {Tab}
		 */
		hide: function() {
			this.visibilty = false;
			vxJS.dom.removeClassName(this.element, "active");
			this.page.style.display = "none";
			return this;
		},

		/**
		 * disable a tab
		 * @returns {Tab}
		 */
		disable: function() {
			this.disabled = true;
			vxJS.dom.addClassName(this.element, "disabled");
			return this;
		},
		
		/**
		 * enable a tab
		 * @returns {Tab}
		 */
		enable: function() {
			this.disabled = false;
			vxJS.dom.removeClassName(this.element, "disabled");
			return this;
		},

		/**
		 * get disabled state
		 * @returns {Boolean}
		 */
		isDisabled: function() {
			return !!this.disabled;
		}
	};

	/**
	 * represents a tab bar containing tabs
	 * @constructor
	 * @param {HTMLElement} container - element holding the tab bar
	 */
	var TabBar = function(container) {
		this.tabs		= [];
		this.container	= container;
	};

	TabBar.prototype = {

		enable: function() {
			this.inactive = false;
			vxJS.dom.removeClassName(this.element, "disabled");
			return this;
		},

		disable: function() {
			this.inactive = true;
			vxJS.dom.addClassName(this.element, "disabled");
			return this;
		},

		getTabByElement: function(elem) {
			var l = this.tabs.length;
			while(l--) {
				if(this.tabs[l].element === elem) {
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

		getTabNdx: function(tab) {
			var l = this.tabs.length;
			while(l--) {
				if(this.tabs[l] === tab) {
					return l;
				}
			}
		},

		gotoTab: function(tab, pushState) {
			var l = this.last;

			if(!tab || this.tabs.indexOf(tab) === -1 || l === tab) {
				return;
			}

			l.hide();
			tab.show();

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

			return this;
		},

		gotoPrevTab: function(pushState) {
			return this.gotoTab(this.last.prevTab, pushState);
		},

		gotoNextTab: function(pushState) {
			return this.gotoTab(this.last.nextTab, pushState);
		},

		focus: function(tab, pushState) {
			this.gotoTab(tab, pushState);
			tab.focus();
			return this;
		},
		
		/**
		 * create and insert a new tab
		 * 
		 * page:	HTMLElement
		 * label:	String
		 * id:		String (optional)
		 * 
		 * @param {Object} tabData - { page: {HTMLElement}, label: {string}, [id : {string}] }
		 * @param {Tab} [insertBefore] - tab before which new tab will be inserted; when omitted, tab will be appended
		 * @returns {TabBar}
		 */
		insertTab: function(tabData, insertBefore) {

			var tab = new Tab(this, tabData.label, tabData.page, tabData.id), prevTab;

			tab.hide();

			if(!insertBefore) {
				prevTab = this.tabs[this.tabs.length - 1];
				prevTab.nextTab = tab;
				tab.nextTab	= null;
				tab.prevTab	= prevTab;
				this.tabs.push(tab);
				this.container.insertBefore(tabData.page, prevTab.page.nextSibling);
				this.ulElement.insertBefore(tab.element, prevTab.element.nextSibling);
			}
			else {
				prevTab = insertBefore.prevTab;
				if(prevTab) {
					prevTab.nextTab = tab;
				}
				insertBefore.prevTab = tab;
				tab.prevTab = prevTab;
				tab.nextTab = insertBefore;
				this.tabs.splice(this.getTabNdx(insertBefore), 0, tab);
				this.container.insertBefore(tabData.page, insertBefore.page);
				this.ulElement.insertBefore(tab.element, insertBefore.element);
			}

			return this;
		},

		/**
		 * remove a tab
		 *  
		 * @param {Tab}
		 * @returns {TabBar}
		 */
		removeTab: function(tab) {
			var ndx = this.getTabNdx(tab);

			if(tab.prevTab) {
				tab.prevTab.nextTab = tab.nextTab;
			}
			if(tab.nextTab) {
				tab.nextTab.prevTab = tab.prevTab;
			}

			this.container.removeChild(tab.page);
			this.ulElement.removeChild(tab.element);
			this.tabs.splice(ndx, 1);

			return this;
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
			var tab = bar.getTabByElement((!this.nodeName || this.nodeName.toUpperCase() !== "LI") ? vxJS.dom.getParentElement(this, "li") : this);

			if(tab && !tab.isDisabled() && !bar.inactive) {
				vxJS.event.serve(bar, "beforeTabClick");
				bar.gotoTab(tab, true);
				vxJS.event.serve(bar, "afterTabClick");
			}

			vxJS.event.preventDefault(e);
		};

		while(tbCount--) {
			(function(container) {
				var secs = vxJS.dom.getElementsByClassName("section", container),
					ctrl = new TabBar(container), h, ul, init, i, l, id, t;

				for(i = 0, l = secs.length; i < l; ++i) {
					h = secs[i].getElementsByTagName("h2");

					if(h[0]) {
						id = h[0].id;
						t = new Tab(ctrl, vxJS.dom.concatText(h[0]), secs[i], id);
						t.hide();
						h[0].parentNode.removeChild(h[0]);
						ctrl.tabs.push(t);

						if((id && id === hash) || (!init && vxJS.dom.hasClassName(secs[i], "default"))) {
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

				ul = "ul".setProp("class", "tab").create();

				for(i = 0; i < l; ++i) {
					t = ctrl.tabs;

					t[i].nextTab	= t[i + 1] || null;
					t[i].prevTab	= i - 1 >= 0 ? t[i - 1] : null;

					ul.appendChild(t[i].element);
					
				}

				init.show();

				ctrl.last		= init;
				ctrl.ulElement	= ul;
				ctrl.element	= "div".setProp("class", "vxJS_tabBar").create([conf.spacersTop, ul, conf.spacersBottom]);

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
