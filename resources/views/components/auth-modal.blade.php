@once
    <link rel="stylesheet" href="{{ asset('css/auth-style.css') }}">
    <script src="{{ asset('js/auth-modal.js') }}" defer></script>
@endonce

<div
    class="auth-modal"
    data-auth-modal
    data-auto-open="{{ $errors->any() ? 'true' : 'false' }}"
    data-initial-tab="{{ old('name') || old('role') ? 'register' : 'login' }}"
    hidden
    aria-hidden="true"
>
    <div class="auth-modal__backdrop" data-auth-close aria-hidden="true"></div>

    <section
        class="auth-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        tabindex="-1"
    >
        <header class="auth-modal__header">
            <button class="auth-modal__close" type="button" data-auth-close aria-label="Close dialog">
                <span aria-hidden="true">&times;</span>
            </button>

            <p class="auth-modal__brand">
                <span class="auth-modal__brand-mark" aria-hidden="true">L</span>
                <span>LuboSmart</span>
            </p>
            <h2 class="auth-modal__heading" id="auth-modal-title">Welcome to LuboSmart</h2>
            <p class="auth-modal__intro">Sign in or create an account to get started.</p>

            <div class="auth-modal__tabs" role="tablist" aria-label="Account access">
                <button
                    class="auth-modal__tab"
                    id="auth-login-tab"
                    type="button"
                    role="tab"
                    aria-selected="true"
                    aria-controls="auth-login-panel"
                    data-auth-tab="login"
                >
                    Log in
                </button>
                <button
                    class="auth-modal__tab"
                    id="auth-register-tab"
                    type="button"
                    role="tab"
                    aria-selected="false"
                    aria-controls="auth-register-panel"
                    data-auth-tab="register"
                    tabindex="-1"
                >
                    Create account
                </button>
            </div>
        </header>

        <div class="auth-modal__content">
            <div
                id="auth-login-panel"
                role="tabpanel"
                aria-labelledby="auth-login-tab"
                class="auth-modal__panel"
                data-auth-panel="login"
            >
                <form class="auth-modal__form" method="POST" action="{{ route('login') }}" data-auth-form="login">
                    @csrf

                    <div class="auth-modal__field-group">
                        <label class="auth-modal__label" for="auth-login-email">Email address</label>
                        <input
                            class="auth-modal__field"
                            id="auth-login-email"
                            name="email"
                            type="email"
                            value="{{ old('email') }}"
                            autocomplete="email"
                            maxlength="160"
                            placeholder="you@example.com"
                            required
                        >
                        @error('email')
                            <p class="auth-modal__error">{{ $message }}</p>
                        @enderror
                    </div>

                    <div class="auth-modal__field-group">
                        <label class="auth-modal__label" for="auth-login-password">Password</label>
                        <input
                            class="auth-modal__field"
                            id="auth-login-password"
                            name="password"
                            type="password"
                            autocomplete="current-password"
                            required
                        >
                        @error('password')
                            <p class="auth-modal__error">{{ $message }}</p>
                        @enderror
                    </div>

                    <label class="auth-modal__remember" for="auth-remember">
                        <input id="auth-remember" name="remember" type="checkbox" value="1">
                        <span>Remember me</span>
                    </label>

                    <button class="auth-modal__button" type="submit">Log in</button>
                    <p class="auth-modal__footer">
                        <a href="{{ route('password.request') }}">Forgot your password?</a>
                    </p>
                </form>
            </div>

            <div
                id="auth-register-panel"
                role="tabpanel"
                aria-labelledby="auth-register-tab"
                class="auth-modal__panel"
                data-auth-panel="register"
                hidden
            >
                <form class="auth-modal__form" method="POST" action="{{ route('register') }}" data-auth-form="register">
                    @csrf

                    <div class="auth-modal__field-group">
                        <label class="auth-modal__label" for="auth-register-name">Full name</label>
                        <input
                            class="auth-modal__field"
                            id="auth-register-name"
                            name="name"
                            type="text"
                            value="{{ old('name') }}"
                            autocomplete="name"
                            maxlength="160"
                            placeholder="Your full name"
                            required
                        >
                        @error('name')
                            <p class="auth-modal__error">{{ $message }}</p>
                        @enderror
                    </div>

                    <div class="auth-modal__field-group">
                        <label class="auth-modal__label" for="auth-register-email">Email address</label>
                        <input
                            class="auth-modal__field"
                            id="auth-register-email"
                            name="email"
                            type="email"
                            value="{{ old('email') }}"
                            autocomplete="email"
                            maxlength="160"
                            placeholder="you@example.com"
                            required
                        >
                        @error('email')
                            <p class="auth-modal__error">{{ $message }}</p>
                        @enderror
                    </div>

                    <div class="auth-modal__field-group">
                        <label class="auth-modal__label" for="auth-register-role">Account type</label>
                        <select class="auth-modal__select" id="auth-register-role" name="role" required data-auth-role>
                            <option value="buyer" @selected(old('role', 'buyer') === 'buyer')>Buyer</option>
                            <option value="seller" @selected(old('role') === 'seller')>Seller</option>
                            <option value="rider" @selected(old('role') === 'rider')>Rider</option>
                        </select>
                    </div>

                    <div class="auth-modal__seller-fields" data-auth-seller-fields hidden>
                        <div class="auth-modal__field-group">
                            <label class="auth-modal__label" for="auth-store-name">Store name</label>
                            <input
                                class="auth-modal__field"
                                id="auth-store-name"
                                name="store_name"
                                type="text"
                                value="{{ old('store_name') }}"
                                maxlength="160"
                                autocomplete="organization"
                                placeholder="Your store name"
                                disabled
                                data-auth-seller-input
                            >
                            @error('store_name')
                                <p class="auth-modal__error">{{ $message }}</p>
                            @enderror
                        </div>

                        <div class="auth-modal__field-group">
                            <label class="auth-modal__label" for="auth-store-description">Store description</label>
                            <textarea
                                class="auth-modal__textarea"
                                id="auth-store-description"
                                name="store_description"
                                placeholder="Tell customers what your store offers"
                                disabled
                                data-auth-seller-input
                            >{{ old('store_description') }}</textarea>
                            @error('store_description')
                                <p class="auth-modal__error">{{ $message }}</p>
                            @enderror
                        </div>
                        <p class="auth-modal__hint">Seller stores are reviewed before they can start selling.</p>
                    </div>

                    <div class="auth-modal__field-group">
                        <label class="auth-modal__label" for="auth-register-password">Password</label>
                        <input
                            class="auth-modal__field"
                            id="auth-register-password"
                            name="password"
                            type="password"
                            autocomplete="new-password"
                            minlength="8"
                            required
                        >
                        @error('password')
                            <p class="auth-modal__error">{{ $message }}</p>
                        @enderror
                    </div>

                    <div class="auth-modal__field-group">
                        <label class="auth-modal__label" for="auth-register-password-confirmation">Confirm password</label>
                        <input
                            class="auth-modal__field"
                            id="auth-register-password-confirmation"
                            name="password_confirmation"
                            type="password"
                            autocomplete="new-password"
                            minlength="8"
                            required
                            data-auth-password-confirmation
                        >
                    </div>

                    <button class="auth-modal__button auth-modal__button--accent" type="submit">Create account</button>
                    <p class="auth-modal__footer">By creating an account, you agree to LuboSmart's terms and privacy policy.</p>
                </form>
            </div>
        </div>
    </section>
</div>
