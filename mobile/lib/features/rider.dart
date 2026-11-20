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
      bottomNavigationBar: MediaQuery.viewInsetsOf(context).bottom > 0
          ? null
          : RiderBottomNavigation(
              selectedIndex: tab,
              onDestinationSelected: (value) => setState(() => tab = value),
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
      final colors = Theme.of(context).colorScheme;
      final darkMode = Theme.of(context).brightness == Brightness.dark;
      final completionColor = darkMode
          ? const Color(0xff57328a)
          : colors.primary;
      Future<void> queue(String stage) async {
        await open(context, RiderQueue(api, stage));
        reload();
      }

      final riderName = (name ?? '').trim();
      final greeting = riderName.isEmpty
          ? 'Rider'
          : riderName.split(RegExp(r'\s+')).first;
      const metrics = [
        (
          key: 'pickups',
          label: 'Pickups',
          icon: Icons.inventory_2_outlined,
          background: Color(0xfff1eafd),
          foreground: Color(0xff6941a5),
        ),
        (
          key: 'dispatch',
          label: 'Dispatch',
          icon: Icons.local_shipping_outlined,
          background: Color(0xffe7f2ff),
          foreground: Color(0xff2870a8),
        ),
        (
          key: 'monitoring',
          label: 'Active deliveries',
          icon: Icons.route_outlined,
          background: Color(0xffe7f8ec),
          foreground: Color(0xff198754),
        ),
        (
          key: 'cash',
          label: 'COD handovers',
          icon: Icons.account_balance_wallet_outlined,
          background: Color(0xfffff0e2),
          foreground: Color(0xffb56519),
        ),
      ];

      return LayoutBuilder(
        builder: (context, constraints) {
          final artworkSize = (constraints.maxWidth * .4)
              .clamp(112.0, 164.0)
              .toDouble();
          final largeText = MediaQuery.textScalerOf(context).scale(1) > 1.3;
          final columns = largeText ? 1 : 2;
          final spacing = 12.0;
          final tileWidth =
              (constraints.maxWidth - spacing * (columns - 1)) / columns;
          final tileHeight = largeText
              ? 112.0
              : (constraints.maxWidth < 320 ? 100.0 : 96.0);

          return TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: MediaQuery.of(context).disableAnimations
                ? Duration.zero
                : const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            builder: (context, progress, child) => Opacity(
              opacity: progress,
              child: Transform.translate(
                offset: Offset(0, 8 * (1 - progress)),
                child: child,
              ),
            ),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 680),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Row(
                      children: [
                        RiderBrand(),
                        Spacer(),
                        RiderIcon(Icons.local_shipping_outlined, size: 24),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Good day,',
                                style: TextStyle(fontSize: 16),
                              ),
                              Text(
                                '$greeting!',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.w700,
                                  height: 1.12,
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Ready for your next delivery?',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        RiderArtwork(height: artworkSize, portrait: true),
                      ],
                    ),
                    const SizedBox(height: 12),
                    GridView.count(
                      crossAxisCount: columns,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: spacing,
                      mainAxisSpacing: spacing,
                      childAspectRatio: tileWidth / tileHeight,
                      children: [
                        for (final metric in metrics)
                          RiderMetric(
                            metric.label,
                            '${queues[metric.key] ?? 'Unavailable'}',
                            onTap: () => queue(metric.key),
                            icon: metric.icon,
                            iconBackground: metric.background,
                            iconColor: metric.foreground,
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Card(
                      margin: EdgeInsets.zero,
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () => queue('completed'),
                        borderRadius: BorderRadius.circular(16),
                        child: Ink(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            gradient: LinearGradient(
                              begin: Alignment.centerLeft,
                              end: Alignment.centerRight,
                              colors: [
                                completionColor,
                                Color.lerp(
                                  completionColor,
                                  const Color(0xff4c2382),
                                  .38,
                                )!,
                              ],
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 14,
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 25,
                                  backgroundColor: Colors.white,
                                  child: RiderIcon(
                                    Icons.check,
                                    color: const Color(0xff6941a5),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Completed',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w600,
                                          fontSize: 17,
                                        ),
                                      ),
                                      Text(
                                        '${queues['completed'] ?? 'Unavailable'} parcels',
                                        style: TextStyle(
                                          color: Colors.white.withValues(
                                            alpha: .9,
                                          ),
                                          fontSize: 13,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const RiderIcon(
                                  Icons.inventory_2_outlined,
                                  size: 40,
                                  color: Color(0xffffd08f),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ActionButton(
                        'Scan QR',
                        () async {
                          await scanAssignment(context, api);
                          reload();
                        },
                        leading: RiderIcon(
                          Icons.qr_code_scanner,
                          size: 23,
                          color: colors.onPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: _RiderQuickAction(
                            label: 'Earnings',
                            icon: Icons.payments_outlined,
                            onTap: () => open(context, EarningsPage(api)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _RiderQuickAction(
                            label: 'All Parcels',
                            icon: Icons.inventory_2_outlined,
                            value: '${queues['all'] ?? 'Unavailable'}',
                            onTap: () => queue('all'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _RiderQuickAction(
                            label: 'Exceptions',
                            icon: Icons.report_outlined,
                            value: '${queues['exceptions'] ?? 'Unavailable'}',
                            onTap: () => queue('exceptions'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
          );
        },
      );
    },
  );
}

class RiderMetric extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final VoidCallback onTap;
  final Color iconBackground, iconColor;

  const RiderMetric(
    this.label,
    this.value, {
    required this.onTap,
    required this.iconBackground,
    required this.iconColor,
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
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: iconBackground,
                borderRadius: BorderRadius.circular(13),
              ),
              alignment: Alignment.center,
              child: RiderIcon(icon, size: 24, color: iconColor),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      height: 1.15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 180),
                    child: Text(
                      value,
                      key: ValueKey(value),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 22,
                        height: 1.05,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 2),
            RiderIcon(
              Icons.chevron_right,
              size: 18,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    ),
  );
}

class _RiderQuickAction extends StatelessWidget {
  final String label;
  final IconData icon;
  final String? value;
  final VoidCallback onTap;

  const _RiderQuickAction({
    required this.label,
    required this.icon,
    required this.onTap,
    this.value,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final surface = Theme.of(context).brightness == Brightness.dark
        ? colors.primary.withValues(alpha: .16)
        : const Color(0xfff2edf9);
    return Card(
      color: surface,
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(15),
        child: SizedBox(
          height: 106,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 9),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                RiderIcon(icon, size: 26, color: colors.primary),
                const SizedBox(height: 5),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (value != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    value!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      color: colors.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
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
        riderPresentation: true,
        pageTitle: riderDetailTitle(found.single),
      ),
    );
  }
}

String riderDetailTitle(Json item) {
  final status = '${item['fulfillment_status'] ?? item['status']}';
  if (['assigned', 'picked_up'].contains(status)) return 'Pickup details';
  if (status == 'in_transit') return 'Dispatch details';
  if (['out_for_delivery', 'delivered'].contains(status)) {
    return 'Delivery details';
  }
  return 'Parcel details';
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
    showAppBar: false,
    builder: (context, response, reload) {
      final colors = Theme.of(context).colorScheme;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const RiderBrand(),
              const Spacer(),
              IconButton(
                tooltip: 'Scan a parcel QR code',
                icon: const RiderIcon(Icons.qr_code_scanner),
                onPressed: () async {
                  try {
                    await scanAssignment(context, widget.api);
                  } catch (error) {
                    if (context.mounted) feedback(context, error);
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'Your Assignments',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
          ),
          Text(
            'Manage your pickups, dispatch, and active deliveries.',
            style: TextStyle(color: colors.onSurfaceVariant, fontSize: 14),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: search,
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => applySearch(),
            decoration: InputDecoration(
              hintText: 'Search tracking reference...',
              filled: true,
              fillColor: colors.surface,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 16,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: colors.outlineVariant),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: colors.outlineVariant),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: colors.primary, width: 1.5),
              ),
              prefixIcon: const RiderIcon(Icons.search, size: 22),
              suffixIcon: IconButton(
                tooltip: 'Search assignments',
                icon: const RiderIcon(Icons.arrow_forward, size: 20),
                onPressed: applySearch,
              ),
            ),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final entry in const [
                  MapEntry('all', 'All'),
                  MapEntry('pickups', 'Pickups'),
                  MapEntry('dispatch', 'Dispatch'),
                  MapEntry('monitoring', 'Active'),
                ])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (entry.key != 'all') ...[
                            ExcludeSemantics(
                              child: Icon(
                                _assignmentFilterIcon(entry.key),
                                size: 20,
                                color: stage == entry.key
                                    ? colors.onPrimary
                                    : colors.primary,
                              ),
                            ),
                            const SizedBox(width: 6),
                          ],
                          Text(entry.value),
                        ],
                      ),
                      selected: stage == entry.key,
                      showCheckmark: false,
                      selectedColor: colors.primary,
                      backgroundColor: colors.surface,
                      side: BorderSide(
                        color: stage == entry.key
                            ? colors.primary
                            : colors.outlineVariant,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      labelStyle: TextStyle(
                        color: stage == entry.key
                            ? colors.onPrimary
                            : colors.onSurface,
                        fontWeight: FontWeight.w500,
                      ),
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
                await open(
                  context,
                  DeliveryPage(
                    widget.api,
                    item['id'] as int,
                    riderPresentation: true,
                    pageTitle: riderDetailTitle(item),
                  ),
                );
                reload();
              },
            ),
        ],
      );
    },
  );
}

IconData _assignmentFilterIcon(String stage) => const {
  'pickups': Icons.inventory_2_outlined,
  'dispatch': Icons.local_shipping_outlined,
  'monitoring': Icons.route_outlined,
}[stage]!;

class RiderQueue extends StatefulWidget {
  final Api api;
  final String stage;
  const RiderQueue(this.api, this.stage, {super.key});

  @override
  State<RiderQueue> createState() => _RiderQueueState();
}

class _RiderQueueState extends State<RiderQueue> {
  final search = TextEditingController();
  String query = '';

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ResourcePage(
    key: ValueKey('${widget.stage}:$query'),
    api: widget.api,
    path:
        'deliveries?stage=${widget.stage}${query.isEmpty ? '' : '&search=${Uri.encodeQueryComponent(query)}'}',
    title: widget.stage == 'completed'
        ? 'Completed deliveries'
        : riderQueues[widget.stage]!,
    builder: (context, response, reload) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: search,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => setState(() => query = search.text.trim()),
          decoration: InputDecoration(
            hintText: 'Search tracking reference',
            prefixIcon: const RiderIcon(Icons.search),
            suffixIcon: IconButton(
              tooltip: 'Search parcels',
              icon: const RiderIcon(Icons.arrow_forward),
              onPressed: () => setState(() => query = search.text.trim()),
            ),
          ),
        ),
        if (widget.stage == 'cash')
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: RiderLine(
              Icons.account_balance_wallet_outlined,
              'COD collected by you and awaiting Logistics handover.',
            ),
          ),
        const SizedBox(height: 12),
        if (rows(response['data']).isEmpty)
          const InfoCard(
            'No parcels in this queue',
            subtitle: 'Pull down to refresh.',
          ),
        for (final item in rows(response['data']))
          RiderParcelCard(
            item,
            onOpen: () async {
              await open(
                context,
                DeliveryPage(
                  widget.api,
                  item['id'] as int,
                  riderPresentation: true,
                  pageTitle: riderDetailTitle(item),
                ),
              );
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
    showAppBar: false,
    builder: (context, response, reload) {
      final data = response['data'] as Map;
      final user = data['user'] as Map;
      final vehicle = data['vehicle'] as Map?;
      final colors = Theme.of(context).colorScheme;
      final darkMode = Theme.of(context).brightness == Brightness.dark;
      final fullName = '${user['name']}';
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const RiderBrand(),
          const SizedBox(height: 12),
          const Text(
            'Rider profile',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
          ),
          Text(
            'View and manage your rider information.',
            style: TextStyle(color: colors.onSurfaceVariant, fontSize: 13),
          ),
          const SizedBox(height: 16),
          Card(
            color: darkMode ? const Color(0xff282330) : const Color(0xfff2edf9),
            clipBehavior: Clip.antiAlias,
            margin: const EdgeInsets.only(bottom: 12),
            child: Stack(
              children: [
                Positioned(
                  top: -36,
                  right: -24,
                  child: Container(
                    width: 116,
                    height: 116,
                    decoration: BoxDecoration(
                      color: colors.primary.withValues(alpha: .08),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Positioned(
                  bottom: -62,
                  left: 58,
                  child: Container(
                    width: 132,
                    height: 132,
                    decoration: BoxDecoration(
                      color: colors.primary.withValues(alpha: .05),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      RiderArtwork(height: 78, portrait: true),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              fullName,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 19,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 8),
                            RiderStatus('${user['status']}'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Text(
            'Personal information',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          RiderPanel(
            child: Column(
              children: [
                RiderLine(
                  Icons.mail_outline,
                  '${user['email'] ?? 'Not provided'}',
                ),
                const Divider(height: 16),
                RiderLine(
                  Icons.phone_outlined,
                  '${data['phone'] ?? 'Not provided'}',
                ),
                const Divider(height: 16),
                RiderLine(
                  Icons.badge_outlined,
                  'Capability: ${riderDisplayValue('${user['rider_capability'] ?? 'See Logistics'}')}',
                ),
              ],
            ),
          ),
          if (vehicle != null)
            RiderPanel(
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Vehicle information',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        RiderLine(
                          Icons.two_wheeler_outlined,
                          riderDisplayValue(
                            '${vehicle['vehicle_type'] ?? 'Not provided'}',
                          ),
                        ),
                        RiderLine(
                          Icons.pin_outlined,
                          '${vehicle['plate_number'] ?? 'Not provided'}',
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 60,
                    height: 60,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: colors.primary.withValues(
                        alpha: darkMode ? .14 : .08,
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: RiderIcon(
                      Icons.two_wheeler_outlined,
                      size: 36,
                      color: colors.primary,
                    ),
                  ),
                ],
              ),
            ),
          RiderPanel(
            padding: EdgeInsets.zero,
            child: ListTile(
              leading: const RiderIcon(Icons.payments_outlined),
              title: const Text(
                'Compensation & Payment History',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
              ),
              trailing: const RiderIcon(Icons.chevron_right),
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
              secondary: const RiderIcon(Icons.dark_mode_outlined),
              title: const Text('Dark mode'),
              dense: true,
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
            child: ActionButton(
              'Sign out',
              () async {
                if (await confirm(
                  context,
                  'Sign out of LubosMart Rider?',
                  'This will revoke the session on this device.',
                )) {
                  await session.logout();
                }
              },
              outlined: true,
              leading: Icon(
                Icons.logout,
                size: 20,
                color: Theme.of(context).colorScheme.error,
              ),
            ),
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
  final search = TextEditingController();
  String query = '';
  bool completed = false;

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ResourcePage(
    api: widget.api,
    path: 'returns',
    title: 'Return assignments',
    builder: (context, response, reload) {
      final allItems = rows(response['data']);
      final items = allItems.where((item) {
        final hasActions = (item['allowed_actions'] as List? ?? []).isNotEmpty;
        if (hasActions == completed) return false;
        if (query.isEmpty) return true;
        final text = [
          item['task']?['reference'],
          item['seller_order']?['delivery']?['tracking_reference'],
          item['task']?['status'],
          item['reason'],
        ].join(' ').toLowerCase();
        return text.contains(query.toLowerCase());
      }).toList();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            textInputAction: TextInputAction.search,
            decoration: const InputDecoration(
              hintText: 'Search return reference',
              prefixIcon: RiderIcon(Icons.search),
            ),
            onChanged: (value) => setState(() => query = value.trim()),
          ),
          const SizedBox(height: 12),
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: false, label: Text('Active')),
              ButtonSegment(value: true, label: Text('Completed')),
            ],
            selected: {completed},
            onSelectionChanged: (selection) =>
                setState(() => completed = selection.first),
          ),
          const SizedBox(height: 16),
          if (items.isEmpty)
            const InfoCard(
              'No return assignments in this view',
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
                        child: RiderIcon(
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
                  riderDateTime(event['created_at']),
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
