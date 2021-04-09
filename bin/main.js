#!/usr/bin/env node

const playwright = require( "@softvisio/playwright" );

var SERVER_CHROMIUM;

( async () => {
    SERVER_CHROMIUM = await playwright.chromium.launchServer( {
        "headless": true,
        "port": 8080,
        "handleSIGHUP": true,
        "handleSIGINT": true,
        "handleSIGTERM": true,
    } );

    console.log( "Chromium: " + SERVER_CHROMIUM.wsEndpoint() );
} )();
