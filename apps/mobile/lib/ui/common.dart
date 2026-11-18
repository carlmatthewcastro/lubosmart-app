import 'dart:async';

import 'package:flutter/material.dart';

import '../core/api.dart';

String shortReference(dynamic reference) {
  final value = reference?.toString() ?? 'Awaiting reference';
  return value.length > 23 ? '${value.substring(0, 23)}…' : value;
}

String localEventTime(dynamic value) {
  final raw = '$value';
  final zoned = RegExp(r'(Z|[+-]\d{2}:?\d{2})$').hasMatch(raw);
  final date = DateTime.tryParse(zoned ? raw : '${raw.replaceFirst(' ', 'T')}Z')
      ?.toUtc()
      .add(const Duration(hours: 8));
  if (date == null) return '';
  return '${date.month}/${date.day}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')} PHT';
}

String addressText(dynamic value) {
  if (value is! Map) return 'Available at the appropriate handover.';
  final parts = ['name', 'line1', 'barangay', 'city', 'province', 'phone']
      .map((key) => value[key]?.toString())
      .whereType<String>()
      .where((part) => part.isNotEmpty)
      .toList();
  return parts.isEmpty
      ? 'Available at the appropriate handover.'
      : parts.join(', ');
}

Future<bool> confirm(
  BuildContext context,
  String title,
  String explanation,
) async =>
    await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(explanation),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Go back'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    ) ??
    false;
void feedback(BuildContext context, Object message) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text('$message')));
}

Future<void> open(BuildContext context, Widget page) =>
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));

class Loading extends StatelessWidget {
  const Loading({super.key});
  @override
  Widget build(BuildContext context) => const Center(
    child: Padding(
      padding: EdgeInsets.all(32),
      child: CircularProgressIndicator(),
    ),
  );
}

class UploadStatus extends StatelessWidget {
  final Api api;
  const UploadStatus(this.api, {super.key});
  @override
  Widget build(BuildContext context) => ValueListenableBuilder<double?>(
    valueListenable: api.uploadProgress,
    builder: (context, value, _) => value == null
        ? const SizedBox.shrink()
        : Semantics(
            liveRegion: true,
            child: Column(
              children: [
                LinearProgressIndicator(value: value < 1 ? value : null),
                Text(
                  value < 1
                      ? 'Uploading photo: ${(value * 100).round()}%'
                      : 'Upload sent. Confirming parcel status…',
                ),
              ],
            ),
          ),
  );
}

class Failure extends StatelessWidget {
  final Object error;
  final VoidCallback retry;
  const Failure(this.error, this.retry, {super.key});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(24),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('$error', textAlign: TextAlign.center),
        const SizedBox(height: 16),
        OutlinedButton(onPressed: retry, child: const Text('Try again')),
      ],
    ),
  );
}

class PageFrame extends StatelessWidget {
  final String title;
  final Widget child;
  final List<Widget>? actions;
  final Widget? appBarTitle;
  final bool showAppBar;
  const PageFrame(
    this.title,
    this.child, {
    this.actions,
    this.appBarTitle,
    this.showAppBar = true,
    super.key,
  });
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar:
        !showAppBar || title == 'LubosMart Rider' || title == 'Rider dashboard'
        ? null
        : AppBar(title: appBarTitle ?? Text(title), actions: actions),
    body: SafeArea(child: child),
  );
}

class ResourcePage extends StatefulWidget {
  final Api api;
  final String path, title;
  final Widget Function(BuildContext, Json, VoidCallback) builder;
  final List<Widget>? actions;
  final Widget? appBarTitle;
  final bool showAppBar;
  const ResourcePage({
    required this.api,
    required this.path,
    required this.title,
    required this.builder,
    this.actions,
    this.appBarTitle,
    this.showAppBar = true,
    super.key,
  });
  @override
  State<ResourcePage> createState() => _ResourcePageState();
}

