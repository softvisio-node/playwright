#!/usr/bin/env node

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
    const { "default": ws } = await import( "ws" );

    ws.Server = class extends ws.Server {
        constructor ( options = {}, callback ) {
            options.host = "0.0.0.0";
            options.path = "/chrome";

            super( options, callback );
        }
    };
}
