import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lubosmart_mobile/core/api.dart';
import 'package:lubosmart_mobile/features/accounts.dart';
import 'package:lubosmart_mobile/ui/common.dart';
import 'package:lubosmart_mobile/ui/rider_design.dart';
import 'package:http/testing.dart';

import 'api_test.dart' show MemoryStore, reply;

void main() {
  test('Timeline localizes UTC and offset timestamps consistently to Philippine time', () {
    expect(localEventTime('2026-11-15 00:29:00'), '11/15/2026 08:29 PHT');
    expect(localEventTime('2026-11-15T00:29:00Z'), '11/15/2026 08:29 PHT');
    expect(localEventTime('2026-11-15T08:29:00+08:00'), '11/15/2026 08:29 PHT');
    expect(localEventTime(null), '');
  });
  test('Rider history uses readable Philippine dates and status labels', () {
    expect(riderDateTime('2026-11-15T00:29:00Z'), 'Nov 15, 2026 · 8:29 AM');
    expect(
      riderDateTime('2026-11-15T08:29:00+08:00'),
      'Nov 15, 2026 · 8:29 AM',
    );
    expect(riderDateTime(null), '');
    expect(riderStatusLabel('out_for_delivery'), 'Out for Delivery');
    expect(riderStatusLabel('assigned'), 'Delivery Rider Assigned');
    expect(riderStatusLabel('delivered'), 'Delivered');
  });
  test('Rider money keeps exact cents and separates thousands', () {
    expect(riderPesos(123456), '₱1,234.56');
    expect(riderPesos(0), '₱0.00');
    expect(pesos(123456), 'PHP 1234.56');
  });
  testWidgets('Rider wizard retains personal values across address and back', (
    tester,
  ) async {
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
    expect(find.text('Step 1 of 3'), findsOneWidget);
    bool passwordIsObscured() => tester
        .widget<TextField>(
          find.descendant(
            of: find.byKey(const ValueKey('password')),
            matching: find.byType(TextField),
          ),
        )
        .obscureText;

    await tester.ensureVisible(find.byKey(const ValueKey('password')));
    await tester.pumpAndSettle();
    expect(passwordIsObscured(), isTrue);
    await tester.tap(find.byTooltip('Show password'));
    await tester.pumpAndSettle();
    expect(passwordIsObscured(), isFalse);
    await tester.tap(find.byTooltip('Hide password'));
    await tester.pumpAndSettle();
    expect(passwordIsObscured(), isTrue);
    await tester.ensureVisible(find.byKey(const ValueKey('first_name')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey('first_name')),
      'Synthetic',
    );
    tester.testTextInput.hide();
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Next'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Step 2 of 3'), findsOneWidget);
    expect(find.text('Vehicle information'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Back'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Back'));
    await tester.pumpAndSettle();
    expect(find.text('Account information'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('first_name')),
      -250,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Synthetic'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.text('Next'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Next'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Step 3 of 3'), findsOneWidget);
    expect(find.text('Identity'), findsOneWidget);
    expect(find.text('License'), findsOneWidget);
    expect(find.text('Vehicle Registration'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    session.dispose();
    api.close();
  });
}
