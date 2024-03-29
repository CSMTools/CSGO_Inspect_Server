export default {
    // Configuration for the HTTP API server
    'http': {
        'port': 80
    },
    // Whether to trust a forwarding proxy's IP (trust X-Forwarded-For)
    'trust_proxy': false,
    // Bot settings
    'bot_settings': {
        // Amount of attempts for each request to Valve
        'max_attempts': 1,
        // Amount of milliseconds to wait between subsequent requests to Valve (per bot)
        'request_delay': 1100,
        // Amount of milliseconds to wait until a request to Valve is timed out
        'request_ttl': 2000
    },
    // Choose which features of the server to enable
    'enabled_modules': {
        'file_storage': true,
        'database': true
    },
    // Optionally configure a global rate limit across all endpoints
    'rate_limit': {
        'enable': false,
        'timeWindow': 60 * 60 * 1000, // 60 minutes
        'max': 10000
    },
    // Caching for inspect API
    'caching': {
        'enable': true,
        // How long cache should keep inspected items before re-inspecting, must be BigInt
        'expiration_time': 7200000n,
        // Costs slight amounts of processing power in return for shortening repetitive sticker data
        'shorten_sticker_serialization': true
    },
    'file_location': process.cwd() + '/files',
    // Max amount of simultaneous requests from the same IP  (incl. WS and HTTP/HTTPS), -1 for unlimited
    'max_simultaneous_requests': 1,
    // Amount of seconds to wait between updating game files (0 = No Interval Updates)
    'game_files_update_interval': 3600,
    // OPTIONAL: Enable bulk inspect requests
    'enable_bulk_requests': false,
    // OPTIONAL: Max amount of links that can be requested through the bulk inspect API. Defaults to half your bot count.
    'max_bulk_amount': 10,
    // OPTIONAL: Key by the caller to allow placing bulk inspects
    'bulk_key': '',
};