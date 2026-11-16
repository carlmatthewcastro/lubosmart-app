import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:lubosmart_mobile/core/api.dart';
import 'package:lubosmart_mobile/main.dart';
import 'package:lubosmart_mobile/ui/rider_design.dart';

import 'api_test.dart' show MemoryStore, identity, reply;
import 'widget_test.dart' show capture;

void main() {
  setUpAll(() async {
    await (FontLoader('Poppins')
          ..addFont(rootBundle.load('assets/fonts/Poppins-Regular.ttf'))
          ..addFont(rootBundle.load('assets/fonts/Poppins-SemiBold.ttf')))
        .load();
    await (FontLoader(
      'MaterialIcons',
    )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
  });
  Future<void> logo(WidgetTester tester) async {
    await tester.runAsync(
      () => precacheImage(
        const AssetImage('assets/brand.png'),
        tester.element(find.byType(RiderBrand).first),
      ),
    );
    await tester.pumpAndSettle();
  }

  void phone(WidgetTester tester) {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  testWidgets(
    'Reference login retains sign-in and registration controls with branded artwork',
    (tester) async {
      phone(tester);
      final api = Api(
        'https://example.test/api/v1',
        store: MemoryStore(),
        transport: MockClient((_) async => reply({'data': []})),
      );
      final session = Session(api, riderOnly: true);
      await tester.pumpWidget(
        RepaintBoundary(
          key: const ValueKey('capture'),
          child: LubosMartApp(session),
        ),
      );
      await tester.pumpAndSettle();
      await logo(tester);
      expect(find.text('Welcome, Rider!'), findsOneWidget);
      expect(find.byType(RiderArtwork), findsOneWidget);
      expect(find.byType(TextField), findsNWidgets(2));
      await capture(tester, 'reference-login');
      await tester.scrollUntilVisible(
        find.text('Register as a Rider'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(find.text('Sign in'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      session.dispose();
      api.close();
    },
  );
  testWidgets(
    'Reference assignment filters and detail navigation use GET only and preserve full tracking',
    (tester) async {
      phone(tester);
      final store = MemoryStore();
      final user = identity('rider');
      await store.write(
        'session',
        jsonEncode({
          'access_token': 'synthetic',
          'kind': 'operational',
          'user': user,
        }),
      );
      final requests = <String>[];
      const tracking = 'LM-SYNTHETIC-REFERENCE-9001';
      final parcel = <String, dynamic>{
        'id': 9001,
        'tracking_reference': tracking,
        'status': 'in_transit',
        'fulfillment_status': 'in_transit',
        'allowed_actions': ['accept_dispatch'],
        'history': [],
        'pickup_address': {
          'line1': 'Synthetic pickup street',
          'city': 'Test municipality',
        },
        'parcel': {
          'store': {'name': 'Synthetic test store'},
          'recipient': {
            'name': 'Synthetic recipient',
            'city': 'Test destination',
            'line1': 'Synthetic delivery street',
          },
          'cod_total': '954.00',
        },
      };
      final api = Api(
        'https://example.test/api/v1',
        store: store,
        transport: MockClient((request) async {
          requests.add(
            '${request.method} ${request.url.path}?${request.url.query}',
          );
          final p = request.url.path;
          if (p.endsWith('/me')) return reply({'data': user});
          if (p.endsWith('/workspace')) {
            return reply({
              'data': {
                'queues': {
                  'pickups': 3,
                  'dispatch': 2,
                  'monitoring': 2,
                  'cash': 5,
                  'exceptions': 0,
                  'completed': 17,
                  'all': 27,
                },
              },
            });
          }
          if (p.endsWith('/deliveries')) {
            return reply({
              'data': [parcel],
            });
          }
          if (p.endsWith('/deliveries/9001')) return reply({'data': parcel});
          if (p.endsWith('/settings/profile')) {
            return reply({
              'data': {
                'user': user,
                'phone': 'Synthetic phone',
                'vehicle': {
                  'vehicle_type': 'motorcycle',
                  'plate_number': 'TEST-9001',
                },
              },
            });
          }
          if (p.endsWith('/rider/earnings')) {
            return reply({
              'data': {
                'totals': {'fees': 0, 'paid': 0},
                'entries': [],
              },
            });
          }
          if (p.endsWith('/returns')) {
            return reply({
              'data': [
                {
                  'id': 9002,
                  'seller_order_id': 9001,
                  'reason': 'Synthetic visual fixture — not a live assignment.',
                  'allowed_actions': ['accept_seller_dispatch'],
                  'events': [],
                  'seller_order': {
                    'delivery': {'tracking_reference': tracking},
                  },
                  'task': {
                    'reference': 'RT-SYNTHETIC-9002',
                    'status': 'seller_assigned',
                    'buyer_address': null,
                    'seller_address': {
                      'line1': 'Synthetic seller street',
                      'city': 'Test municipality',
                    },
                    'proofs': [],
                  },
                },
              ],
            });
          }
          return reply({'data': []});
        }),
      );
      final session = Session(api, riderOnly: true);
      await tester.pumpWidget(
        RepaintBoundary(
          key: const ValueKey('capture'),
          child: LubosMartApp(session),
        ),
      );
      await tester.pumpAndSettle();
      await logo(tester);
      await capture(tester, 'reference-dashboard');
      await tester.tap(find.text('Tasks'));
      await tester.pumpAndSettle();
      expect(find.text('Your assignments'), findsOneWidget);
      expect(find.text('Synthetic test store'), findsOneWidget);
      await tester.ensureVisible(find.text('Dispatch'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Dispatch'));
      await tester.pumpAndSettle();
      expect(
        requests.any((r) => r.contains('deliveries?stage=dispatch')),
        isTrue,
      );
      await capture(tester, 'reference-assignments');
      await tester.ensureVisible(find.text('Accept dispatch'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Accept dispatch'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<SelectableText>(find.byType(SelectableText).first).data,
        tracking,
      );
      await capture(tester, 'reference-parcel-details');
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Profile'));
      await tester.pumpAndSettle();
      await capture(tester, 'reference-profile');
      await tester.ensureVisible(find.text('Compensation & payment history'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Compensation & payment history'));
      await tester.pumpAndSettle();
      await capture(tester, 'reference-earnings');
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Returns'));
      await tester.pumpAndSettle();
      await capture(tester, 'reference-returns');
      await tester.tap(find.text('Profile'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Dark mode'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Dark mode'));
      await tester.pumpAndSettle();
      await capture(tester, 'reference-profile-dark');
      await tester.tap(find.text('Home'));
      await tester.pumpAndSettle();
      expect(
        Theme.of(tester.element(find.byType(RiderBrand).first)).brightness,
        Brightness.dark,
      );
      await capture(tester, 'reference-dashboard-dark');
      expect(requests.every((r) => r.startsWith('GET ')), isTrue);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      session.dispose();
      api.close();
    },
  );
}
