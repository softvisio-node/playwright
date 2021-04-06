require( "@softvisio/globals" );

// https://gs.statcounter.com/screen-resolution-stats/desktop/worldwide
const DESKTOP_RESOLUTIONS = [
    { "width": 1366, "height": 768 },
    { "width": 1920, "height": 1080 },
    { "width": 1536, "height": 864 },
    { "width": 1440, "height": 900 },
    { "width": 1600, "height": 900 },
    { "width": 1280, "height": 720 },
    { "width": 1280, "height": 800 },
    { "width": 1280, "height": 1024 },
    { "width": 1024, "height": 768 },
    { "width": 1680, "height": 1050 },
    { "width": 2560, "height": 1440 },
    { "width": 768, "height": 1024 },
    { "width": 1360, "height": 768 },
    { "width": 1920, "height": 1200 },
    { "width": 800, "height": 600 },
    { "width": 360, "height": 640 },
    { "width": 2048, "height": 1152 },
    { "width": 834, "height": 1112 },
    { "width": 1093, "height": 615 },
    { "width": 1024, "height": 1366 },
];

const WINDOWS_DEVICES = ["windows10"];
const LINUX_DEVICES = ["linux"];
const DESKTOP_DEVICES = [...WINDOWS_DEVICES, ...LINUX_DEVICES];
const MOBILE_DEVICES = ["ipad"];
const ALL_DEVICES = [...DESKTOP_DEVICES, ...MOBILE_DEVICES];

class BrowserDevices {
    windows10 ( options = {} ) {
        const device = {
            "id": "windows10",
            "name": "Windows 10",
            "viewport": null,
            "deviceScaleFactor": 1,
            "isMobile": false,
            "hasTouch": false,
            "userAgent": undefined,
            "userAgentPlatform": "Windows NT 10.0; Win64; x64",
            "platform": "Win32",
            "webglVendor": "Intel Inc.",
            "webglRenderer": "Intel Iris OpenGL Engine",
        };

        if ( options.viewport ) {
            device.viewport = options.viewport;
        }
        else {
            device.viewport = DESKTOP_RESOLUTIONS.randomValue();
        }

        return device;
    }

    linux ( options = {} ) {
        const device = {
            "id": "linux",
            "name": "Linux",
            "viewport": null,
            "deviceScaleFactor": 1,
            "isMobile": false,
            "hasTouch": false,
            "userAgent": undefined,
            "userAgentPlatform": "X11; Linux x86_64",
            "platform": "Linux x86_64",
            "webglVendor": "Intel Inc.",
            "webglRenderer": "Intel Iris OpenGL Engine",
        };

        if ( options.viewport ) {
            device.viewport = options.viewport;
        }
        else {
            device.viewport = DESKTOP_RESOLUTIONS.randomValue();
        }

        return device;
    }

    // XXX
    ipad ( options = {} ) {
        const device = {
            "id": "ipad",
            "name": "iPad",
            "viewport": { "width": 768, "height": 1024 },
            "deviceScaleFactor": 2,
            "isMobile": true,
            "hasTouch": true,
            "userAgent": "Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1",
            "userAgentPlatform": null,
            "platform": "iPad", // XXX check
            "webglVendor": "Intel Inc.",
            "webglRenderer": "Intel Iris OpenGL Engine",
        };

        return device;
    }

    getRandomDevice () {
        const deviceName = ALL_DEVICES.randomValue();

        return this[deviceName]();
    }

    getRandomDesktopDevice () {
        const deviceName = DESKTOP_DEVICES.randomValue();

        return this[deviceName]();
    }

    getRandomMobileDevice () {
        const deviceName = MOBILE_DEVICES.randomValue();

        return this[deviceName]();
    }

    getRandomWindowsDevice () {
        const deviceName = WINDOWS_DEVICES.randomValue();

        return this[deviceName]();
    }

    getRandomLinuxDevice () {
        const deviceName = LINUX_DEVICES.randomValue();

        return this[deviceName]();
    }
}

module.exports = new BrowserDevices();
