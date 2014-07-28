/**
 * simple image zoom
 *
 * @version 0.2.5 2014-08-28
 * @author Gregor Kofler
 * 
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code

 *
 * @param {Object} configuration (all parameters are optional)
 *	tTime:				{Number} transition time for opening/closing stage; times between image changes are compensated
 *	stagePosElem:		{Object} DOM element used for "marking" the final stage position
 *	zoomableContainer:	{Object} only thumbnails within this container become zoomable
 *	stageClass:			{String} className of DIV element forming the stage
 *
 * @return {Object} imageZoom object
 *
 * served events: "openStart", "openStop", "changeStart", "changeStop", "closeStart", "closeStop", "hideStart", "hideStop"
 */
vxJS.widget.imageZoom = function(config) {

	"use strict";

	if(!config) {
		config = {};
	}

	var that = {}, images = [], waitingFor, zoomActive, shown, tTime = config.tTime || 0.3, fps = 60;

	var activityLayer = (function() {
		var d = "div".setProp("class", "activityLayer").create(), s = d.style;
		s.display = "none";
		return d;
	}());

	var stage = (function() {
		var d = "div".setProp("class", config.stageClass || "vxJS_imageZoom_stage").create("img".create()), s = d.style;
		s.display = "none";
		s.position = "absolute";
		d.appendChild(activityLayer);
		vxJS.dom.getBody().appendChild(d);
		return d;
	}());


	var zoomIn = function() {
		var fxCount = 0,
			vps = vxJS.dom.getViewportSize(), sSize, sPos,
			ePos = config.stagePosElem ? vxJS.dom.getElementOffset(config.stagePosElem) : new Coord((vps.x - this.size.x)/2, (vps.y - this.size.y)/2).add(vxJS.dom.getDocumentScroll());

		if(this.thumb) {
			sSize = vxJS.dom.getElementSize(this.thumb);
			sPos = vxJS.dom.getElementOffset(this.thumb);
		}
		else {
			sSize = new Coord(50, 50);
			sPos = vxJS.dom.getElementOffset(this.a);
		}

		shown = this;
		vxJS.event.serve(that, "openStart");
		zoomActive = true;

		stage.replaceChild(shown.img, stage.firstChild);
		vxJS.dom.setElementSize(shown.img, sSize);
		vxJS.dom.setElementPosition(stage, sPos);
		vxJS.dom.setOpacity(stage, 0);
		vxJS.dom.removeClassName(stage, "fullyZoomed");
		stage.style.display = "";

		(function doZoom() {
			fxCount += 1/fps/tTime;

			if(fxCount >= 1) {
				vxJS.dom.setElementSize(shown.img, shown.size);
				vxJS.dom.setElementPosition(stage, ePos);
				vxJS.dom.setOpacity(stage, 1);
				vxJS.dom.addClassName(stage, "fullyZoomed");
				zoomActive = null;
				vxJS.event.serve(that, "openStop");
				return;
			}
			vxJS.dom.setElementSize(shown.img, new Coord(sSize.x + (shown.size.x - sSize.x) * fxCount, sSize.y + (shown.size.y - sSize.y) * fxCount));
			vxJS.dom.setElementPosition(stage, new Coord(sPos.x + (ePos.x - sPos.x) * fxCount, sPos.y + (ePos.y - sPos.y) * fxCount));
			vxJS.dom.setOpacity(stage, fxCount);
			window.requestAnimationFrame(doZoom);
		}());
	};

	var zoomTo = function() {
		var fxCount = 0, compTime, sSize = shown.size,
			vps = vxJS.dom.getViewportSize(), padding, sPos,
			ePos = config.stagePosElem ? vxJS.dom.getElementOffset(config.stagePosElem) : new Coord((vps.x - this.size.x)/2, (vps.y - this.size.y)/2).add(vxJS.dom.getDocumentScroll());

		shown = this;
		vxJS.event.serve(that, "changeStart");

		if(sSize.x == this.size.x && sSize.y == this.size.y) {
			stage.replaceChild(this.img, stage.firstChild);
			vxJS.event.serve(that, "changeStop");
			return;
		}

		zoomActive = true;

		vxJS.dom.removeClassName(stage, "fullyZoomed");
		stage.removeChild(stage.firstChild);
		padding = vxJS.dom.getElementSize(stage);
		stage.insertBefore(this.img, stage.firstChild);
		vxJS.dom.setElementSize(this.img, sSize);
		sPos = vxJS.dom.getElementOffset(stage, null).add(new Coord(padding.x/2, padding.y/2));
		compTime = Math.max(0.2, Math.abs((this.size.len() - sSize.len())) / this.size.len() * tTime);
		(function doZoom() {
			fxCount += 1/fps/compTime;

			if(fxCount >= 1) {
				vxJS.dom.setElementSize(shown.img, shown.size);
				vxJS.dom.setElementPosition(stage, ePos);
				vxJS.dom.addClassName(stage, "fullyZoomed");
				zoomActive = null;
				vxJS.event.serve(that, "changeStop");
				return;
			}
			vxJS.dom.setElementSize(shown.img, new Coord(sSize.x + (shown.size.x - sSize.x) * fxCount, sSize.y + (shown.size.y - sSize.y) * fxCount));
			vxJS.dom.setElementPosition(stage, new Coord(sPos.x + (ePos.x - sPos.x) * fxCount, sPos.y + (ePos.y - sPos.y) * fxCount));
			window.requestAnimationFrame(doZoom);
		}());
	};

	var zoomOut = function(hide) {
		var fxCount = 1;

		if(!shown || zoomActive || !hide) {
			return;
		}
		zoomActive = true;
		vxJS.event.serve(that, hide ? "hideStart" : "closeStart");
		vxJS.dom.removeClassName(stage, "fullyZoomed");

		(function doZoom() {
			fxCount -= 1/fps/tTime;

			if(fxCount <= 0) {
				stage.style.display = "none";
				zoomActive = false;
				shown = null;
				vxJS.event.serve(that, hide ? "hideStop" : "closeStop");
				return;
			}
			vxJS.dom.setOpacity(stage, fxCount);
			window.requestAnimationFrame(doZoom);
		}());
	};

	var setLoaded = function() {
		this.size	= new Coord(this.img.width, this.img.height);
		this.loaded = true;
		this.aL.style.display = "none";
		activityLayer.style.display = "none";

		if(waitingFor == this && !zoomActive) {
			(shown ? zoomTo : zoomIn).bind(this)();
		}
	};
	var setError = function() {
		this.error = true;
	};

	var preparePreload = function(item) {
		var i = "img".create();

		vxJS.event.removeListener(item.listenerId);

		item.img = i;

		i.onload = setLoaded.bind(item);
		i.onerror = setError.bind(item);
		i.src = item.a.href;

		if(i.complete) {
			i.onload = null;
			setLoaded.bind(item)();
		}
	};

	var preloadImage = function(item) {
		return function() { preparePreload(item); };
	};

	var doZoom = function(item) {
		if(item.error || zoomActive || shown == item) {
			return;
		}
		if(!item.img) {
			preparePreload(item);
		}
		if(item.loaded) {
			waitingFor = null;
			(shown ? zoomTo : zoomIn).bind(item)();
		}
		else {
			waitingFor = item;
			item.aL.style.display = "";
			activityLayer.style.display = "";
		}
	};

	var zoom = function(item) {
		return function(e) {
			vxJS.event.preventDefault(e);
			doZoom(item);
		};
	};

	vxJS.dom.getElementsByClassName("vxJS_imageZoom_a", config.zoomableContainer, "a").forEach(function(a) {
		var item = {
			a:		a,
			thumb:	a.getElementsByTagName("img")[0],
			aL:		activityLayer.cloneNode(true)
		};
		a.appendChild(item.aL);
		item.listenerId = vxJS.event.addListener(a, "mouseover", preloadImage(item));
		images.push(item);
		vxJS.event.addListener(a, "click", zoom(item));
	});
	vxJS.event.addListener(stage, "click", zoomOut);

	that.getImages = function() { return images; };
	that.getShown = function() { return shown; };
	that.zoom = function(ndx) { doZoom(images[ndx]); };
	that.hide = function() { zoomOut(true); };

	that.element = stage;

	return that;
};