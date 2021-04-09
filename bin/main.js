#!/usr/bin/env node

const ws = require( "ws" );

ws.Server = class extends ws.Server {
    constructor ( options = {}, callback ) {
        options.host = "0.0.0.0";

        options.path = "/";

        super( options, callback );
    }
};

const playwright = require( "@softvisio/playwright" );

const DEFAULT_PORT = 8080;

( async () => {
    await playwright.chromium.launchServer( {
        "headless": true,
        "port": DEFAULT_PORT,
        "handleSIGHUP": true,
        "handleSIGINT": true,
        "handleSIGTERM": true,
    } );

    console.log( "Chromium: ws://0.0.0.0:" + DEFAULT_PORT );
} )();
