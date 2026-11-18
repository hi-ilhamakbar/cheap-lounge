<?php
declare(strict_types=1);

/*
 * Lounge data from an AUTHORIZED LoungeKey source only. Never invents lounge information.
 *
 * lounge_provider = 'loungekey' → Collinson/LoungeKey partner REST API (NOT verified against a live
 *   API: no public documentation exists; confirm auth, paths and field names once credentials arrive).
 * lounge_provider = 'file'      → app/data/lounges.json, copied by staff from an authorized LoungeKey
 *   source (e.g. the LoungeKey Pass Agent Web Portal).
 */

const LOUNGE_CACHE_FRESH = 3600;      // 1 h: serve cached API data without calling the API
const LOUNGE_CACHE_STALE = 86400;     // 24 h: if the API is down, show cached data marked stale

function lounge_provider_mode(): string
{
    $p = strtolower((string) cfg('lounge_provider', ''));
    if ($p === 'loungekey') return loungekey_configured() ? 'loungekey' : 'none';
    if ($p === 'file') return 'file';
    return 'none';
}

function loungekey_configured(): bool
{
    return cfg('loungekey.base_url', '') !== '' && (cfg('loungekey.api_key', '') !== ''
        || (cfg('loungekey.token_url', '') !== '' && cfg('loungekey.client_id', '') !== '' && cfg('loungekey.client_secret', '') !== ''));
}

function lounge_id(string $iata, string $externalId): string
{
    return $iata . '-' . base64url_encode($externalId);
}

function parse_lounge_id(string $id): ?array
{
    if (!preg_match('/^([A-Z]{3})-([A-Za-z0-9_-]{1,200})$/', $id, $m)) return null;
    $ext = base64url_decode($m[2]);
    return $ext === false ? null : ['iata' => $m[1], 'externalId' => $ext];
}

// ── Normalisation (tolerant mapping; missing fields stay null / []) ─────────

function ln_pick(array $o, array $keys): mixed
{
    foreach ($keys as $k) if (isset($o[$k]) && $o[$k] !== '' && $o[$k] !== null) return $o[$k];
    return null;
}

function ln_str(mixed $v): ?string
{
    if (is_string($v)) return trim($v) !== '' ? trim($v) : null;
    if (is_int($v) || is_float($v)) return (string) $v;
    if (is_array($v) && !array_is_list($v)) {
        $inner = ln_pick($v, ['en', 'text', 'value', 'description', 'name']);
        return is_string($inner) && trim($inner) !== '' ? trim($inner) : null;
    }
    if (is_array($v)) {
        $parts = array_values(array_filter(array_map('ln_str', $v)));
        return $parts ? implode("\n", $parts) : null;
    }
    return null;
}

function ln_list(mixed $v): array
{
    if (is_array($v) && array_is_list($v)) {
        $out = [];
        foreach ($v as $x) {
            $s = is_array($x) && !array_is_list($x) ? ln_str(ln_pick($x, ['name', 'label', 'title', 'code', 'url', 'src'])) : ln_str($x);
            if ($s !== null) $out[] = $s;
        }
        return $out;
    }
    if (is_string($v)) return array_values(array_filter(array_map('trim', preg_split('/[,;\n]/', $v))));
    return [];
}

function ln_hours(mixed $v): ?string
{
    if (is_array($v) && array_is_list($v)) {
        $lines = [];
        foreach ($v as $x) {
            if (!is_array($x)) { $s = ln_str($x); if ($s) $lines[] = $s; continue; }
            $day = ln_str(ln_pick($x, ['day', 'days', 'dayOfWeek']));
            $open = ln_str(ln_pick($x, ['open', 'from', 'opens', 'openTime']));
            $close = ln_str(ln_pick($x, ['close', 'to', 'closes', 'closeTime']));
            $s = ($open && $close) ? ($day ? "$day: " : '') . "{$open}–{$close}" : ln_str(ln_pick($x, ['text', 'hours', 'description']));
            if ($s) $lines[] = $s;
        }
        return $lines ? implode("\n", $lines) : null;
    }
    return ln_str($v);
}

/** Unwraps {data:[…]}, {items:[…]}, {results:[…]}, […] */
function ln_extract_list(mixed $data): array
{
    if (is_array($data) && array_is_list($data)) return $data;
    if (is_array($data)) {
        foreach (['data', 'items', 'results', 'lounges', 'airports', 'outlets'] as $k) {
            if (!isset($data[$k]) || !is_array($data[$k])) continue;
            if (array_is_list($data[$k])) return $data[$k];
            $nested = ln_extract_list($data[$k]);
            if ($nested) return $nested;
        }
    }
    return [];
}

