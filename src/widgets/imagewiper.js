/**
 * tile based image transitions
 * 
 * @version 0.2.8 2011-03-18
 * @author Gregor Kofler
 * 
 * @param {Object} configuration
 *	images:			{Array} list of shown images; properties: src, uri, transition, transitionPattern, fadeDelay, duration
 *	stage:			{Object} optional element which will contain slideshow
 *	tilesX:			{Number} number of horizontal tiles, defaults to 10
 *	tilesY:			{Number} number of vertical tiles, defaults to 10
 *	transitionTime:	{Number} duration of the fading of each tile, defaults to 2 seconds
 *
 * @return {Object} imageWiper object
 * 
 * served events: "transitionStart", "transitionComplete"
 */
/*global vxJS*/

vxJS.widget.imageWiper = function(config) {
	if(!config || !config.images || !config.images.length) {
		throw Error("imageWiper: No properly defined image list.");
	}

	var	that = {},
		activityLayer = "div".setProp("class", "activityLayer").create(),
		images = config.images, imgNdx = 0, clickNdx = 0, waitingFor, tiles = [];

	var stage = function() {
		var s;
		if(config.stage) {
			s = config.stage;
			vxJS.dom.deleteChildNodes(s);
		}
		else {
			s = "div".setProp("class", "vxJS_imageWiper").create();
		}
		vxJS.event.addListener(s, "click", function() {
			if(images[clickNdx].uri) {
				window.location.href = images[clickNdx].uri; 
			}
		});
		return s;
	}();

	var setupTiles = function() {
		var	i, j, size = vxJS.dom.getElementSize(stage),
			w = size.x / (config.tilesX || 10), h = size.y / (config.tilesY || 10),
			t, c, s, frag = document.createDocumentFragment();

		t = "div".create();
		s = t.style;
		s[typeof stage.style.cssFloat == "string" ? "cssFloat" : "styleFloat"] = "left";

		s.backgroundRepeat = "no-repeat";
		s.width = w + "px";
		s.height = h + "px";

		for(i = 0; i < size.y; i += h) {
			for(j = 0; j < size.x; j += w) {
				c = t.cloneNode(true);
				frag.appendChild(c);
				s = frag.lastChild.style;
				s.backgroundPosition = "-" + j + "px -" + i + "px";
				vxJS.dom.setOpacity(c, 0);
				tiles.push({ elem: c, opacity: 0, fadeDelay: 0 });
			}
		}

		stage.appendChild(frag);
	};

	var createRandomPattern = function(maxDelay) {
		for(var i = 0, t; t = tiles[i++];) {
			t.fadeDelay = Math.random() * maxDelay;
		}
	};

	var createLinearPattern = function(totalDelay, reverse) {
		for(var i = 0, l = tiles.length; i < l; ++i) {
			tiles[i].fadeDelay = (reverse ? l - i : i) * (totalDelay) / l;
		}
	};

	var createCustomPattern = function(pattern) {
		for(var i = 0, t; t = tiles[i];) {
			t.fadeDelay = pattern[i++] || 0;
		}
	};

	var showActivity = function() {
		activityLayer.style.display = "";
	};

	var hideActivity = function() {
		activityLayer.style.display = "none";
	};

	var setLoaded = function() {
		this.loaded = true;
		if(waitingFor === this) {
			waitingFor = null;
			hideActivity();
			setTileImage();
		}
	};

	var skipImage = function() {
		imgNdx = ++imgNdx % images.length;

		if(waitingFor === this) {
			waitingFor = images[imgNdx];
			loadImage(waitingFor);
		}
	};

	var loadImage = function(image) {
		if(image.img) {
			return;
		}

		var img = "img".create();

		image.img = img;

		img.onload = setLoaded.bind(image);
		img.onerror = skipImage.bind(image);
		img.src = image.src;

		if(img.complete) {
			img.onload = null;
			setLoaded.bind(image)();
		}
	};

	var nextImage = function() {
		var i = 0, t;

		clickNdx = imgNdx;
		vxJS.dom[images[clickNdx].uri ? "addClassName" : "removeClassName"](stage, "clickable");

		stage.style.backgroundImage = "url('" + images[imgNdx].src + "')";

		while(t = tiles[i++]) {
			t.opacity = 0;
			vxJS.dom.setOpacity(t.elem, 0);
		}
		
		window.setTimeout(play, (images[imgNdx].duration || 3) * 1000);

		imgNdx = ++imgNdx % images.length;
		loadImage(images[imgNdx]);

	};

	var setTileImage = function() {
		var i = 0, t, img = images[imgNdx];

		if(!img.loaded) {
			showActivity();
			waitingFor = img;
			loadImage(img);
			return;
		}
		while(t = tiles[i++]) {
			t.elem.style.backgroundImage = "url('" + img.src + "')";
		}
	};

	var setTransition = function() {
		var i = images[imgNdx], delay = i.fadeDelay;

		if(typeof delay == "undefined") {
			delay = 2;
		}

		switch(images[imgNdx].transition) {
			case "linear":
				createLinearPattern(delay);
				break;
			case "linear-reverse":
				createLinearPattern(delay, true);
				break;
			case "custom":
				if(i.transitionPattern) {
					createCustomPattern(i.transitionPattern);
					break;
				}
			default:
				createRandomPattern(delay);
		}
	};

	var fade = function() {
		var i = 0, t, freq = 25, dT = 1/freq, transitionTime = config.transitionTime || 2, finished = true;

		while(t = tiles[i++]) {
			if(t.fadeDelay) {

				finished = false;
				t.fadeDelay -= dT;

				if(t.fadeDelay < 0) {
					t.fadeDelay = 0;
				}
			}
			else if(t.opacity !== 1) {
				t.opacity += 1 / (transitionTime * freq);
				if(t.opacity < 1) {
					finished = false;
				}
				else {
					t.opacity = 1;
				}
				vxJS.dom.setOpacity(t.elem, t.opacity);
			}
		}

		if(!finished) {
			window.setTimeout(fade, dT * 1000);
		}
		else {
			vxJS.event.serve(that, "transitionComplete");
			nextImage();
		}
	};

	var play = function() {
		setTileImage();
		setTransition();
		vxJS.event.serve(that, "transitionStart");
		fade();
	};

	setupTiles();
	stage.appendChild(activityLayer);

	that.element		= stage;
	that.play			= play;
	that.getImageIndex	= function() { return imgNdx; };
	
	return that;
};