import 'package:flutter/material.dart';

import '../core/api.dart';
import 'common.dart';

class RiderBrand extends StatelessWidget {
  final bool large;
  const RiderBrand({this.large = false, super.key});
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Image.asset(
        'assets/brand.png',
        width: large ? 72 : 48,
        height: large ? 72 : 48,
      ),
      const SizedBox(width: 6),
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'LubosMart',
            style: TextStyle(
              fontSize: large ? 26 : 20,
              fontWeight: FontWeight.w700,
              height: 1.1,
            ),
          ),
          Text(
            'Rider',
            style: TextStyle(
              fontSize: large ? 20 : 14,
              fontWeight: FontWeight.w600,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
        ],
      ),
    ],
  );
}

class RiderAuthTheme extends StatelessWidget {
  final Widget child;

  const RiderAuthTheme({required this.child, super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final borderRadius = BorderRadius.circular(14);

    OutlineInputBorder border(Color color, {double width = 1}) =>
        OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide(color: color, width: width),
        );

    return Theme(
      data: theme.copyWith(
        inputDecorationTheme: theme.inputDecorationTheme.copyWith(
          filled: true,
          fillColor: colors.surface,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 16,
          ),
          border: border(colors.outlineVariant),
          enabledBorder: border(colors.primary.withValues(alpha: .26)),
          focusedBorder: border(colors.primary, width: 1.5),
          errorBorder: border(colors.error),
          focusedErrorBorder: border(colors.error, width: 1.5),
          disabledBorder: border(colors.outlineVariant.withValues(alpha: .55)),
          prefixIconColor: colors.primary,
          suffixIconColor: colors.primary,
          prefixIconConstraints: const BoxConstraints(
            minWidth: 52,
            minHeight: 52,
          ),
        ),
      ),
      child: child,
    );
  }
}

