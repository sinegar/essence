/*
 * Modified by Peter Perenyi to adopt to confluence syntax. 
 * 
 * 
 * JavaScript Creole 1.0 Wiki Markup Parser
 * $Id: creole.js 14 2009-03-21 16:15:08Z ifomichev $
 *
 * Copyright (c) 2009 Ivan Fomichev
 *
 * Portions Copyright (c) 2007 Chris Purcell
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

if (!Parse) { var Parse = {}; }
if (!Parse.Simple) { Parse.Simple = {}; }

Parse.Simple.Base = function(grammar, options) {
    if (!arguments.length) { return; }

    this.grammar = grammar;
    this.grammar.root = new this.ruleConstructor(this.grammar.root);
    this.options = options;
};

Parse.Simple.Base.prototype = {
    ruleConstructor: null,
    grammar: null,
    options: null,

    parse: function(node, data, options) {
        if (options) {
            for (i in this.options) {
                if (typeof options[i] == 'undefined') { options[i] = this.options[i]; }
            }
        }
        else {
            options = this.options;
        }
        data = data.replace(/\r\n?/g, '\n');
        this.grammar.root.apply(node, data, options);
        if (options && options.forIE) { node.innerHTML = node.innerHTML.replace(/\r?\n/g, '\r\n'); }
    }
};

Parse.Simple.Base.prototype.constructor = Parse.Simple.Base;

Parse.Simple.Base.Rule = function(params) {
    if (!arguments.length) { return; }

    for (var p in params) { this[p] = params[p]; }
    if (!this.children) { this.children = []; }
};

Parse.Simple.Base.prototype.ruleConstructor = Parse.Simple.Base.Rule;

Parse.Simple.Base.Rule.prototype = {
    regex: null,
    capture: null,
    replaceRegex: null,
    replaceString: null,
    tag: null,
    attrs: null,
    children: null,

    match: function(data, options) {
        return data.match(this.regex);
    },

    build: function(node, r, options) {
        var data;
        if (this.capture !== null) {
            data = r[this.capture];
        }

        var target;
        if (this.tag) {
            target = document.createElement(this.tag);
            node.appendChild(target);
        }
        else { target = node; }

        if (data) {
            if (this.replaceRegex) {
                data = data.replace(this.replaceRegex, this.replaceString);
            }
            this.apply(target, data, options);
        }

        if (this.attrs) {
            for (var i in this.attrs) {
                target.setAttribute(i, this.attrs[i]);
                if (options && options.forIE && i == 'class') { target.className = this.attrs[i]; }
            }
        }
        return this;
    },

    apply: function(node, data, options) {
        var tail = '' + data;
        var matches = [];

        if (!this.fallback.apply) {
            this.fallback = new this.constructor(this.fallback);
        }

        while (true) {
            var best = false;
            var rule  = false;
            for (var i = 0; i < this.children.length; i++) {
                if (typeof matches[i] == 'undefined') {
                    if (!this.children[i].match) {
                        this.children[i] = new this.constructor(this.children[i]);
                    }
                    matches[i] = this.children[i].match(tail, options);
                }
                if (matches[i] && (!best || best.index > matches[i].index)) {
                    best = matches[i];
                    rule = this.children[i];
                    if (best.index == 0) { break; }
                }
            }
                
            var pos = best ? best.index : tail.length;
            if (pos > 0) {
                this.fallback.apply(node, tail.substring(0, pos), options);
            }
            
            if (!best) { break; }

            if (!rule.build) { rule = new this.constructor(rule); }
            rule.build(node, best, options);

            var chopped = best.index + best[0].length;
            tail = tail.substring(chopped);
            for (var i = 0; i < this.children.length; i++) {
                if (matches[i]) {
                    if (matches[i].index >= chopped) {
                        matches[i].index -= chopped;
                    }
                    else {
                        matches[i] = void 0;
                    }
                }
            }
        }

        return this;
    },

    fallback: {
        apply: function(node, data, options) {
            if (options && options.forIE) {
                // workaround for bad IE
                data = data.replace(/\n/g, ' \r');
            }
            node.appendChild(document.createTextNode(data));
        }
    }    
};

Parse.Simple.Base.Rule.prototype.constructor = Parse.Simple.Base.Rule;

Parse.Simple.Confluence = function(options) {
	var g = {
	        singleLine: { regex: /.+/, capture: 0 },
	        escape: { regex: /\\(.)/, capture: 1 },
	        preBlock: { tag: 'pre', capture: 2, regex: /([^\\]\{code[^\}]*\}\n?)((.*?\n)*?.*?)(\{code\})/ },
	        noformat: { tag: 'pre', capture: 2, regex: /(\{noformat\})((.*?\n)*?.*?)(\{noformat\})/ },
	        macro: { build: function(node, r, options){}, regex: /(\{[^\}]*\})/ },
	        paragraph: { tag: 'p', capture: 0,
	            regex: /(^|\n)([ \t]*\S.*(\n|$))+/ },
	        text: { capture: 0, regex: /(^|\n)([ \t]*[^\s].*(\n|$))+/ },
	        strong: { tag: 'strong', capture: 1,
	            regex: /\*([^*]*)\*/ },
	        em: { tag: 'em', capture: 1,
	                regex: /_([^*]*)_/ },
	        tt: { tag: 'tt',
	                regex: /\{\{(.*?)\}\}/, capture: 1,
	                replaceRegex: /\}\}\}$/, replaceString: '' },
	        hr: { tag: 'hr', regex: /(^|\n)\s*----\s*(\n|$)/ },
	        ulist: { tag: 'ul', capture: 0,
	            regex: /(^|\n)([ \t]*\*[^*#].*(\n|$)([ \t]*[^\s*#].*(\n|$))*([ \t]*[*#]{2}.*(\n|$))*)+/ },
	        olist: { tag: 'ol', capture: 0,
	            regex: /(^|\n)([ \t]*#[^*#].*(\n|$)([ \t]*[^\s*#].*(\n|$))*([ \t]*[*#]{2}.*(\n|$))*)+/ },
	        li: { tag: 'li', capture: 0,
	            regex: /[ \t]*([*#]).+(\n[ \t]*[^*#\s].*)*(\n[ \t]*\1[*#].+)*/,
	            replaceRegex: /(^|\n)[ \t]*[*#]/g, replaceString: '$1' },
            table: { tag: 'table', capture: 0,
	                regex: /(^|\n)(\|.*?[ \t]*(\n|$))+/ },
            tr: { tag: 'tr', capture: 2, regex: /(^|\n)(\|.*?)\|?[ \t]*(\n|$)/ },
            th: { tag: 'th', regex: /\|+\|([^|]*)/, capture: 1 },
            td: { tag: 'td', regex: /\|+([^|]+)/, capture: 1 },
	        br: { tag: 'br', regex: /\\\\/ }
            /*,
	        img: { tag: 'img', regex: /(UNDExxFINED)/ },
	        rawUri: { tag: 'XX', regex: /(UNDExxFINED)/ },
	        namedUri: { tag: 'XX', regex: /(UNDExxFINED)/ }, 
	        namedInterwikiLink: { tag: 'XX', regex: /(UNDExxFINED)/ }, 
	        namedLink: { tag: 'XX', regex: /(UNDExxFINED)/ },
	        unnamedUri: { tag: 'XX', regex: /(UNDExxFINED)/ }, 
	        unnamedInterwikiLink: { tag: 'XX', regex: /(UNDExxFINED)/ }, 
	        unnamedLink: { tag: 'XX', regex: /(UNDExxFINED)/ }
	        */
	};

    for (var i = 1; i <= 6; i++) {
        g['h' + i] = { tag: 'h' + i, capture: 3,
            regex: '(^|\\n)[ \\t]*(h' + i + '\.)[ \\t](.*)'
        };
    }

    g.ulist.children = g.olist.children = [ g.li ];
    g.li.children = [ g.ulist, g.olist ];
    g.li.fallback = g.text;

    g.table.children = [ g.tr ];
    g.tr.children = [ g.th, g.td ];
    g.td.children = [ g.singleLine ];
    g.th.children = [ g.singleLine ];

    g.h1.children = 
    	g.h2.children = 
    	g.h3.children =
        g.h4.children = 
        g.h5.children = 
        g.h6.children =
        g.singleLine.children = 
        g.paragraph.children =
        g.text.children = 
        g.strong.children = 
        g.em.children =
    [  
       
      g.strong, 
      g.em, 
      g.br, 
      g.tt, 
      g.macro, 
      g.escape ];

    
	g.root = {
            children: [ g.h1
                         , g.h2, g.h3, g.h4, g.h5, g.h6, 
                g.hr, g.ulist, g.olist, g.preBlock, g.noformat, g.table],
            fallback: { children: [ g.paragraph ] }
    };

	Parse.Simple.Base.call(this, g, options);
};
Parse.Simple.Confluence.prototype = new Parse.Simple.Base();
Parse.Simple.Confluence.prototype.constructor = Parse.Simple.Confluence;

