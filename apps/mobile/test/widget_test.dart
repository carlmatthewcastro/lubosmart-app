import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:lubosmart_mobile/core/api.dart';
import 'package:lubosmart_mobile/main.dart';
import 'package:lubosmart_mobile/features/buyer.dart';
import 'package:lubosmart_mobile/features/work.dart';

import 'api_test.dart' show MemoryStore, reply, identity;

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    final font = FontLoader('InstrumentSans')
      ..addFont(rootBundle.load('assets/fonts/InstrumentSans.ttf'));
    await font.load();
    final icons = FontLoader('MaterialIcons')
      ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
    await icons.load();
  });
  for (final role in ['buyer', 'seller', 'rider']) {
    testWidgets('$role receives its own mobile workspace', (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final store = MemoryStore();
      await store.write(
        'session',
        jsonEncode({
          'access_token': 'synthetic',
          'kind': 'operational',
          'user': identity(role),
        }),
      );
      final api = Api(
        'https://example.test/api/v1',
        store: store,
        transport: MockClient((request) async {
          if (request.url.path.endsWith('/me')) {
            return reply({'data': identity(role)});
          }
          return reply({'data': []});
        }),
      );
      final session = Session(api);
      await tester.pumpWidget(
        RepaintBoundary(
          key: const ValueKey('capture'),
          child: LubosMartApp(session),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(NavigationBar), findsOneWidget);
      expect(
        find.text(
          role == 'buyer'
              ? 'Discover'
              : role == 'seller'
              ? 'Store orders'
              : 'Your assigned parcels',
        ),
        findsWidgets,
      );
      if (role == 'rider') {
        expect(find.text('Inventory'), findsNothing);
        expect(find.text('Earnings'), findsOneWidget);
      }
      if (role == 'buyer') expect(find.text('Inventory'), findsNothing);
      await capture(tester, '$role-home');
      await tester.pumpWidget(const SizedBox.shrink());
      session.dispose();
      api.close();
    });
  }
  testWidgets(
    'signed-out screen has readable password controls and no operational navigation',
    (tester) async {
      final api = Api(
        'https://example.test/api/v1',
        store: MemoryStore(),
        transport: MockClient((_) async => reply({'data': []})),
      );
      final session = Session(api);
      await tester.pumpWidget(
        RepaintBoundary(
          key: const ValueKey('capture'),
          child: LubosMartApp(session),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Welcome to LubosMart'), findsOneWidget);
      expect(find.byType(NavigationBar), findsNothing);
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
      await capture(tester, 'sign-in');
      await tester.pumpWidget(const SizedBox.shrink());
      session.dispose();
      api.close();
    },
  );
  testWidgets(
    'multi-store bag reviews separate shipping and submits a stable checkout key',
    (tester) async {
      Json? submitted;
      final api = Api(
        'https://example.test/api/v1',
        store: MemoryStore(),
        transport: MockClient((request) async {
          if (request.url.path.endsWith('/addresses')) {
            return reply({
              'data': [
                {
                  'id': 1,
                  'label': 'Home',
                  'line1': 'Test street',
                  'city': 'Manila',
                },
              ],
            });
          }
          if (request.url.path.endsWith('/orders')) {
            submitted = Json.from(jsonDecode(request.body) as Map);
            return reply({
              'data': {'id': 22},
            }, 201);
          }
          return reply({
            'data': {
              'items': [
                for (final store in [1, 2])
                  {
                    'product_id': store,
                    'store_id': store,
                    'product_variant_id': null,
                    'quantity': 1,
                    'name': 'Test item $store',
                    'price': '100.00',
                    'is_available': true,
                  },
              ],
              'logistics_pricing': false,
              'shipping_fee_per_seller_order': '50.00',
            },
          });
        }),
      )..userId = 7;
      await tester.pumpWidget(MaterialApp(home: CartPage(api)));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Place COD purchase'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.textContaining('COD total: PHP 300.00'), findsOneWidget);
      await tester.tap(find.text('Place COD purchase'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();
      expect(submitted?['expected_shipping_total'], '100.00');
      expect(submitted?['expected_items_subtotal'], '200.00');
      expect(submitted?['checkout_key'], isNotEmpty);
      await tester.pumpWidget(const SizedBox.shrink());
      api.close();
    },
  );
  test('native waybill produces a PDF for one parcel identity', () async {
    final pdf = await waybillPdf({
      'id': 1,
      'store': {'name': 'Synthetic Store'},
      'recipient': {
        'name': 'Synthetic Buyer',
        'phone': '09171234567',
        'line1': '5 Test Street',
        'barangay': 'Test',
        'city': 'Manila',
        'province': 'Metro Manila',
        'zip': '1000',
      },
      'cod_total': '150.00',
      'delivery': {'tracking_reference': 'LM-SYNTHETIC-ONLY'},
    });
    expect(String.fromCharCodes(pdf.take(4)), '%PDF');
    expect(pdf.length, greaterThan(500));
  });
}

Future<void> capture(WidgetTester tester, String name) async {
  if (!const bool.fromEnvironment('CAPTURE_SCREENSHOTS')) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const ValueKey('capture')),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage();
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final folder = Directory('../../storage/app/flutter-ui-check');
    await folder.create(recursive: true);
    await File('${folder.path}/$name.png')
        .writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
}
