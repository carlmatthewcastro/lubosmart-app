import 'dart:io';

import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/rider_design.dart';
import 'work.dart';
import 'seller.dart' show EarningsPage;

const riderQueues = {
  'pickups': 'Pickups',
  'dispatch': 'Dispatch',
  'monitoring': 'Active deliveries',
  'exceptions': 'Exceptions',
  'cash': 'COD handovers',
  'completed': 'Completed',
  'all': 'All parcels',
};

class RiderHome extends StatefulWidget {
  final Session session;
  final VoidCallback toggleTheme;
  const RiderHome(this.session, this.toggleTheme, {super.key});
  @override
  State<RiderHome> createState() => _RiderHomeState();
}

class _RiderHomeState extends State<RiderHome> {
  int tab = 0;
  @override
  Widget build(BuildContext context) {
    final api = widget.session.api;
    final pages = [
      RiderDashboard(api, name: widget.session.identity?['name']?.toString()),
      RiderAssignments(api),
      RiderReturns(api),
      RiderQueue(api, 'completed'),
      RiderProfile(widget.session, widget.toggleTheme),
    ];
    return Scaffold(
      body: pages[tab],
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab,
        onDestinationSelected: (value) => setState(() => tab = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.local_shipping_outlined),
            label: 'Tasks',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_return_outlined),
            label: 'Returns',
          ),
          NavigationDestination(icon: Icon(Icons.history), label: 'History'),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class RiderDashboard extends StatelessWidget {
  final Api api;
  final String? name;
  const RiderDashboard(this.api, {this.name, super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: 'workspace',
    title: 'Rider dashboard',
    builder: (context, response, reload) {
      final queues = response['data']['queues'] as Map;
      final primary = Theme.of(context).colorScheme.primary;
      final onPrimary = Theme.of(context).colorScheme.onPrimary;
      Future<void> queue(String stage) async {
        await open(context, RiderQueue(api, stage));
        reload();
      }

      final greeting = name == null ? 'Rider' : name!.trim().split(' ').first;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              RiderBrand(),
              Spacer(),
              Icon(Icons.local_shipping_outlined, size: 24),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Good day,', style: TextStyle(fontSize: 16)),
                    Text(
                      '$greeting!',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Ready for your next delivery?',
                      style: TextStyle(fontSize: 13),
                    ),
                  ],
                ),
              ),
              const RiderArtwork(height: 100, portrait: true),
            ],
          ),
          const SizedBox(height: 20),
          LayoutBuilder(
            builder: (context, c) => GridView.count(
              crossAxisCount: c.maxWidth >= 600
                  ? 4
                  : (MediaQuery.textScalerOf(context).scale(16) > 22 ? 1 : 2),
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio:
                  (c.maxWidth < 340 ? 1.0 : 1.38) /
                  MediaQuery.textScalerOf(context).scale(1).clamp(1, 3),
              children: [
                for (final key in ['pickups', 'dispatch', 'monitoring', 'cash'])
                  RiderMetric(
                    riderQueues[key]!,
                    '${queues[key] ?? 'Unavailable'}',
                    onTap: () => queue(key),
                    icon: const {
                      'pickups': Icons.inventory_2_outlined,
                      'dispatch': Icons.local_shipping_outlined,
                      'monitoring': Icons.route_outlined,
                      'cash': Icons.account_balance_wallet_outlined,
                    }[key]!,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Card(
            color: primary,
            margin: EdgeInsets.zero,
            child: InkWell(
              onTap: () => queue('completed'),
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const CircleAvatar(
                      backgroundColor: Colors.white,
                      child: Icon(Icons.check, color: Color(0xff6f47b3)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Completed',
                            style: TextStyle(
                              color: onPrimary,
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                            ),
                          ),
                          Text(
                            '${queues['completed'] ?? 'Unavailable'} parcels',
                            style: TextStyle(color: onPrimary, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.inventory_2_outlined,
                      size: 40,
                      color: Color(0xffffcb88),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          ActionButton('Scan a parcel QR code', () async {
            await scanAssignment(context, api);
            reload();
          }),
          ActionButton(
            'View earnings',
            () => open(context, EarningsPage(api)),
            outlined: true,
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: TextButton.icon(
                  onPressed: () => queue('exceptions'),
                  icon: const Icon(Icons.report_outlined, size: 18),
                  label: Text(
                    'Exceptions: ${queues['exceptions'] ?? 'Unavailable'}',
                  ),
                ),
              ),
              Expanded(
                child: TextButton.icon(
                  onPressed: () => queue('all'),
                  icon: const Icon(Icons.all_inbox_outlined, size: 18),
                  label: Text('All parcels: ${queues['all'] ?? 'Unavailable'}'),
                ),
              ),
            ],
          ),
        ],
      );
    },
  );
}

class RiderMetric extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final VoidCallback onTap;
  const RiderMetric(
    this.label,
    this.value, {
    required this.onTap,
    this.icon = Icons.inventory_2_outlined,
    super.key,
  });
  @override
  Widget build(BuildContext context) => Card(
    margin: EdgeInsets.zero,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary, size: 24),
            Text(
              value,
              style: const TextStyle(
                fontSize: 25,
                fontWeight: FontWeight.w700,
                height: 1.2,
              ),
            ),
            Text(label, style: const TextStyle(fontSize: 12, height: 1.2)),
          ],
        ),
      ),
    ),
  );
}

