// NOTE resources for tests:
// https://httpbin.org/user-agent
// http://www.ip-score.com
// https://arh.antoinevastel.com/bots/areyouheadless
// https://bot.sannysoft.com
// https://antoinevastel.com/bots/

await import( "#lib/patch/client/page" );
await import( "#lib/patch/client/browser-context" );
await import( "#lib/patch/client/browser" );
await import( "#lib/patch/client/browser-type" );

const { "default": playwright } = await import( "#lib/patch/playwright" );

export default playwright;
