import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export function useAuthRequestFeedback(processing: boolean) {
    const [requestError, setRequestError] = useState('');
    useEffect(() => {
        if (!processing) return;
        const exception = router.on('exception', (event) => {
            event.preventDefault();
            setRequestError('We could not connect. Your details remain on this page. Check your connection and try again.');
        });
        const invalid = router.on('invalid', (event) => {
            event.preventDefault();
            setRequestError(
                event.detail.response.status === 429
                    ? 'Too many requests. Wait a moment before trying again.'
                    : event.detail.response.status === 419
                      ? 'Your session expired. Refresh this page before trying again.'
                      : 'We could not complete your request. Please try again shortly.',
            );
        });
        return () => {
            exception();
            invalid();
        };
    }, [processing]);
    return { requestError, setRequestError };
}
