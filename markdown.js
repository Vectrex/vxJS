/**
 * Provides Markdown conversion for JS
 * 
 * @version 0.0.3 2010-09-27
 * @author Gregor Kofler
 * 
 * based extensively on the code of John Fraser <http://www.attacklab.net/>
 * 
 * @param {String} Markdown string
 * @returns {String} Markup String
 * 
 */
/*global vxJS*/

vxJS.markdown = function() {

	var uris = [], titles = [], htmlBlocks = [], listLevel;

	var tab2spc = function(t) {
		return t.
			replace(/\t(?=\t)/g,"    ").
			replace(/\t/g,"~A~B").
			replace(/~B(.+?)~A/g, 
				function(all, m1, m2) {
					for(var i = 4 - m1.length % 4; i--;) {
						m1 += " ";
					}
					return m1;
				}).
			replace(/~A/g,"    ").
			replace(/~B/g,"");
	};

	var encodeAmpsAndAngles = function(t) {
		return t.
			replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g,"&amp;").
			replace(/<(?![a-z\/?$!])/gi,"&lt;");
	};

	var encodeEmailAddress = function(addr) {

		var encode = [
			function(c) { return "&#"+c.charCodeAt(0)+";"; },
			function(c) { return "&#x"+c.charCodeAt(0).toString(16)+";"; },
			function(c) { return c; }
		], r;

		addr = "mailto:" + addr;

		addr = addr.replace(/./g, function(c) {
			if (c === "@") {
				c = encode[Math.floor(Math.random()*2)](c);
			}
			else if (c !== ":") {
				r = Math.random();
				c = r > 0.9  ?	encode[2](c)   :
					r > 0.45 ?	encode[1](c)   :
								encode[0](c);
			}
			return c;
		});

		return "<a href=\"" + addr + "\">" + addr.replace(/mailto:/, "") + "</a>";
	};

	var outdent = function(t) {
		return t.replace(/^(\t|[ ]{1,4})/gm,"");
	};

	var unescapeSpecialChars = function(t) {
		return t.replace(/~E(\d+)E/g,
			function(all, c) {
				return String.fromCharCode(parseInt(c, 10));
			});
	};

	var escCallback = function(all, match) { return  "~E" + match.charCodeAt(0) + "E"; };

	var escapeCharacters = function(t, charsToEscape, afterBackslash) {
		var r = "([" + charsToEscape.replace(/([\[\]\\])/g,"\\$1") + "])";

		if (afterBackslash) {
			r = "\\\\" + r;
		}

		return t.replace(new RegExp(r, "g"), escCallback);
	};

	var encodeCode = function(t) {
		var char = { "<" : "&lt;", ">" : "&gt;", "&" : "&amp;", '"' : "&quot;" };
		t = t.replace(/[<>&]/g, function(c) {
				return char[c];
			}
		);
		return escapeCharacters(t, "*_{}[]\\", false);
	};
	
	var stripLinkDefinitions = function(t) {

		// searches for ^[id]: url "optional title" and fills according hashes

		return t.
			replace(/^[ ]{0,3}\[(.+)\]:[ \t]*\n?[ \t]*<?(\S+?)>?[ \t]*\n?[ \t]*(?:(\n*)["(](.+?)[")][ \t]*)?(?:\n+|\Z)/gm,
				function (all, m1, m2, m3, m4) {
					m1 = m1.toLowerCase();
					uris[m1] = encodeAmpsAndAngles(m2);  // Link IDs are case-insensitive
					if (m3) {
						return m3 + m4;
					}
					else if (m4) {
						titles[m1] = m4.replace(/"/g,"&quot;");
					}
					return "";
				}
			);
	};

	var hashElement = function(all, element) {
		element = element.
			replace(/\n\n/g,"\n").
			replace(/(^\n|\n+$)/,"");
		return "\n\n~K" + (htmlBlocks.push(element)-1) + "K\n\n";
	};

	var hashHTMLBlocks = function(t) {
		return t.
			replace(/\n/g,"\n\n").
			replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|ins|del)\b[^\r]*?\n<\/\2>[ \t]*(?=\n+))/gm, hashElement).
			replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math)\b[^\r]*?.*<\/\2>[ \t]*(?=\n+)\n)/gm, hashElement).
			replace(/(\n[ ]{0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g, hashElement).			/* <hr /> */
			replace(/(\n\n[ ]{0,3}<!(--[^\r]*?--\s*)+>[ \t]*(?=\n{2,}))/g, hashElement).			/* standalone HTML comments */
			replace(/(?:\n\n)([ ]{0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g, hashElement).		/* PHP, ASP blocks */
			replace(/\n\n/g,"\n");
	};

	var hashBlock = function(t) {
		return "\n\n~K" + (htmlBlocks.push(t.replace(/(^\n+|\n+$)/g,""))-1) + "K\n\n";
	};

	var doHeaders = function(t) {
		// first
		//	Header 1 or Header 2
		//	========    --------
		// then
		//  # Header 1
		//  ## Header 2
		//  ## Header 2 with closing hashes ##
		//  ...
		
		return t.
			replace(/^(.+)[ \t]*\n=+[ \t]*\n+/gm,
					function(wholeMatch,m1){return hashBlock("<h1>" + runSpanGamut(m1) + "</h1>");}).
			replace(/^(.+)[ \t]*\n-+[ \t]*\n+/gm,
					function(matchFound,m1){return hashBlock("<h2>" + runSpanGamut(m1) + "</h2>");}).
			replace(/^(\#{1,6})[ \t]*(.+?)[ \t]*\#*\n+/gm,
				function(all, m1, m2) {
					var hLevel = m1.length;
					return hashBlock("<h" + hLevel + ">" + runSpanGamut(m2) + "</h" + hLevel + ">");
				});
	};

	
	var doLists = function(t) {
		var listType;

		var processListItems = function(l) {
			listLevel++;

			l = (l.replace(/\n{2,}$/,"\n") + "~0").
				replace(/(\n)?(^[ \t]*)([*+-]|\d+[.])[ \t]+([^\r]+?(\n{1,2}))(?=\n*(~0|\2([*+-]|\d+[.])[ \t]+))/gm,
					function(all, leadingLine, leadingSpace, m3, item) {
						if (leadingLine || /\n{2,}/.test(item)) {
							return  "<li>" + runBlockGamut(outdent(item)) + "</li>\n";
						}
						item = doLists(outdent(item)).replace(/\n$/,"");
						return  "<li>" + runSpanGamut(item) + "</li>\n";
					}
				).
				replace(/~0/g,"");

			listLevel--;
			return l;
		};
		
		if (listLevel) {
			return t.replace(/^(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?($|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm,
					function(all, m1, m2) {
						m1 = m1.replace(/\n{2,}/g,"\n\n\n");
						listType = /[*+-]/.test(m2) ? "ul" : "ol";
						return	"<"+listType+">" +
									processListItems(m1).replace(/\s+$/,"") +
								"</"+listType+">\n";
					});
		}
		return t.replace(/(\n\n|^\n?)(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/g,
				function(all, m1, m2, m3) {
					m2 = m2.replace(/\n{2,}/g,"\n\n\n");
					listType = /[*+-]/.test(m3) ? "ul" : "ol";
					return	m1 +
							"<"+listType+">\n" +
								processListItems(m2) +
							"</"+listType+">\n";	
				});
	};

	var doCodeBlocks = function(t) {
		return t.replace(/(?:\n\n|^)((?:(?:[ ]{4}|\t).*\n+)+)(\n*[ ]{0,3}[^ \t\n]|(?=$))/g,
				function(all, codeBlock, nextChar) {
				
					codeBlock = encodeCode(outdent(codeBlock));
					codeBlock = tab2spc(codeBlock);
					codeBlock = "<pre><code>" + codeBlock.replace(/(^\n+|n+$)/g,"") + "\n</code></pre>";

					return hashBlock(codeBlock) + nextChar;
				}
			);
	};

	var doBlockQuotes = function(t) {

		return t.replace(/((^[ \t]*>[ \t]?.+\n(.+\n)*\n*)+)/gm,
			function(all, bq) {

				bq = bq.
					replace(/^[ \t]*>[ \t]?/gm,"").	/* trim one level of quoting */
					replace(/^[ \t]+$/gm,"");		/* trim whitespace-only lines */

				bq = runBlockGamut(bq);

				bq = bq.
					replace(/(^|\n)/g,"$1  ").
					replace(
						/(\s*<pre>[^\r]+?<\/pre>)/gm,
							function(all, pre) {
								return pre.replace(/^ {2}/mg,"");
							});
				return hashBlock("<blockquote>\n" + bq + "\n</blockquote>");
			});
	};

	var formParagraphs = function(t) {
		t = t.replace(/(^\n+|\n+$)/g,"");

		var grafs = t.split(/\n{2,}/g), grafsOut = [], i, len, str, blockText;

		for (i = 0, len = grafs.length; i < len; i++) {
			str = grafs[i];
			if(/~K(\d+)K/.test(str)) {
				grafsOut.push(str);
			}
			else if (/\S/.test(str)) {
				grafsOut.push(runSpanGamut(str).replace(/^([ \t]*)/g,"<p>") + "</p>");
			}
		}

		for(i = 0, len = grafsOut.length; i < len; i++) {
			while (/~K(\d+)K/.test(grafsOut[i])) {
				blockText = htmlBlocks[RegExp.$1].replace(/\$/g,"$$$$");
				grafsOut[i] = grafsOut[i].replace(/~K\d+K/, blockText);
			}
		}

		return grafsOut.join("\n\n");
	};

	var runBlockGamut = function(t) {
		t = doHeaders(t);
		t = t.replace(/^[ ]{0,2}([ ]?[_*-][ ]?){3,}[ \t]*$/gm, hashBlock("<hr />"));
		t = doLists(t);
		t = doCodeBlocks(t);
		t = doBlockQuotes(t);
		t = hashHTMLBlocks(t);	// hash HTML blocks created wirh Markdown
		t = formParagraphs(t);

		return t;
	};

	var doCodeSpans = function(t) {
		/* Backtick quotes are used for <code></code> spans.
		 * You can use multiple backticks as the delimiters if you want to
		 * include literal backticks in the code span. So, this input:
		 * Just type ``foo `bar` baz`` at the prompt.
		 */
		return t.replace(/(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm,
				function(all, prev, bt1, code, bt2) {
					code = code.replace(/(^[ \t]*|[ \t]*$)/g,"");	// leading and trailing whitespace
					return prev + "<code>" + encodeCode(code) + "</code>";
				});
	};

	var escapeSpecialCharsWithinTagAttributes = function(t) {
		return t.replace(/(<[a-z\/!$]("[^"]*"|'[^']*'|[^'">])*>|<!(--.*?--\s*)+>)/gi, function(all) {
			return escapeCharacters(all.replace(/(.)<\/?code>(?=.)/g,"$1`"), "\\`*_");
		});
	};

	var encodeBackslashEscapes = function(t) {
		return t.replace(/\\(\\)/g, escCallback).replace(/\\([`*_{}\[\]()>#+-.!])/g, escCallback);
	};
	
	var doImages = function(t) {

		var imgTag = function(all ,whole, alt, linkId, url, m5, m6, title) {
			var html;
			linkId	 = linkId.toLowerCase();

			if (!url) {
				if (!linkId) {
					linkId = alt.toLowerCase().replace(/ ?\n/g," ");
				}
				url = "#"+linkId;
				
				if (uris[linkId]) {
					url = uris[linkId];
					if (titles[linkId]) {
						title = titles[linkId];
					}
				}
				else {
					return whole;
				}
			}	

			alt = alt.replace(/"/g,"&quot;");
			url = escapeCharacters(url,"*_");
			html = '<img src="' + url + '" alt="' + alt + '"';

			if (!title) {
				title = alt;
			}
			else {
				title = title.replace(/"/g,"&quot;");
			}
			title = escapeCharacters(title,"*_");

			html +=  ' title="' + title + '"';
			return html + " />";
		};

		// reference-style labeled images: ![alt text][id]
		t = t.replace(/(!\[(.*?)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g, imgTag);
		// inline images:  ![alt text](url "optional title")
		t = t.replace(/(!\[(.*?)\]\s?\([ \t]*()<?(\S+?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g,imgTag);

		return t;
	};

	var doAnchors = function(t) {

		var aTag = function(all, whole, linkText, linkId, url, m5, m6, title) {
			var html;
			if (!title) {
				title = "";
			}
			linkId = linkId.toLowerCase();
			
			if(!url) {
				if(!linkId) {
					linkId = linkText.toLowerCase().replace(/ ?\n/g," ");
				}
				url = "#"+linkId;
				
				if (uris[linkId]) {
					url = uris[linkId];
					if (titles[linkId]) {
						title = titles[linkId];
					}
				}
				else {
					if (/\(\s*\)$/m.test(whole)) {
						url = "";
					}
					else {
						return whole;
					}
				}
			}
			
			html = '<a href="' + escapeCharacters(url,"*_") + '"';
			if(title) {
				title = title.replace(/"/g,"&quot;");
				html +=  ' title="' + escapeCharacters(title,"*_") + '"';
			}

			return html + ">" + linkText + "</a>";
		};
		
		// reference-style links: [link text] [id]
		t = t.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g, aTag);
		// inline-style links: [link text](url "optional title")
		t = t.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\]\([ \t]*()<?(.*?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g, aTag);
		// reference-style shortcuts: [link text]
		t = t.replace(/(\[([^\[\]]+)\])()()()()()/g, aTag);
		return t;
	};

	var doAutoLinks = function(t) {

		return t.
			replace(/<((https?|ftp|dict):[^'">\s]+)>/gi,"<a href=\"$1\">$1</a>").
			replace(/<(?:mailto:)?([-.\w]+\@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi,
				function(all, addr) {
					return encodeEmailAddress( unescapeSpecialChars(addr) );
				}
			);
	};
	
	var doItalicsAndBold = function(t) {
		return t.
			replace(/(\*\*|__)(?=\S)([^\r]*?\S[*_]*)\1/g, "<strong>$2</strong>").
			replace(/(\*|_)(?=\S)([^\r]*?\S)\1/g, "<em>$2</em>");
	};

	var runSpanGamut = function(t) {
		t = doCodeSpans(t);
		t = escapeSpecialCharsWithinTagAttributes(t);
		t = encodeBackslashEscapes(t);

		t = doImages(t);
		t = doAnchors(t);

		t = doAutoLinks(t);
		t = encodeAmpsAndAngles(t);
		t = doItalicsAndBold(t);

		return t.replace(/  +\n/g," <br />\n");
	};
	
	// John Fraser:
	// Replace ~ with ~T:
	// This lets us use tilde as an escape char to avoid md5 hashes
	// The choice of character is arbitray; anything that isn't magic in Markdown will work
	// Replace $ with ~D:
	// RegExp interprets $ as a special character when it's in a replacement string

	return {
		convert: function(text) {
			text = text.replace(/~/g,"~T").replace(/\$/g,"~D").replace(/\r\n?/g,"\n"); 	// ~|$ masked, CR unified
	
			text = "\n\n" + tab2spc(text) + "\n\n";
			text = text.replace(/^[ \t]+$/mg,"");
			text = hashHTMLBlocks(text);			// hash "inline" HTML blocks
			text = stripLinkDefinitions(text);
			text = runBlockGamut(text);
			text = unescapeSpecialChars(text);
	
			return text.replace(/~D/g,"$$").replace(/~T/g,"~"); // unmask $|~		
		}
	};
}();