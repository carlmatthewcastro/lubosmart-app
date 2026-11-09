import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import 'accounts.dart';
import 'work.dart';
import 'buyer.dart';
import 'seller.dart';

class SupportPage extends StatelessWidget {
  final Api api;
  const SupportPage(this.api, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: 'support',
    title: 'Support and messages',
    actions: [
      IconButton(
        tooltip: 'Open conversation',
        icon: const Icon(Icons.add_comment_outlined),
        onPressed: () => open(context, SupportComposer(api)),
      ),
    ],
    builder: (context, response, reload) => Column(
      children: [
        if (rows(response['data']).isEmpty)
          const InfoCard(
            'No conversations yet',
            subtitle: 'Open a message or complaint when you need help.',
          ),
        for (final row in rows(response['data']))
          InfoCard(
            '${row['subject']}',
            subtitle: '${readable('${row['status']}')} · ${row['kind']}',
            onTap: () => open(context, SupportThread(api, row['id'] as int)),
          ),
      ],
    ),
  );
}

class SupportThread extends StatelessWidget {
  final Api api;
  final int id;
  const SupportThread(this.api, this.id, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: 'support/$id',
    title: 'Conversation',
    builder: (context, response, reload) {
      final data = response['data'] as Json;
      return Column(
        children: [
          InfoCard(
            '${data['case']['subject']}',
            subtitle:
                '${data['case']['status']}\n${data['case']['resolution'] ?? ''}',
          ),
          for (final message in rows(data['messages']).reversed)
            InfoCard(
              '${message['author_name']}',
              subtitle: '${message['body']}',
              child: message['has_attachment'] == true
                  ? ActionButton(
                      'View private evidence',
                      () => privateFile(
                        context,
                        api,
                        'support/$id/evidence/${message['id']}',
                      ),
                      outlined: true,
                    )
                  : null,
            ),
          if (data['case']['status'] != 'resolved')
            ActionButton('Write a reply', () async {
              await open(context, SupportComposer(api, caseId: id));
              reload();
            }),
        ],
      );
    },
  );
}

class SupportComposer extends StatefulWidget {
  final Api api;
  final int? caseId;
  const SupportComposer(this.api, {this.caseId, super.key});
  @override
  State<SupportComposer> createState() => _SupportComposerState();
}

