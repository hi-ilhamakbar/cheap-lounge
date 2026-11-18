<?php
declare(strict_types=1);

require_once WEB_ROOT . '/vendor/phpmailer/Exception.php';
require_once WEB_ROOT . '/vendor/phpmailer/PHPMailer.php';
require_once WEB_ROOT . '/vendor/phpmailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;

function smtp_configured(): bool
{
    return cfg('smtp.host', '') !== '' && cfg('smtp.username', '') !== '' && cfg('smtp.password', '') !== '' && cfg('email_from', '') !== '';
}

/** 'bcc' (hidden from the customer) or 'cc' (visible). Set with 'internal_copy' in config.php. */
function internal_copy_mode(): string
{
    return strtolower((string) cfg('internal_copy', 'cc')) === 'bcc' ? 'bcc' : 'cc';
}

function clean_email_list(mixed $v): array
{
    return array_values(array_filter(array_map(fn ($x) => strtolower(trim((string) $x)), (array) $v), fn ($x) => filter_var($x, FILTER_VALIDATE_EMAIL)));
}

/**
 * Who gets a copy of every order email. The two internal addresses ALWAYS receive one — as CC or,
 * with 'internal_copy' => 'bcc', as BCC so the customer cannot see them.
 * @return array{cc: string[], bcc: string[]}
 */
function copy_recipients(): array
{
    $mode = internal_copy_mode();
    $cc = clean_email_list(cfg('email_extra_cc', []));
    $bcc = clean_email_list(cfg('email_extra_bcc', []));
    if ($mode === 'bcc') $bcc = [...INTERNAL_CC_EMAILS, ...$bcc];
    else $cc = [...INTERNAL_CC_EMAILS, ...$cc];
    $bcc = array_values(array_unique($bcc));
    $cc = array_values(array_diff(array_unique($cc), $bcc)); // never both CC and BCC
    return ['cc' => $cc, 'bcc' => $bcc];
}

/**
 * Sends via SMTP (PHPMailer). CC recipients are real SMTP recipients, not text in the body.
 * $dedupeKey: the same key is sent at most once (stored in storage/sent for 24 h), so refreshes,
 * double clicks and retries never send a duplicate.
 *
 * @param array<int, array{filename:string, content:string, mime:string}> $attachments
 * @return array{ok:bool, id?:string, error?:string, duplicate?:bool}
 */
function send_email(string $to, string $subject, string $html, string $text, string $dedupeKey, array $attachments = []): array
{
    if (!smtp_configured()) return ['ok' => false, 'error' => 'SMTP not configured'];

    $dir = STORAGE . '/sent';
    @mkdir($dir, 0750, true);
    $marker = $dir . '/' . hash('sha256', $dedupeKey);
    // Exclusive lock per key: two simultaneous requests cannot both send.
    $lock = @fopen($marker . '.lock', 'c');
    if ($lock) flock($lock, LOCK_EX);
    try {
        if (is_file($marker) && filemtime($marker) > time() - 86400) {
            return ['ok' => true, 'id' => trim((string) file_get_contents($marker)), 'duplicate' => true];
        }

        $m = new PHPMailer(true);
        $m->isSMTP();
        $m->Host = (string) cfg('smtp.host');
        $m->Port = (int) cfg('smtp.port', 465);
        $m->SMTPAuth = true;
        $m->Username = (string) cfg('smtp.username');
        $m->Password = (string) cfg('smtp.password');
        $secure = strtolower((string) cfg('smtp.secure', 'ssl'));
        $m->SMTPSecure = $secure === 'tls' ? PHPMailer::ENCRYPTION_STARTTLS : ($secure === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : '');
        if ($secure === 'none') $m->SMTPAutoTLS = false;
        $m->Timeout = 20;
        $m->CharSet = PHPMailer::CHARSET_UTF8;
        $m->setFrom((string) cfg('email_from'), (string) cfg('email_from_name', BRAND_NAME));
        if (cfg('email_reply_to')) $m->addReplyTo((string) cfg('email_reply_to'));
        $m->addAddress($to);
        $copies = copy_recipients();
        foreach ($copies['cc'] as $cc) $m->addCC($cc);
        foreach ($copies['bcc'] as $bcc) $m->addBCC($bcc); // SMTP envelope only — no Bcc header is sent
        $m->Subject = $subject;
        $m->isHTML(true);
        $m->Body = $html;
        $m->AltBody = $text;
        foreach ($attachments as $a) $m->addStringAttachment($a['content'], $a['filename'], PHPMailer::ENCODING_BASE64, $a['mime']);
        $m->send();

        $id = $m->getLastMessageID();
        @file_put_contents($marker, $id, LOCK_EX);
        if (random_int(1, 100) === 1) foreach (glob($dir . '/*') ?: [] as $f) if (filemtime($f) < time() - 2 * 86400) @unlink($f);
        return ['ok' => true, 'id' => $id];
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => $e->getMessage()];
    } finally {
        if ($lock) {
            flock($lock, LOCK_UN);
            fclose($lock); // lock files are removed by the periodic clean-up above
        }
    }
}
