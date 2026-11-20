<?php
declare(strict_types=1);

/** Inline SVG icons (stroke style). */
function icon(string $name, string $class = 'size-5'): string
{
    static $paths = [
        'search' => '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        'plane' => '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
        'pin' => '<path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
        'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'check' => '<path d="m5 12 5 5L20 7"/>',
        'shield' => '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
        'qr' => '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
        'mail' => '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
        'chat' => '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
        'ticket' => '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 6v12" stroke-dasharray="2 2"/>',
        'info' => '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
        'alert' => '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
        'right' => '<path d="m9 6 6 6-6 6"/>',
        'left' => '<path d="m15 6-6 6 6 6"/>',
        'copy' => '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
        'upload' => '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
        'users' => '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
        'hotel' => '<path d="M3 21V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14M15 11h4a2 2 0 0 1 2 2v8M2 21h20M7 9h1M11 9h1M7 13h1M11 13h1M7 17h1M11 17h1"/>',
        'plus' => '<path d="M12 5v14M5 12h14"/>',
        'trash' => '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
        'spinner' => '<path d="M12 3a9 9 0 1 0 9 9"/>',
    ];
    if ($name === 'whatsapp') {
        return '<svg class="' . e($class) . '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.57 2 2.13 6.44 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2.05 22l5.3-1.39a9.9 9.9 0 0 0 4.69 1.19h.01c5.47 0 9.91-4.44 9.91-9.91A9.9 9.9 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.18 8.18 0 0 1-1.26-4.37c0-4.53 3.69-8.22 8.23-8.22a8.2 8.2 0 0 1 8.22 8.23c0 4.54-3.69 8.24-8.19 8.24zm4.51-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.23-.73-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42h-.48a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07s.89 2.4 1.01 2.57c.12.16 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.29z"/></svg>';
    }
    $extra = $name === 'spinner' ? ' animate-spin' : '';
    return '<svg class="' . e($class . $extra) . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . ($paths[$name] ?? '') . '</svg>';
}
