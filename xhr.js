/**
 * provides xmlHttpRequest object
 * 
 * @param {Object} request, { command: {string}, uri: {String}, echo: {Boolean}, timeout: {Number}, forceXMLResponse: {Boolean}
 * @param {Object} param, object containing all additional parameters needed by request
 * @param {Object} animation, object containing a node reference
 * @param {Object} container with callback functions { completed: {Function}, timeout: {Function} }
 * 
 * @returns xhr object
 * 
 * @version 3.8.0 2011-06-02
 * @author Gregor Kofler
 * 
 * served events: "timeout", "complete", "fail", "beforeSend"
 */

vxJS.xhrObj = function() {
	var	ms = ["Msxml2.XMLHTTP", "Msxml2.XMLHTTP.3.0", "Msxml2.XMLHTTP.6.0"], i, ok;

	try { ok = new XMLHttpRequest(); } catch (e) {}
	if(ok) {
		return function() { return new XMLHttpRequest(); };
	}
	for (i = ms.length; i--;) {
		try { ok = new ActiveXObject(ms[i]); } catch (e) { }
		if(ok) {
			return function() { return new ActiveXObject(ms[i]); };
		}
	}
	if(window.createRequest) {
		return function() { return window.createRequest(); };
	}
	throw Error("vxJS.xhr: Can't instantiate XMLHttpRequest!");
}();

vxJS.xhr = function(req, param, anim, cb) {
	if(!req)	{ req = {}; }
	if(!param)	{ param = {}; }
	if(!anim)	{ anim = {}; }

	var	timeout = req.timeout || 5000, timer, xhrO = vxJS.xhrObj(), that = { response: {} };

	var stopTimer = function() {
		if(timer) {
			window.clearTimeout(timer);
		}
		if(anim.node) {
			anim.node.style.display = "none";
		}
	};

	var abort = function() {
		stopTimer();
		if(xhrO) { 
			xhrO.onreadystatechange = function() {};
			if(xhrO.readyState !== 0 && xhrO.readyState !== 4) {
				xhrO.abort();
			}
		}
	};

	var startTimer = function() {
		if(timeout > 0) {
			timer = window.setTimeout( function() {
					abort();
					vxJS.event.serve(that, "timeout");
					if(cb && typeof cb.timeout === "function") {
						cb.timeout.call(that);
					}
				}, timeout);
		}
		if(anim.node) {
			anim.node.style.display = "";
		}
	};

	var stateChange = function () {
		if(xhrO.readyState === 4) {
			if(xhrO.status >= 200 && xhrO.status < 300 || xhrO.status === 1223) {
				abort();

				if(req.forceXMLResponse) {
					that.response = xhrO.responseXML || xhrO.responseText;
				}
				else {
					that.response = JSON.parse(xhrO.responseText || "{}");
				}
	
				vxJS.event.serve(that, "complete");
				if(cb && typeof cb.complete === "function") {
					cb.complete.call(that);
				}
			}
			else {
				vxJS.event.serve(that, "fail");
				if(cb && typeof cb.fail === "function") {
					cb.fail.call(that);
				}
			}
		}
	};

	var submit = function() {
		abort();

		param.httpRequest = req.command || "";
		param.echo = req.echo ? 1 : 0;
	
		if(req.forceXMLResponse && xhrO.overrideMimeType) {
			xhrO.overrideMimeType("text/xml");
		}

		xhrO.open(	"POST",
					encodeURI(req.uri || window.location.href),
					true
		);
		xhrO.setRequestHeader("X-Requested-With", "XMLHttpRequest");
		xhrO.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	
		xhrO.onreadystatechange = stateChange;	
		vxJS.event.serve(that, "beforeSend");
		xhrO.send("xmlHttpRequest="+encodeURIComponent(JSON.stringify(param)));
		startTimer();
	};

	that.xhrObj	= xhrO;
	that.abort	= abort;
	that.submit = submit;
	that.use	= function(r, p, a, c) {
		vxJS.merge(req,		r);
		vxJS.merge(param,	p);
		vxJS.merge(anim,	a);
		if(typeof cb === "object") {
			vxJS.merge(cb, c);
		}
		else {
			cb = c;
		}
	};

	return that;
};

