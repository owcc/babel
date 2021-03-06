/* eslint quotes: 0 */

import isInteger from "is-integer";
import * as t from "../../types";

export function Identifier(node) {
  this.push(node.name);
}

export function RestElement(node, print) {
  this.push("...");
  print.plain(node.argument);
}

export { RestElement as SpreadElement, RestElement as SpreadProperty };

export function ObjectExpression(node, print) {
  var props = node.properties;

  if (props.length) {
    this.push("{");
    this.space();

    print.list(props, { indent: true });

    this.space();
    this.push("}");
  } else {
    this.push("{}");
  }
}

export { ObjectExpression as ObjectPattern };

export function Property(node, print) {
  if (node.method || node.kind === "get" || node.kind === "set") {
    this._method(node, print);
  } else {
    if (node.computed) {
      this.push("[");
      print.plain(node.key);
      this.push("]");
    } else {
      // print `({ foo: foo = 5 } = {})` as `({ foo = 5 } = {});`
      if (t.isAssignmentPattern(node.value) && t.isIdentifier(node.key) && node.key.name === node.value.left.name) {
        print.plain(node.value);
        return;
      }

      print.plain(node.key);

      // shorthand!
      if (node.shorthand &&
        (t.isIdentifier(node.key) &&
         t.isIdentifier(node.value) &&
         node.key.name === node.value.name)) {
        return;
      }
    }

    this.push(":");
    this.space();
    print.plain(node.value);
  }
}

export function ArrayExpression(node, print) {
  var elems = node.elements;
  var len   = elems.length;

  this.push("[");

  for (var i = 0; i < elems.length; i++) {
    var elem = elems[i];
    if (!elem) {
      // If the array expression ends with a hole, that hole
      // will be ignored by the interpreter, but if it ends with
      // two (or more) holes, we need to write out two (or more)
      // commas so that the resulting code is interpreted with
      // both (all) of the holes.
      this.push(",");
    } else {
      if (i > 0) this.space();
      print.plain(elem);
      if (i < len - 1) this.push(",");
    }
  }

  this.push("]");
}

export { ArrayExpression as ArrayPattern };

const SCIENTIFIC_NOTATION = /e/i;

export function Literal(node, print, parent) {
  var val  = node.value;
  var type = typeof val;

  if (type === "string") {
    this._stringLiteral(val);
  } else if (type === "number") {
    // check to see if this is the same number as the raw one in the original source as asm.js uses
    // numbers in the form 5.0 for type hinting
    var raw = node.raw;
    if (val === +raw && raw[raw.length - 1] !== "." && !/^0[bo]/i.test(raw)) {
      val = raw;
    }

    val = val + "";

    if (isInteger(+val) && t.isMemberExpression(parent, { object: node }) && !SCIENTIFIC_NOTATION.test(val)) {
      val += ".";
    }

    this.push(val);
  } else if (type === "boolean") {
    this.push(val ? "true" : "false");
  } else if (node.regex) {
    this.push(`/${node.regex.pattern}/${node.regex.flags}`);
  } else if (val === null) {
    this.push("null");
  }
}

export function _stringLiteral(val) {
  val = JSON.stringify(val);

  // escape illegal js but valid json unicode characters
  val = val.replace(/[\u000A\u000D\u2028\u2029]/g, function (c) {
    return "\\u" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4);
  });

  if (this.format.quotes === "single") {
    // remove double quotes
    val = val.slice(1, -1);

    // unescape double quotes
    val = val.replace(/\\"/g, '"');

    // escape single quotes
    val = val.replace(/'/g, "\\'");

    // add single quotes
    val = `'${val}'`;
  }

  this.push(val);
}
