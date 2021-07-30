#!/usr/bin/env node

import module from "module";

const CHROME_PORT = 80;

await patch();

const { "default": playwright } = await import( "#index" );

await playwright.chromium.launchServer( {
    "headless": true,
    "port": CHROME_PORT,
    "handleSIGHUP": true,
    "handleSIGINT": true,
    "handleSIGTERM": true,
} );

console.log( "Chromium: ws://0.0.0.0:" + CHROME_PORT + "/chrome" );

async function patch () {
    const pwPath = module.createRequire( import.meta.url ).resolve( "playwright-core" ),
        wsPath = module.createRequire( pwPath ).resolve( "ws" );

    const { "default": ws } = await import( wsPath );

    ws.Server = class extends ws.Server {
        constructor ( options = {}, callback ) {
            options.host = "0.0.0.0";
            options.path = "/";

            super( options, callback );
        }
    };
}
