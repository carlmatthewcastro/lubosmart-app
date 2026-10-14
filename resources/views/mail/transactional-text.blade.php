{{ $mailTitle ?? $subject }}

{{ $greeting ?? 'Hello!' }}

@if(!empty($verificationCode))
Verification code: {{ $verificationCode }}
Expires in {{ $expiryMinutes }} minutes.
Never share this code. If you did not request it, ignore this email.
@else
@foreach($introLines as $line)
{{ $line }}

@endforeach
@if(!empty($actionText))
{{ $actionText }}: {{ $actionUrl }}
@endif
@foreach($outroLines as $line)
{{ $line }}
@endforeach
@endif

LubosMart
