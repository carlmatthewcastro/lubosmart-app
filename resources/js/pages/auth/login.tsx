import AuthModal from '@/components/storefront-auth-modal';
import { Head, router } from '@inertiajs/react';

export default function Login() {
    return (
        <>
            <Head title="Log in" />
            <AuthModal initialTab="login" initialRole="buyer" onClose={() => router.visit(route('home'))} />
        </>
    );
}
