<?php

return [
    'vapid' => [
        'subject' => env('VAPID_SUBJECT', 'mailto:admin@angora.test'),
        'public_key' => env('VAPID_PUBLIC_KEY', 'BBoDN2KiVDUliHdniTYiG9TjuhmZk5E800_yj7VFHQNJD7AgwiqdJ6Uei6L5VpsIsCNLryzq0qVhsWkVNi4WBKA'),
        'private_key' => env('VAPID_PRIVATE_KEY', 'W3M5XycZgK-pVp6OIyl8PSIuKAitwmTb75kxv2sw9U8'),
    ],
    'client_options' => [
        'timeout' => 15,
    ],
];
