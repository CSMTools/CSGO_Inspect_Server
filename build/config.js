export default {
    'http': {
        'port': 1337
    },
    'trust_proxy': false,
    'logins': [
        {
            'user': 'bottenanna1',
            'pass': 'XZ42MciogxAxOwfbFyEG',
            'auth': 'CvGac2gOYPIG5it27iLCBDMCIwA='
        },
        {
            'user': 'bottenanna2',
            'pass': '9jGC3rOE22DEYZeMlQ11',
            'auth': '1P6hjwCzIYrCpRKUVy2vxeH/4XA='
        }
    ],
    'bot_settings': {
        'max_attempts': 1,
        'request_delay': 5100,
        'request_ttl': 9999
    },
    // Optionally configure a global rate limit across all endpoints
    'rate_limit': {
        'enable': false,
        'window_ms': 60 * 60 * 1000,
        'max': 10000
    },
    // Max amount of simultaneous requests from the same IP  (incl. WS and HTTP/HTTPS), -1 for unlimited
    'max_simultaneous_requests': -1,
    // Bool to enable game file updates from the SteamDB Github tracker (updated item definitions, images, names)
    'enable_game_file_updates': true,
    // Amount of seconds to wait between updating game files (0 = No Interval Updates)
    'game_files_update_interval': 3600,
    // Postgres connection string to store results in (ex. postgres://user:pass@127.0.0.1:5432/postgres?sslmode=disable)
    'database_url': '',
    // OPTIONAL: Enable bulk inserts, may improve performance with many requests
    'enable_bulk_requests': true,
    // OPTIONAL: Max amount of links that can be requested through the bulk inspect API. It is recommended to set this to double your bot count.
    'max_bulk_amount': 4,
    // OPTIONAL: Key by the caller to allow inserting price information, required to use the feature
    'price_key': '',
    // OPTIONAL: Key by the caller to allow placing bulk searches
    'bulk_key': '',
};
