#!/usr/bin/env node

import module from "module";
import * as config from "#core/config";
import path from "path";

const pwPath = module.createRequire( import.meta.url ).resolve( "playwright-core" ),
    pkgPath = path.join( path.dirname( pwPath ), "package.json" ),
    pkg = config.read( pkgPath );

pkg.exports["./*"] = "./*";
delete pkg.exports["./"];

config.write( pkgPath, pkg, { "readable": true } );

console.log( "Playwright exports patched:", pkg.exports );
