// NOTE resources for tests:
// https://httpbin.org/user-agent
// http://www.ip-score.com
// https://arh.antoinevastel.com/bots/areyouheadless
// https://bot.sannysoft.com
// https://antoinevastel.com/bots/

require( "./patch/server/chromium/crbrowser" );
require( "./patch/dispatchers/dispatcher" );
require( "./patch/client/page" );
require( "./patch/client/chromium-browser" );
require( "./patch/client/browser-type" );

const playwright = require( "./patch/playwright" );

module.exports = playwright;