class _ResourcePageState extends State<ResourcePage>
    with WidgetsBindingObserver {
  late Future<Json> data;
  late String path;
  Timer? timer;
  bool foreground = true;
  @override
  void initState() {
    super.initState();
    path = widget.path;
    WidgetsBinding.instance.addObserver(this);
    timer = Timer.periodic(const Duration(seconds: 12), (_) {
      if (mounted && foreground && ModalRoute.of(context)?.isCurrent == true) {
        reload();
      }
    });
    reload();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    foreground = state == AppLifecycleState.resumed;
    if (foreground) reload();
  }

  @override
  void dispose() {
    timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void reload() {
    setState(() {
      data = widget.api.request('GET', path);
    });
  }

  @override
  Widget build(BuildContext context) => PageFrame(
    widget.title,
    FutureBuilder(
      future: data,
      builder: (context, snapshot) {
        if (snapshot.hasError) return Failure(snapshot.error!, reload);
        if (!snapshot.hasData) return const Loading();
        final payload = snapshot.data!;
        final nested = payload['data'] is Map
            ? payload['data'] as Map
            : payload;
        final previous = payload['links']?['prev'] ?? nested['prev_page_url'];
        final next = payload['links']?['next'] ?? nested['next_page_url'];
        return RefreshIndicator(
          onRefresh: () async {
            reload();
            try {
              await data;
            } catch (_) {
              // FutureBuilder displays the error and keeps pull-to-refresh usable.
            }
          },
          child: ListView(
            key: ValueKey(path),
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              widget.builder(context, snapshot.data!, reload),
              if (previous != null || next != null)
                Wrap(
                  spacing: 16,
                  children: [
                    if (previous != null)
                      OutlinedButton(
                        onPressed: () {
                          path = '$previous';
                          reload();
                        },
                        child: const Text('Previous page'),
                      ),
                    if (next != null)
                      OutlinedButton(
                        onPressed: () {
                          path = '$next';
                          reload();
                        },
                        child: const Text('Next page'),
                      ),
                  ],
                ),
            ],
          ),
        );
      },
    ),
    actions: widget.actions,
    appBarTitle: widget.appBarTitle,
    showAppBar: widget.showAppBar,
  );
}

class InfoCard extends StatelessWidget {
  final String? status;
  final String title;
  final String? subtitle;
  final Widget? child;
  final VoidCallback? onTap;
  const InfoCard(
    this.title, {
    this.status,
    this.subtitle,
    this.child,
    this.onTap,
    super.key,
  });
  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 16),
    child: InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                if (onTap != null) const Icon(Icons.chevron_right, size: 20),
              ],
            ),
            if (status != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Chip(
                  avatar: Icon(
                    status == 'delivered'
                        ? Icons.check_circle_outline
                        : Icons.inventory_2_outlined,
                    size: 18,
                  ),
                  label: Text(status!.replaceAll('_', ' ')),
                  side: BorderSide.none,
                  backgroundColor:
                      Theme.of(context).brightness == Brightness.dark
                      ? const Color(0xff49321b)
                      : const Color(0xffffeedc),
                ),
              ),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(subtitle!),
            ],
            if (child != null) ...[const SizedBox(height: 12), child!],
          ],
        ),
      ),
    ),
  );
}

class ActionButton extends StatefulWidget {
  final String label;
  final Future<void> Function() action;
  final bool outlined;
  final bool enabled;
  final Widget? leading;
  final Widget? trailing;
  final bool showProgressIndicator;
  final TextStyle? textStyle;
  const ActionButton(
    this.label,
    this.action, {
    this.outlined = false,
    this.enabled = true,
    this.leading,
    this.trailing,
    this.showProgressIndicator = false,
    this.textStyle,
    super.key,
  });
  @override
  State<ActionButton> createState() => _ActionButtonState();
}

