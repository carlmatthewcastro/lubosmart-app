(() => {
    'use strict';

    const initializeAuthModal = () => {
        const modal = document.querySelector('[data-auth-modal]');

        if (!modal) {
            return;
        }

        const dialog = modal.querySelector('.auth-modal__dialog');
        const tabs = Array.from(modal.querySelectorAll('[data-auth-tab]'));
        const panels = Array.from(modal.querySelectorAll('[data-auth-panel]'));
        const closeButtons = modal.querySelectorAll('[data-auth-close]');
        const registrationForm = modal.querySelector('[data-auth-form="register"]');
        const roleSelect = modal.querySelector('[data-auth-role]');
        const sellerFields = modal.querySelector('[data-auth-seller-fields]');
        const sellerInputs = Array.from(modal.querySelectorAll('[data-auth-seller-input]'));
        const passwordConfirmation = modal.querySelector('[data-auth-password-confirmation]');
        let previousFocus = null;
        let closeTimer = null;

        const selectTab = (tabName) => {
            const selectedTab = tabs.find((tab) => tab.dataset.authTab === tabName) ?? tabs[0];

            tabs.forEach((tab) => {
                const isSelected = tab === selectedTab;
                tab.setAttribute('aria-selected', String(isSelected));
                tab.tabIndex = isSelected ? 0 : -1;
            });

            panels.forEach((panel) => {
                panel.hidden = panel.dataset.authPanel !== selectedTab.dataset.authTab;
            });
        };

        const syncSellerFields = () => {
            const isSeller = roleSelect.value === 'seller';

            sellerFields.hidden = !isSeller;
            sellerInputs.forEach((input) => {
                input.disabled = !isSeller;
                input.required = isSeller;
            });
        };

        const openModal = (tabName = 'login', opener = document.activeElement) => {
            window.clearTimeout(closeTimer);
            previousFocus = opener instanceof HTMLElement ? opener : null;
            selectTab(tabName);
            syncSellerFields();
            modal.hidden = false;
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('auth-modal-open');

            window.requestAnimationFrame(() => {
                modal.classList.add('is-open');
                const firstField = modal.querySelector(
                    `[data-auth-panel="${tabName}"] input:not([disabled]), [data-auth-panel="${tabName}"] select:not([disabled])`,
                );
                (firstField ?? dialog).focus();
            });
        };

        const closeModal = () => {
            if (modal.hidden) {
                return;
            }

            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('auth-modal-open');
            closeTimer = window.setTimeout(() => {
                modal.hidden = true;
                if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
                    previousFocus.focus();
                }
            }, 230);
        };

        document.querySelectorAll('[data-auth-open]').forEach((trigger) => {
            trigger.addEventListener('click', () => {
                const tabName = ['login', 'register'].includes(trigger.dataset.authOpen)
                    ? trigger.dataset.authOpen
                    : 'login';
                openModal(tabName, trigger);
            });
        });

        tabs.forEach((tab) => {
            tab.addEventListener('click', () => selectTab(tab.dataset.authTab));
            tab.addEventListener('keydown', (event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
                    return;
                }

                event.preventDefault();
                const nextIndex = (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
                tabs[nextIndex].focus();
                tabs[nextIndex].click();
            });
        });

        closeButtons.forEach((button) => button.addEventListener('click', closeModal));
        roleSelect.addEventListener('change', syncSellerFields);

        registrationForm.addEventListener('submit', (event) => {
            const fields = Array.from(registrationForm.querySelectorAll('input[required], select[required], textarea[required]'));
            const emptyField = fields.find((field) => !field.disabled && !field.value.trim());

            if (emptyField) {
                emptyField.setCustomValidity('Please fill out this field.');
                emptyField.reportValidity();
                event.preventDefault();
                return;
            }

            fields.forEach((field) => field.setCustomValidity(''));
            passwordConfirmation.setCustomValidity(
                passwordConfirmation.value === registrationForm.elements.password.value
                    ? ''
                    : 'Please make sure both passwords match.',
            );

            if (!registrationForm.checkValidity()) {
                event.preventDefault();
                registrationForm.reportValidity();
            }
        });

        registrationForm.addEventListener('input', (event) => {
            if (event.target.matches('[required]')) {
                event.target.setCustomValidity('');
            }

            if (event.target === passwordConfirmation) {
                passwordConfirmation.setCustomValidity('');
            }
        });

        document.addEventListener('keydown', (event) => {
            if (modal.hidden) {
                return;
            }

            if (event.key === 'Escape') {
                closeModal();
                return;
            }

            if (event.key !== 'Tab') {
                return;
            }

            const focusableElements = Array.from(
                dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'),
            ).filter((element) => !element.closest('[hidden]'));

            if (focusableElements.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        });

        syncSellerFields();

        if (modal.dataset.autoOpen === 'true') {
            openModal(modal.dataset.initialTab || 'login');
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAuthModal, { once: true });
    } else {
        initializeAuthModal();
    }
})();
