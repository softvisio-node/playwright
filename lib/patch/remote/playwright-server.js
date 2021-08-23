import playwrightServer from "playwright-core/lib/remote/playwrightServer.js";

playwrightServer.PlaywrightServer = class extends playwrightServer.PlaywrightServer {
    constructor ( delegate ) {
        delegate.path = "/";

        super( delegate );
    }
};
