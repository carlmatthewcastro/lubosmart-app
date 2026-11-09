import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

typedef Json = Map<String, dynamic>;

abstract class PrivateStore {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

class DeviceStore implements PrivateStore {
  final FlutterSecureStorage storage;
  DeviceStore([this.storage = const FlutterSecureStorage()]);
  @override
  Future<String?> read(String key) => storage.read(key: key);
  @override
  Future<void> write(String key, String value) =>
      storage.write(key: key, value: value);
  @override
  Future<void> delete(String key) => storage.delete(key: key);
}

class ApiFailure implements Exception {
  final int status;
  final String message;
  final Json fields;
  const ApiFailure(this.status, this.message, [this.fields = const {}]);
  @override
  String toString() => fields.isEmpty
      ? message
      : '$message\n${fields.entries.map((e) => '${e.key.replaceAll('_', ' ')}: ${(e.value as List).join(' ')}').join('\n')}';
}

class Api {
  final Uri base;
  final http.Client transport;
  final PrivateStore store;
  String? token;
  int? userId;
  Future<void> Function()? onUnauthorized;
  Api(String origin, {http.Client? transport, PrivateStore? store})
    : base = Uri.parse('${origin.replaceFirst(RegExp(r'/$'), '')}/'),
      transport = transport ?? http.Client(),
      store = store ?? DeviceStore() {
    if (base.host.isEmpty ||
        base.userInfo.isNotEmpty ||
        base.hasQuery ||
        base.hasFragment ||
        (base.scheme != 'https' && (kReleaseMode || base.scheme != 'http'))) {
      throw const ApiFailure(
        0,
        'The service connection is not configured. Contact support.',
      );
    }
  }
  Uri url(String path) {
    final uri = base.resolve(path.replaceFirst(RegExp(r'^/'), ''));
    if (uri.origin != base.origin || !uri.path.startsWith(base.path)) {
      throw const ApiFailure(0, 'Invalid service address.');
    }
    return uri;
  }

