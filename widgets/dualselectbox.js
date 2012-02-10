/**
 * DualSelectBox
 * attach a second select box to an already existing one
 * allow shifting of entries between both
 * 
 * @version 0.5.4 2012-02-10
 * 
 * @param {object} existing select box, becomes destination box
 * 
 */
vxJS.widget.dualSelectBox = function(destBox) {
	var container = "div".setProp("class", "vxJS_dualSelectBox").create(), srcBox;

	var shiftSelectedOptions = function(src, dest) {
		var i = 0, o;

		while((o = src.options[i++])) {
			if (o.selected) {
				dest.options[dest.options.length || 0] = new Option(o.text, o.value, false, false);
			}
		}
		for (i = src.options.length; i--;) {
			if (src.options[i].selected) {
				src.options[i] = null;
			}
		}
		src.selectedIndex = -1;
	};

	var shiftAllOptions = function(src, dest) {
		var i = 0, o;
		while((o = src.options[i++])) {
			dest.options[dest.options.length || 0] = new Option(o.text, o.value, false, false);
		}
		for (i = src.options.length; i--;) {
			src.options[i] = null;
		} 
		src.selectedIndex = -1;
	};

	var createContainer = function() {
		var c = "div".create();
		c.style.clear = "left";
		destBox.parentNode.insertBefore(container, destBox);
		container.appendChild(destBox);
		container.appendChild(c);
	};

	var createSourceBox = function() {
		var i;

		destBox.style.cssFloat = destBox.style.styleFloat = "left";
		destBox.multiple = true;
		srcBox = destBox.cloneNode(true);
		srcBox.name += "_source";
		vxJS.dom.addClassName(srcBox, "vxJS_dualSelectBox_source");

		// Quirks for IE6
		for(i = destBox.options.length; i--;) {
			srcBox.options[i].selected = destBox.options[i].selected;
		}

		vxJS.dom.deleteChildNodes(destBox);
		shiftSelectedOptions(srcBox, destBox);	
		container.insertBefore(srcBox, destBox);
	};


	var createShiftButtons = function() {
		var addAll	= "button".setProp([["type", "button"], ["class", "addAll"]]).create("\u00bb");
		var subAll	= "button".setProp([["type", "button"], ["class", "subAll"]]).create("\u00ab");
		var add		= "button".setProp([["type", "button"], ["class", "add"]]).create(">");
		var sub		= "button".setProp([["type", "button"], ["class", "sub"]]).create("<");
		var bar		= "div".setProp("class", "vxJS_dualSelectBox_buttons").create([addAll, add, sub, subAll]);
		bar.style.cssFloat	= bar.style.styleFloat = "left";

		vxJS.event.addListener(add,	"click", function() { shiftSelectedOptions(srcBox, destBox); });
		vxJS.event.addListener(sub, "click", function() { shiftSelectedOptions(destBox, srcBox); });
		vxJS.event.addListener(addAll, "click", function() { shiftAllOptions(srcBox, destBox); });
		vxJS.event.addListener(subAll, "click", function() { shiftAllOptions(destBox, srcBox); });

		container.insertBefore(bar, destBox);
	};

	createContainer();
	createSourceBox();
	createShiftButtons();

	vxJS.dom.addClassName(destBox, "vxJS_dualSelectBox_dest");

	if(destBox.form) {
		vxJS.event.addListener(destBox.form, "submit",
			function() {
				for(var i = destBox.options.length; i--;) {
					destBox.options[i].selected = true;
				}
			}
		);
	}
};