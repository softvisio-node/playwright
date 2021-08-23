#!/usr/bin/env node

const CHROME_PORT = 80;

const { "default": playwright } = await import( "#index" );

await playwright.chromium.launchServer( {
    "headless": true,
    "port": CHROME_PORT,
    "handleSIGHUP": true,
    "handleSIGINT": true,
    "handleSIGTERM": true,
} );

console.log( "Chromium: ws://0.0.0.0:" + CHROME_PORT + "/" );