class _SupportComposerState extends State<SupportComposer> {
  final subject = TextEditingController(),
      body = TextEditingController(),
      parcel = TextEditingController();
  String kind = 'message';
  String? evidence;
  @override
  void dispose() {
    subject.dispose();
    body.dispose();
    parcel.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PageFrame(
    widget.caseId == null ? 'Open a conversation' : 'Reply',
    ListView(
      padding: const EdgeInsets.all(24),
      children: [
        if (widget.caseId == null) ...[
          DropdownButtonFormField<String>(
            initialValue: kind,
            decoration: const InputDecoration(labelText: 'Conversation type'),
            items: const [
              DropdownMenuItem(value: 'message', child: Text('Message')),
              DropdownMenuItem(value: 'complaint', child: Text('Complaint')),
            ],
            onChanged: (v) => kind = v!,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: subject,
            decoration: const InputDecoration(labelText: 'Subject'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: parcel,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Related parcel number (optional)',
            ),
          ),
        ],
        const SizedBox(height: 16),
        TextField(
          controller: body,
          minLines: 4,
          maxLines: 8,
          maxLength: 5000,
          decoration: const InputDecoration(labelText: 'Your message'),
        ),
        OutlinedButton.icon(
          onPressed: () async {
            final picked = await FilePicker.pickFile(
              type: FileType.custom,
              allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
            );
            if (picked?.path != null && mounted) {
              setState(() => evidence = picked!.path);
            }
          },
          icon: Icon(evidence == null ? Icons.attach_file : Icons.check),
          label: Text(
            evidence == null ? 'Attach private evidence' : 'Evidence selected',
          ),
        ),
        const SizedBox(height: 16),
        ActionButton('Send message', () async {
          if (body.text.trim().isEmpty) {
            throw const ApiFailure(422, 'Write your message first.');
          }
          await widget.api.request(
            'POST',
            widget.caseId == null
                ? 'support'
                : 'support/${widget.caseId}/messages',
            body: {
              'body': body.text,
              if (widget.caseId == null) ...{
                'kind': kind,
                'subject': subject.text,
                if (parcel.text.isNotEmpty) 'seller_order_id': parcel.text,
              },
            },
            files: evidence == null ? {} : {'attachment': evidence!},
          );
          if (context.mounted) Navigator.pop(context);
        }),
      ],
    ),
  );
}

class AddressesPage extends StatelessWidget {
  final Api api;
  const AddressesPage(this.api, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: 'addresses',
    title: 'Delivery addresses',
    actions: [
      IconButton(
        tooltip: 'Add delivery address',
        icon: const Icon(Icons.add_location_alt_outlined),
        onPressed: () => open(context, AddressEditor(api)),
      ),
    ],
    builder: (context, data, reload) => Column(
      children: [
        for (final address in rows(data['data']))
          InfoCard(
            '${address['label']}${address['is_default'] == true ? ' · Default' : ''}',
            subtitle:
                '${address['recipient_name']}\n${address['line1']}, ${address['barangay']}, ${address['city']}\n${address['phone']}',
            child: Wrap(
              spacing: 8,
              children: [
                ActionButton('Edit', () async {
                  await open(context, AddressEditor(api, address: address));
                  reload();
                }, outlined: true),
                if (address['is_default'] != true)
                  ActionButton('Use as default', () async {
                    await api.request(
                      'PATCH',
                      'addresses/${address['id']}/default',
                    );
                    reload();
                  }, outlined: true),
                ActionButton('Remove', () async {
                  if (!await confirm(
                    context,
                    'Remove address?',
                    'Existing purchases retain their original delivery details. Registration addresses are protected.',
                  )) {
                    return;
                  }
                  await api.request('DELETE', 'addresses/${address['id']}');
                  reload();
                }, outlined: true),
              ],
            ),
          ),
      ],
    ),
  );
}

class AddressEditor extends StatefulWidget {
  final Api api;
  final Json? address;
  const AddressEditor(this.api, {this.address, super.key});
  @override
  State<AddressEditor> createState() => _AddressEditorState();
}

class _AddressEditorState extends State<AddressEditor> {
  late final fields = {
    for (final key in [
      'label',
      'recipient_name',
      'phone',
      'line1',
      'line2',
      'zip',
    ])
      key: TextEditingController(text: widget.address?[key]?.toString() ?? ''),
  };
  Json location = {};
  final form = GlobalKey<FormState>();
  @override
  void dispose() {
    for (final c in fields.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PageFrame(
    widget.address == null ? 'Add address' : 'Edit address',
    Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          AddressFields(widget.api, (value) => location = value),
          for (final field in fields.entries)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextFormField(
                controller: field.value,
                decoration: InputDecoration(
                  labelText: {
                    'label': 'Address label',
                    'recipient_name': 'Recipient name',
                    'phone': 'Mobile number',
                    'line1': 'House number and street',
                    'line2': 'Other address details (optional)',
                    'zip': 'Postal code',
                  }[field.key],
                ),
                validator: (v) =>
                    field.key != 'line2' && (v == null || v.isEmpty)
                    ? 'Complete this field.'
                    : null,
              ),
            ),
          ActionButton('Save address', () async {
            if (!form.currentState!.validate()) return;
            await widget.api.request(
              widget.address == null ? 'POST' : 'PUT',
              widget.address == null
                  ? 'addresses'
                  : 'addresses/${widget.address!['id']}',
              body: {
                for (final entry in fields.entries) entry.key: entry.value.text,
                ...location,
              },
            );
            if (context.mounted) Navigator.pop(context);
          }),
        ],
      ),
    ),
  );
}

