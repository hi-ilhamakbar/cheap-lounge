<?php
declare(strict_types=1);

/**
 * Human-readable view of an order, shared by the emails and the order page so they always match.
 * @return array{service:string, sections: array<int, array{title:string, rows: array<int, array{0:string,1:string}>}>}
 */
function service_name(string $type, string $lang): string
{
    return match ($type) { 'ticket' => t('ticket.service', $lang), 'hotel' => t('hotel.service', $lang), default => t('meta.loungeTitle', $lang) };
}

function order_sections(array $o, string $lang): array
{
    $d = $o['data'];
    $c = $o['customer'];
    $sections = [];
    $contact = [];
    if (!empty($c['name'])) $contact[] = [preg_replace('/ \(.*\)$/', '', t('booking.customerName', $lang)), $c['name']];
    $contact[] = [t('booking.whatsapp', $lang), $c['whatsapp']];
    $contact[] = [t('booking.email', $lang), $c['email']];

    if ($o['type'] === 'lounge') {
        $sections[] = ['title' => t('meta.loungeTitle', $lang), 'rows' => [
            [t('booking.airport', $lang), $d['airport']],
            [t('booking.visitDate', $lang), format_visit_date($d['visitDate'], $lang)],
        ]];
        $pax = [[t('booking.adults', $lang), (string) count($d['adultNames'])], [t('booking.children', $lang), (string) count($d['childNames'])]];
        foreach ($d['adultNames'] as $i => $n) $pax[] = [tf(t('ticket.paxN', $lang), ['n' => $i + 1]) . ' · ' . t('ticket.typeAdult', $lang), $n];
        foreach ($d['childNames'] as $i => $n) $pax[] = [tf(t('ticket.paxN', $lang), ['n' => count($d['adultNames']) + $i + 1]) . ' · ' . t('ticket.typeChild', $lang), $n];
        $sections[] = ['title' => t('booking.passengers', $lang), 'rows' => $pax];
    } elseif ($o['type'] === 'ticket') {
        $tripLabel = ['oneway' => t('ticket.oneWay', $lang), 'roundtrip' => t('ticket.roundTrip', $lang), 'multicity' => t('ticket.multiCity', $lang)][$d['tripType']];
        $rows = [[t('ticket.tripType', $lang), $tripLabel]];
        foreach ($d['routes'] as $i => $r) {
            $label = $d['tripType'] === 'roundtrip' ? ($i === 0 ? t('ticket.departDate', $lang) : t('ticket.returnDate', $lang)) : ($d['tripType'] === 'oneway' ? t('ticket.departDate', $lang) : tf(t('ticket.route', $lang), ['n' => $i + 1]));
            $rows[] = [$label, "{$r['from']} → {$r['to']} · " . format_visit_date($r['date'], $lang)];
        }
        if (!empty($d['airline'])) $rows[] = [t('ticket.airlineLabel', $lang), $d['airline']]; // older orders
        $rows[] = [t('ticket.usageLabel', $lang), format_visit_date($d['usageDate'], $lang)];
        if (!empty($d['note'])) $rows[] = [t('ticket.noteLabel', $lang), $d['note']];
        $sections[] = ['title' => t('ticket.service', $lang), 'rows' => $rows];
        $typeLabel = ['adult' => t('ticket.typeAdult', $lang), 'child' => t('ticket.typeChild', $lang), 'infant' => t('ticket.typeInfant', $lang)];
        $pax = [[t('form.adults', $lang) . ' / ' . t('form.children', $lang) . ' / ' . t('form.infants', $lang), "{$d['adults']} / {$d['children']} / {$d['infants']}"]];
        foreach ($d['passengers'] as $i => $p) {
            $pax[] = [tf(t('ticket.paxN', $lang), ['n' => $i + 1]) . ' · ' . $typeLabel[$p['type']], $p['name']];
            if (!empty($p['gender'])) $pax[] = ['   ' . t('ticket.gender', $lang), $p['gender'] === 'M' ? t('ticket.male', $lang) : t('ticket.female', $lang)];
            if (!empty($p['nationality'])) $pax[] = ['   ' . t('ticket.nationality', $lang), country_name($p['nationality'], $lang)];
            $pax[] = ['   ' . t('form.dob', $lang), format_visit_date($p['dob'], $lang)];
            $pax[] = ['   ' . t('form.passportNo', $lang), $p['passport']];
            $pax[] = ['   ' . t('form.passportExpiry', $lang), format_visit_date($p['passportExpiry'], $lang)];
        }
        $sections[] = ['title' => t('ticket.passengers', $lang), 'rows' => $pax];
    } else {
        $rows = [
            [t('hotel.roomsLabel', $lang), (string) $d['rooms']],
            [t('hotel.guestsLabel', $lang), t('form.adults', $lang) . " {$d['adults']} · " . t('form.children', $lang) . " {$d['children']} · " . t('form.infants', $lang) . " {$d['infants']}"],
        ];
        foreach ($d['stays'] as $i => $s) {
            $nights = (int) ((strtotime($s['checkOut']) - strtotime($s['checkIn'])) / 86400);
            $rows[] = [tf(t('hotel.stay', $lang), ['n' => $i + 1]), $s['city'] . ' — ' . ($s['hotel'] ?? t('hotel.anyHotel', $lang))];
            $rows[] = ['   ' . t('hotel.checkIn', $lang) . ' – ' . t('hotel.checkOut', $lang), format_visit_date($s['checkIn'], $lang) . ' – ' . format_visit_date($s['checkOut'], $lang) . ' (' . tf(t('hotel.nights', $lang), ['n' => $nights]) . ')'];
        }
        $sections[] = ['title' => t('hotel.service', $lang), 'rows' => $rows];
        $typeLabel = ['adult' => t('ticket.typeAdult', $lang), 'child' => t('ticket.typeChild', $lang), 'infant' => t('ticket.typeInfant', $lang)];
        $guests = [];
        foreach ($d['guests'] as $i => $g) $guests[] = [tf(t('hotel.guestN', $lang), ['n' => $i + 1]) . ' · ' . $typeLabel[$g['type']], $g['name']];
        $sections[] = ['title' => t('hotel.guests', $lang), 'rows' => $guests];
    }
    $sections[] = ['title' => t('booking.contact', $lang), 'rows' => $contact];
    return ['service' => service_name($o['type'], $lang), 'sections' => $sections];
}
