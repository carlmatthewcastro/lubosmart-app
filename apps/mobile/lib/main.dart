import 'package:flutter/material.dart';

import 'core/api.dart';
import 'features/accounts.dart';
import 'features/buyer.dart';
import 'features/seller.dart';
import 'features/work.dart';
import 'features/community.dart';
import 'ui/common.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    runApp(
      LubosMartApp(
        Session(
          Api(
            const String.fromEnvironment(
              'API_BASE_URL',
              defaultValue: 'http://10.0.2.2:8000/api/v1',
            ),
          ),
        ),
      ),
    );
  } catch (error) {
    runApp(
      MaterialApp(
        home: Scaffold(
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text('$error'),
            ),
          ),
        ),
      ),
    );
  }
}

class LubosMartApp extends StatefulWidget {
  final Session session;
  const LubosMartApp(this.session, {super.key});
  @override
  State<LubosMartApp> createState() => _LubosMartAppState();
}

class _LubosMartAppState extends State<LubosMartApp> {
  ThemeMode appearance = ThemeMode.system;
  @override
  void initState() {
    super.initState();
    widget.session.restore();
    restoreAppearance();
  }

  Future<void> restoreAppearance() async {
    final saved = await widget.session.api.store.read('appearance');
    if (mounted && saved != null) {
      setState(
        () => appearance = saved == 'dark' ? ThemeMode.dark : ThemeMode.light,
      );
    }
  }

  void toggleAppearance() {
    final dark =
        appearance == ThemeMode.dark ||
        (appearance == ThemeMode.system &&
            WidgetsBinding.instance.platformDispatcher.platformBrightness ==
                Brightness.dark);
    setState(() => appearance = dark ? ThemeMode.light : ThemeMode.dark);
    widget.session.api.store.write('appearance', dark ? 'light' : 'dark');
  }

  ThemeData theme(Brightness brightness) {
    const purple = Color(0xff6e47b3);
    final scheme = ColorScheme.fromSeed(
      seedColor: purple,
      brightness: brightness,
    );
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme.copyWith(
        primary: brightness == Brightness.light ? purple : scheme.primary,
      ),
      fontFamily: 'InstrumentSans',
      scaffoldBackgroundColor: brightness == Brightness.light
          ? const Color(0xfff7f4fc)
          : const Color(0xff16101f),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(14)),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(minimumSize: const Size(44, 48)),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(minimumSize: const Size(44, 48)),
      ),
      cardTheme: const CardThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.session,
    builder: (context, _) {
      final session = widget.session;
      final Widget page;
      if (session.restoring) {
        page = const Scaffold(body: Loading());
      } else if (session.restoreError != null) {
        page = Scaffold(
          body: SafeArea(
            child: Failure(session.restoreError!, session.restore),
          ),
        );
      } else if (session.identity == null) {
        page = LoginPage(session);
      } else if (session.kind == 'onboarding') {
        page = OnboardingPage(session);
      } else {
        page = RoleHome(session, toggleAppearance);
      }
      return MaterialApp(
        key: ValueKey('${session.identity?['id']}:${session.kind}'),
        title: 'LubosMart',
        debugShowCheckedModeBanner: false,
        theme: theme(Brightness.light),
        darkTheme: theme(Brightness.dark),
        themeMode: appearance,
        home: page,
      );
    },
  );
}

class RoleHome extends StatefulWidget {
  final Session session;
  final VoidCallback toggleTheme;
  const RoleHome(this.session, this.toggleTheme, {super.key});
  @override
  State<RoleHome> createState() => _RoleHomeState();
}

class _RoleHomeState extends State<RoleHome> {
  int tab = 0;
  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    final api = session.api;
    final pages = switch (session.role) {
      'buyer' => <Widget>[
        CatalogPage(api),
        OrdersPage(api, 'buyer'),
        SupportPage(api),
        AccountPage(session, widget.toggleTheme),
      ],
      'seller' => <Widget>[
        OrdersPage(api, 'seller'),
        InventoryPage(api),
        CostsPage(api),
        AccountPage(session, widget.toggleTheme),
      ],
      'rider' => <Widget>[
        DeliveriesPage(api),
        ReturnsPage(api),
        EarningsPage(api),
        AccountPage(session, widget.toggleTheme),
      ],
      _ => <Widget>[
        const Center(child: Text('This account uses the LubosMart website.')),
      ],
    };
    final labels = switch (session.role) {
      'buyer' => ['Discover', 'Purchases', 'Messages', 'Account'],
      'seller' => ['Orders', 'Inventory', 'Finance', 'Account'],
      _ => ['Parcels', 'Returns', 'Earnings', 'Account'],
    };
    final icons = switch (session.role) {
      'buyer' => [
        Icons.storefront_outlined,
        Icons.shopping_bag_outlined,
        Icons.chat_bubble_outline,
        Icons.person_outline,
      ],
      'seller' => [
        Icons.receipt_long_outlined,
        Icons.inventory_2_outlined,
        Icons.account_balance_wallet_outlined,
        Icons.person_outline,
      ],
      _ => [
        Icons.local_shipping_outlined,
        Icons.assignment_return_outlined,
        Icons.payments_outlined,
        Icons.person_outline,
      ],
    };
    return Scaffold(
      body: pages[tab.clamp(0, pages.length - 1)],
      bottomNavigationBar: pages.length == 1
          ? null
          : NavigationBar(
              selectedIndex: tab,
              onDestinationSelected: (index) => setState(() => tab = index),
              destinations: [
                for (var index = 0; index < labels.length; index++)
                  NavigationDestination(
                    icon: Icon(icons[index]),
                    label: labels[index],
                  ),
              ],
            ),
    );
  }
}
