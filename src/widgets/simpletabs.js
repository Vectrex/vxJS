/**
 * automatically structure content with a tab panel
 * searches for .vxJS_tabThis elements
 * .section elements within .vxJS_tabThis form the views
 * the first h2 element of a .section is used as tab label
 * tabs inherit both text content and classNames of their respective h2 elements
 * 
 * pushState() is used when config.setHash is set and browser support suffices
 * 
 * @version 0.4.3 2014-11-30
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
	 * render a tab element, tabData requires a label property, an id property is optional
	 * 
	 * @param Object tabData
	 * @return HTMLLIElement
	 */
	var renderTab = function(tabData) {

		var li, a, l,
			w		= conf.tabWrap,
			label	= conf.shortenLabelsTo ? tabData.label.shortenToLen(conf.shortenLabelsTo) : tabData.label,
			title	= "";

		if(label.length !== tabData.label.length) {
			label += "...";
			title = tabData.label;
		}

		a = tabData.id ? "a".setProp("href", conf.setHash ? "#" + tabData.id : "").create(label) : document.createTextNode(label);

		li = "li".setProp("title", title).create();

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

		return li;
	};

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

			return this;
		},

		gotoPrevTab: function(pushState) {
			return this.gotoTab(this.last.prevTab, pushState);
		},

		gotoNextTab: function(pushState) {
			return this.gotoTab(this.last.nextTab, pushState);
		},

		focus: function(tab, pushState) {
			var a;

			this.gotoTab(tab, pushState);
			a = this.last.tab.getElementsByTagName("a");
			if(a && a[0]) {
				a[0].focus();
			}
			return this;
		},
		
		/**
		 * insert a new tab
		 * tab data contains
		 * 
		 * page:	HTMLElement
		 * label:	String
		 * id:		String (optional)
		 * 
		 * @param Object tabData
		 * @param Object insertBefore
		 * @returns {TabBar}
		 */
		insertTab: function(tabData, insertBefore) {

			var tab = {
					tab:		renderTab(tabData),
					page:		tabData.page,
					id:			tabData.id,
					visibility:	false
				},
				prevTab;

			tabData.page.style.display = "none";

			if(!insertBefore) {
				prevTab = this.tabs[this.tabs.length - 1];
				prevTab.nextTab = tab;
				tab.nextTab	= null;
				tab.prevTab	= prevTab;
				this.tabs.push(tab);
				this.container.insertBefore(tabData.page, prevTab.page.nextSibling);
				this.ulElement.insertBefore(tab.tab, prevTab.tab.nextSibling);
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
				this.ulElement.insertBefore(tab.tab, insertBefore.tab);

			}

			return this;
		},

		/**
		 * remove a tab
		 *  
		 * @param Object tab
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
			this.ulElement.removeChild(tab.tab);
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

			if(!tab) {
				return;
			}
			if(!bar.inactive) {
				vxJS.event.serve(bar, "beforeTabClick");
				bar.gotoTab(tab, true);
				vxJS.event.serve(bar, "afterTabClick");
			}

			vxJS.event.preventDefault(e);
		};

		while(tbCount--) {
			(function(container) {
				var secs = vxJS.dom.getElementsByClassName("section", container),
					ctrl = new TabBar(container), h, ul, init, i, l, id, t, li;

				for(i = 0, l = secs.length; i < l; ++i) {
					h = secs[i].getElementsByTagName("h2");

					if(h[0]) {
						secs[i].style.display = "none";
						id = h[0].id;
						li = renderTab( { label: vxJS.dom.concatText(h[0]), id: id } );
						li.className = h[0].className;
						h[0].parentNode.removeChild(h[0]);
						t = { page: secs[i], tab: li, id: id, visibility: false };
						ctrl.tabs.push(t);

						if(id && id === hash) {
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

					if(t[i] === init) {
						t[i].page.style.display = "";
						vxJS.dom.addClassName(t[i].tab, "shown");
						t[i].visibility = true;
					}

					t[i].nextTab	= t[i + 1] || null;
					t[i].prevTab	= i - 1 >= 0 ? t[i - 1] : null;

					ul.appendChild(t[i].tab);
				}

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