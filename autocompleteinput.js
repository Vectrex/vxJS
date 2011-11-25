/**
 * autocomplete input widget
 * depending on type an input element value is completed upon blur
 * 
 * @version 0.6.1 2010-06-11
 * @author Gregor Kofler
 * 
 * @param {Object} existing input element
 * @param {Object} configuration:
 *	type:		{String} type of completion
 *	required:	{Boolean} visually indicate error
 *
 * @return {Object} autocomplete object
 * 
 * served events: "invalid"
 * 
 */

if(!this.vxJS) { throw Error("widget.AutocompleteInput: vxJS core missing."); }

vxJS.widget.autocompleteInput = function(elem, config) {
	var origBgColor, type, that = {};
	var handleCompletion = function() {
		var v = elem.value;

		if(!v) { return; }

		switch (type) {
			case "int":
				v = parseInt(v,10);
				if(!isNaN(v)) { setValue(v); return; }
				setError();
				break;

			case "decimal":
				if(/^(\+|-)?([1-9]\d{0,2}(\.\d{3})*(,\d+)?|[1-9]\d{0,2}((,|')\d{3})*(\.\d+)?|\d+([,.]\d+)?)$/.test(v)) { setValue(v); return; }
				setError();
				break;

			default:
				v = elem.value.toDateTime(type);
				if(v) { setValue(v); return; }
				setError();
			}
	};

	var setError = function() {
		if(config.required) { elem.style.backgroundColor = "#ffe0e0"; }
		vxJS.event.serve(that, "invalid");
	};

	var setValue = function(v) {
		elem.value = v;
		if(config.required) { elem.style.backgroundColor = origBgColor; }
	};

	if(!elem) { throw new Error("widget.autocompleteInput: Missing element."); }
	if(typeof config.type === "undefined" || "date_de|date_us|date_iso|time_hm|time_hms|decimal|int".indexOf((type = config.type)) < 0) {
		throw Error("widget.autocompleteInput: Missing format string.");
	}

	if(config.required) { origBgColor = elem.style.backgroundColor; }
	vxJS.event.addListener(elem, "blur", function() { handleCompletion(); });

	that.element = elem;
	return that;
};