class AccountPage extends StatelessWidget {
  final Session session;
  final VoidCallback toggleTheme;
  const AccountPage(this.session, this.toggleTheme, {super.key});
  @override
  Widget build(BuildContext context) {
    final api = session.api;
    return PageFrame(
      'Your account',
      ListView(
        padding: const EdgeInsets.all(16),
        children: [
          InfoCard(
            '${session.identity?['name']}',
            subtitle: '${session.identity?['email']}\n${session.role}',
          ),
          ListTile(
            leading: const Icon(Icons.person_outline),
            title: const Text('Profile and security'),
            onTap: () => open(context, ProfilePage(session)),
          ),
          if (session.role == 'buyer') ...[
            ListTile(
              leading: const Icon(Icons.rate_review_outlined),
              title: const Text('Your verified reviews'),
              onTap: () => open(
                context,
                ResourcePage(
                  api: api,
                  path: 'reviews',
                  title: 'Your reviews',
                  builder: (context, response, reload) => Column(
                    children: [
                      for (final review in rows(response['data']))
                        InfoCard(
                          'Review #${review['id']}',
                          subtitle:
                              '${review['rating']} / 5\n${review['body']}\n${review['is_visible'] == true ? 'Visible' : 'Hidden by moderation'}',
                        ),
                    ],
                  ),
                ),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.favorite_border),
              title: const Text('Saved products'),
              onTap: () => open(context, CatalogPage(api, wishlist: true)),
            ),
            ListTile(
              leading: const Icon(Icons.location_on_outlined),
              title: const Text('Delivery addresses'),
              onTap: () => open(context, AddressesPage(api)),
            ),
            ListTile(
              leading: const Icon(Icons.shopping_bag_outlined),
              title: const Text('Shopping bag'),
              onTap: () => open(context, CartPage(api)),
            ),
          ],
          if (session.role == 'seller') ...[
            ListTile(
              leading: const Icon(Icons.local_offer_outlined),
              title: const Text('Store vouchers'),
              onTap: () => open(context, VouchersPage(api)),
            ),
            ListTile(
              leading: const Icon(Icons.payments_outlined),
              title: const Text('Recorded payouts'),
              onTap: () => open(context, SettlementsPage(api)),
            ),
          ],
          ListTile(
            leading: const Icon(Icons.assignment_return_outlined),
            title: const Text('Returns and refunds'),
            onTap: () => open(context, ReturnsPage(api)),
          ),
          ListTile(
            leading: const Icon(Icons.chat_bubble_outline),
            title: const Text('Support and messages'),
            onTap: () => open(context, SupportPage(api)),
          ),
          if (session.role != 'buyer')
            ListTile(
              leading: const Icon(Icons.assessment_outlined),
              title: const Text('Reports'),
              onTap: () => open(context, ReportsPage(api, session.role)),
            ),
          SwitchListTile(
            secondary: const Icon(Icons.dark_mode_outlined),
            title: const Text('Dark mode'),
            value: Theme.of(context).brightness == Brightness.dark,
            onChanged: (_) => toggleTheme(),
          ),
          ActionButton('Sign out', () async {
            if (await confirm(
              context,
              'Sign out?',
              'This device token will be revoked. Uncertain purchases remain recoverable when you sign in again.',
            )) {
              await session.logout();
            }
          }, outlined: true),
        ],
      ),
    );
  }
}