Future<void> scanAssignment(BuildContext context, Api api) async {
  final reference = await Navigator.of(context)
      .push<String>(MaterialPageRoute(builder: (_) => const ScanPage()));
  if (reference == null) return;
  final found = rows(
    (await api.request(
      'GET',
      'deliveries?search=${Uri.encodeQueryComponent(reference.trim())}',
    ))['data'],
  ).where((item) => item['tracking_reference'] == reference.trim()).toList();
  if (found.length != 1) {
    throw const ApiFailure(
      422,
      'This QR code does not match a parcel assigned to you.',
    );
  }
  if (context.mounted) {
    await open(
      context,
      DeliveryPage(
        api,
        found.single['id'] as int,
        scannedReference: reference.trim(),
      ),
    );
  }
}

class RiderAssignments extends StatefulWidget {
  final Api api;
  const RiderAssignments(this.api, {super.key});
  @override
  State<RiderAssignments> createState() => _RiderAssignmentsState();
}

class _RiderAssignmentsState extends State<RiderAssignments> {
  final search = TextEditingController();
  String stage = 'all', query = '';
  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  void applySearch() => setState(() => query = search.text.trim());
  @override
  Widget build(BuildContext context) => ResourcePage(
    key: ValueKey('$stage:$query'),
    api: widget.api,
    path:
        'deliveries?stage=$stage${query.isEmpty ? '' : '&search=${Uri.encodeQueryComponent(query)}'}',
    title: 'Your assignments',
    actions: [
      IconButton(
        tooltip: 'Scan a parcel QR code',
        icon: const Icon(Icons.qr_code_scanner),
        onPressed: () async {
          try {
            await scanAssignment(context, widget.api);
          } catch (error) {
            if (context.mounted) feedback(context, error);
          }
        },
      ),
    ],
    builder: (context, response, reload) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: search,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => applySearch(),
          decoration: InputDecoration(
            hintText: 'Search tracking reference',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: IconButton(
              tooltip: 'Search assignments',
              icon: const Icon(Icons.arrow_forward),
              onPressed: applySearch,
            ),
          ),
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final entry in [
                MapEntry('all', riderQueues['all']!),
                ...riderQueues.entries.where((entry) => entry.key != 'all'),
              ])
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(
                      entry.key == 'all'
                          ? 'All'
                          : entry.key == 'monitoring'
                          ? 'Active'
                          : entry.value,
                    ),
                    selected: stage == entry.key,
                    onSelected: (_) => setState(() => stage = entry.key),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (rows(response['data']).isEmpty)
          const InfoCard(
            'No matching assignments',
            subtitle: 'Refresh or select another queue.',
          ),
        for (final item in rows(response['data']))
          RiderParcelCard(
            item,
            onOpen: () async {
              await open(context, DeliveryPage(widget.api, item['id'] as int));
              reload();
            },
          ),
      ],
    ),
  );
}