  Future<http.Response> _send(
    String method,
    String path,
    Json? body,
    Map<String, String> files,
  ) async {
    final headers = {
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    try {
      if (files.isNotEmpty) {
        final request = http.MultipartRequest('POST', url(path))
          ..headers.addAll(headers);
        request.fields.addAll({
          if (method != 'POST') '_method': method,
          ...?body?.map(
            (k, v) => MapEntry(k, v is Map || v is List ? jsonEncode(v) : '$v'),
          ),
        });
        for (final file in files.entries) {
          request.files.add(
            await http.MultipartFile.fromPath(file.key, file.value),
          );
        }
        return await http.Response.fromStream(
          await transport.send(request).timeout(const Duration(seconds: 30)),
        ).timeout(const Duration(seconds: 30));
      }
      final request = http.Request(method, url(path))..headers.addAll(headers);
      if (body != null) {
        request.headers['Content-Type'] = 'application/json';
        request.body = jsonEncode(body);
      }
      return await http.Response.fromStream(
        await transport.send(request).timeout(const Duration(seconds: 25)),
      ).timeout(const Duration(seconds: 25));
    } on TimeoutException {
      throw const ApiFailure(
        0,
        'The response was interrupted. Check your connection, then retry the same action.',
      );
    } on FileSystemException {
      throw const ApiFailure(
        422,
        'The selected file is no longer available. Choose it again before retrying.',
      );
    } on http.ClientException {
      throw const ApiFailure(
        0,
        'Cannot reach LubosMart. Check your connection and retry.',
      );
    }
  }

  Future<Json> request(
    String method,
    String path, {
    Json? body,
    Map<String, String> files = const {},
  }) async {
    final response = await _send(method, path, body, files);
    if (response.statusCode == 204) return {};
    Json decoded;
    try {
      final raw = jsonDecode(response.body);
      decoded = raw is List ? {'data': raw} : Json.from(raw as Map);
    } catch (_) {
      throw const ApiFailure(
        0,
        'The service returned an unreadable response. Please retry later.',
      );
    }
    if (response.statusCode >= 400) {
      if (response.statusCode == 401 && token != null) {
        await onUnauthorized?.call();
      }
      throw ApiFailure(
        response.statusCode,
        decoded['message']?.toString() ?? 'Request could not be completed.',
        (decoded['errors'] as Json?) ?? {},
      );
    }
    return decoded;
  }

  Future<List<Json>> list(String path) async =>
      rows((await request('GET', path))['data']);
  Future<Uint8List> bytes(String path) async {
    final response = await _send('GET', path, null, {});
    if (response.statusCode >= 400) {
      if (response.statusCode == 401) await onUnauthorized?.call();
      throw ApiFailure(
        response.statusCode,
        'You cannot open this private file.',
      );
    }
    return response.bodyBytes;
  }

  String _intentKey(String tag) => 'intent:$userId:$tag';
  Future<Json?> pending(String tag) async {
    final saved = await store.read(_intentKey(tag));
    return saved == null ? null : jsonDecode(saved) as Json;
  }

  Future<Json> intent(
    String tag,
    String path,
    Json payload, {
    String keyField = 'request_key',
    Map<String, String> files = const {},
  }) async {
    if (userId == null) throw const ApiFailure(401, 'Please sign in again.');
    final key = _intentKey(tag);
    final existing = await pending(tag);
    if (existing != null &&
        (existing['path'] != path ||
            jsonEncode(existing['payload']) != jsonEncode(payload))) {
      throw const ApiFailure(
        409,
        'An earlier action is awaiting confirmation. Retry it before changing the details.',
      );
    }
    final saved =
        existing ??
        {
          'path': path,
          'payload': payload,
          'uuid': const Uuid().v4(),
          'files': files,
        };
    if (files.isNotEmpty) saved['files'] = files;
    await store.write(key, jsonEncode(saved));
    try {
      final response = await request(
        'POST',
        path,
        body: {...payload, keyField: saved['uuid']},
        files: Map<String, String>.from(saved['files'] as Map),
      );
      await store.delete(key);
      return response;
    } on ApiFailure catch (error) {
      // A known refusal has no committed effect. An interrupted/500 response remains uncertain.
      if (existing == null &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status != 401 &&
          error.status != 403) {
        await store.delete(key);
      }
      rethrow;
    }
  }

  void close() => transport.close();
}

List<Json> rows(dynamic value) {
  if (value is List) return value.map((v) => Json.from(v as Map)).toList();
  if (value is Map) return rows(value['data']);
  return [];
}

int cents(dynamic value) {
  final match = RegExp(r'^(-?)(\d+)(?:\.(\d{1,2}))?$').firstMatch('$value');
  if (match == null) return 0;
  return (match[1] == '-' ? -1 : 1) *
      (int.parse(match[2]!) * 100 +
          int.parse((match[3] ?? '').padRight(2, '0')));
}

String pesos(int amount) => 'PHP ${(amount / 100).toStringAsFixed(2)}';

class Session extends ChangeNotifier {
  final Api api;
  Json? identity;
  String? kind;
  bool restoring = true;
  String? restoreError;
  Session(this.api) {
    api.onUnauthorized = clear;
  }
  String get role => identity?['role']?.toString() ?? '';
  Future<void> accept(Json data) async {
    api.token = data['access_token'] as String;
    identity = Json.from(data['user'] as Map);
    api.userId = identity!['id'] as int;
    kind = data['kind'] as String? ?? 'operational';
    await api.store.write('session', jsonEncode(data));
    restoreError = null;
    notifyListeners();
  }

  Future<void> restore() async {
    restoring = true;
    restoreError = null;
    notifyListeners();
    try {
      final saved = await api.store.read('session');
      if (saved != null) {
        final data = jsonDecode(saved) as Json;
        api.token = data['access_token'] as String;
        kind = data['kind'] as String? ?? 'operational';
        final response = await api.request(
          'GET',
          kind == 'onboarding' ? 'onboarding/status' : 'me',
        );
        identity = Json.from(
          kind == 'onboarding'
              ? response['data']['user'] as Map
              : response['data'] as Map,
        );
        api.userId = identity!['id'] as int;
      }
    } on ApiFailure catch (error) {
      if (error.status == 401 || error.status == 403) {
        await clear();
      } else {
        identity = null;
        restoreError = error.message;
      }
    } catch (_) {
      await clear();
    }
    restoring = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final response = await api.request(
      'POST',
      'auth/session',
      body: {
        'email': email.trim(),
        'password': password,
        'device_name': 'LubosMart Flutter',
      },
    );
    await accept(Json.from(response['data'] as Map));
  }

  Future<void> logout() async {
    // Keep local intent records so uncertain purchases can be recovered after signing in again.
    await api.request(
      'DELETE',
      kind == 'onboarding' ? 'onboarding/token' : 'auth/token',
    );
    await clear();
  }

  Future<void> clear() async {
    api.token = null;
    api.userId = null;
    identity = null;
    kind = null;
    await api.store.delete('session');
    notifyListeners();
  }
}
