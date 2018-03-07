/**
 * various math and crypto functions
 * 
 * @author Gregor Kofler, info@gregorkofler.at
 * @version 0.1.1 2018-03-07
 * 
 * vxJS.math.md5() is based Joseph Myers' and Will Bonds work
 * https://github.com/wbond/md5-js/blob/master/md5.js
 */
"use strict";

vxJS.math = {
	md5: (function() {

		var cmn = function(q, a, b, x, s, t) {
			a = (((a + q) & 0xFFFFFFFF) + ((x + t) & 0xFFFFFFFF)) & 0xFFFFFFFF;
			return (((a << s) | (a >>> (32 - s))) + b) & 0xFFFFFFFF;
		};

		var ff = function (a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); };
		var gg = function (a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); };
		var hh = function (a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); };
		var ii = function (a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); };

		var md5cycle = function(x, k) {
			var a = x[0], b = x[1], c = x[2], d = x[3];

			a = ff(a, b, c, d, k[0], 7,		0xd76aa478);
			d = ff(d, a, b, c, k[1], 12,	0xe8c7b756);
			c = ff(c, d, a, b, k[2], 17,	0x242070db);
			b = ff(b, c, d, a, k[3], 22,	0xc1bdceee);
			a = ff(a, b, c, d, k[4], 7, 	0xf57c0faf);
			d = ff(d, a, b, c, k[5], 12,	0x4787c62a);
			c = ff(c, d, a, b, k[6], 17,	0xa8304613);
			b = ff(b, c, d, a, k[7], 22,	0xfd469501);
			a = ff(a, b, c, d, k[8], 7,		0x698098d8);
			d = ff(d, a, b, c, k[9], 12,	0x8b44f7af);
			c = ff(c, d, a, b, k[10], 17,	0xffff5bb1);
			b = ff(b, c, d, a, k[11], 22,	0x895cd7be);
			a = ff(a, b, c, d, k[12], 7,	0x6b901122);
			d = ff(d, a, b, c, k[13], 12,	0xfd987193);
			c = ff(c, d, a, b, k[14], 17,	0xa679438e);
			b = ff(b, c, d, a, k[15], 22,	0x49b40821);

			a = gg(a, b, c, d, k[1], 5,		0xf61e2562);
			d = gg(d, a, b, c, k[6], 9,		0xc040b340);
			c = gg(c, d, a, b, k[11], 14,	0x265e5a51);
			b = gg(b, c, d, a, k[0], 20,	0xe9b6c7aa);
			a = gg(a, b, c, d, k[5], 5,		0xd62f105d);
			d = gg(d, a, b, c, k[10], 9,	0x02441453);
			c = gg(c, d, a, b, k[15], 14,	0xd8a1e681);
			b = gg(b, c, d, a, k[4], 20,	0xe7d3fbc8);
			a = gg(a, b, c, d, k[9], 5,		0x21e1cde6);
			d = gg(d, a, b, c, k[14], 9,	0xc33707d6);
			c = gg(c, d, a, b, k[3], 14,	0xf4d50d87);
			b = gg(b, c, d, a, k[8], 20,	0x455a14ed);
			a = gg(a, b, c, d, k[13], 5,	0xa9e3e905);
			d = gg(d, a, b, c, k[2], 9,		0xfcefa3f8);
			c = gg(c, d, a, b, k[7], 14,	0x676f02d9);
			b = gg(b, c, d, a, k[12], 20,	0x8d2a4c8a);

			a = hh(a, b, c, d, k[5], 4,		0xfffa3942);
			d = hh(d, a, b, c, k[8], 11,	0x8771f681);
			c = hh(c, d, a, b, k[11], 16,	0x6d9d6122);
			b = hh(b, c, d, a, k[14], 23,	0xfde5380c);
			a = hh(a, b, c, d, k[1], 4,		0xa4beea44);
			d = hh(d, a, b, c, k[4], 11,	0x4bdecfa9);
			c = hh(c, d, a, b, k[7], 16,	0xf6bb4b60);
			b = hh(b, c, d, a, k[10], 23,	0xbebfbc70);
			a = hh(a, b, c, d, k[13], 4,	0x289b7ec6);
			d = hh(d, a, b, c, k[0], 11,	0xeaa127fa);
			c = hh(c, d, a, b, k[3], 16,	0xd4ef3085);
			b = hh(b, c, d, a, k[6], 23,	0x04881d05);
			a = hh(a, b, c, d, k[9], 4,		0xd9d4d039);
			d = hh(d, a, b, c, k[12], 11,	0xe6db99e5);
			c = hh(c, d, a, b, k[15], 16,	0x1fa27cf8);
			b = hh(b, c, d, a, k[2], 23,	0xc4ac5665);

			a = ii(a, b, c, d, k[0], 6,		0xf4292244);
			d = ii(d, a, b, c, k[7], 10,	0x432aff97);
			c = ii(c, d, a, b, k[14], 15,	0xab9423a7);
			b = ii(b, c, d, a, k[5], 21,	0xfc93a039);
			a = ii(a, b, c, d, k[12], 6,	0x655b59c3);
			d = ii(d, a, b, c, k[3], 10,	0x8f0ccc92);
			c = ii(c, d, a, b, k[10], 15,	0xffeff47d);
			b = ii(b, c, d, a, k[1], 21,	0x85845dd1);
			a = ii(a, b, c, d, k[8], 6,		0x6fa87e4f);
			d = ii(d, a, b, c, k[15], 10,	0xfe2ce6e0);
			c = ii(c, d, a, b, k[6], 15,	0xa3014314);
			b = ii(b, c, d, a, k[13], 21,	0x4e0811a1);
			a = ii(a, b, c, d, k[4], 6,		0xf7537e82);
			d = ii(d, a, b, c, k[11], 10,	0xbd3af235);
			c = ii(c, d, a, b, k[2], 15,	0x2ad7d2bb);
			b = ii(b, c, d, a, k[9], 21,	0xeb86d391);

			x[0] = (a + x[0]) & 0xFFFFFFFF;
			x[1] = (b + x[1]) & 0xFFFFFFFF;
			x[2] = (c + x[2]) & 0xFFFFFFFF;
			x[3] = (d + x[3]) & 0xFFFFFFFF;
		};

		var md51 = function (s) {

			var md5blk = function (s) {
				var md5blks = [], i;

				for (i = 0; i < 64; i += 4) {
					md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
				}
				return md5blks;
			};

			var i, l, n = s.length; state = [1732584193, -271733879, -1732584194, 271733878], tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

			for (i = 64, l = s.length; i <= l; i += 64) {
				md5cycle(state, md5blk(s.substring(i - 64, i)));
			}

			s = s.substring(i - 64);

			for (i = 0, l = s.length; i < l; ++i) {
				tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
			}

			tail[i >> 2] |= 0x80 << ((i % 4) << 3);

			if (i > 55) {
				md5cycle(state, tail);

				for (i = 0; i < 16; ++i) {
					tail[i] = 0;
				}
			}

			tail[14] = n * 8;
			md5cycle(state, tail);
			return state;
		};	

		var hexChars = "0123456789abcdef".split("");

		var hex = function (s) {

			var i, j, l, r;

			for (i = 0, l = s.length; i < l; ++i) {

				r = "";
				for(j = 0; j < 4; ++j) {
					r += hexChars[(s[i] >> (j * 8 + 4)) & 0x0F] + hexChars[(s[i] >> (j * 8)) & 0x0F];
				}
				s[i] = r;

			}
			return s.join("");
		};

		return function (s) {

			// converts the string to UTF-8 "bytes" when necessary

			return hex(md51(/[\x80-\xFF]/.test(s) ? unescape(encodeURI(s)) : s));
		};
	})(),

	uuid: function() {
		var u = [], r, i = 36;

		u[8] = u[13] = u[18] = u[23] = "-";
		u[14] = "4";

		while(i--) {
			if(!u[i]) {
				r = 0 | Math.random() * 16;
				u[i] = "0123456789ABCDEF"[i === 19 ? (r & 0x3 | 0x8) : r];
			}
		}

		return u.join("");
	}
};