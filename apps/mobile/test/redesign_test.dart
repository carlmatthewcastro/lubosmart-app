import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lubosmart_mobile/core/api.dart';
import 'package:lubosmart_mobile/features/accounts.dart';
import 'package:lubosmart_mobile/ui/common.dart';
import 'package:http/testing.dart';

import 'api_test.dart' show MemoryStore, reply;

void main() {
  test('Timeline localizes UTC and offset timestamps consistently to Philippine time', () {
    expect(localEventTime('2026-11-15 00:29:00'), '11/15/2026 08:29 PHT');
    expect(localEventTime('2026-11-15T00:29:00Z'), '11/15/2026 08:29 PHT');
    expect(localEventTime('2026-11-15T08:29:00+08:00'), '11/15/2026 08:29 PHT');
    expect(localEventTime(null), '');
  });
  test('Rider money keeps exact cents and separates thousands', () {
    expect(riderPesos(123456), '₱1,234.56');
    expect(riderPesos(0), '₱0.00');
    expect(pesos(123456), 'PHP 1234.56');
  });
  testWidgets('Rider wizard retains personal values across address and back', (
    tester,
  ) async {
    final api = Api(
      'https://example.test/api/v1',
      store: MemoryStore(),
      transport: MockClient((_) async => reply({'data': []})),
    );
    final session = Session(api, riderOnly: true);
    await tester.pumpWidget(MaterialApp(home: RegistrationPage(session)));
    await tester.pumpAndSettle();
    expect(find.text('Step 1 of 4'), findsOneWidget);
    await tester.enterText(
      find.byKey(const ValueKey('first_name')),
      'Synthetic',
    );
    tester.testTextInput.hide();
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Continue'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.text('Step 2 of 4'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Back'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Back'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('first_name')),
      -250,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Synthetic'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
    session.dispose();
    api.close();
  });
}