function normalize_airport(mixed $raw): ?array
{
    if (!is_array($raw)) return null;
    $iata = ln_str(ln_pick($raw, ['iata', 'iataCode', 'iata_code', 'airportCode', 'code']));
    $name = ln_str(ln_pick($raw, ['name', 'airportName', 'airport_name']));
    if (!$iata || !preg_match('/^[A-Za-z]{3}$/', $iata) || !$name) return null;
    return [
        'iata' => strtoupper($iata),
        'name' => $name,
        'city' => ln_str(ln_pick($raw, ['city', 'cityName', 'city_name'])) ?? '',
        'country' => ln_str(ln_pick($raw, ['country', 'countryName', 'country_name'])) ?? '',
    ];
}

function normalize_lounge(mixed $raw, string $fallbackIata): ?array
{
    if (!is_array($raw)) return null;
    $externalId = ln_str(ln_pick($raw, ['id', 'loungeId', 'lounge_id', 'outletId', 'code', 'reference']));
    $name = ln_str(ln_pick($raw, ['name', 'loungeName', 'lounge_name', 'title']));
    if (!$externalId || !$name) return null;

    $af = ln_pick($raw, ['airport', 'airportCode', 'iata', 'airport_iata']);
    $iata = strtoupper((is_array($af) ? ln_str(ln_pick($af, ['iata', 'iataCode', 'code'])) : ln_str($af)) ?? $fallbackIata);

    $location = ln_str(ln_pick($raw, ['location', 'locationDescription', 'directions', 'zone']));
    $airside = ln_pick($raw, ['airside', 'isAirside']);
    if (is_bool($airside)) $location = implode(' — ', array_filter([$airside ? 'Airside' : 'Landside', $location]));

    return [
        'externalId' => $externalId,
        'airportIata' => $iata,
        'name' => $name,
        'terminal' => ln_str(ln_pick($raw, ['terminal', 'terminalName', 'terminal_name'])),
        'location' => $location,
        'openingHours' => ln_hours(ln_pick($raw, ['openingHours', 'opening_hours', 'openingTimes', 'hours'])),
        'description' => ln_str(ln_pick($raw, ['description', 'summary', 'about'])),
        'facilities' => ln_list(ln_pick($raw, ['facilities', 'amenities', 'services'])),
        'images' => array_values(array_filter(ln_list(ln_pick($raw, ['images', 'imageUrls', 'photos', 'media'])), fn ($u) => str_starts_with($u, 'https://'))),
        'conditions' => ln_str(ln_pick($raw, ['conditions', 'restrictions', 'accessConditions', 'terms', 'rules'])),
        'accessInfo' => ln_str(ln_pick($raw, ['accessInfo', 'access', 'entryRequirements', 'bookingInformation'])),
    ];
}

// ── LoungeKey partner API (cURL) ────────────────────────────────────────────

function loungekey_get(string $path, array $params): mixed
{
    $base = rtrim((string) cfg('loungekey.base_url'), '/');
    $timeout = (int) cfg('loungekey.timeout', 10);
    $headers = ['Accept: application/json'];
    if (cfg('loungekey.api_key', '') !== '') $headers[] = 'x-api-key: ' . cfg('loungekey.api_key');
    if (cfg('loungekey.token_url', '') !== '') $headers[] = 'Authorization: Bearer ' . loungekey_token($timeout);

    $ch = curl_init($base . $path . '?' . http_build_query($params));
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_HTTPHEADER => $headers]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($body === false) throw new RuntimeException('LoungeKey API unreachable: ' . $err);
    if ($status < 200 || $status >= 300) throw new RuntimeException("LoungeKey API error ($status)");
    $json = json_decode((string) $body, true);
    if ($json === null) throw new RuntimeException('LoungeKey API returned invalid JSON');
    return $json;
}

function loungekey_token(int $timeout): string
{
    $cacheFile = STORAGE . '/cache/loungekey-token.json';
    $c = is_file($cacheFile) ? json_decode((string) file_get_contents($cacheFile), true) : null;
    if (is_array($c) && ($c['expires'] ?? 0) > time() + 30) return (string) $c['token'];
    $ch = curl_init((string) cfg('loungekey.token_url'));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query(['grant_type' => 'client_credentials', 'client_id' => cfg('loungekey.client_id'), 'client_secret' => cfg('loungekey.client_secret')]),
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $j = is_string($body) ? json_decode($body, true) : null;
    if ($status !== 200 || empty($j['access_token'])) throw new RuntimeException("LoungeKey token request failed ($status)");
    @file_put_contents($cacheFile, json_encode(['token' => $j['access_token'], 'expires' => time() + (int) ($j['expires_in'] ?? 3600)]), LOCK_EX);
    @chmod($cacheFile, 0600);
    return (string) $j['access_token'];
}

