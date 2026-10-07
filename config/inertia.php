<?php

return [
    // Match the case used by the React page resolver, including on Linux.
    'page_paths' => [resource_path('js/pages')],

    'testing' => [
        'ensure_pages_exist' => true,
        'page_paths' => [resource_path('js/pages')],
        'page_extensions' => ['tsx'],
    ],
];