class RiderQueue extends StatelessWidget {
  final Api api;
  final String stage;
  const RiderQueue(this.api, this.stage, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: 'deliveries?stage=$stage',
    title: stage == 'completed' ? 'Completed deliveries' : riderQueues[stage]!,
    builder: (context, response, reload) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (rows(response['data']).isEmpty)
          const InfoCard(
            'No parcels in this queue',
            subtitle: 'Pull down to refresh.',
          ),
        for (final item in rows(response['data']))
          RiderParcelCard(
            item,
            onOpen: () async {
              await open(context, DeliveryPage(api, item['id'] as int));
              reload();
            },
          ),
      ],
    ),
  );
}

class RiderProfile extends StatelessWidget {
  final Session session;
  final VoidCallback toggleTheme;
  const RiderProfile(this.session, this.toggleTheme, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: session.api,
    path: 'settings/profile',
    title: 'Rider profile',
    builder: (context, response, reload) {
      final data = response['data'] as Map;
      final user = data['user'] as Map;
      final fullName = '${user['name']}';
      final names = fullName
          .trim()
          .split(RegExp(r'\s+'))
          .where((s) => s.isNotEmpty)
          .toList();
      final initials = names.take(2).map((s) => s[0]).join();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                child: Text(
                  initials.isEmpty ? 'R' : initials,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      fullName,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    RiderStatus('${user['status']}'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          RiderPanel(
            child: Column(
              children: [
                RiderLine(Icons.mail_outline, '${user['email']}'),
                RiderLine(
                  Icons.phone_outlined,
                  '${data['phone'] ?? 'Not provided'}',
                ),
                RiderLine(
                  Icons.badge_outlined,
                  'Capability: ${user['rider_capability'] ?? 'See Logistics'}',
                ),
              ],
            ),
          ),
          if (data['vehicle'] != null)
            RiderPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Vehicle information',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  RiderLine(
                    Icons.two_wheeler_outlined,
                    '${data['vehicle']['vehicle_type']}',
                  ),
                  RiderLine(
                    Icons.pin_outlined,
                    '${data['vehicle']['plate_number']}',
                  ),
                ],
              ),
            ),
          RiderPanel(
            padding: EdgeInsets.zero,
            child: ListTile(
              leading: const Icon(Icons.payments_outlined),
              title: const Text(
                'Compensation & payment history',
                style: TextStyle(fontSize: 13),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => open(context, EarningsPage(session.api)),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'App settings',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          RiderPanel(
            padding: EdgeInsets.zero,
            child: SwitchListTile(
              secondary: const Icon(Icons.dark_mode_outlined),
              title: const Text('Dark mode'),
              value: Theme.of(context).brightness == Brightness.dark,
              onChanged: (_) => toggleTheme(),
            ),
          ),
          Theme(
            data: Theme.of(context).copyWith(
              outlinedButtonTheme: OutlinedButtonThemeData(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Theme.of(context).colorScheme.error,
                  side: BorderSide(color: Theme.of(context).colorScheme.error),
                  minimumSize: const Size(44, 48),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
            child: ActionButton('Sign out', () async {
              if (await confirm(
                context,
                'Sign out of LubosMart Rider?',
                'This will revoke the session on this device.',
              )) {
                await session.logout();
              }
            }, outlined: true),
          ),
        ],
      );
    },
  );
}

class RiderReturns extends StatefulWidget {
  final Api api;
  const RiderReturns(this.api, {super.key});
  @override
  State<RiderReturns> createState() => _RiderReturnsState();
}

class _RiderReturnsState extends State<RiderReturns> {
  bool actionable = false;
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: widget.api,
    path: 'returns',
    title: 'Return assignments',
    builder: (context, response, reload) {
      final items = rows(response['data'])
          .where(
            (item) =>
                !actionable ||
                (item['allowed_actions'] as List? ?? []).isNotEmpty,
          )
          .toList();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              ChoiceChip(
                label: const Text('All returns'),
                selected: !actionable,
                onSelected: (_) => setState(() => actionable = false),
              ),
              const SizedBox(width: 8),
              ChoiceChip(
                label: const Text('Action required'),
                selected: actionable,
                onSelected: (_) => setState(() => actionable = true),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (items.isEmpty)
            const InfoCard(
              'No return assignments',
              subtitle: 'Assigned return work will appear here. Pull down to refresh.',
            ),
          for (final item in items)
            RiderPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const CircleAvatar(
                        backgroundColor: Color(0xfffff0d9),
                        child: Icon(
                          Icons.assignment_return_outlined,
                          color: Color(0xffaa5c18),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              shortReference(
                                item['task']?['reference'] ??
                                    'Return #${item['id']}',
                              ),
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 6),
                            RiderStatus(
                              '${item['task']?['status'] ?? item['status']}',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  RiderLine(
                    Icons.inventory_2_outlined,
                    'Original parcel: ${shortReference(item['seller_order']?['delivery']?['tracking_reference'] ?? item['seller_order_id'])}',
                  ),
                  RiderLine(
                    Icons.location_on_outlined,
                    'Collect from: ${addressText(item['task']?['buyer_address'])}',
                  ),
                  RiderLine(
                    Icons.storefront_outlined,
                    'Return to: ${addressText(item['task']?['seller_address'])}',
                  ),
                  const SizedBox(height: 12),
                  for (final action in List<String>.from(
                    item['allowed_actions'] as List? ?? [],
                  ))
                    if ([
                      'collect',
                      'accept_seller_dispatch',
                      'deliver_seller',
                      'discrepancy',
                    ].contains(action))
                      ActionButton(returnLabel(action), () async {
                        await open(
                          context,
                          RiderReturnAction(widget.api, item, action),
                        );
                        reload();
                      }),
                  ActionButton('View details', () async {
                    await open(context, RiderReturnDetails(widget.api, item));
                    reload();
                  }, outlined: true),
                ],
              ),
            ),
        ],
      );
    },
  );
}