class ProfilePage extends StatelessWidget {
  final Session session;
  const ProfilePage(this.session, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: session.api,
    path: 'settings/profile',
    title: 'Profile and security',
    builder: (context, response, reload) {
      final data = response['data'] as Json;
      final user = data['user'] as Json;
      return Column(
        children: [
          InfoCard(
            '${user['name']}',
            subtitle:
                '${user['email']}\n${data['phone'] ?? ''}\n${data['application']?['status'] ?? user['status']}',
          ),
          ActionButton(
            'Edit profile',
            () => open(
              context,
              EditPage(
                title: 'Update profile',
                fields: [
                  InputSpec('name', 'Full name', initial: '${user['name']}'),
                  InputSpec('email', 'Email', initial: '${user['email']}'),
                  InputSpec(
                    'phone',
                    'Mobile number',
                    initial: '${data['phone'] ?? ''}',
                    required: false,
                  ),
                  const InputSpec(
                    'current_password',
                    'Current password (or confirm by email)',
                    secret: true,
                    required: false,
                  ),
                ],
                submit: (fields) async {
                  final sensitive =
                      fields['email'] != user['email'] ||
                      (fields['phone'] != null &&
                          fields['phone'] != data['phone']);
                  if (sensitive && fields['current_password'] == null) {
                    if (!context.mounted) return;
                    fields['otp_token'] = await confirmProfileEmail(
                      context,
                      session,
                      '${user['email']}',
                    );
                  }
                  final result = await session.api.request(
                    'PATCH',
                    'settings/profile',
                    body: fields,
                  );
                  if (result['requires_sign_in'] == true) {
                    await session.clear();
                  } else {
                    reload();
                  }
                },
              ),
            ),
          ),
          if (session.role == 'seller')
            ActionButton(
              'Change shop name / bank details',
              () => partnerChange(context, data, user, [
                'business_name',
                'bank_account',
              ]),
            ),
          if (session.role == 'rider')
            ActionButton(
              'Change vehicle plate / bank details',
              () => partnerChange(context, data, user, [
                'plate_number',
                'bank_account',
              ]),
            ),
          ActionButton('Replace identity document', () async {
            final document = await FilePicker.pickFile(
              type: FileType.custom,
              allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
            );
            if (document?.path == null || !context.mounted) return;
            if (!await confirm(
              context,
              'Submit replacement identity?',
              'Your account will require another approval review before you can continue operations.',
            )) {
              return;
            }
            await session.api.request(
              'PATCH',
              'settings/profile',
              body: {'name': user['name'], 'email': user['email']},
              files: {'identity': document!.path!},
            );
            await session.clear();
          }, outlined: true),
          ActionButton(
            'Change password with email code',
            () => open(
              context,
              PasswordRecovery(session.api, onChanged: session.clear),
            ),
            outlined: true,
          ),
        ],
      );
    },
  );
  Future<void> partnerChange(
    BuildContext context,
    Json data,
    Json user,
    List<String> keys,
  ) => open(
    context,
    EditPage(
      title: 'Protected partner changes',
      fields: [
        for (final key in keys)
          InputSpec(
            key,
            key == 'bank_account'
                ? 'New bank details'
                : key == 'business_name'
                ? 'New shop name'
                : 'New plate number',
            required: false,
          ),
        const InputSpec(
          'current_password',
          'Current password (or confirm by email)',
          secret: true,
          required: false,
        ),
      ],
      submit: (fields) async {
        if (!await confirm(
          context,
          'Request another approval review?',
          'Important changes can suspend operations until Admin or your Logistics company approves them.',
        )) {
          return;
        }
        if (fields['current_password'] == null) {
          if (!context.mounted) return;
          fields['otp_token'] = await confirmProfileEmail(
            context,
            session,
            '${user['email']}',
          );
        }
        await session.api.request(
          'PATCH',
          'settings/profile',
          body: {'name': user['name'], 'email': user['email'], ...fields},
        );
        await session.clear();
      },
    ),
  );
}

Future<String> confirmProfileEmail(
  BuildContext context,
  Session session,
  String email,
) async {
  await session.api.request(
    'POST',
    'settings/code',
    body: {'email': email, 'purpose': 'profile'},
  );
  if (!context.mounted) {
    throw const ApiFailure(0, 'Confirmation was cancelled.');
  }
  String? token;
  await open(
    context,
    EditPage(
      title: 'Confirm registered email',
      fields: const [InputSpec('code', 'Six-digit code', number: true)],
      submit: (data) async {
        final response = await session.api.request(
          'POST',
          'settings/code/verify',
          body: {'email': email, 'purpose': 'profile', 'code': data['code']},
        );
        token = response['data']['confirmation_token'] as String;
      },
    ),
  );
  if (token == null) {
    throw const ApiFailure(
      422,
      'Confirm your email before changing protected details.',
    );
  }
  return token!;
}
