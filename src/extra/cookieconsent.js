/**
 * a simple cookie consent add-on
 * requires vxJS core 
 */
!(function(global) {

	var config = global.vxJS.cookieConsentConfig  || {}, exp;

	// no cookie found?

	if(!vxJS.cookie.getItem("cookie_consent")) {

		// set cookie and prepare notification message, expires in 60 days as default

		var exp = new Date();
		exp.setDate(exp.getDate() + (config.expiresIn || 60));
		vxJS.cookie.setItem("cookie_consent", "1", exp);

		vxJS.event.addDomReadyListener(function() {
			var div, button, evId, body = vxJS.dom.getBody();

			var removeElement = function() {
				div.parentNode.removeChild(div);
			};
			
			// callback which closes notification

			var clickCallback = function() {

				vxJS.event.removeListener(button, clickCallback);
				vxJS.dom.toggleClassName(body, "cookieConsentShown");

				// an optional timeout to allow a CSS animation effect

				if(config.timeout) {
					window.setTimeout(removeElement, config.timeout);
				}
				else {
					removeElement();
				}

			};

			// build notification element

			button = "button".create(config.buttonLabel || "Ok!");
			div = "div".setProp("id", "cookieConsent").create([config.message || "We use cookies", button]);

			// append or prepend element depending on configuration

			if(config.prepend) {
				body.insertBefore(div, body.firstChild);
			}
			else {
				body.appendChild(div);
			}
			
			vxJS.dom.toggleClassName(body, "cookieConsentShown");
			vxJS.event.addListener(button, "click", clickCallback);
		});
	}

}(this));