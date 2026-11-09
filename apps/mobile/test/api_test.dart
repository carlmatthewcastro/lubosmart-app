import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:lubosmart_mobile/core/api.dart';

class MemoryStore implements PrivateStore {
  final values = <String, String>{};
  @override
  Future<String?> read(String key) async => values[key];
  @override
  Future<void> write(String key, String value) async {
    values[key] = value;
  }

  @override
  Future<void> delete(String key) async {
    values.remove(key);
  }
}

http.Response reply(dynamic value, [int status = 200]) => http.Response(
  jsonEncode(value),
  status,
  headers: {'content-type': 'application/json'},
);
Json identity(String role) => {
  'id': 7,
  'name': 'Synthetic $role',
  'email': 'synthetic@example.test',
  'role': role,
  'status': 'approved',
  'email_verified': true,
};

void main() {
  test(
    'private requests use bearer headers and reject an origin escape',
    () async {
      var requests = 0;
      final api = Api(
        'https://example.test/api/v1',
        store: MemoryStore(),
        transport: MockClient((request) async {
          requests++;
          expect(request.headers['Authorization'], 'Bearer synthetic');
          expect(request.url.path, '/api/v1/me');
          return reply({'data': identity('buyer')});
        }),
      )..token = 'synthetic';
      await api.request('GET', 'me');
      await expectLater(
        api.request('GET', 'https://unrelated.test/me'),
        throwsA(isA<ApiFailure>()),
      );
      await expectLater(
        api.request('GET', '../private'),
        throwsA(isA<ApiFailure>()),
      );
      expect(requests, 1);
      api.close();
    },
  );
  test('interrupted checkout keeps its UUID across client recreation and never auto replays', () async {
    final store = MemoryStore();
    String? firstKey;
    var calls = 0;
    final first = Api(
      'https://example.test/api/v1',
      store: store,
      transport: MockClient((request) async {
        calls++;
        firstKey = jsonDecode(request.body)['checkout_key'] as String;
        throw http.ClientException('Synthetic lost response');
      }),
    )..userId = 7;
    final payload = {
      'address_id': 1,
      'expected_items_subtotal': '100.00',
      'expected_shipping_total': '50.00',
    };
    await expectLater(
      first.intent('checkout', 'orders', payload, keyField: 'checkout_key'),
      throwsA(isA<ApiFailure>()),
    );
    expect(calls, 1);
    expect(await first.pending('checkout'), isNotNull);
    first.close();
    final second = Api(
      'https://example.test/api/v1',
      store: store,
      transport: MockClient((request) async {
        expect(jsonDecode(request.body)['checkout_key'], firstKey);
        return reply({
          'data': {'id': 22},
        }, 201);
      }),
    )..userId = 7;
    await second.intent(
      'checkout',
      'orders',
      payload,
      keyField: 'checkout_key',
    );
    expect(await second.pending('checkout'), isNull);
    second.close();
  });
  test('uncertain intent refuses a changed purchase and remains scoped to its owner', () async {
    final store = MemoryStore();
    final api = Api(
      'https://example.test/api/v1',
      store: store,
      transport: MockClient((_) async => throw http.ClientException('Offline')),
    )..userId = 7;
    await expectLater(
      api.intent('checkout', 'orders', {
        'address_id': 1,
      }, keyField: 'checkout_key'),
      throwsA(isA<ApiFailure>()),
    );
    await expectLater(
      api.intent('checkout', 'orders', {
        'address_id': 2,
      }, keyField: 'checkout_key'),
      throwsA(isA<ApiFailure>().having((e) => e.status, 'conflict', 409)),
    );
    api.userId = 8;
    expect(await api.pending('checkout'), isNull);
    api.close();
  });
  test('a known first validation failure releases an intent but a server error preserves it', () async {
    final store = MemoryStore();
    var status = 422;
    final api = Api(
      'https://example.test/api/v1',
      store: store,
      transport: MockClient(
        (_) async => reply({
          'message': 'Synthetic refusal',
          'errors': {
            'amount': ['Review amount.'],
          },
        }, status),
      ),
    )..userId = 7;
    await expectLater(
      api.intent('event', 'deliveries/1/events', {'action': 'delivered'}),
      throwsA(isA<ApiFailure>()),
    );
    expect(await api.pending('event'), isNull);
    status = 500;
    await expectLater(
      api.intent('event', 'deliveries/1/events', {'action': 'delivered'}),
      throwsA(isA<ApiFailure>()),
    );
    expect(await api.pending('event'), isNotNull);
    api.close();
  });
  test(
    '401 clears secure login state but keeps uncertain purchase records',
    () async {
      final store = MemoryStore();
      await store.write('intent:7:checkout', '{}');
      final api = Api(
        'https://example.test/api/v1',
        store: store,
        transport: MockClient((_) async => reply({'message': 'Expired'}, 401)),
      );
      final session = Session(api);
      await session.accept({
        'access_token': 'synthetic',
        'kind': 'operational',
        'user': identity('buyer'),
      });
      await expectLater(api.request('GET', 'me'), throwsA(isA<ApiFailure>()));
      expect(session.identity, isNull);
      expect(await store.read('session'), isNull);
      expect(await store.read('intent:7:checkout'), isNotNull);
      session.dispose();
      api.close();
    },
  );
  test(
    'offline restore keeps secure credentials for a later explicit retry',
    () async {
      final store = MemoryStore();
      await store.write(
        'session',
        jsonEncode({
          'access_token': 'synthetic',
          'kind': 'operational',
          'user': identity('buyer'),
        }),
      );
      var online = false;
      final api = Api(
        'https://example.test/api/v1',
        store: store,
        transport: MockClient((_) async {
          if (!online) throw http.ClientException('Offline');
          return reply({'data': identity('buyer')});
        }),
      );
      final session = Session(api);
      await session.restore();
      expect(session.restoreError, isNotNull);
      expect(await store.read('session'), isNotNull);
      online = true;
      await session.restore();
      expect(session.role, 'buyer');
      expect(session.restoreError, isNull);
      session.dispose();
      api.close();
    },
  );
  test('raw location arrays and decimal money are parsed without floating point totals', () async {
    final api = Api(
      'https://example.test/api/v1',
      store: MemoryStore(),
      transport: MockClient(
        (_) async => reply([
          {'code': '123456789', 'name': 'Synthetic'},
        ]),
      ),
    );
    expect((await api.list('locations')).single['code'], '123456789');
    expect(cents('100.25'), 10025);
    expect(cents('0.05'), 5);
    expect(cents('-20.50'), -2050);
    expect(cents('1.234'), 0);
    api.close();
  });
}
