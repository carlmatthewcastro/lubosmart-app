import 'package:flutter/material.dart';

import 'core/api.dart';
import 'main.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    LubosMartApp(
      Session(
        Api(
          const String.fromEnvironment(
            'API_BASE_URL',
            defaultValue: 'https://lubosmart.app/api/v1',
          ),
        ),
        riderOnly: true,
      ),
    ),
  );
}
