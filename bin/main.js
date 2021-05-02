#!/usr/bin/env node

import ws from "ws";
import playwright from "#index";

const CHROME_PORT = 80;

patch();

await playwright.chromium.launchServer( {
    "headless": true,
    "port": CHROME_PORT,
    "handleSIGHUP": true,
    "handleSIGINT": true,
    "handleSIGTERM": true,
} );

console.log( "Chromium: ws://0.0.0.0:" + CHROME_PORT + "/chrome" );

function patch () {
    ws.Server = class extends ws.Server {
        constructor ( options = {}, callback ) {
            options.host = "0.0.0.0";

            options.path = "/chrome";

            super( options, callback );
        }
    };
}