/**
 * JSON encoding/decoding by Douglas Crockford https://github.com/douglascrockford/JSON-js
 */
if(!this.JSON){this.JSON={};}
(function(){"use strict";function f(n){return n<10?'0'+n:n;}
if(typeof Date.prototype.toJSON!=='function'){Date.prototype.toJSON=function(key){return isFinite(this.valueOf())?this.getUTCFullYear()+'-'+
f(this.getUTCMonth()+1)+'-'+
f(this.getUTCDate())+'T'+
f(this.getUTCHours())+':'+
f(this.getUTCMinutes())+':'+
f(this.getUTCSeconds())+'Z':null;};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(key){return this.valueOf();};}
var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={'\b':'\\b','\t':'\\t','\n':'\\n','\f':'\\f','\r':'\\r','"':'\\"','\\':'\\\\'},rep;function quote(string){escapable.lastIndex=0;return escapable.test(string)?'"'+string.replace(escapable,function(a){var c=meta[a];return typeof c==='string'?c:'\\u'+('0000'+a.charCodeAt(0).toString(16)).slice(-4);})+'"':'"'+string+'"';}
function str(key,holder){var i,k,v,length,mind=gap,partial,value=holder[key];if(value&&typeof value==='object'&&typeof value.toJSON==='function'){value=value.toJSON(key);}
if(typeof rep==='function'){value=rep.call(holder,key,value);}
switch(typeof value){case'string':return quote(value);case'number':return isFinite(value)?String(value):'null';case'boolean':case'null':return String(value);case'object':if(!value){return'null';}
gap+=indent;partial=[];if(Object.prototype.toString.apply(value)==='[object Array]'){length=value.length;for(i=0;i<length;i+=1){partial[i]=str(i,value)||'null';}
v=partial.length===0?'[]':gap?'[\n'+gap+
partial.join(',\n'+gap)+'\n'+
mind+']':'['+partial.join(',')+']';gap=mind;return v;}
if(rep&&typeof rep==='object'){length=rep.length;for(i=0;i<length;i+=1){k=rep[i];if(typeof k==='string'){v=str(k,value);if(v){partial.push(quote(k)+(gap?': ':':')+v);}}}}else{for(k in value){if(Object.hasOwnProperty.call(value,k)){v=str(k,value);if(v){partial.push(quote(k)+(gap?': ':':')+v);}}}}
v=partial.length===0?'{}':gap?'{\n'+gap+partial.join(',\n'+gap)+'\n'+
mind+'}':'{'+partial.join(',')+'}';gap=mind;return v;}}
if(typeof JSON.stringify!=='function'){JSON.stringify=function(value,replacer,space){var i;gap='';indent='';if(typeof space==='number'){for(i=0;i<space;i+=1){indent+=' ';}}else if(typeof space==='string'){indent=space;}
rep=replacer;if(replacer&&typeof replacer!=='function'&&(typeof replacer!=='object'||typeof replacer.length!=='number')){throw new Error('JSON.stringify');}
return str('',{'':value});};}
if(typeof JSON.parse!=='function'){JSON.parse=function(text,reviver){var j;function walk(holder,key){var k,v,value=holder[key];if(value&&typeof value==='object'){for(k in value){if(Object.hasOwnProperty.call(value,k)){v=walk(value,k);if(v!==undefined){value[k]=v;}else{delete value[k];}}}}
return reviver.call(holder,key,value);}
text=String(text);cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(a){return'\\u'+
('0000'+a.charCodeAt(0).toString(16)).slice(-4);});}
if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,'@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,']').replace(/(?:^|:|,)(?:\s*\[)+/g,''))){j=eval('('+text+')');return typeof reviver==='function'?walk({'':j},''):j;}
throw new SyntaxError('JSON.parse');};}}());