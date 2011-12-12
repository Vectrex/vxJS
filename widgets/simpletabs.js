/**
 * automatically structure content with a tab panel 
 * searches for .vxJS_tabThis elements
 * .section elements within .vxJS_tabThis form the views
 * the first h2 element of a .section is used as tab label
 * tabs inherit both text content and classNames of their respective h2 elements 
 * 
 * @version 0.2.0 2010-08-18
 * @author Gregor Kofler
 *
 * @param {Object} optional root elemement searched for tabs, defaults to document
 * @param {Object} optional configuration parameters:
 *		tabWrap: {String | Array} nodeName(s) of extra container element(s) for each tab
 *		shortenLabelsTo: {Number} shorten labels to the given number of chars or preceeding word boundary
 *		setHash: {Boolean} when true, tab ids will modify URI hash
 *		spacersTop: {Object} additional DOM element(s) inserted before the ul element
 *		spacersBottom: {Object} additional DOM element(s) inserted after the ul element
 */
/*global vxJS*/

vxJS.widget.simpleTabs = function() {
	var conf;

	var switchTabs = function(bar, to) {
		var l = bar.last, i, t;

		if(!to || l.tab == to) { return; }

		if(to.id && conf.setHash) {
			window.location = "#" + to.id;
		}

		for(i = bar.tabs.length; i--;) {
			t = bar.tabs[i];
			if(t.tab === to) {
				l.visibility = false;
				vxJS.dom.removeClassName(l.tab, "shown"); 
				l.page.style.display = "none";

				vxJS.dom.addClassName(to, "shown"); 
				t.visibility = true;
				t.page.style.display = "";
				bar.last = t;
				break;
			}
		}
	};

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
		getTabByNdx: function(ndx) {
			return this.tabs[ndx];
		},
		getTabById: function(id) {
			var t, i;
			for(i = this.tabs.length; i--;) {
				t = this.tabs[i];
				if(t.id && t.id == id) {
					return t;
				}
			}
		},
		gotoPrevTab: function() {
			switchTabs(this, this.last.prevTab.tab);
		},
		gotoNextTab: function() {
			switchTabs(this, this.last.nextTab.tab);
		},
		focus: function(tab) {
			if(tab) {
				switchTabs(this, tab.tab);
			}
			var a = this.last.tab.getElementsByTagName("a");
			if(a && a[0]) {
				a[0].focus();
			}
		}
	};

	return function(root, config) {
		var tabbed = vxJS.dom.getElementsByClassName("vxJS_tabThis", root), i = tabbed.length, hash = window.location.hash.slice(1) || "", tabs = [];

		if(!i) {
			return;
		}
		conf = config || {};

		var clickListener = function(e, bar) {
			if(bar.inactive) {
				vxJS.event.preventDefault(e);
			}
			else {
				switchTabs(bar, (!this.nodeName || this.nodeName.toUpperCase() !== "LI") ? vxJS.dom.getParentElement(this, "li") : this);
			}
		};

		for( ;i--; ) {
			(function(container) {
				var secs = vxJS.dom.getElementsByClassName("section", container),
					ctrl = new TabBar(), h, ul, init, i = 0, l = secs.length, label = "", txt, id, t, li, a, w, wl;

				for(; i < l; ++i) {
					h = secs[i].getElementsByTagName("h2");

					if(h[0]) {
						secs[i].style.display = "none";
						txt = vxJS.dom.concatText(h[0]);

						label = config.shortenLabelsTo ? txt.shortenToLen(config.shortenLabelsTo) : txt;

						if(label.length !== txt.length) {
							label += "...";
						}
						else {
							txt = "";
						}

						id = h[0].id;

						a = id ? "a".setProp("href", "#" + id).create(label) : label;

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
				tabs.push(ctrl);
			})(tabbed[i]);
		}
		return tabs;
	};
}();