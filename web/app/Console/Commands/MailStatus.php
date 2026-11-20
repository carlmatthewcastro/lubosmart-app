<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class MailStatus extends Command
{
    protected $signature = 'lubosmart:mail-status {--check-connection : Check SMTP authentication without sending an email}';

    protected $description = 'Inspect transactional mail readiness without exposing credentials or sending mail';

    public function handle(): int
    {
        $name = config('mail.security_mailer');
        $settings = config('mail.mailers.'.$name, []);
        $transport = $settings['transport'] ?? 'missing';
        $sender = config('mail.from.address');
        $smtpConfigured = filled($settings['url'] ?? null) || (filled($settings['host'] ?? null)
            && ! in_array($settings['host'], ['127.0.0.1', 'localhost'], true)
            && filled($settings['username'] ?? null) && filled($settings['password'] ?? null));
        $this->table(['Setting', 'Value'], [
            ['Application URL', config('app.url')],
            ['Security mailer', $name], ['Transport', $transport],
            ['SMTP scheme', in_array($settings['scheme'] ?? null, ['smtp', 'smtps'], true) ? $settings['scheme'] : 'Use smtp (587) or smtps (465)'],
            ['SMTP port', (int) ($settings['port'] ?? 0)],
            ['SMTP credentials', $smtpConfigured ? 'Configured (hidden)' : 'Not configured for an external SMTP provider'],
            ['Sender', filter_var($sender, FILTER_VALIDATE_EMAIL) && ! str_ends_with($sender, '@example.com') ? 'Configured (hidden)' : 'Placeholder or missing'],
            ['Notification queue', config('queue.default')],
        ]);
        if ($transport !== 'smtp' || ! $smtpConfigured || ! filter_var($sender, FILTER_VALIDATE_EMAIL) || str_ends_with($sender, '@example.com')) {
            $this->warn('Real inbox delivery is not ready. Configure a verified sender and SMTP credentials in .env.');

            return self::FAILURE;
        }
        if ($this->option('check-connection')) {
            try {
                $smtp = Mail::mailer($name)->getSymfonyTransport();
                $smtp->start();
                $smtp->stop();
                $this->info('SMTP connection and authentication succeeded. No email was sent.');
            } catch (\Throwable $exception) {
                $message = strtolower($exception->getMessage());
                $failure = match (true) {
                    str_contains($message, 'scheme') => 'SMTP scheme is invalid. Use MAIL_SCHEME=smtp with port 587; TLS is negotiated automatically.',
                    str_contains($message, 'certificate'), str_contains($message, 'crypto'), str_contains($message, 'ssl') => 'TLS certificate validation failed. Check the PHP certificate bundle; keep TLS verification enabled.',
                    str_contains($message, 'authenticate'), str_contains($message, 'authentication'), str_contains($message, '535') => 'SMTP authentication failed. Check the full Gmail address and its app password.',
                    default => 'SMTP connection failed. Check the provider settings and local network access.',
                };
                $this->error($failure.' Credentials were not printed.');
                $this->line('Failure type: '.class_basename($exception));

                return self::FAILURE;
            }
        }
        $this->info('Mail settings are present. Inbox delivery and sender verification must still be confirmed with a real signup.');

        return self::SUCCESS;
    }
}
