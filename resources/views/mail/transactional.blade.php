<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ $subject }}</title>
<style>@media only screen and (max-width:600px){.mail-padding{padding:24px 20px!important}.mail-title{font-size:24px!important}.mail-code{font-size:32px!important;letter-spacing:5px!important}}</style>
</head>
<body style="margin:0;padding:0;background-color:#f5f2ff;color:#302744;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f2ff;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e5def5;border-radius:16px;">
<tr><td style="height:4px;background-color:#6d47b3;border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td class="mail-padding" align="left" style="padding:32px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 28px;color:#211a33;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;letter-spacing:0.5px;">LUBOSMART</p>
@if(($mailTitle ?? '') === 'Application approved')
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;"><tr><td bgcolor="#edf7f0" style="padding:6px 12px;border-radius:6px;color:#23623b;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;font-weight:700;">Approved</td></tr></table>
@endif
<h1 class="mail-title" style="margin:0 0 20px;color:#211a33;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1.3;font-weight:700;">{{ $mailTitle ?? $subject }}</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">{{ $greeting ?? 'Hello!' }}</p>
@if(!empty($verificationCode))
<p style="margin:0 0 24px;color:#534563;font-size:15px;line-height:1.6;">{{ $introLines[0] ?? 'Enter this code on LubosMart to continue.' }}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5dcff;background-color:#f3efff;border-radius:12px;"><tr><td align="center" style="padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 16px;color:#685781;font-size:11px;font-weight:bold;letter-spacing:1.5px;">YOUR VERIFICATION CODE</p>
<p class="mail-code" style="margin:0;color:#59309b;font-family:Arial,Helvetica,sans-serif;font-size:40px;line-height:1.3;font-weight:700;letter-spacing:6px;white-space:nowrap;">{{ $verificationCode }}</p>
<p style="margin:16px 0 0;color:#534563;font-size:13px;line-height:1.5;">Expires in {{ $expiryMinutes }} minutes</p>
</td></tr></table>
<p style="margin:24px 0 0;color:#534563;font-size:13px;line-height:1.6;">Never share this code. If you did not request it, ignore this email.</p>
@else
@foreach($introLines as $line)<p style="margin:0 0 12px;font-size:15px;line-height:1.6;overflow-wrap:anywhere;">{{ $line }}</p>@endforeach
@if(!empty($actionText))
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center" bgcolor="#6d47b3" style="background-color: #6d47b3;border-radius:8px;"><a href="{{ $actionUrl }}" style="display:inline-block;padding:14px 24px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;text-decoration:none;font-size:15px;line-height:1.5;font-weight:bold;">{{ $actionText }}</a></td></tr></table>
@endif
@foreach($outroLines as $line)<p style="margin:12px 0 0;font-size:15px;line-height:1.6;">{{ $line }}</p>@endforeach
@endif
</td></tr></table></td></tr></table>
</body></html>
