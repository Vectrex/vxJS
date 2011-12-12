/**
 * simple slideshow
 * 
 * @version 0.4.7 2010-11-20
 * @author Gregor Kofler
 * 
 * @param {Object} configuration
 *	images:			{Array} list of shown images; properties: src, title, uri
 *	stage:			{Object} optional element which will contain slideshow
 *	transitionTime:	{Number} duration of fading
 *	duration:		{Number} duration of each image displayed (excludes transitionTime)
 *	noTitles:		{Boolean} don't display title bar
 *
 * @return {Object} simpleSlideShow object
 * 
 * served events: "transitionStart", "transitionComplete"
 */
/*global vxJS*/

vxJS.widget.simpleSlideShow = function(config) {
	if(!config || !config.images || !config.images.length) {
		throw Error("simpleSlideShows: No properly defined image list.");
	}

	var	sss = {},
		fb = ["div".create(), "div".create()],
		activityLayer = "div".setProp("class", "activityLayer").create(),
		stage = (function() {
			var s = config.stage ? config.stage : "div".setProp("class", "vxJS_sss_stage").create();
			vxJS.dom.appendChildren(s, [fb[1], fb[0], activityLayer]);
			return s;
		})(),		
		images = config.images, imgNdx = 0, waitingFor, playing, paused, stageSize, fadeCount = 0,
		fadeTimeout, swapTimeout, loadTimeout, forceFade,
		duration = (config.duration || 5) * 1000,
		transitionTime = typeof config.transitionTime === "undefined" ? 1000 : config.transitionTime * 1000;

	var setImgNdx = function(next) {
		imgNdx = (typeof next === "undefined") ? ++imgNdx % images.length : next;
	};

	var showActivity = function() {
		waitingFor = images[imgNdx];
		activityLayer.style.display = "";
	};
	
	var hideActivity = function() {
		waitingFor = null;
		activityLayer.style.display = "none";
	};

	var setLoaded = function() {
		forceFade = false;
		this.loaded = true;
		if(waitingFor === this) {
			hideActivity();
			imgToScreen();
			fade();
		}
	};

	var skipImage = function() {
		this.element = null;

		setImgNdx();

		if(waitingFor == this) {
			waitingFor = images[imgNdx];
		}

		if(!images[imgNdx].element) {
			createImgElement(images[imgNdx]);
			return;
		}
		if(forceFade) {
			forceFade = false;
			hideActivity();
			imgToScreen();
			fade();
		}
	};

	var doFx = function(param) {
		vxJS.dom.setOpacity(fb[1], param);
		vxJS.dom.setOpacity(fb[0], 1-param);
	};

	var createImgElement = function(row) {
		var img = "img".setProp("alt", row.title || row.src.split("/").pop()).create();

		row.loaded = false;
		img.onload = setLoaded.bind(row);
		img.onerror = skipImage.bind(row);
		row.element = row.uri ? "a".setProp("href", row.uri).create(img) : img;
		img.src = row.src;
	};

	var imgToScreen = function() {
		var i = images[imgNdx].element, t = images[imgNdx].title || i.src.split(/[\/\\\\]/).pop(), cnl = fb[1].childNodes.length;

		if(!stageSize ||!stageSize.x || !stageSize.y) {
			stageSize = vxJS.dom.getElementStyleSize(stage);
		}

		if(!cnl) {
			fb[1].appendChild(i);
		}
		else {
			fb[1].replaceChild(i, fb[1].firstChild);
		}
		
		if(!config.noTitles) {
			if(cnl < 2) {
				fb[1].appendChild("div".setProp("class", "title").create("p".create(t)));
			}
			else {
				fb[1].childNodes[1].childNodes[0].childNodes[0].nodeValue = t;
			}
			fb[1].childNodes[1].childNodes[0].style.display = t ? "" : "none";
		}
		
		fb[1].style.top = (i.height ? Math.floor((stageSize.y - i.height)/2) : 0) + "px";
		fb[1].style.left = (i.width ? Math.floor((stageSize.x - i.width)/2) : 0) + "px";
	};
	
	var nextImage = function() {

		if(!images[imgNdx].loaded) {
			showActivity();
			return;
		}

		imgToScreen();
		fade();
	};

	var fade = function() {
		if(!fadeCount) {
			vxJS.event.serve(sss, "transitionStart");
		}

		fadeCount += 100/(transitionTime ? transitionTime/25 : 1);

		if(fadeCount >= 100) {
			fadeCount = 0;
			doFx(1);
			fb.swap(0, 1);

			vxJS.event.serve(sss, "transitionComplete");

			if(images.length > 1) {
				setImgNdx();

				if(!images[imgNdx].element) {
					createImgElement(images[imgNdx]);
				}
				if(playing) {
					swapTimeout = window.setTimeout(nextImage, duration);
				}
				else {
					paused = true;
				}
			}
			return;
		}

		doFx(fadeCount/100);

		fadeTimeout = window.setTimeout(fade, 25);
	};

	var selectNdx = function(ndx) {

		// image-to-be-shown is already on other layer
		if(fb[0].childNodes[0] && fb[0].childNodes[0] === images[ndx].element) {
			if(fadeCount) {

				window.clearTimeout(fadeTimeout);
				window.clearTimeout(swapTimeout);

				fb.swap(0, 1);
				fadeCount = 100 - fadeCount;
				fade();

				setImgNdx(ndx);
			}
			return;
		}

		window.clearTimeout(fadeTimeout);
		window.clearTimeout(swapTimeout);

		setImgNdx(ndx);

		if(!images[imgNdx].element) {
			createImgElement(images[imgNdx]);
		}
		
		if(fadeCount) {
			fadeCount = 0;
		}

		if(!images[imgNdx].loaded) {
			showActivity();
			forceFade = true;
			return;
		}

		imgToScreen();
		fade();
	};

	doFx(0);
	hideActivity();
	selectNdx(0);

	sss.element = stage;

	sss.play = function() {
		if(paused) {
			nextImage();
			paused = false;
		}
		playing = 1;
	};

	sss.pause = function() {
		window.clearTimeout(swapTimeout);
		paused = true;
		playing = 0;
	};

	sss.isPlaying = function() {
		return(!!playing);
	};

	sss.jumpToImage = function(ndx) {
		ndx = Math.round(ndx);
		if(isNaN(ndx) || ndx < 0 || ndx >= images.length) {
			return;
		}
		selectNdx(ndx);
	};
	
	sss.getImageIndex = function() {
		return imgNdx;
	};

	return sss;
};