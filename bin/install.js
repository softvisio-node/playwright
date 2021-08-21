#!/usr/bin/env node

import module from "module";
import * as config from "#core/config";

const pwPath = module.createRequire( import.meta.url ).resolve( "playwright-core/package.json" ),
    pkg = config.read( pwPath );

pkg.exports["./*"] = "./*";
delete pkg.exports["./"];

config.write( pwPath, pkg, { "readable": true } );

console.log( "Playwright exports patched:", pkg.exports );
