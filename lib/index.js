// apply patches
await import( "#lib/patch/client/page" );
await import( "#lib/patch/client/browser-context" );
await import( "#lib/patch/client/browser" );
await import( "#lib/patch/client/browser-type" );

const { "default": playwright } = await import( "playwright-core" );

export default playwright;