class _ActionButtonState extends State<ActionButton> {
  bool busy = false;
  Future<void> run() async {
    if (busy) return;
    setState(() => busy = true);
    try {
      await widget.action();
    } catch (error) {
      if (mounted) feedback(context, error);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = busy ? 'Please wait…' : widget.label;
    final style = widget.textStyle;
    final content = busy && widget.showProgressIndicator
        ? Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: widget.outlined
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).colorScheme.onPrimary,
                ),
              ),
              const SizedBox(width: 8),
              Text(text, style: style),
            ],
          )
        : widget.leading == null && widget.trailing == null
        ? Text(text, style: style)
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (widget.leading != null) ...[
                widget.leading!,
                const SizedBox(width: 8),
              ],
              Text(text, style: style),
              if (widget.trailing != null) ...[
                const SizedBox(width: 8),
                widget.trailing!,
              ],
            ],
          );
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: widget.outlined
          ? OutlinedButton(
              onPressed: busy || !widget.enabled ? null : run,
              child: content,
            )
          : FilledButton(
              onPressed: busy || !widget.enabled ? null : run,
              child: content,
            ),
    );
  }
}

class InputSpec {
  final String keyName, label;
  final String initial;
  final bool required, secret, number, multiline;
  final Map<String, String>? options;
  const InputSpec(
    this.keyName,
    this.label, {
    this.initial = '',
    this.required = true,
    this.secret = false,
    this.number = false,
    this.multiline = false,
    this.options,
  });
}

class EditPage extends StatefulWidget {
  final String title, submitLabel;
  final List<InputSpec> fields;
  final Future<void> Function(Json) submit;
  const EditPage({
    required this.title,
    required this.fields,
    required this.submit,
    this.submitLabel = 'Save',
    super.key,
  });
  @override
  State<EditPage> createState() => _EditPageState();
}

class _EditPageState extends State<EditPage> {
  final form = GlobalKey<FormState>();
  late final Map<String, TextEditingController> controllers = {
    for (final f in widget.fields)
      f.keyName: TextEditingController(text: f.initial),
  };
  String? error;
  @override
  void dispose() {
    for (final controller in controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PageFrame(
    widget.title,
    Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Semantics(
                liveRegion: true,
                child: Text(
                  error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            ),
          for (final field in widget.fields)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: field.options != null
                  ? DropdownButtonFormField<String>(
                      initialValue: field.initial.isEmpty
                          ? null
                          : field.initial,
                      isExpanded: true,
                      decoration: InputDecoration(labelText: field.label),
                      items: field.options!.entries
                          .map(
                            (e) => DropdownMenuItem(
                              value: e.key,
                              child: Text(e.value),
                            ),
                          )
                          .toList(),
                      onChanged: (v) =>
                          controllers[field.keyName]!.text = v ?? '',
                      validator: (v) =>
                          field.required && (v == null || v.isEmpty)
                          ? 'Choose ${field.label.toLowerCase()}.'
                          : null,
                    )
                  : TextFormField(
                      controller: controllers[field.keyName],
                      obscureText: field.secret,
                      maxLines: field.multiline ? 4 : 1,
                      keyboardType: field.number
                          ? const TextInputType.numberWithOptions(decimal: true)
                          : TextInputType.text,
                      decoration: InputDecoration(labelText: field.label),
                      validator: (v) =>
                          field.required && (v == null || v.trim().isEmpty)
                          ? 'Enter ${field.label.toLowerCase()}.'
                          : null,
                    ),
            ),
          ActionButton(widget.submitLabel, () async {
            if (!form.currentState!.validate()) return;
            setState(() => error = null);
            try {
              await widget.submit({
                for (final f in widget.fields)
                  if (f.required || controllers[f.keyName]!.text.isNotEmpty)
                    f.keyName: controllers[f.keyName]!.text,
              });
              if (context.mounted) Navigator.pop(context);
            } catch (failure) {
              if (mounted) setState(() => error = '$failure');
            }
          }),
        ],
      ),
    ),
  );
}
