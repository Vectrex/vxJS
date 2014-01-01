/**
 * Tree
 *
 * @version 0.6.2, 2014-01-01
 * @author Gregor Kofler
 *
 * @param {Object} config object
 *		container:				{Object} DOM element tree will be appended to
 *		tree:					{Object} (nested) UL element(s) which will be turned into tree
 *		branches:				{Array} initial branches
 *		checkBoxes:				{Boolean¦"last"} show and handle checkboxes, "last" displays checkboxes only on lowest level
 *		leafNodeDefault:		{Boolean} use leafnodes when subtree is undefined
 * 		checkBoxIndependence:	{Boolean} prevents checkbox states to propagate up or down the tree
 *		expandTo:				{Number|"all"} number of levels shown upon default
 *
 * events served:
 *	branchClick
 *	labelClick
 *	beforeNodeClick
 *	afterNodeClick
 *	beforeCheckBoxClick
 *	afterCheckBoxClick
 *	expandTree
 *	collapseTree
 *
 * @todo handling of "disabled" property
 * @todo alternatively add "hashes" to speed up tree traversal
 */

vxJS.widget.tree = function(config) {

	"use strict";

	if(!config) { config = {}; }

	var tree, that = {}, checkBoxes = config.checkBoxes || false, cbDependence = !config.checkBoxIndependence, activeBranch;

	/**
	 * Tree object
	 */
	var Tree = function(level, ul) {
		this.element = ul || document.createElement("ul");
		vxJS.dom.addClassName(this.element, "vxJS_tree");
		this.level = level || 0;
		this.branches = [];
	};

	Tree.prototype = {
		findBranchByElem: function(e) {
			var l = 0, b;

			while((b = this.branches[l++])) {
				if(b.element == e || (b.subtree && (b = b.subtree.findBranchByElem(e)))) {
					return b;
				}
			}
		},

		findBranchByPropertyValue: function(p, v) {
			var l = 0, b;

			while((b = this.branches[l++])) {
				if(b[p] == v || (b.subtree && (b = b.subtree.findBranchByPropertyValue(p, v)))) {
					return b;
				}
			}
		},

		appendBranch: function(data) {
			var b = new Branch(this, data);

			b.element.className = "lastBranch";
			if(this.last) {
				this.last.element.className = "";
			}

			this.branches.push(b);
			this.last = b;
			b.pos = this.branches.length - 1;
			this.element.appendChild(b.element);
		},

		removeBranch: function(ndx) {
			var branches = this.branches, l = branches.length, e;

			if(ndx instanceof Branch) {
				while(l--) {
					if(branches[l] === ndx) {
						ndx = l;
						break;
					}
				}
			}

			if(typeof ndx == "number") {
				e = branches[ndx].element;

				if(e && e.parentNode) {
					e.parentNode.removeChild(e);
				}

				branches.splice(ndx, 1);

				if((l = branches.length)) {
					while(ndx < l) {
						branches[ndx++].pos--;
					}

					this.last = branches[l - 1];
					this.last.className = "lastBranch";
				}
				else {
					this.last = null;
				}
			}
		},

		truncate: function() {
			var c;

			while((c = this.element.firstChild)) {
				this.element.removeChild(c);
			}
			this.branches = [];
		},

		insertBranch: function(data, ndx) {
			var branches = this.branches, l = branches.length - 1, b, e;

			if(ndx > l) {
				return;
			}
			if(ndx == l) {
				this.appendBranch(data);
			}

			e = branches[ndx].element;
			b = new Branch(this, data);
			branches.splice(ndx, 0, b);

			while(ndx <= l) {
				branches[ndx].pos = ndx++;
			}

			this.element.insertBefore(b.element, e);
		},

		addBranches: function(branches) {
			var i = 0, l = branches.length;

			while(i < l) {
				this.appendBranch(branches[i++]);
			}
		},

		setParentCheckBox: function() {
			var i, b, disabled = 0, ticked = 0, semi, p = this.parent;
			if(!p || checkBoxes === "last") {
				return;
			}

			for(i = this.branches.length; i--;) {
				b = this.branches[i];
				if (b.disabled) {
					++disabled;
				}
				ticked += b.cbState == 1 ? 1 : 0;
				semi = semi || b.cbState == 2;
			}

			p.setCheckBox(
				semi ? 2 : ( !ticked ? 0 : (ticked == this.branches.length ? 1 : 2)),
				p.disabled || disabled === this.branches.length
			);

			if(this.parent.tree && cbDependence) {
				this.parent.tree.setParentCheckBox();
			}
		},

		expand: function() {
			this.element.style.display = "";
		},

		collapse: function() {
			this.element.style.display = "none";
		},

		expandToLevel: function(lvl) {
			var i = this.branches.length, t;

			if(!lvl) {
				lvl = 0;
			}
			if(this.parent) {
				this.parent[lvl !== "all" && this.level > lvl ? "hideSubTree" : "showSubTree"]();
			}
			while(i--) {
				t = this.branches[i].subtree;
				if(t) {
					t.expandToLevel(lvl);
				}
			}
		},

		render: function() {
			var i, l = this.branches.length, p = this.parent, b, c, n;

			if(checkBoxes === "last" && l && p) {
				if((c = p.cbElem) && (n = c.parentNode)) {
					n.removeChild(c);
				}
			}

			this.onlyLeaves = true;

			for(i = 0; i < l; ++i) {
				b = this.branches[i];

				if(b.subtree) {
					b.subtree.render();
					this.onlyLeaves = false;
				}

				this.element.appendChild(b.element);
			}

			if(p) {
				if(this.element && (n = this.element.parentNode)) {
					n.removeChild(this.element);
				}
				p.element.appendChild(this.element);
			}

			if(this.onlyLeaves && cbDependence) {
				this.setParentCheckBox();
			}
		}
	};

	/**
	 * Branch object
	 */
	var Branch = function(tree, data) {
		var p, hasSubtree;

		this.element = document.createElement("li");
		this.tree = tree;

		for(p in data) {
			if(p == "branches" && data.branches.length) {
				hasSubtree = true;
			}
			else if(data.hasOwnProperty(p)) {
				this[p] = data[p];
			}
		}

		if(typeof this.terminates == "undefined" && config.leafNodeDefault && !hasSubtree) {
			this.terminates = true;
		}

		if(typeof this.hasCheckBox == "undefined") {
			this.hasCheckBox = checkBoxes === true || (checkBoxes == "last" && this.terminates);
		}

		this.render();

		if(hasSubtree) {
			this.appendSubTree(data.branches);
		}

		this.renderNode();
	};

	Branch.prototype = {
		insertBefore: function(data) {
			this.tree.insertBranch(data, this.pos - 1);
		},

		insertAfter: function(data) {
			this.tree.insertBranch(data, this.pos + 1);
		},

		appendSubTree: function(b) {
			this.subtree = new Tree(this.tree.level + 1, null);
			this.subtree.parent = this;
			if(b) {
				this.subtree.addBranches(b);
			}
			this.element.appendChild(this.subtree.element);
		},

		removeSubTree: function() {
			var e;

			if(!this.subtree) {
				return;
			}
			this.hideSubTree();
			e = this.subtree.element;
			e.parentNode.removeChild(e);
			delete this.subtree;
			this.renderNode();
		},

		toggleSubTree: function() {
			var s = this.subtree;
			!s || s.element.style.display == "none" ? this.showSubTree() : this.hideSubTree();
		},

		hideSubTree: function() {
			var s = this.subtree;
			vxJS.event.serve(that, "collapseTree", { branch: this });
			if(s && s.element.style.display != "none") {
				s.collapse();
			}
			this.renderNode();
		},

		showSubTree: function() {
			var s = this.subtree;
			vxJS.event.serve(that, "expandTree", { branch: this });
			if(s && s.element.style.display == "none") {
				s.expand();
			}
			this.renderNode();
		},

		propagateCheckBox: function() {
			if(!this.subtree || !this.subtree.branches.length) {
				return;
			}
			var b = this.subtree.branches, i = b.length, s = this.cbState;

			while(i--) {
				b[i].setCheckBox(s, b[i].disabled);
				b[i].propagateCheckBox();
			}
		},

		setCheckBox: function(state, disabled) {
			this.cbState = state;
			this.disabled = !!disabled;
			this.renderCheckBox();
		},

		toggleCheckBox: function() {
			this.cbState = !this.cbState ? 1 : 0;
			this.renderCheckBox();
		},

		renderCheckBox: function() {
			if(!this.hasCheckBox) {
				return;
			}

			if(!this.cbElem) {
				this.cbElem = document.createElement("span");
			}
			this.cbElem.className = ["unChecked", "checked", "partChecked"][+this.cbState] + " __check__" + (this.disabled ? " disabled" : "");
		},

		renderNode: function() {
			var cn, s = this.subtree;

			if(this.terminates || typeof s == "undefined" && config.leafNodeDefault) {
				cn = "leafNode";
			}
			else if(typeof s == "undefined") {
				cn = "subTreeCollapsed __node__";
			}
			else if(s.branches.length > 0) {
				if(s.element.style.display == "none") {
					cn = "subTreeCollapsed __node__";
				}
				else {
					cn = "subTreeExpanded __node__";
				}
			}
			else {
				cn = "leafNode";
			}

			this.nodeElem.className = cn;
		},

		render: function() {
			var	li = this.element;

			li.className = this.tree.last === this ? "lastBranch" : "";

			// was not rendered before

			if(!this.labelElem) {

				this.nodeElem = document.createElement("span");
				li.appendChild(this.nodeElem);

				if(this.hasCheckBox) {
	//			if(checkBoxes == "last" && this.nodeElem.className.indexOf("leafNode") != -1 || checkBoxes == true) {
					if(typeof this.cbState == "undefined") {
						if(cbDependence && this.tree.parent && this.tree.parent.cbState && this.tree.parent.cbState !== 2) {
							this.cbState = this.tree.parent.cbState;
						}
						else {
							this.cbState = 0;
						}
					}
					this.renderCheckBox();
					li.appendChild(this.cbElem);
				}

				this.labelElem = document.createElement("div");
				this.labelElem.className = "__label__";
				this.labelElem.appendChild(vxJS.dom.parse(this.elements));
				li.appendChild(this.labelElem);
			}
		}
	};

	var importUl = function(ul) {
		var li, c, frag, b, prop, rex = /(?:^|\s)__([a-z][a-z0-9]*)__([a-z0-9]+)/ig, branches = [];

		while((li = ul.childNodes[0])) {
			if(li.nodeType == 1 && li.nodeName.toLowerCase() == "li") {

				b = { id: li.id || null };

				if(li.className) {
					while((prop = rex.exec(li.className))) {
						if(prop[2] == 'false') {
							b[prop[1]] = false;
							continue;
						}
						if(prop[2] == 'true') {
							b[prop[1]] = true;
							continue;
						}

						b[prop[1]] = prop[2];
					}
				}

				frag = document.createDocumentFragment();

				while((c = li.childNodes[0])) {
					if(c.nodeType == 1 && c.nodeName.toLowerCase() == "ul") {
						b.branches = importUl(c);
						c.parentNode.removeChild(c);
					}
					else {
						frag.appendChild(c);
					}
				}

				b.elements = [ { fragment: frag } ];
				branches.push(b);
			}
			ul.removeChild(li);
		}
		return branches;
	};

	var handleClick = function() {
		var c, b;

		// @todo filter or speed up search

		if(!(b = tree.findBranchByElem(vxJS.dom.getParentElement(this, "li"))) || b.disabled) {
			return;
		}

		activeBranch = b;
		vxJS.event.serve(that, "branchClick", { branch: b});

		if(b.nodeElem && this === b.nodeElem) {
			vxJS.event.serve(that, "beforeNodeClick", { branch: b });
			b.toggleSubTree();
			vxJS.event.serve(that, "afterNodeClick", { branch: b });
		}

		else if(b.cbElem && this === b.cbElem) {
			vxJS.event.serve(that, "beforeCheckBoxClick", { branch: b });
			b.toggleCheckBox();
			if(cbDependence) {
				b.propagateCheckBox();
				b.tree.setParentCheckBox();
			}
			vxJS.event.serve(that, "afterCheckBoxClick", { branch: b });
		}

		else {
			c = this;
			while(c !== b.element) {
				if(c === b.labelElem) {
					vxJS.event.serve(that, "labelClick", { branch: b });
					break;
				}
				c = c.parentNode;
			}
		}
	};

	if(config.tree && config.tree.nodeName && config.tree.nodeName.toLowerCase() == "ul") {
		tree = new Tree(null, config.tree);
		tree.addBranches(importUl(config.tree));
	}
	else {
		tree = new Tree();
		tree.addBranches(config.branches || []);
	}
	tree.expandToLevel(config.expandTo);
//	tree.render();

	if(config.container) {
		config.container.appendChild(tree.element);
	}
	vxJS.event.addListener(tree.element, "click", handleClick);

	that.element = tree.element;

	that.getCheckedLeaves = (function() {
		var branches;

		var cbRecursion = function(t) {
			var l = t.branches.length, b;
			while(l--) {
				b = t.branches[l];

				if(b.subtree) {
					cbRecursion(b.subtree);
				}
				if(b.cbElem && b.cbState == 1) {
					branches.push(b);
				}
			}
		};

		return function(subTree) {
			branches = [];
			cbRecursion(subTree || tree);
			return branches;
		};
	})();

	that.getBranch = function(p, v) {
		return tree.findBranchByPropertyValue(p, v);
	};

	that.customExpandTo = function(cb) {
		var traces = [], track = [], trace, i, l;

		var scan = function(t) {
			var b = t.branches, l = b.length, alreadyExpanding;

			while(l--) {
				if(!alreadyExpanding && cb.apply(b[l])) {
					traces.push(track.concat([]));
					alreadyExpanding = true;
				}
				if(b[l].subtree) {
					track.push(b[l]);
					scan(b[l].subtree);
				}
			}
			track.pop();
		};

		scan(tree);

		while((trace = traces.pop())) {
			for(i = 0, l = trace.length; i < l; ++i) {
				trace[i].showSubTree();
			}
		}
	};

	that.expandToLevel = function(lvl) {
		tree.expandToLevel(lvl);
	};

	that.getActiveBranch = function() {
		return activeBranch;
	};

	that.getRootTree = function() {
		return tree;
	};

	return that;
};