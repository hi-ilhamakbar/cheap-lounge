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

function cc_recipients(): array
{
    $extra = array_filter(array_map('strtolower', (array) cfg('email_extra_cc', [])), fn ($x) => filter_var($x, FILTER_VALIDATE_EMAIL));
    return array_values(array_unique([...INTERNAL_CC_EMAILS, ...$extra]));
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
        foreach (cc_recipients() as $cc) $m->addCC($cc);
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
