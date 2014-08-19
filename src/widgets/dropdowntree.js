/**
 * dropdownTree
 * 
 * turn a single dropdown into several hierarchial dropdowns
 * dependencies/level of options are determined by their classnames
 * the top level remains in original dropdown
 * 
 * @version 0.2.2 2010-12-01
 * @author Gregor Kofler
 * 
 * @param {object} existing dropdown, becomes parent dropdown
 * @param {Object} configuration (all properties are optional)
 * 	suffix:		{String} identifying classname suffix
 *  initOption:	{Object} optional default entry at top of child dropdown
 */

vxJS.widget.dropdownTree = function(elem, config) {
	if(!config) {
		config = {};
	}

	var	i, eName, initSelNode, initSel = [], iO = config.initOption, initNode,
	 	dds = [elem], tree = [], swap = [],
	 	rex = new RegExp("(?:^|\\s+)"+(config.suffix || "vxJS_ddt_level_")+"([0-9][1-9]*)+$", "");

	if(iO && iO.value && iO.text) {
		initNode = "option".setProp([["value", iO.value], ["class", "vxJS_ddt_initOption"]]).create(iO.text);
	}
		
	var findSelected = function (node, lvl) {
		var i;

		if(lvl) {
			for(i = tree[lvl].length; i--; ) {
				if(tree[lvl][i].parent === node) {
					return tree[lvl][i];
				}
			}
		}
	};

	var buildTree = function() {
		var i = 1, j, l, m, o = elem.options, p, last = o[0], frag, lastLevel = 0;
		
		while(o[i]) {
			m = o[i].className.match(rex);
			l = m ? (parseInt(m[1], 10) || 0) : 0;

			o[i].className = o[i].className.replace(rex, "");

			if(l) {
				if(l > lastLevel) {
					p.push(last);
					if(!tree[l]) {
						tree[l] = [];
					}
					frag = document.createDocumentFragment();
					if(initNode) {
						frag.appendChild(initNode.cloneNode(true));
					}
					tree[l].push({ parent: last, options: frag });
				}
				else if(l < lastLevel) {
					for(j = lastLevel-l; j-- && p.length;) {
						p.pop();
					}
					frag = tree[l][tree[l].length-1].options;
				}
				last = o[i];
				if(last === initSelNode) {
					last.selected = false;
					initSel = p.copy();
					initSel.push(last);
				}
				frag.appendChild(last);
			}
			else {
				p = [];
				last = o[i++];
			}

			lastLevel = l;
		}
	};
	
	var setName = function() {
		var i, f;

		for(var i = tree.length; i--;) {
			if(!f && (dds[i].options && dds[i].options.length && (!initNode || dds[i].selectedIndex))) {
				dds[i].name = eName;
				f = true;
			}
			else {
				dds[i].name =  "_ddtDummy";
			}
		}
	};

	var insertChildDDs = function() {
		var i, n;

		if(!tree.length) { return; }

		for(i = tree.length; --i;) {
			n = "select".setProp([["class", elem.className], ["size", 1]]).create();
			dds.push(n);
			elem.parentNode.insertBefore(n, elem.parentNode.lastChild.nextSibling);
		}
	};

	var fillChildDD = function(l, init) {
		var f, i, nameNdx = 0;

		for(i = l+1; i < tree.length; ++i) {
			if(dds[i-1].options.length) {
				f = findSelected(dds[i-1].options[dds[i-1].selectedIndex], i);
			}

			if(swap[i]) {
				while(dds[i].options[0]) {
					swap[i].options.appendChild(dds[i].options[0]);
				}
			}

			if((swap[i] = f)) {
				dds[i].appendChild(f.options);
				if(!init) {
					dds[i].selectedIndex = 0;
				}
			}

			dds[i].disabled = !f;
		}
		setName();
	};

	if(!elem || !elem.options || elem.options.length < 2) { throw new Error("widget.DropdownTree: Missing element or element without options."); }

	vxJS.dom.addClassName(elem, "ddTree");
	eName = elem.name || "dropdownTree";
	initSelNode = elem.options[elem.selectedIndex];

	buildTree();
	insertChildDDs();
	for(var i = initSel.length; i--;) {
		initSel[i].selected = true;
	}
	fillChildDD(0, true);

	for(i = 0; i < dds.length; i++ ) {
		vxJS.event.addListener(dds[i], "change", function(l) {
				return function() {
					fillChildDD(l);
				}; }(i)
		);
	}
};