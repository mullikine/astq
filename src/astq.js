/*
**  ASTq -- Abstract Syntax Tree (AST) Query Engine
**  Copyright (c) 2014-2016 Ralf S. Engelschall <rse@engelschall.com>
**
**  Permission is hereby granted, free of charge, to any person obtaining
**  a copy of this software and associated documentation files (the
**  "Software"), to deal in the Software without restriction, including
**  without limitation the rights to use, copy, modify, merge, publish,
**  distribute, sublicense, and/or sell copies of the Software, and to
**  permit persons to whom the Software is furnished to do so, subject to
**  the following conditions:
**
**  The above copyright notice and this permission notice shall be included
**  in all copies or substantial portions of the Software.
**
**  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
**  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
**  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
**  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
**  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
**  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
**  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*  load external depdendencies  */
let CacheLRU = require("cache-lru")

/*  load internal dependencies  */
import ASTQAdapter       from "./astq-adapter.js"
import ASTQAdapterASTY   from "./astq-adapter-asty.js"
import ASTQAdapterMOZAST from "./astq-adapter-mozast.js"
import ASTQAdapterXMLDOM from "./astq-adapter-xmldom.js"
import ASTQFuncs         from "./astq-funcs.js"
import ASTQFuncsSTD      from "./astq-funcs-std.js"
import ASTQQuery         from "./astq-query.js"
import ASTQVersion       from "./astq-version.js"

/*  define the API class  */
class ASTQ {
    /*  create a new ASTq instance  */
    constructor () {
        /*  create adapter registry and pre-register standard adapters  */
        this._adapter = new ASTQAdapter()
            .register(ASTQAdapterMOZAST)
            .register(ASTQAdapterXMLDOM)
            .register(ASTQAdapterASTY)

        /*  create function registry and pre-register standard functions  */
        this._funcs = new ASTQFuncs()
        for (let name in ASTQFuncsSTD)
            this.func(name, ASTQFuncsSTD[name])

        /*  create LRU cache  */
        this._cache = new CacheLRU()
    }

    /*  return the version information  */
    version () {
        return ASTQVersion
    }

    /*  switch to a custom adapter  */
    adapter (adapter) {
        if (arguments.length !== 1)
            throw new Error("ASTQ#adapter: invalid number of arguments")
        this._adapter.unregister()
        this._adapter.register(adapter)
        return this
    }

    /*  register an additional function  */
    func (name, func) {
        if (arguments.length !== 2)
            throw new Error("ASTQ#func: invalid number of arguments")
        this._funcs.register(name, func)
        return this
    }

    /*  configure the LRU cache limit  */
    cache (entries) {
        if (arguments.length !== 1)
            throw new Error("ASTQ#cache: invalid number of arguments")
        this._cache.limit(entries)
        return this
    }

    /*  individual step 1: compile selector DSL into a query AST  */
    compile (selector, trace) {
        if (arguments.length < 1)
            throw new Error("ASTQ#compile: too less arguments")
        if (arguments.length > 2)
            throw new Error("ASTQ#compile: too many arguments")
        if (trace === undefined)
            trace = false
        let query = this._cache.get(selector)
        if (query === undefined) {
            query = new ASTQQuery()
            query.compile(selector, trace)
            this._cache.set(selector, query)
        }
        return query
    }

    /*  individual step 2: execute query AST onto node  */
    execute (node, query, params, trace) {
        if (arguments.length < 2)
            throw new Error("ASTQ#execute: too less arguments")
        if (arguments.length > 4)
            throw new Error("ASTQ#execute: too many arguments")
        if (params === undefined)
            params = {}
        if (trace === undefined)
            trace = false
        let adapter = this._adapter.select(node)
        if (adapter === undefined)
            throw new Error("ASTQ#execute: no suitable adapter found for node")
        return query.execute(node, adapter, params, this._funcs, trace)
    }

    /*  all-in-one step: execute selector DSL onto node  */
    query (node, selector, params, trace) {
        if (arguments.length < 2)
            throw new Error("ASTQ#query: too less arguments")
        if (arguments.length > 4)
            throw new Error("ASTQ#query: too many arguments")
        if (params === undefined)
            params = {}
        if (trace === undefined)
            trace = false
        return this.execute(node, this.compile(selector, trace), params, trace)
    }
}

/*  export the traditional way for interoperability reasons
    (as Babel would export an object with a 'default' field)  */
module.exports = ASTQ

