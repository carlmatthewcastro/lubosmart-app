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

class RiderArtwork extends StatelessWidget {
  final double height;
  final bool portrait;
  const RiderArtwork({this.height = 180, this.portrait = false, super.key});
  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Delivery rider illustration',
    image: true,
    child: SizedBox(
      height: height,
      width: portrait ? height : double.infinity,
      child: CustomPaint(
        painter: _RiderPainter(Theme.of(context).colorScheme.primary, portrait),
      ),
    ),
  );
}

class _RiderPainter extends CustomPainter {
  final Color purple;
  final bool portrait;
  _RiderPainter(this.purple, this.portrait);
  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    if (portrait) {
      canvas.scale(size.width / 100, size.height / 100);
      canvas.clipPath(Path()..addOval(const Rect.fromLTWH(0, 0, 100, 100)));
      final p = Paint()..color = purple.withValues(alpha: .09);
      canvas.drawCircle(const Offset(50, 50), 50, p);
      p.color = purple;
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          const Rect.fromLTWH(24, 61, 56, 50),
          const Radius.circular(18),
        ),
        p,
      );
      p.color = const Color(0xffefc5a7);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          const Rect.fromLTWH(43, 29, 26, 35),
          const Radius.circular(10),
        ),
        p,
      );
      p.color = purple;
      canvas.drawCircle(const Offset(47, 30), 25, p);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          const Rect.fromLTWH(46, 25, 35, 10),
          const Radius.circular(5),
        ),
        p,
      );
      p.color = const Color(0xffd9e4e9);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          const Rect.fromLTWH(45, 36, 25, 12),
          const Radius.circular(5),
        ),
        p,
      );
      p.color = const Color(0xffffcb88);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          const Rect.fromLTWH(34, 74, 12, 18),
          const Radius.circular(3),
        ),
        p,
      );
      canvas.restore();
      return;
    }
    canvas.scale(size.width / 320, size.height / 180);
    final paint = Paint();
    void box(
      double x,
      double y,
      double w,
      double h,
      Color color, [
      double radius = 8,
    ]) {
      paint.color = color;
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x, y, w, h),
          Radius.circular(radius),
        ),
        paint,
      );
    }

    void circle(double x, double y, double r, Color color) {
      paint.color = color;
      canvas.drawCircle(Offset(x, y), r, paint);
    }

    final pale = purple.withValues(alpha: .08);
    if (portrait) {
      circle(160, 88, 86, pale);
    } else {
      for (var i = 0; i < 9; i++) {
        box(i * 39.0, 72 - (i % 3) * 15, 26, 90 + (i % 3) * 15, pale, 2);
      }
      box(0, 151, 320, 29, purple.withValues(alpha: .1), 15);
      circle(49, 127, 24, purple.withValues(alpha: .1));
      circle(276, 131, 28, purple.withValues(alpha: .1));
    }
    circle(115, 155, 21, const Color(0xff262731));
    circle(244, 155, 21, const Color(0xff262731));
    circle(115, 155, 11, const Color(0xffe4e4ed));
    circle(244, 155, 11, const Color(0xffe4e4ed));
    box(102, 119, 133, 28, purple, 14);
    box(212, 95, 23, 51, purple, 10);
    box(225, 90, 33, 8, const Color(0xff262731), 4);
    box(83, 77, 67, 49, const Color(0xfff6ae59), 9);
    box(111, 78, 10, 43, const Color(0xffffdfae), 1);
    box(154, 91, 52, 36, purple, 12);
    box(164, 117, 47, 14, const Color(0xff35303e), 7);
    box(198, 122, 16, 25, const Color(0xff35303e), 6);
    circle(183, 63, 22, const Color(0xffefc5a7));
    circle(181, 52, 27, purple);
    box(183, 51, 35, 12, purple, 6);
    box(190, 65, 18, 8, const Color(0xfff4e4d8), 4);
    box(188, 86, 35, 12, const Color(0xffefc5a7), 6);
    circle(222, 92, 7, const Color(0xffefc5a7));
    box(101, 118, 67, 7, const Color(0xff262731), 3);
    canvas.restore();
  }

  @override
  bool shouldRepaint(_RiderPainter oldDelegate) =>
      oldDelegate.purple != purple || oldDelegate.portrait != portrait;
}

class RiderStatus extends StatelessWidget {
  final String status;
  const RiderStatus(this.status, {super.key});
  @override
  Widget build(BuildContext context) {
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
    final dark = Theme.of(context).brightness == Brightness.dark;
    final color = success
        ? (dark ? const Color(0xffa5e8b7) : const Color(0xff176734))
        : failure
        ? (dark ? const Color(0xffffb4ab) : const Color(0xffa51e2d))
        : (dark ? const Color(0xffffce92) : const Color(0xff8b4a10));
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
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
        Icon(icon, size: 18, color: Theme.of(context).colorScheme.primary),
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
    final city =
        parcel['recipient']?['city'] ?? item['pickup_address']?['city'];
    return RiderPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(11),
                decoration: const BoxDecoration(
                  color: Color(0xfffff0d9),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.inventory_2_outlined,
                  size: 22,
                  color: Color(0xffaa5c18),
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
                          fontSize: 14,
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
          const SizedBox(height: 8),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            spacing: 12,
            runSpacing: 8,
            children: [
              Text(
                riderPesos(cents(parcel['cod_total'])),
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Theme.of(context).brightness == Brightness.dark
                      ? const Color(0xffffce92)
                      : const Color(0xff8b4a10),
                ),
              ),
              RiderStatus(status),
            ],
          ),
          if (parcel['delivery']?['delivered_at'] != null)
            RiderLine(
              Icons.event_available_outlined,
              localEventTime(parcel['delivery']['delivered_at']),
            ),
          const SizedBox(height: 12),
          ActionButton(
            actions.isEmpty ? 'View details' : riderActionTitle(actions.first),
            onOpen,
            outlined: actions.isEmpty,
          ),
        ],
      ),
    );
  }
}
