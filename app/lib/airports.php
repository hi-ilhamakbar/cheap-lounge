<?php
declare(strict_types=1);

/** @return array<int, array{iata:string,name:string,city:string,country:string}> */
function local_airports(): array
{
    static $list = null;
    return $list ??= array_map(
        fn ($r) => ['iata' => $r[0], 'name' => $r[1], 'city' => $r[2], 'country' => $r[3]],
        require APP_ROOT . '/data/airports.php'
    );
}

/** Search by IATA code, airport name, city or country. Exact/prefix IATA matches first. */
function search_local_airports(string $q, int $limit = 8): array
{
    $query = mb_strtolower(trim($q));
    if (mb_strlen($query) < 2) return [];
    $upper = mb_strtoupper($query);
    $scored = [];
    foreach (local_airports() as $a) {
        $name = mb_strtolower($a['name']);
        $city = mb_strtolower($a['city']);
        $s = match (true) {
            $a['iata'] === $upper => 0,
            str_starts_with($a['iata'], $upper) => 1,
            str_starts_with($city, $query) || str_starts_with($name, $query) => 2,
            str_contains($city, $query) || str_contains($name, $query) => 3,
            str_contains(mb_strtolower($a['country']), $query) => 4,
            default => 9,
        };
        if ($s < 9) $scored[] = [$s, $a];
    }
    usort($scored, fn ($x, $y) => $x[0] <=> $y[0] ?: strcmp($x[1]['name'], $y[1]['name']));
    return array_map(fn ($x) => $x[1], array_slice($scored, 0, $limit));
}

function find_local_airport(string $iata): ?array
{
    foreach (local_airports() as $a) if ($a['iata'] === strtoupper($iata)) return $a;
    return null;
}