class RiderReturnDetails extends StatelessWidget {
  final Api api;
  final Json item;
  const RiderReturnDetails(this.api, this.item, {super.key});
  @override
  Widget build(BuildContext context) => PageFrame(
    'Return details',
    ListView(
      padding: const EdgeInsets.all(16),
      children: [
        RiderPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SelectableText(
                '${item['task']?['reference'] ?? 'Return #${item['id']}'}',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 17,
                ),
              ),
              const SizedBox(height: 8),
              RiderStatus('${item['task']?['status'] ?? item['status']}'),
              const SizedBox(height: 12),
              RiderLine(
                Icons.inventory_2_outlined,
                'Original parcel: ${item['seller_order']?['delivery']?['tracking_reference'] ?? item['seller_order_id']}',
              ),
              RiderLine(Icons.notes_outlined, '${item['reason'] ?? ''}'),
              RiderLine(
                Icons.location_on_outlined,
                'Collect from: ${addressText(item['task']?['buyer_address'])}',
              ),
              RiderLine(
                Icons.storefront_outlined,
                'Return to: ${addressText(item['task']?['seller_address'])}',
              ),
            ],
          ),
        ),
        for (final action in List<String>.from(
          item['allowed_actions'] as List? ?? [],
        ))
          if ([
            'collect',
            'accept_seller_dispatch',
            'deliver_seller',
            'discrepancy',
          ].contains(action))
            ActionButton(returnLabel(action), () async {
              await open(context, RiderReturnAction(api, item, action));
              if (context.mounted) Navigator.pop(context);
            }),
        const SizedBox(height: 12),
        const Text(
          'Return history',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 12),
        for (final event in rows(item['events']))
          RiderPanel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  readable('${event['action']}'),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  localEventTime(event['created_at']),
                  style: const TextStyle(fontSize: 12),
                ),
                if (event['notes'] != null) Text('${event['notes']}'),
              ],
            ),
          ),
        for (final proof in rows(item['task']?['proofs']))
          ActionButton(
            'View ${readable('${proof['leg']}')} proof',
            () => privateFile(
              context,
              api,
              'returns/${item['id']}/proof/${proof['id']}',
            ),
            outlined: true,
          ),
      ],
    ),
  );
}

