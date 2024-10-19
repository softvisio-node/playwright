#!/usr/bin/env node

import module from "node:module";
import path from "node:path";
import { readConfig, writeConfig } from "#core/config";

const pwPath = module.createRequire( import.meta.url ).resolve( "playwright-core" ),
    pkgPath = path.join( path.dirname( pwPath ), "package.json" ),
    pkg = readConfig( pkgPath );

pkg.exports[ "./*" ] = "./*";
delete pkg.exports[ "./" ];

writeConfig( pkgPath, pkg, { "readable": true } );

console.log( `"playwright-core" exports patched` );
