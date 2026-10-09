<?php

namespace App\Http\Controllers;

use App\Models\RegistrationApplication;
use App\Models\SupportCase;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate(['search' => ['required', 'string', 'min:2', 'max:100']]);
        $actor = $request->user();
        $search = '%'.addcslashes($data['search'], '%_\\').'%';
        $results = collect();
        if ($actor->canAdmin('accounts')) {
            $results = $results->concat(User::query()->where('role', '!=', 'admin')->where(fn ($q) => $q->where('name', 'like', $search)->orWhere('email', 'like', $search))->limit(5)->get()->map(fn ($user) => ['id' => $user->id, 'kind' => 'account', 'label' => $user->name, 'detail' => $user->email]));
        }
        if ($actor->canAdmin('registrations')) {
            $results = $results->concat(RegistrationApplication::query()->with('user:id,name,email')->whereHas('user', fn ($q) => $q->where('name', 'like', $search)->orWhere('email', 'like', $search))->limit(5)->get()->map(fn ($application) => ['id' => $application->id, 'kind' => 'registration', 'label' => $application->user->name, 'detail' => 'Application #'.$application->id.' · '.$application->status]));
        }
        if ($actor->canAdmin('messages')) {
            $results = $results->concat(SupportCase::query()->where('subject', 'like', $search)->limit(5)->get(['id', 'subject', 'kind'])->map(fn ($case) => ['id' => $case->id, 'kind' => 'conversation', 'label' => $case->subject, 'detail' => $case->kind, 'url' => '/support/'.$case->id]));
        }

        return response()->json(['results' => $results->values()])->header('Cache-Control', 'private, no-store');
    }
}
