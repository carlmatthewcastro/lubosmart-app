@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
@if (filled(config('mail.logo_url')))
<img src="{{ config('mail.logo_url') }}" class="logo" width="56" height="53" alt="LubosMart logo">
<br>
@endif
<span class="brand-name">LubosMart</span>
</a>
</td>
</tr>
