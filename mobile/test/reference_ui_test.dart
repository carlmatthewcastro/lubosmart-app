import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:lubosmart_mobile/core/api.dart';
import 'package:lubosmart_mobile/features/seller.dart';
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
      expect(
        find.image(const AssetImage('assets/illustrations/delivery_rider.png')),
        findsOneWidget,
      );
      expect(find.byType(TextField), findsNWidgets(2));
      expect(find.text('Deliver Parcels'), findsOneWidget);
      expect(find.text('Handle Returns'), findsOneWidget);
      expect(find.text('Track Earnings'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
      expect(find.text('Continue with Google'), findsNothing);
      expect(
        tester.widget<TextField>(find.byType(TextField).last).obscureText,
        isTrue,
      );
      await tester.tap(find.byTooltip('Show password'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextField>(find.byType(TextField).last).obscureText,
        isFalse,
      );
      await tester.tap(find.byTooltip('Hide password'));
      await tester.pumpAndSettle();
      await capture(tester, 'reference-login');
      await tester.ensureVisible(find.text('Forgot password?'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Forgot password?'));
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Use your registered email. A code expires after ten minutes.',
        ),
        findsOneWidget,
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Register as a Rider'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Register as a Rider'));
      await tester.pumpAndSettle();
      expect(find.text('Step 1 of 3'), findsOneWidget);
      expect(find.text('Account information'), findsOneWidget);
      expect(find.text('Register as Rider'), findsOneWidget);
      expect(find.text('Logistics company'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.pumpAndSettle();
      expect(find.text('Sign In'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      session.dispose();
      api.close();
    },
  );
  testWidgets('Rider login scrolls under the keyboard on a compact screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 680);
    tester.view.devicePixelRatio = 1;
    tester.view.viewInsets = const FakeViewPadding();
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetViewInsets);
    final api = Api(
      'https://example.test/api/v1',
      store: MemoryStore(),
      transport: MockClient((_) async => reply({'data': []})),
    );
    final session = Session(api, riderOnly: true);
    await tester.pumpWidget(LubosMartApp(session));
    await tester.pumpAndSettle();
    tester.view.viewInsets = const FakeViewPadding(bottom: 260);
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Sign In'));
    await tester.pumpAndSettle();
    expect(find.byType(SingleChildScrollView), findsOneWidget);
    expect(find.text('Register as a Rider'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    session.dispose();
    api.close();
  });
  testWidgets('Rider login authenticates and persists a valid session', (
    tester,
  ) async {
    phone(tester);
    final store = MemoryStore();
    final loginBodies = <Json>[];
    final authResponse = Completer<http.Response>();
    final api = Api(
      'https://example.test/api/v1',
      store: store,
      transport: MockClient((request) async {
        if (request.url.path.endsWith('/auth/session')) {
          loginBodies.add(Json.from(jsonDecode(request.body) as Map));
          return authResponse.future;
        }
        if (request.url.path.endsWith('/workspace')) {
          return reply({
            'data': {
              'queues': {
                'pickups': 0,
                'dispatch': 0,
                'monitoring': 0,
                'cash': 0,
                'exceptions': 0,
                'completed': 0,
                'all': 0,
              },
            },
          });
        }
        return reply({'data': []});
      }),
    );
    final session = Session(api, riderOnly: true);
    await tester.pumpWidget(LubosMartApp(session));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextField).first,
      ' rider@example.test ',
    );
    await tester.enterText(find.byType(TextField).last, 'synthetic-password');
    await tester.ensureVisible(find.text('Sign In'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign In'));
    await tester.pump();
    expect(find.text('Please wait…'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.tap(find.text('Please wait…'));
    await tester.pump();
    expect(loginBodies, hasLength(1));
    authResponse.complete(
      reply({
        'data': {
          'access_token': 'synthetic-token',
          'kind': 'operational',
          'user': identity('rider'),
        },
      }, 201),
    );
    await tester.pumpAndSettle();
    expect(find.byType(RiderBottomNavigation), findsOneWidget);
    expect(session.role, 'rider');
    expect(loginBodies, hasLength(1));
    expect(loginBodies.single['email'], 'rider@example.test');
    expect(loginBodies.single['password'], 'synthetic-password');
    final savedSession = await store.read('session');
    expect(savedSession, isNotNull);
    expect(
      (jsonDecode(savedSession!) as Map<String, dynamic>)['access_token'],
      'synthetic-token',
    );
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    session.dispose();
    api.close();
  });
  testWidgets('Rejected Rider login leaves the session signed out', (
    tester,
  ) async {
    phone(tester);
    final store = MemoryStore();
    var loginAttempts = 0;
    final api = Api(
      'https://example.test/api/v1',
      store: store,
      transport: MockClient((request) async {
        if (request.url.path.endsWith('/auth/session')) {
          loginAttempts++;
          return reply({'message': 'Invalid credentials.'}, 401);
        }
        return reply({'data': []});
      }),
    );
    final session = Session(api, riderOnly: true);
    await tester.pumpWidget(LubosMartApp(session));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'rider@example.test');
    await tester.enterText(find.byType(TextField).last, 'incorrect-password');
    await tester.ensureVisible(find.text('Sign In'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign In'));
    await tester.pumpAndSettle();
    expect(loginAttempts, 1);
    expect(session.identity, isNull);
    expect(await store.read('session'), isNull);
    expect(find.byType(SnackBar), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(2));
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    session.dispose();
    api.close();
  });
  testWidgets('Earnings shows a responsive empty state for zero records', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 720);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final api = Api(
      'https://example.test/api/v1',
      store: MemoryStore(),
      transport: MockClient(
        (_) async => reply({
          'data': {
            'totals': {'fees': 0, 'paid': 0},
            'entries': [],
          },
        }),
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(fontFamily: 'Poppins'),
        home: EarningsPage(api),
      ),
    );
    await tester.pumpAndSettle();
    await logo(tester);
    expect(find.text('₱0.00'), findsNWidgets(3));
    expect(find.text('No payment records yet.'), findsOneWidget);
    expect(
      find.text('Recorded fees and payments will appear here.'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    api.close();
  });
  testWidgets(
    'Reference assignment filters and detail navigation use GET only and preserve full tracking',
    (tester) async {
      phone(tester);
      final store = MemoryStore();
      final user = identity('rider')..['rider_capability'] = 'both';
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
                'totals': {'fees': 10000, 'paid': 5000},
                'entries': [
                  {
                    'leg': 'pickup',
                    'delivery_id': 9001,
                    'amount_cents': 5000,
                    'paid_at': '2026-11-14T05:36:00Z',
                    'payment_reference': 'PAY-SYNTHETIC-01',
                  },
                  {
                    'leg': 'delivery',
                    'delivery_id': 9001,
                    'amount_cents': 5000,
                    'paid_at': null,
                    'payment_reference': null,
                  },
                ],
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
      expect(
        find.image(const AssetImage('assets/icons/home.png')),
        findsOneWidget,
      );
      expect(find.byType(RiderBottomNavigation), findsOneWidget);
      await capture(tester, 'reference-dashboard');
      await tester.tap(find.text('History'));
      await tester.pumpAndSettle();
      expect(find.text('Completed deliveries'), findsOneWidget);
      await tester.tap(find.text('Home'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Tasks'));
      await tester.pumpAndSettle();
      expect(find.text('Your Assignments'), findsOneWidget);
      expect(
        find.text('Manage your pickups, dispatch, and active deliveries.'),
        findsOneWidget,
      );
      expect(find.image(const AssetImage('assets/brand.png')), findsOneWidget);
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
      expect(find.text('Dispatch details'), findsOneWidget);
      expect(
        tester.widget<SelectableText>(find.byType(SelectableText).first).data,
        tracking,
      );
      await capture(tester, 'reference-parcel-details');
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Profile'));
      await tester.pumpAndSettle();
      expect(
        find.image(const AssetImage('assets/illustrations/rider_avatar.png')),
        findsOneWidget,
      );
      expect(find.text('Synthetic rider'), findsOneWidget);
      expect(find.text('Approved'), findsOneWidget);
      expect(find.text('Synthetic phone'), findsOneWidget);
      expect(find.text('Capability: Both'), findsOneWidget);
      expect(find.text('Motorcycle'), findsOneWidget);
      expect(find.text('TEST-9001'), findsOneWidget);
      await capture(tester, 'reference-profile');
      await tester.ensureVisible(find.text('Compensation & Payment History'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Compensation & Payment History'));
      await tester.pumpAndSettle();
      expect(find.text('Your earnings'), findsOneWidget);
      expect(find.text('₱100.00'), findsOneWidget);
      expect(find.text('₱50.00'), findsNWidgets(4));
      expect(find.text('Ref. PAY-SYNTHETIC-01'), findsOneWidget);
      expect(find.text('Nov 14, 2026 · 1:36 PM'), findsOneWidget);
      expect(find.text('Paid'), findsWidgets);
      expect(find.text('Pending'), findsNWidgets(2));
      await capture(tester, 'reference-earnings');
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Returns'));
      await tester.pumpAndSettle();
      expect(find.byType(SegmentedButton<bool>), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
      await capture(tester, 'reference-returns');
      await tester.tap(find.text('Completed'));
      await tester.pumpAndSettle();
      expect(find.text('No return assignments in this view'), findsOneWidget);
      await tester.tap(find.text('Active'));
      await tester.pumpAndSettle();
      expect(find.text('RT-SYNTHETIC-9002'), findsOneWidget);
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