String returnLabel(String action) =>
    const {
      'collect': 'Confirm return collection',
      'accept_seller_dispatch': 'Accept return dispatch',
      'deliver_seller': 'Deliver return to seller',
      'discrepancy': 'Report return discrepancy',
    }[action] ??
    readable(action);

class RiderReturnAction extends StatefulWidget {
  final Api api;
  final Json item;
  final String action;
  const RiderReturnAction(this.api, this.item, this.action, {super.key});
  @override
  State<RiderReturnAction> createState() => _RiderReturnActionState();
}

class _RiderReturnActionState extends State<RiderReturnAction> {
  final reason = TextEditingController(), recipient = TextEditingController();
  String? photo;
  bool uncertain = false;
  @override
  void dispose() {
    reason.dispose();
    recipient.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final needsProof = ['collect', 'deliver_seller'].contains(widget.action);
    return PageFrame(
      returnLabel(widget.action),
      ListView(
        padding: const EdgeInsets.all(16),
        children: [
          InfoCard(
            'Return #${widget.item['id']}',
            subtitle:
                'Parcel #${widget.item['seller_order_id']} · ${widget.item['seller_order']?['delivery']?['tracking_reference'] ?? ''}',
          ),
          TextField(
            controller: reason,
            maxLength: 500,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Physical handover notes (3–500 characters)',
            ),
          ),
          if (needsProof) ...[
            TextField(
              controller: recipient,
              maxLength: 150,
              decoration: const InputDecoration(
                labelText: 'Person handing over / receiving the parcel',
              ),
            ),
            ActionButton(
              photo == null
                  ? 'Capture handover proof'
                  : 'Retake handover photo',
              () async {
                final image = await captureRiderProof();
                if (image == null) return;
                if (mounted) setState(() => photo = image);
              },
              outlined: true,
            ),
            if (photo != null)
              Image.file(
                File(photo!),
                height: 220,
                semanticLabel: 'Captured return handover proof',
              ),
          ],
          UploadStatus(widget.api),
          if (uncertain)
            const InfoCard(
              'Check the return status before retrying',
              subtitle: 'The response was interrupted. Go back and refresh assignments to confirm whether the handover was recorded. Return handovers are not automatically replayed.',
            ),
          ActionButton(
            'Confirm ${returnLabel(widget.action).toLowerCase()}',
            () async {
              if (reason.text.trim().length < 3 ||
                  (needsProof &&
                      (photo == null || recipient.text.trim().isEmpty))) {
                throw const ApiFailure(
                  422,
                  'Enter handover notes, recipient name and a fresh proof photo where required.',
                );
              }
              if (!await confirm(
                context,
                returnLabel(widget.action),
                'Confirm you have physically checked this parcel and completed the handover.',
              )) {
                return;
              }
              if (!context.mounted) return;
              try {
                await widget.api.request(
                  'PATCH',
                  'returns/${widget.item['id']}',
                  body: {
                    'action': widget.action,
                    'reason': reason.text.trim(),
                    if (needsProof) 'recipient_name': recipient.text.trim(),
                  },
                  files: needsProof ? {'proof': photo!} : {},
                );
              } on ApiFailure catch (error) {
                if (mounted && (error.status == 0 || error.status >= 500)) {
                  setState(() => uncertain = true);
                }
                rethrow;
              }
              if (context.mounted) {
                feedback(context, 'Return handover recorded.');
                Navigator.pop(context);
              }
            },
            enabled: !uncertain,
          ),
        ],
      ),
    );
  }
}
