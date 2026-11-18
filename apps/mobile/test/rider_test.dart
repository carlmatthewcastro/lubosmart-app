import 'dart:io';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:lubosmart_mobile/core/api.dart';
import 'package:lubosmart_mobile/features/accounts.dart';
import 'package:lubosmart_mobile/features/rider.dart';
import 'package:lubosmart_mobile/features/work.dart';
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

  testWidgets('Rider navigation fits compact and wide phone layouts', (
    tester,
  ) async {
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    for (final size in [const Size(320, 680), const Size(600, 900)]) {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            bottomNavigationBar: RiderBottomNavigation(
              selectedIndex: 0,
              onDestinationSelected: (_) {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(RiderBottomNavigation), findsOneWidget);
      expect(find.text('Profile'), findsOneWidget);
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets('Rider app renders its own five destinations and dashboard', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 780);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final store = MemoryStore();
    await store.write(
      'session',
      jsonEncode({
        'access_token': 'synthetic',
        'kind': 'operational',
        'user': identity('rider'),
      }),
    );
    final requests = <Uri>[];
    final api = Api(
      'https://example.test/api/v1',
      store: store,
      transport: MockClient((request) async {
        requests.add(request.url);
        if (request.url.path.endsWith('/me')) {
          return reply({'data': identity('rider')});
        }
        if (request.url.path.endsWith('/workspace')) {
          return reply({
            'data': {
              'queues': {
                'pickups': 3,
                'dispatch': 2,
                'monitoring': 2,
                'completed': 17,
                'cash': 5,
                'exceptions': 0,
                'all': 27,
              },
            },
          });
        }
        if (request.url.path.endsWith('/rider/earnings')) {
          return reply({
            'data': {
              'totals': {'fees': 15000, 'paid': 10000},
              'entries': [],
            },
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
    expect(find.byType(RiderBottomNavigation), findsOneWidget);
    for (final label in ['Home', 'Tasks', 'Returns', 'History', 'Profile']) {
      expect(find.text(label), findsOneWidget);
    }
    expect(find.text('Good day,'), findsOneWidget);
    expect(find.text('Synthetic!'), findsOneWidget);
    expect(find.text('Discover'), findsNothing);
    expect(find.text('3'), findsOneWidget);
    expect(find.text('5'), findsOneWidget);
    expect(find.text('17 parcels'), findsOneWidget);
    expect(find.text('27'), findsOneWidget);
    expect(find.text('0'), findsOneWidget);
    expect(find.text('Earnings'), findsOneWidget);
    expect(find.text('All Parcels'), findsOneWidget);
    expect(find.text('Exceptions'), findsOneWidget);
    final avatar = find.image(
      const AssetImage('assets/illustrations/rider_avatar.png'),
    );
    expect(avatar, findsOneWidget);
    expect(
      find.ancestor(of: avatar, matching: find.byType(ClipOval)),
      findsOneWidget,
    );
    final scanButton = find.ancestor(
      of: find.text('Scan QR'),
      matching: find.byType(FilledButton),
    );
    expect(tester.getSize(scanButton).width, closeTo(288, 1));
    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.text('Earnings'));
    await tester.tap(find.text('Earnings'));
    await tester.pumpAndSettle();
    expect(find.text('Your earnings'), findsOneWidget);
    expect(requests.any((uri) => uri.path.endsWith('/rider/earnings')), isTrue);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('All Parcels'));
    await tester.tap(find.text('All Parcels'));
    await tester.pumpAndSettle();
    expect(find.text('All parcels'), findsOneWidget);
    expect(
      requests.any(
        (uri) =>
            uri.path.endsWith('/deliveries') &&
            uri.queryParameters['stage'] == 'all',
      ),
      isTrue,
    );
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Exceptions'));
    await tester.tap(find.text('Exceptions'));
    await tester.pumpAndSettle();
    expect(find.text('Exceptions'), findsOneWidget);
    expect(
      requests.any(
        (uri) =>
            uri.path.endsWith('/deliveries') &&
            uri.queryParameters['stage'] == 'exceptions',
      ),
      isTrue,
    );
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.runAsync(
      () => precacheImage(
        const AssetImage('assets/brand.png'),
        tester.element(find.byType(RiderDashboard)),
      ),
    );
    await tester.pumpAndSettle();
    await capture(tester, 'rider-only-dashboard');
    await tester.pumpWidget(const SizedBox.shrink());
    api.close();
    session.dispose();
  });
  test(
    'Rider-only login revokes a non-Rider token without saving a session',
    () async {
      var revoked = false;
      final store = MemoryStore();
      final api = Api(
        'https://example.test/api/v1',
        store: store,
        transport: MockClient((request) async {
          if (request.method == 'DELETE') {
            revoked = true;
            return reply({}, 204);
          }
          return reply({
            'data': {
              'access_token': 'synthetic',
              'kind': 'operational',
              'user': identity('buyer'),
            },
          }, 201);
        }),
      );
      final session = Session(api, riderOnly: true);
      await expectLater(
        session.login('synthetic@example.test', 'test'),
        throwsA(isA<ApiFailure>()),
      );
      expect(revoked, isTrue);
      expect(session.identity, isNull);
      expect(await store.read('session'), isNull);
      api.close();
      session.dispose();
    },
  );

  test('Delivery proof sends recipient, actual bytes and UUID with upload progress', () async {
    final dir = await Directory.systemTemp.createTemp('rider-upload-test');
    final file = File('${dir.path}/camera-test.jpg');
    await file.writeAsBytes([255, 216, 255, 217]);
    final progress = <double?>[];
    final api = Api(
      'https://example.test/api/v1',
      store: MemoryStore(),
      transport: MockClient((request) async {
        expect(
          request.headers['content-type'],
          contains('multipart/form-data'),
        );
        final body = latin1.decode(request.bodyBytes);
        expect(body, contains('name="recipient_name"\r\n\r\nTest recipient'));
        expect(body, contains('name="request_key"'));
        expect(body, contains('name="proof"; filename="camera-test.jpg"'));
        expect(request.bodyBytes, containsAllInOrder([255, 216, 255, 217]));
        return reply({
          'data': {'status': 'delivered'},
        });
      }),
    )..userId = 7;
    api.uploadProgress.addListener(
      () => progress.add(api.uploadProgress.value),
    );
    await api.intent(
      'delivery:1:delivered',
      'deliveries/1/events',
      {
        'action': 'delivered',
        'recipient_name': 'Test recipient',
        'tracking_reference': 'LM-TEST',
        'cod_confirmed': 1,
      },
      files: {'proof': file.path},
    );
    expect(progress.first, 0);
    expect(progress, contains(1.0));
    expect(progress.last, isNull);
    expect(await api.pending('delivery:1:delivered'), isNull);
    api.close();
    await file.delete();
    await dir.delete();
  });

  testWidgets(
    'Rider registration fixes role and never offers Buyer or Seller',
    (tester) async {
      tester.view.physicalSize = const Size(320, 720);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final api = Api(
        'https://example.test/api/v1',
        store: MemoryStore(),
        transport: MockClient((_) async => reply({'data': []})),
      );
      final session = Session(api, riderOnly: true);
      await tester.pumpWidget(MaterialApp(home: RegistrationPage(session)));
      await tester.pumpAndSettle();
      expect(find.text('Account role'), findsNothing);
      expect(find.text('Buyer'), findsNothing);
      expect(find.text('Seller'), findsNothing);
      expect(find.text('LubosMart'), findsOneWidget);
      expect(find.byType(RiderBrand), findsOneWidget);
      expect(find.text('Register as Rider'), findsOneWidget);
      expect(find.text('Step 1 of 3'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Next'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
      expect(find.text('Step 2 of 3'), findsOneWidget);
      expect(find.text('Vehicle information'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      api.close();
      session.dispose();
    },
  );

  testWidgets('Rider dashboard renders server counts at 320px', (tester) async {
    tester.view.physicalSize = const Size(320, 780);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final api = Api(
      'https://example.test/api/v1',
      store: MemoryStore(),
      transport: MockClient(
        (_) async => reply({
          'data': {
            'queues': {
              'pickups': 9,
              'dispatch': 4,
              'monitoring': 2,
              'completed': 6,
              'cash': 1,
              'exceptions': 0,
              'all': 22,
            },
          },
        }),
      ),
    );
    await tester.pumpWidget(MaterialApp(home: RiderDashboard(api)));
    await tester.pumpAndSettle();
    expect(
      find.descendant(
        of: find.widgetWithText(RiderMetric, 'Pickups'),
        matching: find.text('9'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.widgetWithText(RiderMetric, 'Dispatch'),
        matching: find.text('4'),
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    api.close();
  });

  testWidgets(
    'Pickup custody requires the scanner and has no editable tracking reference',
    (tester) async {
      final api = Api(
        'https://example.test/api/v1',
        store: MemoryStore(),
        transport: MockClient(
          (_) async => reply({
            'data': {
              'id': 52,
              'tracking_reference': 'LM-TEST',
              'status': 'assigned',
              'allowed_actions': ['picked_up'],
              'history': [],
              'parcel': {'recipient': {}, 'cod_total': '0.00'},
            },
          }),
        ),
      );
      await tester.pumpWidget(MaterialApp(home: DeliveryPage(api, 52)));
      await tester.pumpAndSettle();
      final tracking = tester.widget<TextField>(find.byType(TextField).first);
      expect(tracking.readOnly, isTrue);
      await tester.ensureVisible(find.text('Confirm physical pickup'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirm physical pickup'));
      await tester.pumpAndSettle();
      expect(
        find.text('Scan the QR label attached to this parcel.'),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      api.close();
    },
  );

  test('Rider-only sessions reject and revoke non-Rider identities', () async {
    final store = MemoryStore();
    final requests = <String>[];
    final api = Api(
      'https://example.test/api/v1',
      store: store,
      transport: MockClient((request) async {
        requests.add('${request.method} ${request.url.path}');
        return reply({});
      }),
    );
    final session = Session(api, riderOnly: true);

    await expectLater(
      session.accept({
        'access_token': 'synthetic',
        'kind': 'operational',
        'user': identity('buyer'),
      }),
      throwsA(isA<ApiFailure>().having((error) => error.status, 'status', 403)),
    );

    expect(requests, ['DELETE /api/v1/auth/token']);
    expect(api.token, isNull);
    expect(session.identity, isNull);
    expect(await store.read('session'), isNull);
    session.dispose();
    api.close();
  });
}