// ── Public functions ────────────────────────────────────────────────────────

function search_airports(string $q): array
{
    if (lounge_provider_mode() === 'loungekey') {
        try {
            $remote = array_values(array_filter(array_map('normalize_airport', ln_extract_list(loungekey_get((string) cfg('loungekey.airports_path', '/airports'), ['q' => $q])))));
            if ($remote) return array_slice($remote, 0, 8);
        } catch (Throwable $e) {
            log_event('warn', 'loungekey_airport_search_failed', ['error' => $e->getMessage()]);
        }
    }
    return search_local_airports($q);
}

function lounge_view(array $l, string $source, int $at): array
{
    return $l + ['id' => lounge_id($l['airportIata'], $l['externalId']), 'source' => $source, 'fetchedAt' => $at];
}

/**
 * @return array{status:string, airport?:array, lounges?:array, stale?:bool}
 *   status: ok | airport_not_found | not_configured | error
 */
function get_lounges_for_airport(string $iataInput): array
{
    $iata = strtoupper($iataInput);
    if (!preg_match('/^[A-Z]{3}$/', $iata)) return ['status' => 'airport_not_found'];
    $mode = lounge_provider_mode();
    if ($mode === 'none') return ['status' => 'not_configured'];

    if ($mode === 'file') {
        $airport = find_local_airport($iata);
        if (!$airport) return ['status' => 'airport_not_found'];
        $rows = json_decode((string) @file_get_contents(APP_ROOT . '/data/lounges.json'), true);
        if (!is_array($rows)) {
            log_event('error', 'lounges_json_invalid');
            return ['status' => 'error'];
        }
        $at = (int) @filemtime(APP_ROOT . '/data/lounges.json');
        $lounges = [];
        foreach ($rows as $r) {
            $l = normalize_lounge($r, '');
            if ($l && $l['airportIata'] === $iata) $lounges[] = lounge_view($l, 'FILE', $at);
        }
        return ['status' => 'ok', 'airport' => $airport, 'lounges' => $lounges];
    }

    // LoungeKey with file cache
    @mkdir(STORAGE . '/cache', 0750, true);
    $cacheFile = STORAGE . "/cache/lounges-$iata.json";
    $cached = is_file($cacheFile) ? json_decode((string) file_get_contents($cacheFile), true) : null;
    $age = is_array($cached) ? time() - (int) ($cached['at'] ?? 0) : PHP_INT_MAX;
    if (is_array($cached) && $age < LOUNGE_CACHE_FRESH) return ['status' => 'ok', 'airport' => $cached['airport'], 'lounges' => $cached['lounges']];

    try {
        $data = loungekey_get((string) cfg('loungekey.lounges_path', '/lounges'), ['airport' => $iata, 'iata' => $iata]);
        $apiAirport = is_array($data) && isset($data['airport']) ? normalize_airport($data['airport']) : null;
        $airport = $apiAirport ? ['iata' => $iata] + $apiAirport : find_local_airport($iata);
        if (!$airport) return ['status' => 'airport_not_found'];
        $at = time();
        $lounges = [];
        foreach (ln_extract_list($data) as $r) {
            $l = normalize_lounge($r, $iata);
            if ($l && $l['airportIata'] === $iata) $lounges[] = lounge_view($l, 'LOUNGEKEY', $at);
        }
        @file_put_contents($cacheFile, json_encode(['at' => $at, 'airport' => $airport, 'lounges' => $lounges], JSON_UNESCAPED_UNICODE), LOCK_EX);
        return ['status' => 'ok', 'airport' => $airport, 'lounges' => $lounges];
    } catch (Throwable $e) {
        log_event('error', 'loungekey_fetch_lounges_failed', ['iata' => $iata, 'error' => $e->getMessage()]);
        if (is_array($cached) && $age < LOUNGE_CACHE_STALE) return ['status' => 'ok', 'airport' => $cached['airport'], 'lounges' => $cached['lounges'], 'stale' => true];
        return ['status' => 'error'];
    }
}

/** Re-reads a lounge from the authorized source (detail pages + order validation). */
function get_active_lounge(string $id): ?array
{
    $p = parse_lounge_id($id);
    if (!$p) return null;
    $res = get_lounges_for_airport($p['iata']);
    if ($res['status'] !== 'ok') return null;
    foreach ($res['lounges'] as $l) if ($l['externalId'] === $p['externalId']) return $l + ['airport' => $res['airport']];
    return null;
}
