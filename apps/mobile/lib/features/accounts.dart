import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../core/api.dart';
import '../ui/common.dart';

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
  Widget build(BuildContext context) => PageFrame(
    'Welcome to LubosMart',
    Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.all(24),
          children: [
            Image.asset('assets/brand.png', height: 80),
            const SizedBox(height: 24),
            Text(
              'Local finds.\nEveryday favorites.',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 16),
            const Text('Shop, manage your store, or deliver with LubosMart.'),
            const SizedBox(height: 24),
            TextField(
              controller: email,
              autofillHints: const [AutofillHints.username],
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: password,
              autofillHints: const [AutofillHints.password],
              obscureText: !visible,
              decoration: InputDecoration(
                labelText: 'Password',
                suffixIcon: IconButton(
                  tooltip: visible ? 'Hide password' : 'Show password',
                  onPressed: () => setState(() => visible = !visible),
                  icon: Icon(visible ? Icons.visibility_off : Icons.visibility),
                ),
              ),
            ),
            const SizedBox(height: 24),
            ActionButton(
              'Sign in',
              () => widget.session.login(email.text, password.text),
            ),
            if (const String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID')
                .isNotEmpty)
              ActionButton('Continue with Google', () async {
                final google = GoogleSignIn.instance;
                await google.initialize(
                  serverClientId: const String.fromEnvironment(
                    'GOOGLE_SERVER_CLIENT_ID',
                  ),
                );
                final account = await google.authenticate();
                const scopes = ['email', 'profile'];
                final authorization =
                    await account.authorizationClient.authorizationForScopes(
                      scopes,
                    ) ??
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
                      googleProfile: Json.from(
                        response['data']['profile'] as Map,
                      ),
                    ),
                  );
                } else {
                  await widget.session.accept(
                    Json.from(response['data'] as Map),
                  );
                }
              }, outlined: true),
            TextButton(
              onPressed: () =>
                  open(context, PasswordRecovery(widget.session.api)),
              child: const Text('Forgot password?'),
            ),
            OutlinedButton(
              onPressed: () => open(context, RegistrationPage(widget.session)),
              child: const Text('Create a Buyer, Seller or Rider account'),
            ),
          ],
        ),
      ),
    ),
  );
}

class PasswordRecovery extends StatefulWidget {
  final Api api;
  final Future<void> Function()? onChanged;
  const PasswordRecovery(this.api, {this.onChanged, super.key});
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
    ListView(
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
          }),
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
          }),
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
            decoration: const InputDecoration(
              labelText: 'Confirm new password',
            ),
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
          }),
        ],
      ],
    ),
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
  final form = GlobalKey<FormState>();
  final fields = <String, TextEditingController>{};
  final files = <String, String>{};
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
    role = widget.resubmit ? widget.session.role : 'buyer';
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
        controller: controller,
        obscureText: secret,
        keyboardType: keyboard,
        decoration: InputDecoration(labelText: label),
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
    return PageFrame(
      widget.resubmit ? 'Correct your application' : 'Create your account',
      Form(
        key: form,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            if (error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Semantics(liveRegion: true, child: Text(error!)),
              ),
            if (!widget.resubmit)
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
            field(
              'middle_initial',
              'Middle initial (optional)',
              optional: true,
            ),
            field('last_name', 'Last name'),
            DropdownButtonFormField<String>(
              initialValue: sex,
              decoration: const InputDecoration(labelText: 'Sex'),
              items: const [
                DropdownMenuItem(value: 'female', child: Text('Female')),
                DropdownMenuItem(value: 'male', child: Text('Male')),
                DropdownMenuItem(
                  value: 'prefer_not_to_say',
                  child: Text('Prefer not to say'),
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
            field(
              'phone',
              'Mobile number (09…)',
              keyboard: TextInputType.phone,
            ),
            if (!widget.resubmit)
              field('email', 'Email', keyboard: TextInputType.emailAddress),
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
                validator: (id) =>
                    id == null ? 'Choose your department.' : null,
              ),
            ],
            if (role == 'rider') ...[
              DropdownButtonFormField<int>(
                decoration: const InputDecoration(
                  labelText: 'Logistics company',
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
                decoration: const InputDecoration(labelText: 'Vehicle'),
                items: ['motorcycle', 'bicycle', 'car', 'van', 'truck']
                    .map((v) => DropdownMenuItem(value: v, child: Text(v)))
                    .toList(),
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
                  icon: Icon(
                    files.containsKey(document)
                        ? Icons.check_circle_outline
                        : Icons.upload_file,
                  ),
                  label: Text(
                    '${document.replaceAll('_', ' ')}${files.containsKey(document) ? ' selected' : ''}',
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
            if (!widget.resubmit && widget.googleToken == null) ...[
              field('password', 'Password', secret: true),
              field('password_confirmation', 'Confirm password', secret: true),
            ],
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
                if (!form.currentState!.validate()) return;
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
                    widget.resubmit
                        ? 'onboarding/application'
                        : 'auth/register',
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
            ),
          ],
        ),
      ),
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
