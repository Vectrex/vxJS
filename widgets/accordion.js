/**
 * (un-)fold screen sections with an "accordion" effect
 * 
 * @version 0.2.4a 2012-05-04
 * @author Gregor Kofler
 * 
 * @param {Object} container element, defaults to document
 * @param {Object} optional configuration parameters:
 *		divider: {String} nodeName of dividing element, defaults to h2
 * 
 * searches for block elements with className "vxJS_foldThis"
 * divided by a given it into an "accordion"
 * if the dividing has a className containing "default", this fold will be shown upon start
 * if vxJS.fx is available a transition is added
 */
/*global vxJS*/

vxJS.widget.accordion = function(root, config) {
	var folded = vxJS.dom.getElementsByClassName("vxJS_foldThis", root), hash = window.location.hash.slice(1) || "", i, nn;
	
	if(!config) {
		config = {};
	}

	nn = config.divider ? config.divider.toUpperCase() : "H2";

	if((i = folded.length)) {
		for(;i--;) {
			(function(container) {
				var i = 0, div, bar, hashed, deflt, ctrl = [], c = container.childNodes, last;

				var storePane = function() {
					var o = {
						bar: bar,
						div: div,
						visibility: false
					};

					div.style.display = "none"; 

					if(!hashed && bar.id && bar.id == hash) {
						hashed = o;
					}
					if(!deflt && bar.className.indexOf("default") !== -1) {
						deflt = o;
					}
					ctrl.push(o);
				};

				while(i < c.length && (!c[i].tagName || c[i].tagName.toUpperCase() !== nn)) { ++i; }

				while(c[i]) {
					if(c[i].tagName && c[i].tagName.toUpperCase() === nn) {
						if(bar) {
							storePane();
						}
						bar = c[i++];
						div = "div".create();
					}
					else {
						div.appendChild(c[i]);
					}
				}

				storePane();

				for(i = ctrl.length; i--;) {
					container.insertBefore(ctrl[i].div, ctrl[i].bar.nextSibling);
				}

				last = hashed || deflt || null;

				if(last) {
					last.visibility = true;
					vxJS.dom.addClassName(last.bar, "shown");
					if(vxJS.fx && vxJS.fx.roll) {
						vxJS.element.register(last.div).fx("roll", { direction: "down", transition: "easeInOut", duration: 0.3 });
					}
					else {
						last.div.style.display = "";
					}
				}

				vxJS.event.addListener(container, "click", function(group) {

					return function() {
						var i, t, n = this.nodeName.toUpperCase() !== nn ? vxJS.dom.getParentElement(this, nn) : this;

						if(!n) {
							return;
						}

						if(last) {
							last.visibility = false;
							vxJS.dom.removeClassName(last.bar, "shown");
							if(vxJS.fx && vxJS.fx.roll) {
								vxJS.element.register(last.div).fx("roll", { direction: "up", transition: "easeInOut", duration: 0.3 });
							}
							else {
								last.div.style.display = "none";
							}
						}

						for(i = group.length; i--;) {
							t = group[i];
							if(t.bar === n) {
								if(t == last) {
									last = null;
									return;
								}
								t.visibility = true;
								vxJS.dom.addClassName(t.bar, "shown");
								if(t.bar.id) {
									window.location = "#" + t.bar.id;
								}

								if(vxJS.fx && vxJS.fx.roll) {
									vxJS.element.register(t.div).fx("roll", { direction: "down", transition: "easeInOut", duration: 0.3 });
								}
								else {
									t.div.style.display = "";
								}
								last = t;
								break;
							}
						}
					};
				}(ctrl));
			})(folded[i]);
		}
	}
};