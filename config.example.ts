export default {
    // Configuration for the HTTP API server
    'http': {
        'port': 80
    },
    // Whether to trust a forwarding proxy's IP (trust X-Forwarded-For)
    'trust_proxy': false,
    // List of usernames and passwords for the Steam accounts
    'logins': [
        {
            'user': 'USERNAME',
            'pass': 'PASSWORD',
            // You can use the shared_secret of mobile 2FA
            'auth': '2FA_TOKEN'
        },
        {
            'user': 'USERNAME_2',
            'pass': 'PASSWORD_2',
            'auth': '2FA_TOKEN_2'
        }
    ],
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
        'timeWindow': 60 * 60 * 1000, // 60 min
        'max': 10000
    },
    // Caching for inspect API
    'caching': {
        'enable': true,
        // How long cache should keep inspected items before re-inspecting, must be BigInt
        'expiration_time': 7200000n
    },
    'file_location': process.cwd() + '/files',
    // Max amount of simultaneous requests from the same IP  (incl. WS and HTTP/HTTPS), -1 for unlimited
    'max_simultaneous_requests': 1,
    // Bool to enable game file updates from the SteamDB Github tracker (updated item definitions, images, names)
    'enable_game_file_updates': true,
    // Amount of seconds to wait between updating game files (0 = No Interval Updates)
    'game_files_update_interval': 3600,
    // OPTIONAL: Enable bulk inserts, may improve performance with many requests
    'enable_bulk_requests': false,
    // OPTIONAL: Max amount of links that can be requested through the bulk inspect API. It is recommended to set this to double your bot count.
    'max_bulk_amount': 10,
    // OPTIONAL: Key by the caller to allow placing bulk searches
    'bulk_key': '',
};