class RiderBottomNavigation extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;

  const RiderBottomNavigation({
    required this.selectedIndex,
    required this.onDestinationSelected,
    super.key,
  });

  static const destinations = [
    ('Home', Icons.home_outlined),
    ('Tasks', Icons.local_shipping_outlined),
    ('Returns', Icons.assignment_return_outlined),
    ('History', Icons.history),
    ('Profile', Icons.person_outline),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 6, 14, 6),
        child: Material(
          color: theme.colorScheme.surface,
          elevation: 4,
          shadowColor: Colors.black.withValues(alpha: dark ? .24 : .12),
          borderRadius: BorderRadius.circular(22),
          child: Container(
            height: 68,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(22),
              border: Border.all(
                color: theme.colorScheme.outlineVariant.withValues(alpha: .55),
              ),
            ),
            child: Row(
              children: [
                for (var index = 0; index < destinations.length; index++)
                  _RiderNavigationItem(
                    label: destinations[index].$1,
                    icon: destinations[index].$2,
                    selected: selectedIndex == index,
                    onTap: () => onDestinationSelected(index),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RiderNavigationItem extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _RiderNavigationItem({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final color = selected ? colors.primary : colors.onSurfaceVariant;
    return Expanded(
      child: Semantics(
        label: label,
        button: true,
        selected: selected,
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOutCubic,
          margin: EdgeInsets.symmetric(
            horizontal: selected ? 2 : 7,
            vertical: 4,
          ),
          decoration: BoxDecoration(
            color: selected
                ? colors.primary.withValues(alpha: .12)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(17),
          ),
          child: ExcludeSemantics(
            child: Material(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(17),
              child: InkWell(
                onTap: onTap,
                borderRadius: BorderRadius.circular(17),
                child: SizedBox(
                  height: 60,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      AnimatedScale(
                        scale: selected ? 1.04 : 1,
                        duration: const Duration(milliseconds: 180),
                        curve: Curves.easeOutCubic,
                        child: RiderIcon(icon, size: 23, color: color),
                      ),
                      const SizedBox(height: 2),
                      AnimatedDefaultTextStyle(
                        duration: const Duration(milliseconds: 180),
                        curve: Curves.easeOutCubic,
                        style: TextStyle(
                          color: color,
                          fontSize: 11,
                          fontWeight: selected
                              ? FontWeight.w600
                              : FontWeight.w500,
                        ),
                        child: Text(label, maxLines: 1),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class RiderArtwork extends StatelessWidget {
  final double height;
  final bool portrait;
  const RiderArtwork({this.height = 180, this.portrait = false, super.key});
  @override
  Widget build(BuildContext context) {
    final image = Image.asset(
      portrait
          ? 'assets/illustrations/rider_avatar.png'
          : 'assets/illustrations/delivery_rider.png',
      fit: portrait ? BoxFit.cover : BoxFit.contain,
    );
    return Semantics(
      label: portrait
          ? 'Rider avatar illustration'
          : 'Delivery rider illustration',
      image: true,
      child: SizedBox(
        height: height,
        width: portrait ? height : double.infinity,
        child: portrait
            ? Container(
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: const Color(0xfff7f1ff),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xffff8b24), width: 2),
                ),
                child: ClipOval(
                  child: Transform.scale(scale: 1.14, child: image),
                ),
              )
            : image,
      ),
    );
  }
}

class RiderIcon extends StatelessWidget {
  final IconData icon;
  final double size;
  final Color? color;

  const RiderIcon(this.icon, {this.size = 24, this.color, super.key});

  static final _assets = <int, String>{
    Icons.home_outlined.codePoint: 'home',
    Icons.local_shipping_outlined.codePoint: 'tasks-truck',
    Icons.assignment_return_outlined.codePoint: 'returns',
    Icons.history.codePoint: 'history',
    Icons.person_outline.codePoint: 'profile',
    Icons.inventory_2_outlined.codePoint: 'package',
    Icons.storefront_outlined.codePoint: 'store',
    Icons.location_on_outlined.codePoint: 'map-pin',
    Icons.event_available_outlined.codePoint: 'calendar',
    Icons.mail_outline.codePoint: 'email',
    Icons.lock_outline.codePoint: 'lock',
    Icons.visibility_off.codePoint: 'eye-off',
    Icons.visibility.codePoint: 'eye',
    Icons.phone_outlined.codePoint: 'phone',
    Icons.badge_outlined.codePoint: 'plate-id',
    Icons.two_wheeler_outlined.codePoint: 'motorcycle',
    Icons.pin_outlined.codePoint: 'plate-id',
    Icons.payments_outlined.codePoint: 'wallet-history',
    Icons.chevron_right.codePoint: 'chevron-right',
    Icons.dark_mode_outlined.codePoint: 'moon',
    Icons.qr_code_scanner.codePoint: 'scan-qr',
    Icons.search.codePoint: 'search',
    Icons.arrow_forward.codePoint: 'arrow-right',
    Icons.report_outlined.codePoint: 'info',
    Icons.all_inbox_outlined.codePoint: 'list-check',
    Icons.check.codePoint: 'check',
    Icons.account_balance_wallet_outlined.codePoint: 'cod-wallet',
    Icons.route_outlined.codePoint: 'route',
  };

  @override
  Widget build(BuildContext context) {
    final asset = _assets[icon.codePoint];
    if (asset == null) {
      return Icon(
        icon,
        size: size,
        color: color ?? Theme.of(context).colorScheme.primary,
      );
    }
    return Image.asset(
      'assets/icons/$asset.png',
      width: size,
      height: size,
      color: color ?? Theme.of(context).colorScheme.primary,
      colorBlendMode: BlendMode.srcIn,
      excludeFromSemantics: true,
    );
  }
}

class RiderStatus extends StatelessWidget {
  final String status;
  final IconData? icon;
  const RiderStatus(this.status, {this.icon, super.key});
  @override
  Widget build(BuildContext context) {
    final color = riderStatusColor(context, status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: icon == null
          ? Text(
              riderStatusLabel(status),
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            )
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                ExcludeSemantics(child: Icon(icon, size: 16, color: color)),
                const SizedBox(width: 6),
                Text(
                  riderStatusLabel(status),
                  style: TextStyle(
                    color: color,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
    );
  }
}

Color riderStatusColor(BuildContext context, String status) {
  final success = [
    'delivered',
    'completed',
    'approved',
    'received',
  ].contains(status);
  final failure =
      status.contains('fail') ||
      status.contains('exception') ||
      status.contains('reject');
  final active = [
    'assigned',
    'in_transit',
    'out_for_delivery',
  ].contains(status);
  final dark = Theme.of(context).brightness == Brightness.dark;
  final color = success
      ? (dark ? const Color(0xffa5e8b7) : const Color(0xff176734))
      : failure
      ? (dark ? const Color(0xffffb4ab) : const Color(0xffa51e2d))
      : active
      ? Theme.of(context).colorScheme.primary
      : (dark ? const Color(0xffffce92) : const Color(0xff8b4a10));
  return color;
}

String riderStatusLabel(String status) =>
    const {
      'assigned': 'Delivery Rider Assigned',
      'out_for_delivery': 'Out for Delivery',
      'in_transit': 'In Transit',
      'picked_up': 'Picked Up',
      'failed_attempt': 'Failed Attempt',
    }[status] ??
    riderDisplayValue(status);

String riderDisplayValue(String value) {
  final normalized = value.replaceAll(RegExp(r'[_-]+'), ' ').trim();
  if (normalized.isEmpty) return '';
  return normalized
      .split(' ')
      .map(
        (word) => word.isEmpty
            ? word
            : '${word[0].toUpperCase()}${word.substring(1)}',
      )
      .join(' ');
}

String riderDateTime(dynamic value) {
  final raw = '$value';
  final zoned = RegExp(r'(Z|[+-]\d{2}:?\d{2})$').hasMatch(raw);
  final date = DateTime.tryParse(zoned ? raw : '${raw.replaceFirst(' ', 'T')}Z')
      ?.toUtc()
      .add(const Duration(hours: 8));
  if (date == null) return '';
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
  final period = date.hour < 12 ? 'AM' : 'PM';
  return '${months[date.month - 1]} ${date.day}, ${date.year} · '
      '$hour:${date.minute.toString().padLeft(2, '0')} $period';
}

class RiderLine extends StatelessWidget {
  final IconData icon;
  final String text;
  final bool strong;
  const RiderLine(this.icon, this.text, {this.strong = false, super.key});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        RiderIcon(icon, size: 18),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 13,
              height: 1.4,
              fontWeight: strong ? FontWeight.w600 : FontWeight.w400,
            ),
          ),
        ),
      ],
    ),
  );
}

class RiderPanel extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  const RiderPanel({
    required this.child,
    this.padding = const EdgeInsets.all(16),
    super.key,
  });
  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 12),
    child: Padding(padding: padding, child: child),
  );
}

String riderActionTitle(String action) =>
    const {
      'picked_up': 'Confirm pickup',
      'accept_dispatch': 'Accept dispatch',
      'accept_transfer': 'Accept transfer',
      'out_for_delivery': 'Start delivery',
      'delivered': 'View delivery',
      'failed_attempt': 'View delivery',
    }[action] ??
    action.replaceAll('_', ' ');

class RiderParcelCard extends StatelessWidget {
  final Json item;
  final Future<void> Function() onOpen;
  const RiderParcelCard(this.item, {required this.onOpen, super.key});
  @override
  Widget build(BuildContext context) {
    final parcel = item['parcel'] as Map? ?? {};
    final actions = List<String>.from(item['allowed_actions'] as List? ?? []);
    final status = '${item['fulfillment_status'] ?? item['status']}';
    final colors = Theme.of(context).colorScheme;
    final tone = riderStatusColor(context, status);
    final city =
        parcel['recipient']?['city'] ?? item['pickup_address']?['city'];
    return RiderPanel(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: tone.withValues(alpha: .1),
                  shape: BoxShape.circle,
                ),
                child: RiderIcon(
                  Icons.inventory_2_outlined,
                  size: 24,
                  color: tone,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Semantics(
                      label: '${item['tracking_reference']}',
                      child: Text(
                        shortReference(item['tracking_reference']),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    RiderLine(
                      Icons.storefront_outlined,
                      '${parcel['store']?['name'] ?? 'LubosMart seller'}',
                    ),
                    if (city != null)
                      RiderLine(Icons.location_on_outlined, '$city'),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 20),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            spacing: 12,
            runSpacing: 8,
            children: [
              Text(
                riderPesos(cents(parcel['cod_total'])),
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: colors.onSurface,
                ),
              ),
              RiderStatus(status, icon: _riderStatusIcon(status)),
            ],
          ),
          if (parcel['delivery']?['delivered_at'] != null)
            RiderLine(
              Icons.event_available_outlined,
              riderDateTime(parcel['delivery']['delivered_at']),
            ),
          const SizedBox(height: 12),
          ActionButton(
            actions.isEmpty ? 'View details' : riderActionTitle(actions.first),
            onOpen,
            outlined: actions.isEmpty,
            leading: actions.isEmpty
                ? null
                : ExcludeSemantics(
                    child: Icon(
                      _riderActionIcon(actions.first) ?? Icons.arrow_forward,
                      size: 20,
                      color: colors.onPrimary,
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  IconData _riderStatusIcon(String status) =>
      const {
        'assigned': Icons.local_shipping_outlined,
        'in_transit': Icons.local_shipping_outlined,
        'out_for_delivery': Icons.local_shipping_outlined,
        'picked_up': Icons.inventory_2_outlined,
        'delivered': Icons.check_circle_outline,
        'completed': Icons.check_circle_outline,
      }[status] ??
      Icons.info_outline;

  IconData? _riderActionIcon(String action) => const {
    'picked_up': Icons.inventory_2_outlined,
    'accept_dispatch': Icons.local_shipping_outlined,
    'accept_transfer': Icons.swap_horiz,
    'out_for_delivery': Icons.local_shipping_outlined,
    'delivered': Icons.check_circle_outline,
    'failed_attempt': Icons.info_outline,
  }[action];
}
