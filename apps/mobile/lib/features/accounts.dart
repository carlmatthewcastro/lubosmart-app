import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/rider_design.dart';

class LoginPage extends StatefulWidget {
  final Session session;
  const LoginPage(this.session, {super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final email = TextEditingController(), password = TextEditingController();
  bool visible = false;
  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.session.riderOnly
      ? _buildRiderLogin(context)
      : _buildOtherLogin(context);

  Widget _buildRiderLogin(BuildContext context) {
    final googleButton = _googleSignInButton(context);
    final googleButtonSlot = googleButton == null
        ? null
        : Padding(
            padding: const EdgeInsets.only(top: 4),
            child: SizedBox(
              width: double.infinity,
              height: 56,
              child: googleButton,
            ),
          );
    return RiderAuthTheme(
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final keyboardOpen = MediaQuery.viewInsetsOf(context).bottom > 0;
              final heroHeight =
                  (constraints.maxHeight * (keyboardOpen ? .2 : .38))
                      .clamp(
                        keyboardOpen ? 108.0 : 210.0,
                        keyboardOpen ? 158.0 : 316.0,
                      )
                      .toDouble();
              final illustrationHeight = heroHeight * (keyboardOpen ? .42 : .7);

              return SingleChildScrollView(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Column(
                    children: [
                      SizedBox(
                        height: heroHeight,
                        child: Stack(
                          alignment: Alignment.topCenter,
                          children: [
                            Positioned(
                              left: -58,
                              bottom: 4,
                              child: Container(
                                width: 168,
                                height: 168,
                                decoration: BoxDecoration(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .primaryContainer
                                      .withValues(alpha: .58),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                            Positioned(
                              right: -52,
                              bottom: 14,
                              child: Container(
                                width: 148,
                                height: 148,
                                decoration: BoxDecoration(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .primaryContainer
                                      .withValues(alpha: .42),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                            Positioned(
                              left: 0,
                              right: 0,
                              bottom: 0,
                              height: illustrationHeight,
                              child: RiderArtwork(height: illustrationHeight),
                            ),
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: RiderBrand(large: !keyboardOpen),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surface,
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(32),
                            bottom: Radius.circular(28),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: .045),
                              blurRadius: 18,
                              offset: const Offset(0, -4),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'Welcome, Rider!',
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.headlineSmall
                                  ?.copyWith(
                                    fontSize: 26,
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Sign in to manage your deliveries, returns, and earnings.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant,
                                fontSize: 14,
                                height: 1.4,
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Row(
                              children: [
                                Expanded(
                                  child: _RiderLoginFeature(
                                    Icons.inventory_2_outlined,
                                    'Deliver Parcels',
                                  ),
                                ),
                                SizedBox(width: 8),
                                _RiderFeatureDivider(),
                                SizedBox(width: 8),
                                Expanded(
                                  child: _RiderLoginFeature(
                                    Icons.sync_alt,
                                    'Handle Returns',
                                  ),
                                ),
                                SizedBox(width: 8),
                                _RiderFeatureDivider(),
                                SizedBox(width: 8),
                                Expanded(
                                  child: _RiderLoginFeature(
                                    Icons.account_balance_wallet_outlined,
                                    'Track Earnings',
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 18),
                            TextField(
                              controller: email,
                              autofillHints: const [AutofillHints.username],
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              decoration: const InputDecoration(
                                labelText: 'Email',
                                prefixIcon: RiderIcon(
                                  Icons.mail_outline,
                                  size: 22,
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: password,
                              autofillHints: const [AutofillHints.password],
                              obscureText: !visible,
                              textInputAction: TextInputAction.done,
                              decoration: InputDecoration(
                                labelText: 'Password',
                                prefixIcon: const RiderIcon(
                                  Icons.lock_outline,
                                  size: 22,
                                ),
                                suffixIcon: IconButton(
                                  tooltip: visible
                                      ? 'Hide password'
                                      : 'Show password',
                                  onPressed: () =>
                                      setState(() => visible = !visible),
                                  icon: RiderIcon(
                                    visible
                                        ? Icons.visibility_off
                                        : Icons.visibility,
                                    size: 22,
                                  ),
                                ),
                              ),
                            ),
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () => open(
                                  context,
                                  PasswordRecovery(
                                    widget.session.api,
                                    riderOnly: true,
                                  ),
                                ),
                                style: TextButton.styleFrom(
                                  minimumSize: const Size(0, 44),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 4,
                                  ),
                                ),
                                child: const Text('Forgot password?'),
                              ),
                            ),
                            SizedBox(
                              width: double.infinity,
                              height: 56,
                              child: ActionButton(
                                'Sign In',
                                () => widget.session.login(
                                  email.text,
                                  password.text,
                                ),
                                trailing: ExcludeSemantics(
                                  child: Icon(
                                    Icons.arrow_forward,
                                    size: 22,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onPrimary,
                                  ),
                                ),
                                showProgressIndicator: true,
                                textStyle: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            ?googleButtonSlot,
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 10),
                              child: Row(
                                children: [
                                  Expanded(child: Divider()),
                                  Padding(
                                    padding: EdgeInsets.symmetric(
                                      horizontal: 14,
                                    ),
                                    child: Text('or'),
                                  ),
                                  Expanded(child: Divider()),
                                ],
                              ),
                            ),
                            SizedBox(
                              width: double.infinity,
                              height: 54,
                              child: OutlinedButton.icon(
                                onPressed: () => open(
                                  context,
                                  RegistrationPage(widget.session),
                                ),
                                icon: const Icon(
                                  Icons.person_add_alt_1_outlined,
                                  size: 21,
                                ),
                                label: const Text(
                                  'Register as a Rider',
                                  style: TextStyle(fontWeight: FontWeight.w600),
                                ),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Theme.of(context)
                                      .colorScheme
                                      .primary,
                                  side: BorderSide(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .primary,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildOtherLogin(BuildContext context) {
    final googleButton = _googleSignInButton(context);
    return PageFrame(
      'Welcome to LubosMart',
      Align(
        alignment: Alignment.center,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.all(20),
            children: [
              Image.asset('assets/brand.png', height: 80),
              const SizedBox(height: 20),
              Text(
                'Local finds.\nEveryday favorites.',
                style: Theme.of(context).textTheme.headlineMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 16),
              const Text('Shop, manage your store, or deliver with LubosMart.'),
              const SizedBox(height: 24),
              TextField(
                controller: email,
                autofillHints: const [AutofillHints.username],
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: RiderIcon(Icons.mail_outline),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: password,
                autofillHints: const [AutofillHints.password],
                obscureText: !visible,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const RiderIcon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    tooltip: visible ? 'Hide password' : 'Show password',
                    onPressed: () => setState(() => visible = !visible),
                    icon: RiderIcon(
                      visible ? Icons.visibility_off : Icons.visibility,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () =>
                      open(context, PasswordRecovery(widget.session.api)),
                  child: const Text('Forgot password?'),
                ),
              ),
              ActionButton(
                'Sign in',
                () => widget.session.login(email.text, password.text),
              ),
              ?googleButton,
              OutlinedButton(
                onPressed: () =>
                    open(context, RegistrationPage(widget.session)),
                child: const Text('Create a Buyer, Seller or Rider account'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget? _googleSignInButton(BuildContext context) {
    if (const String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID').isEmpty) {
      return null;
    }
    return ActionButton(
      'Continue with Google',
      () async {
        final google = GoogleSignIn.instance;
        await google.initialize(
          serverClientId: const String.fromEnvironment(
            'GOOGLE_SERVER_CLIENT_ID',
          ),
        );
        final account = await google.authenticate();
        const scopes = ['email', 'profile'];
        final authorization =
            await account.authorizationClient.authorizationForScopes(scopes) ??
            await account.authorizationClient.authorizeScopes(scopes);
        final response = await widget.session.api.request(
          'POST',
          'auth/google',
          body: {
            'access_token': authorization.accessToken,
            'device_name': 'LubosMart Flutter',
          },
        );
        if (response['data']['kind'] == 'registration_required') {
          if (!context.mounted) return;
          await open(
            context,
            RegistrationPage(
              widget.session,
              googleToken: authorization.accessToken,
              googleProfile: Json.from(response['data']['profile'] as Map),
            ),
          );
        } else {
          await widget.session.accept(Json.from(response['data'] as Map));
        }
      },
      outlined: true,
      showProgressIndicator: true,
    );
  }
}

class _RiderLoginFeature extends StatelessWidget {
  final IconData icon;
  final String label;

  const _RiderLoginFeature(this.icon, this.label);

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Container(
        width: 42,
        height: 42,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primaryContainer
              .withValues(alpha: .58),
          borderRadius: BorderRadius.circular(14),
        ),
        child: ExcludeSemantics(
          child: RiderIcon(
            icon,
            size: 22,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
      ),
      const SizedBox(height: 6),
      Text(
        label,
        textAlign: TextAlign.center,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w500),
      ),
    ],
  );
}

class _RiderFeatureDivider extends StatelessWidget {
  const _RiderFeatureDivider();

  @override
  Widget build(BuildContext context) => Container(
    width: 1,
    height: 54,
    color: Theme.of(context).colorScheme.primary.withValues(alpha: .12),
  );
}

class PasswordRecovery extends StatefulWidget {
  final Api api;
  final Future<void> Function()? onChanged;
  final bool riderOnly;
  const PasswordRecovery(
    this.api, {
    this.onChanged,
    this.riderOnly = false,
    super.key,
  });
  @override
  State<PasswordRecovery> createState() => _PasswordRecoveryState();
}

class _PasswordRecoveryState extends State<PasswordRecovery> {
  final email = TextEditingController(),
      code = TextEditingController(),
      password = TextEditingController(),
      confirmation = TextEditingController();
  int step = 0;
  String? verifiedToken;
  @override
  void dispose() {
    for (final c in [email, code, password, confirmation]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PageFrame(
    'Recover your account',
    widget.riderOnly
        ? RiderAuthTheme(child: _recoveryBody(context))
        : _recoveryBody(context),
    appBarTitle: widget.riderOnly ? const RiderBrand() : null,
  );

  Widget _recoveryBody(BuildContext context) => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      const Text(
        'Use your registered email. A code expires after ten minutes.',
      ),
      const SizedBox(height: 16),
      TextField(
        controller: email,
        readOnly: step > 0,
        keyboardType: TextInputType.emailAddress,
        decoration: const InputDecoration(labelText: 'Email'),
      ),
      if (step == 0)
        ActionButton('Send recovery code', () async {
          await widget.api.request(
            'POST',
            'auth/password/code',
            body: {'email': email.text.trim(), 'purpose': 'password'},
          );
          setState(() => step = 1);
        }, showProgressIndicator: widget.riderOnly),
      if (step == 1) ...[
        TextField(
          controller: code,
          keyboardType: TextInputType.number,
          maxLength: 6,
          decoration: const InputDecoration(labelText: 'Email code'),
        ),
        ActionButton('Verify code', () async {
          final result = await widget.api.request(
            'POST',
            'auth/password/verify',
            body: {
              'email': email.text.trim(),
              'purpose': 'password',
              'code': code.text,
            },
          );
          verifiedToken = result['data']['confirmation_token'] as String;
          setState(() => step = 2);
        }, showProgressIndicator: widget.riderOnly),
      ],
      if (step == 2) ...[
        TextField(
          controller: password,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'New password'),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: confirmation,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'Confirm new password'),
        ),
        ActionButton('Change password', () async {
          await widget.api.request(
            'POST',
            'auth/password/reset',
            body: {
              'email': email.text.trim(),
              'confirmation_token': verifiedToken,
              'password': password.text,
              'password_confirmation': confirmation.text,
            },
          );
          await widget.onChanged?.call();
          if (context.mounted) {
            feedback(context, 'Password changed. Sign in again.');
            Navigator.pop(context);
          }
        }, showProgressIndicator: widget.riderOnly),
      ],
    ],
  );
}

class AddressFields extends StatefulWidget {
  final Api api;
  final ValueChanged<Json> onChanged;
  const AddressFields(this.api, this.onChanged, {super.key});
  @override
  State<AddressFields> createState() => _AddressFieldsState();
}

class _AddressFieldsState extends State<AddressFields> {
  final Json selected = {};
  final List<List<Json>> choices = [[], [], [], []];
  final keys = ['region_code', 'province_code', 'city_code', 'barangay_code'];
  final labels = ['Region', 'Province', 'City / municipality', 'Barangay'];
  String? error;
  @override
  void initState() {
    super.initState();
    fetch(0, 'locations?regions=1');
  }

  Future<void> fetch(int index, String path) async {
    try {
      // Location endpoints return a raw array, unlike resource endpoints.
      final result = await widget.api.list(path);
      if (mounted) {
        setState(() {
          choices[index] = result;
          error = null;
        });
      }
    } catch (failure) {
      if (mounted) setState(() => error = '$failure');
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      if (error != null) Failure(error!, () => fetch(0, 'locations?regions=1')),
      for (var index = 0; index < 4; index++)
        Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: DropdownButtonFormField<String>(
            key: ValueKey(
              '${keys[index]}:${selected[keys[index]]}:${choices[index].length}',
            ),
            initialValue: selected[keys[index]] as String?,
            isExpanded: true,
            decoration: InputDecoration(labelText: labels[index]),
            items: choices[index]
                .map(
                  (item) => DropdownMenuItem(
                    value: '${item['code']}',
                    child: Text(
                      '${item['name']}',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                )
                .toList(),
            validator: (value) =>
                value == null ? 'Choose ${labels[index].toLowerCase()}.' : null,
            onChanged: (value) {
              const nameKeys = ['region', 'province', 'city', 'barangay'];
              setState(() {
                selected[keys[index]] = value;
                selected[nameKeys[index]] = choices[index].firstWhere(
                  (item) => '${item['code']}' == value,
                )['name'];
                for (var next = index + 1; next < 4; next++) {
                  selected.remove(keys[next]);
                  selected.remove(nameKeys[next]);
                  choices[next] = [];
                }
              });
              widget.onChanged({...selected});
              if (index < 3) {
                fetch(
                  index + 1,
                  'locations?${['region', 'province', 'city'][index]}=$value',
                );
              }
            },
          ),
        ),
    ],
  );
}

class RegistrationSteps extends StatefulWidget {
  final String? error;
  final bool enabled;
  final bool resubmit;
  final EdgeInsets padding;
  final List<Widget> children;
  const RegistrationSteps({
    this.error,
    required this.enabled,
    required this.resubmit,
    required this.padding,
    required this.children,
    super.key,
  });
  @override
  State<RegistrationSteps> createState() => _RegistrationStepsState();
}

class _RegistrationStepsState extends State<RegistrationSteps> {
  int step = 0;
  final scroll = ScrollController();
  void changeStep(int next) {
    FocusScope.of(context).unfocus();
    setState(() => step = next);
    if (scroll.hasClients) scroll.jumpTo(0);
  }

  void showValidation() => changeStep(0);
  @override
  void dispose() {
    scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled) {
      return ListView(padding: widget.padding, children: widget.children);
    }
    final items = widget.children;
    final address = items.indexWhere((w) => w is AddressFields);
    final documents = items.indexWhere(
      (w) => w is Padding && w.child is OutlinedButton,
    );
    if (address < 0 || documents < address) {
      return ListView(padding: widget.padding, children: items);
    }
    final bounds = [0, address, documents, items.length];
    const titles = [
      'Account information',
      'Vehicle information',
      'Required documents',
    ];
    const steps = ['Account', 'Vehicle', 'Documents'];
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return ListView(
      controller: scroll,
      padding: widget.padding,
      children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.resubmit
                                ? 'Update your Rider application'
                                : 'Register as Rider',
                            style: theme.textTheme.headlineSmall?.copyWith(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            widget.resubmit
                                ? 'Review and correct your application details.'
                                : 'Create your rider account to start delivering with LubosMart.',
                            style: TextStyle(
                              color: colors.onSurfaceVariant,
                              fontSize: 13,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 112,
                      height: 112,
                      child: Stack(
                        alignment: Alignment.bottomRight,
                        children: [
                          Positioned(
                            right: 0,
                            bottom: 0,
                            child: Container(
                              width: 104,
                              height: 104,
                              decoration: BoxDecoration(
                                color: colors.primaryContainer.withValues(
                                  alpha: .55,
                                ),
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                          const Align(
                            alignment: Alignment.bottomRight,
                            child: RiderArtwork(height: 110),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  'Step ${step + 1} of 3',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    for (var index = 0; index < 3; index++) ...[
                      if (index > 0)
                        Expanded(
                          child: Container(
                            height: 2,
                            color: index <= step
                                ? colors.primary
                                : colors.outlineVariant,
                          ),
                        ),
                      CircleAvatar(
                        radius: 18,
                        backgroundColor: index <= step
                            ? colors.primary
                            : colors.surface,
                        foregroundColor: index <= step
                            ? colors.onPrimary
                            : colors.onSurfaceVariant,
                        child: index < step
                            ? const Icon(Icons.check, size: 20)
                            : Text(
                                '${index + 1}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                      if (index < 2)
                        Expanded(
                          child: Container(
                            height: 2,
                            color: index < step
                                ? colors.primary
                                : colors.outlineVariant,
                          ),
                        ),
                    ],
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    for (var index = 0; index < steps.length; index++)
                      Expanded(
                        child: Text(
                          steps[index],
                          textAlign: index == 0
                              ? TextAlign.left
                              : index == steps.length - 1
                              ? TextAlign.right
                              : TextAlign.center,
                          style: TextStyle(
                            color: index <= step
                                ? colors.onSurface
                                : colors.onSurfaceVariant,
                            fontSize: 11,
                            fontWeight: index == step
                                ? FontWeight.w600
                                : FontWeight.w400,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                Card(
                  margin: EdgeInsets.zero,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(22),
                    side: BorderSide(
                      color: colors.outlineVariant.withValues(alpha: .55),
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 42,
                              height: 42,
                              decoration: BoxDecoration(
                                color: colors.primaryContainer.withValues(
                                  alpha: .65,
                                ),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              alignment: Alignment.center,
                              child: RiderIcon(
                                [
                                  Icons.person_outline,
                                  Icons.two_wheeler_outlined,
                                  Icons.description_outlined,
                                ][step],
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                titles[step],
                                style: theme.textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (widget.error != null) ...[
                          const SizedBox(height: 12),
                          Semantics(
                            liveRegion: true,
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: colors.errorContainer,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(
                                    Icons.error_outline,
                                    size: 20,
                                    color: colors.onErrorContainer,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      widget.error!,
                                      style: TextStyle(
                                        color: colors.onErrorContainer,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),
                        for (var group = 0; group < 3; group++)
                          Offstage(
                            offstage: group != step,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: items.sublist(
                                bounds[group],
                                bounds[group + 1],
                              ),
                            ),
                          ),
                        if (step < 2) ...[
                          const SizedBox(height: 8),
                          if (step == 0)
                            SizedBox(
                              height: 52,
                              width: double.infinity,
                              child: FilledButton(
                                onPressed: () => changeStep(step + 1),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text('Next'),
                                    SizedBox(width: 8),
                                    Icon(Icons.arrow_forward, size: 20),
                                  ],
                                ),
                              ),
                            )
                          else
                            Row(
                              children: [
                                Expanded(
                                  child: SizedBox(
                                    height: 52,
                                    child: OutlinedButton(
                                      style: OutlinedButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                        ),
                                      ),
                                      onPressed: () => changeStep(step - 1),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.arrow_back, size: 18),
                                          SizedBox(width: 4),
                                          Text('Back'),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: SizedBox(
                                    height: 52,
                                    child: FilledButton(
                                      style: FilledButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                        ),
                                      ),
                                      onPressed: () => changeStep(step + 1),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text('Next'),
                                          SizedBox(width: 4),
                                          Icon(Icons.arrow_forward, size: 18),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ],
                    ),
                  ),
                ),
                if (!widget.resubmit) ...[
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Flexible(
                        child: Text(
                          'Already have an account?',
                          textAlign: TextAlign.right,
                        ),
                      ),
                      TextButton(
                        onPressed: () => Navigator.of(context).maybePop(),
                        child: const Text('Sign In'),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class RegistrationPage extends StatefulWidget {
  final Session session;
  final bool resubmit;
  final String? googleToken;
  final Json? googleProfile;
  const RegistrationPage(
    this.session, {
    this.resubmit = false,
    this.googleToken,
    this.googleProfile,
    super.key,
  });
  @override
  State<RegistrationPage> createState() => _RegistrationPageState();
}

class _RegistrationPageState extends State<RegistrationPage> {
  final wizardKey = GlobalKey<_RegistrationStepsState>();
  final form = GlobalKey<FormState>();
  final fields = <String, TextEditingController>{};
  final files = <String, String>{};
  final visibleSecrets = <String>{};
  Json location = {};
  String role = 'buyer',
      sex = 'prefer_not_to_say',
      sellerType = 'individual',
      vehicle = 'motorcycle';
  int? category, center;
  List<Json> categories = [], centers = [];
  bool consent = false;
  String? error;
  @override
  void initState() {
    super.initState();
    role = widget.resubmit
        ? widget.session.role
        : (widget.session.riderOnly ? 'rider' : 'buyer');
    if (widget.googleProfile != null) {
      for (final key in ['first_name', 'last_name', 'email']) {
        fields[key] = TextEditingController(
          text: widget.googleProfile![key]?.toString() ?? '',
        );
      }
    }
    prepare();
  }

  Future<void> prepare() async {
    try {
      categories = rows(
        (await widget.session.api.request('GET', 'categories'))['data'],
      ).where((c) => c['parent_id'] == null).toList();
      centers = rows(
        (await widget.session.api.request(
          'GET',
          'registration/centers',
        ))['data'],
      );
      if (mounted) setState(() {});
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    }
  }

  @override
  void dispose() {
    for (final c in fields.values) {
      c.dispose();
    }
    super.dispose();
  }

  Widget field(
    String key,
    String label, {
    bool optional = false,
    bool secret = false,
    TextInputType? keyboard,
  }) {
    final controller = fields.putIfAbsent(key, TextEditingController.new);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        key: ValueKey(key),
        controller: controller,
        readOnly: key == 'birthday',
        onTap: key != 'birthday'
            ? null
            : () async {
                final chosen = await showDatePicker(
                  context: context,
                  initialDate:
                      DateTime.tryParse(controller.text) ?? DateTime(2000),
                  firstDate: DateTime(1900, 1, 2),
                  lastDate: DateTime.now(),
                );
                if (chosen != null) {
                  controller.text =
                      '${chosen.year}-${chosen.month.toString().padLeft(2, '0')}-${chosen.day.toString().padLeft(2, '0')}';
                }
              },
        obscureText: secret && !visibleSecrets.contains(key),
        keyboardType: keyboard,
        textInputAction: key == 'password_confirmation'
            ? TextInputAction.done
            : TextInputAction.next,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(
            const {
                  'first_name': Icons.person_outline,
                  'middle_initial': Icons.person_outline,
                  'last_name': Icons.person_outline,
                  'birthday': Icons.calendar_today_outlined,
                  'email': Icons.mail_outline,
                  'phone': Icons.phone_outlined,
                  'password': Icons.lock_outline,
                  'password_confirmation': Icons.lock_outline,
                  'line1': Icons.home_outlined,
                  'zip': Icons.pin_outlined,
                  'plate_number': Icons.pin_outlined,
                }[key] ??
                Icons.edit_outlined,
          ),
          suffixIcon: secret
              ? IconButton(
                  tooltip: visibleSecrets.contains(key)
                      ? 'Hide ${label.toLowerCase()}'
                      : 'Show ${label.toLowerCase()}',
                  onPressed: () => setState(() {
                    if (!visibleSecrets.add(key)) visibleSecrets.remove(key);
                  }),
                  icon: RiderIcon(
                    visibleSecrets.contains(key)
                        ? Icons.visibility_off
                        : Icons.visibility,
                    size: 22,
                  ),
                )
              : null,
        ),
        validator: (v) => !optional && (v == null || v.trim().isEmpty)
            ? 'Enter ${label.toLowerCase()}.'
            : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final documents = [
      'identity',
      if (role == 'seller') ...[
        'business_permit',
        if (sellerType == 'sole_proprietorship') 'dti_certificate',
        if (sellerType == 'corporation') 'sec_certificate',
        if (sellerType != 'individual') 'bir_2303',
      ],
      if (role == 'rider') ...['license', 'vehicle_registration'],
    ];
    final formContent = Form(
      key: form,
      child: RegistrationSteps(
        key: wizardKey,
        error: error,
        enabled: widget.session.riderOnly,
        resubmit: widget.resubmit,
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          if (!widget.resubmit && !widget.session.riderOnly)
            DropdownButtonFormField<String>(
              initialValue: role,
              decoration: const InputDecoration(labelText: 'Account role'),
              items: const [
                DropdownMenuItem(value: 'buyer', child: Text('Buyer')),
                DropdownMenuItem(value: 'seller', child: Text('Seller')),
                DropdownMenuItem(value: 'rider', child: Text('Rider')),
              ],
              onChanged: (v) => setState(() => role = v!),
            ),
          const SizedBox(height: 16),
          field('first_name', 'First name'),
          field('middle_initial', 'Middle initial (optional)', optional: true),
          field('last_name', 'Last name'),
          DropdownButtonFormField<String>(
            initialValue: sex,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Sex'),
            items: const [
              DropdownMenuItem(
                value: 'female',
                child: Text('Female', overflow: TextOverflow.ellipsis),
              ),
              DropdownMenuItem(
                value: 'male',
                child: Text('Male', overflow: TextOverflow.ellipsis),
              ),
              DropdownMenuItem(
                value: 'prefer_not_to_say',
                child: Text(
                  'Prefer not to say',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
            onChanged: (v) => sex = v!,
          ),
          const SizedBox(height: 16),
          field(
            'birthday',
            'Birthday (YYYY-MM-DD)',
            keyboard: TextInputType.datetime,
          ),
          field('phone', 'Mobile number (09…)', keyboard: TextInputType.phone),
          if (!widget.resubmit)
            field('email', 'Email', keyboard: TextInputType.emailAddress),
          if (!widget.resubmit && widget.googleToken == null) ...[
            field('password', 'Password', secret: true),
            field('password_confirmation', 'Confirm password', secret: true),
          ],
          AddressFields(widget.session.api, (value) => location = value),
          field('line1', 'House number and street'),
          field('zip', 'Postal code', keyboard: TextInputType.number),
          if (role == 'seller') ...[
            DropdownButtonFormField<String>(
              initialValue: sellerType,
              decoration: const InputDecoration(labelText: 'Seller type'),
              items: const [
                DropdownMenuItem(
                  value: 'individual',
                  child: Text('Individual'),
                ),
                DropdownMenuItem(
                  value: 'sole_proprietorship',
                  child: Text('Sole proprietorship'),
                ),
                DropdownMenuItem(
                  value: 'corporation',
                  child: Text('Corporation'),
                ),
              ],
              onChanged: (v) => setState(() => sellerType = v!),
            ),
            const SizedBox(height: 16),
            field('business_name', 'Shop name'),
            field('tin', 'TIN (000-000-000-000)'),
            DropdownButtonFormField<int>(
              decoration: const InputDecoration(
                labelText: 'Registered department',
              ),
              isExpanded: true,
              items: categories
                  .map(
                    (c) => DropdownMenuItem(
                      value: c['id'] as int,
                      child: Text('${c['name']}'),
                    ),
                  )
                  .toList(),
              onChanged: (id) => category = id,
              validator: (id) => id == null ? 'Choose your department.' : null,
            ),
          ],
          if (role == 'rider') ...[
            DropdownButtonFormField<int>(
              decoration: const InputDecoration(
                labelText: 'Logistics company',
                prefixIcon: RiderIcon(Icons.business_outlined, size: 22),
              ),
              isExpanded: true,
              items: centers
                  .map(
                    (c) => DropdownMenuItem(
                      value: c['id'] as int,
                      child: Text('${c['name']}'),
                    ),
                  )
                  .toList(),
              onChanged: (id) => center = id,
              validator: (id) => id == null ? 'Choose your company.' : null,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: vehicle,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Vehicle',
                prefixIcon: RiderIcon(Icons.two_wheeler_outlined, size: 22),
              ),
              items: [
                'motorcycle',
                'bicycle',
                'car',
                'van',
                'truck',
              ].map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
              onChanged: (v) => vehicle = v!,
            ),
            const SizedBox(height: 16),
            field('plate_number', 'Plate number'),
          ],
          const SizedBox(height: 16),
          for (final document in documents)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  alignment: Alignment.centerLeft,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  minimumSize: const Size.fromHeight(66),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                icon: Icon(
                  files.containsKey(document)
                      ? Icons.check_circle_outline
                      : Icons.upload_file,
                  size: 22,
                ),
                label: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      riderDisplayValue(document),
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      files[document] == null
                          ? 'JPG, PNG, or PDF'
                          : files[document]!.split(RegExp(r'[/\\]')).last,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                onPressed: () async {
                  final picked = await FilePicker.pickFile(
                    type: FileType.custom,
                    allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
                  );
                  if (picked?.path != null && mounted) {
                    setState(() => files[document] = picked!.path!);
                  }
                },
              ),
            ),
          TextButton(
            onPressed: () => open(
              context,
              ResourcePage(
                api: widget.session.api,
                path: 'policies',
                title: 'Terms and Privacy',
                builder: (context, response, reload) => Column(
                  children: [
                    for (final policy in rows(response['data']))
                      InfoCard(
                        '${policy['title']}',
                        subtitle: '${policy['body']}',
                      ),
                    if (rows(response['data']).isEmpty)
                      const InfoCard(
                        'Policies are unavailable',
                        subtitle: 'Contact LubosMart before submitting your application.',
                      ),
                  ],
                ),
              ),
            ),
            child: const Text('Read published policies'),
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: consent,
            onChanged: (v) => setState(() => consent = v ?? false),
            title: const Text(
              'I accept the Terms and Privacy Policy and consent to application review.',
            ),
          ),
          ActionButton(
            widget.resubmit ? 'Submit for review' : 'Create account',
            () async {
              if (!form.currentState!.validate()) {
                setState(
                  () => error =
                      'Review required fields in each registration step.',
                );
                wizardKey.currentState?.showValidation();
                return;
              }
              if (!consent) {
                throw const ApiFailure(
                  422,
                  'Accept the Terms and Privacy Policy to continue.',
                );
              }
              if (!await confirm(
                context,
                'Submit application?',
                'Your details and documents will be reviewed by Admin, or by your Logistics company for Rider accounts.',
              )) {
                return;
              }
              try {
                final response = await widget.session.api.request(
                  'POST',
                  widget.resubmit ? 'onboarding/application' : 'auth/register',
                  body: {
                    for (final entry in fields.entries)
                      if (entry.value.text.isNotEmpty)
                        entry.key: entry.value.text,
                    ...location,
                    'role': role,
                    'sex': sex,
                    'policy_accepted': 1,
                    if (widget.googleToken != null)
                      'google_access_token': widget.googleToken,
                    if (role == 'seller') ...{
                      'seller_type': sellerType,
                      'business_category_id': category,
                    },
                    if (role == 'rider') ...{
                      'vehicle_type': vehicle,
                      'logistics_center_id': center,
                    },
                  },
                  files: {
                    for (final doc in documents)
                      if (files.containsKey(doc)) doc: files[doc]!,
                  },
                );
                if (widget.resubmit) {
                  await widget.session.clear();
                } else {
                  await widget.session.accept(
                    Json.from(response['data'] as Map),
                  );
                }
                if (context.mounted) Navigator.pop(context);
              } catch (failure) {
                if (mounted) setState(() => error = '$failure');
              }
            },
            showProgressIndicator: widget.session.riderOnly,
          ),
        ],
      ),
    );
    final riderRegistration = widget.session.riderOnly;
    final Widget body = riderRegistration
        ? RiderAuthTheme(child: formContent)
        : formContent;
    return PageFrame(
      widget.resubmit ? 'Correct your application' : 'Create your account',
      body,
      appBarTitle: riderRegistration ? const RiderBrand() : null,
    );
  }
}

class OnboardingPage extends StatelessWidget {
  final Session session;
  const OnboardingPage(this.session, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: session.api,
    path: 'onboarding/status',
    title: 'Your application',
    builder: (context, data, reload) {
      final state = data['data'] as Json;
      final user = state['user'] as Json;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InfoCard(
            '${user['name']}',
            subtitle:
                'Status: ${user['status']}\n${state['application']?['rejection_reason'] ?? 'Admin reviews Buyer/Seller accounts. Your Logistics company reviews Rider accounts.'}',
          ),
          if (user['email_verified'] != true) ...[
            ActionButton(
              'Enter email verification code',
              () => open(
                context,
                EditPage(
                  title: 'Verify email',
                  fields: const [
                    InputSpec('code', 'Six-digit code', number: true),
                  ],
                  submit: (fields) async {
                    final result = await session.api.request(
                      'POST',
                      'onboarding/verify',
                      body: fields,
                    );
                    await session.accept(Json.from(result['data'] as Map));
                  },
                ),
              ),
            ),
            ActionButton('Resend verification code', () async {
              await session.api.request('POST', 'onboarding/resend');
              if (context.mounted) feedback(context, 'Verification code sent.');
            }, outlined: true),
          ],
          if (state['can_operate'] == true)
            ActionButton('Open your workspace', () async {
              final result = await session.api.request(
                'POST',
                'onboarding/promote',
              );
              await session.accept(Json.from(result['data'] as Map));
            }),
          if (['incomplete', 'rejected'].contains(user['status']))
            ActionButton(
              'Complete or correct application',
              () => open(context, RegistrationPage(session, resubmit: true)),
            ),
          ActionButton('Check review status', () async {
            reload();
          }, outlined: true),
          ActionButton('Sign out', session.logout, outlined: true),
        ],
      );
    },
  );
}
