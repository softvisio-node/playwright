// NOTE resources for tests:
// https://httpbin.org/user-agent
// http://www.ip-score.com
// https://arh.antoinevastel.com/bots/areyouheadless
// https://bot.sannysoft.com
// https://antoinevastel.com/bots/

import "#lib/patch/server/dispatchers/dispatcher";
import "#lib/patch/client/page";
import "#lib/patch/client/browser";
import "#lib/patch/client/browser-type";

import playwright from "#lib/patch/playwright";

export default playwright;
