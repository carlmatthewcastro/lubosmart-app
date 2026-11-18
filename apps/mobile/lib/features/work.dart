import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/rider_design.dart';

String readable(String value) => value.replaceAll('_', ' ');

Future<String?> captureRiderProof() async {
  try {
    final image = await ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
      maxWidth: 1800,
    );
    if (image == null) return null;
    if (await File(image.path).length() > 5120 * 1024) {
      throw const ApiFailure(422, 'Photo exceeds 5 MB. Retake the photo.');
    }
    return image.path;
  } on PlatformException {
    throw const ApiFailure(
      422,
      'Camera unavailable. Allow camera access in Android app settings, then retry taking the photo.',
    );
  }
}

Future<void> privateFile(BuildContext context, Api api, String path) async {
  final bytes = await api.bytes(path);
  if (!context.mounted) return;
  if (bytes.length > 4 && String.fromCharCodes(bytes.take(4)) == '%PDF') {
    await Printing.layoutPdf(onLayout: (_) async => bytes);
  } else {
    await open(
      context,
      PageFrame(
        'Private evidence',
        InteractiveViewer(
          child: Center(
            child: Image.memory(
              bytes,
              errorBuilder: (_, _, _) =>
                  const Text('This file cannot be previewed. Contact support.'),
            ),
          ),
        ),
      ),
    );
  }
}

Future<Uint8List> waybillPdf(Json parcel) async {
  final font = pw.Font.ttf(
    await rootBundle.load('assets/fonts/InstrumentSans.ttf'),
  );
  final document = pw.Document(
    theme: pw.ThemeData.withFont(base: font, bold: font),
  );
  final recipient = Json.from(parcel['recipient'] as Map);
  final tracking = '${parcel['delivery']?['tracking_reference'] ?? ''}';
  document.addPage(
    pw.Page(
      pageFormat: PdfPageFormat.a6,
      build: (_) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            'LubosMart',
            style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold),
          ),
          pw.Text('Parcel #${parcel['id']} | ${parcel['store']?['name']}'),
          pw.SizedBox(height: 12),
          pw.Text('${recipient['name']} | ${recipient['phone']}'),
          pw.Text('${recipient['line1']} ${recipient['line2'] ?? ''}'),
          pw.Text(
            '${recipient['barangay']}, ${recipient['city']}, ${recipient['province']} ${recipient['zip']}',
          ),
          pw.SizedBox(height: 12),
          pw.Text(
            'COD: PHP ${parcel['cod_total']}',
            style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold),
          ),
          pw.SizedBox(height: 12),
          pw.BarcodeWidget(
            textStyle: pw.TextStyle(font: font, fontSize: 8),
            barcode: pw.Barcode.code128(),
            data: tracking,
            height: 56,
          ),
          pw.SizedBox(height: 12),
          pw.Text(
            'One label per physical parcel. Keep this identity on reprints.',
          ),
        ],
      ),
    ),
  );
  return document.save();
}

class OrdersPage extends StatelessWidget {
  final Api api;
  final String role;
  const OrdersPage(this.api, this.role, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: role == 'seller' ? 'seller/orders' : 'orders',
    title: role == 'seller' ? 'Store orders' : 'Your purchases',
    builder: (context, result, reload) {
      final orders = rows(result['data']);
      return Column(
        children: [
          if (orders.isEmpty)
            const InfoCard(
              'No orders yet',
              subtitle: 'Pull down to check for new activity.',
            ),
          for (final order in orders) ...[
            if (role == 'buyer')
              InfoCard(
                'Purchase #${order['id']}',
                subtitle:
                    '${readable('${order['status']}')} · ${pesos(cents(order['total']))}',
                child: order['can_cancel'] == true
                    ? ActionButton('Cancel purchase', () async {
                        if (!await confirm(
                          context,
                          'Cancel this purchase?',
                          'Items will be removed from fulfillment and stock restored.',
                        )) {
                          return;
                        }
                        await api.request(
                          'POST',
                          'orders/${order['id']}/cancel',
                        );
                        reload();
                      }, outlined: true)
                    : null,
              ),
            for (final parcel
                in role == 'seller' ? [order] : rows(order['parcels']))
              parcelCard(context, parcel, reload),
          ],
        ],
      );
    },
  );
  Widget parcelCard(BuildContext context, Json parcel, VoidCallback reload) {
    final delivery = parcel['delivery'] as Json?;
    return InfoCard(
      'Parcel #${parcel['id']} · ${parcel['store']?['name']}',
      subtitle:
          '${readable('${parcel['status']}')}\n${delivery?['tracking_reference'] ?? 'Awaiting tracking'}\nParcel COD: ${pesos(cents(parcel['cod_total']))}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final item in rows(parcel['items']))
            Text(
              '${item['quantity']} × ${item['product_name']}${item['variant_name'] == null ? '' : ' · ${item['variant_name']}'}',
            ),
          if (role == 'seller') ...[
            for (final action in (parcel['allowed_actions'] as List? ?? []))
              ActionButton(
                action == 'processing'
                    ? 'Start preparation'
                    : 'Mark ready for pickup',
                () async {
                  if (!await confirm(
                    context,
                    'Update preparation?',
                    action == 'processing' ? 'Begin packing this parcel.' : 'Confirm this parcel is packed and ready for physical pickup.',
                  )) {
                    return;
                  }
                  await api.request(
                    'PATCH',
                    'seller/orders/${parcel['id']}',
                    body: {'status': action},
                  );
                  reload();
                },
              ),
            ActionButton('Review and print waybill', () async {
              final latest =
                  (await api.request(
                        'GET',
                        'seller/orders/${parcel['id']}/waybill',
                      ))['data']
                      as Json;
              if (!context.mounted ||
                  !await confirm(
                    context,
                    'Print one waybill?',
                    'Check recipient, tracking and COD. Attach one label to this physical parcel; a print request does not confirm actual printing.',
                  )) {
                return;
              }
              await api.intent(
                'print:${parcel['id']}',
                'seller/orders/${parcel['id']}/waybill',
                {'packages': 1},
              );
              await Printing.layoutPdf(onLayout: (_) => waybillPdf(latest));
            }, outlined: true),
          ],
          if (role == 'buyer' && delivery?['status'] == 'delivered') ...[
            for (final item in rows(parcel['items']))
              ActionButton(
                'Rate / edit review: ${item['product_name']}',
                () => open(
                  context,
                  EditPage(
                    title: 'Review delivered item',
                    fields: const [
                      InputSpec('rating', 'Rating (1–5)', number: true),
                      InputSpec('body', 'Your review', multiline: true),
                    ],
                    submit: (data) async {
                      await api.request(
                        'PUT',
                        'order-items/${item['id']}/review',
                        body: data,
                      );
                      reload();
                    },
                  ),
                ),
                outlined: true,
              ),
            ActionButton(
              'Request a return',
              () => open(
                context,
                EditPage(
                  title: 'Request whole-parcel return',
                  fields: const [
                    InputSpec(
                      'reason',
                      'Reason (at least 10 characters)',
                      multiline: true,
                    ),
                  ],
                  submit: (data) async {
                    await api.request(
                      'POST',
                      'returns',
                      body: {...data, 'seller_order_id': parcel['id']},
                    );
                    reload();
                  },
                ),
              ),
              outlined: true,
            ),
          ],
          if (delivery?['has_proof'] == true)
            ActionButton(
              'View private delivery proof',
              () => privateFile(
                context,
                api,
                'deliveries/${delivery!['id']}/proof',
              ),
              outlined: true,
            ),
          ActionButton(
            'Parcel conversation',
            () => open(context, ConversationPage(api, parcel['id'] as int)),
            outlined: true,
          ),
          if (delivery?['notes'] != null)
            Text('Delivery notes: ${delivery!['notes']}'),
          if (delivery != null) ...[
            Text(
              'Delivery: ${readable('${delivery['fulfillment_status'] ?? delivery['status']}')}',
            ),
            for (final stage in {
              'picked_up_at': 'Collected',
              'received_at': 'Received at center',
              'sorted_at': 'Sorted',
              'dispatch_accepted_at': 'Dispatch accepted',
              'delivered_at': 'Delivered',
            }.entries)
              if (delivery[stage.key] != null)
                Text('${stage.value}: ${delivery[stage.key]}'),
          ],
        ],
      ),
    );
  }
}

class ConversationPage extends StatefulWidget {
  final Api api;
  final int parcel;
  const ConversationPage(this.api, this.parcel, {super.key});
  @override
  State<ConversationPage> createState() => _ConversationPageState();
}

class _ConversationPageState extends State<ConversationPage> {
  final message = TextEditingController();
  int revision = 0;
  @override
  void dispose() {
    message.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ResourcePage(
    key: ValueKey(revision),
    api: widget.api,
    path: 'parcels/${widget.parcel}/messages',
    title: 'Parcel conversation',
    builder: (context, data, reload) => Column(
      children: [
        for (final item in rows(data['data']).reversed)
          InfoCard('${item['author_name']}', subtitle: '${item['body']}'),
        TextField(
          controller: message,
          maxLines: 4,
          maxLength: 2000,
          decoration: const InputDecoration(labelText: 'Your message'),
        ),
        ActionButton('Send message', () async {
          await widget.api.request(
            'POST',
            'parcels/${widget.parcel}/messages',
            body: {'body': message.text},
          );
          message.clear();
          if (mounted) setState(() => revision++);
        }),
      ],
    ),
  );
}

class DeliveriesPage extends StatelessWidget {
  final Api api;
  const DeliveriesPage(this.api, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: 'deliveries',
    title: 'Your assigned parcels',
    builder: (context, data, reload) => Column(
      children: [
        if (rows(data['data']).isEmpty)
          const InfoCard(
            'No assigned parcels',
            subtitle: 'Your Logistics company assigns eligible work.',
          ),
        for (final delivery in rows(data['data']))
          InfoCard(
            '${delivery['tracking_reference']}',
            subtitle:
                '${readable('${delivery['status']}')}\n${delivery['parcel']?['recipient']?['city']} · COD ${delivery['parcel']?['cod_total']}',
            onTap: () async {
              await open(context, DeliveryPage(api, delivery['id'] as int));
              reload();
            },
          ),
      ],
    ),
  );
}

class ScanPage extends StatefulWidget {
  const ScanPage({super.key});
  @override
  State<ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends State<ScanPage> {
  final controller = MobileScannerController(
    formats: [BarcodeFormat.qrCode],
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  bool returned = false;
  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PageFrame(
    'Scan parcel QR code',
    Column(
      children: [
        const Padding(
          padding: EdgeInsets.all(16),
          child: Text(
            'Place the parcel QR label inside the frame. Camera access is required to verify the physical handover.',
          ),
        ),
        Expanded(
          child: Stack(
            alignment: Alignment.center,
            children: [
              MobileScanner(
                controller: controller,
                errorBuilder: (context, error) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Camera unavailable. Allow camera access in Android Settings → Apps → LubosMart Rider → Permissions, then return and retry.',
                        ),
                        ActionButton('Retry camera', () => controller.start()),
                      ],
                    ),
                  ),
                ),
                onDetect: (capture) {
                  final value = capture.barcodes.firstOrNull?.rawValue;
                  if (!returned && value != null && value.isNotEmpty) {
                    returned = true;
                    Navigator.pop(context, value);
                  }
                },
              ),
              IgnorePointer(
                child: Container(
                  width: 250,
                  height: 250,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.white, width: 3),
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ],
          ),
        ),
        TextButton.icon(
          onPressed: () => controller.toggleTorch(),
          icon: const Icon(Icons.flash_on),
          label: const Text('Toggle flashlight'),
        ),
      ],
    ),
  );
}

class DeliveryPage extends StatefulWidget {
  final Api api;
  final int id;
  final String? scannedReference;
  final bool riderPresentation;
  final String? pageTitle;
  const DeliveryPage(
    this.api,
    this.id, {
    this.scannedReference,
    this.riderPresentation = false,
    this.pageTitle,
    super.key,
  });
  @override
  State<DeliveryPage> createState() => _DeliveryPageState();
}

class _DeliveryPageState extends State<DeliveryPage> {
  final tracking = TextEditingController(),
      reason = TextEditingController(),
      recipient = TextEditingController();
  String method = 'manual';
  String? photo;
  String note = '', outcome = '';
  bool codConfirmed = false;
  String receiptCondition = '';
  bool recovering = false;
  @override
  void initState() {
    super.initState();
    if (widget.scannedReference != null) {
      tracking.text = widget.scannedReference!;
      method = 'scanner';
    }
    restorePending();
  }

  Future<void> restorePending() async {
    try {
      for (final action in [
        'delivered',
        'failed_attempt',
        'picked_up',
        'accept_dispatch',
        'accept_transfer',
        'out_for_delivery',
      ]) {
        final pending = await widget.api.pending(
          'delivery:${widget.id}:$action',
        );
        if (pending == null || !mounted) continue;
        final payload = pending['payload'] as Map;
        setState(() {
          recovering = true;
          outcome = action;
          tracking.text = payload['tracking_reference']?.toString() ?? '';
          method = payload['capture_method']?.toString() ?? 'manual';
          reason.text = payload['reason']?.toString() ?? '';
          recipient.text = payload['recipient_name']?.toString() ?? '';
          note = payload['note']?.toString() ?? '';
          codConfirmed = payload['cod_confirmed'] == 1;
          photo = pending['files']?['proof'] as String?;
        });
        break;
      }
    } catch (error) {
      if (mounted) feedback(context, error);
    }
  }

  @override
  void dispose() {
    for (final c in [tracking, reason, recipient]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ResourcePage(
    api: widget.api,
    path: 'deliveries/${widget.id}',
    title: widget.pageTitle ?? 'Parcel details',
    builder: (context, response, reload) {
      final delivery = response['data'] as Json;
      final parcel = delivery['parcel'] as Json;
      final receiver = parcel['recipient'] as Json? ?? {};
      final actions = List<String>.from(
        delivery['allowed_actions'] as List? ?? [],
      );
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          RiderPanel(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: const BoxDecoration(
                    color: Color(0xfffff0d9),
                    shape: BoxShape.circle,
                  ),
                  child: const RiderIcon(
                    Icons.inventory_2_outlined,
                    color: Color(0xffaa5c18),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SelectableText(
                        '${delivery['tracking_reference']}',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      RiderStatus(
                        '${delivery['fulfillment_status'] ?? delivery['status']}',
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (widget.riderPresentation)
            RiderPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Parcel details',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                  RiderLine(
                    Icons.storefront_outlined,
                    '${parcel['store']?['name'] ?? 'LubosMart seller'}',
                  ),
                  if (delivery['pickup_address'] != null)
                    RiderLine(
                      Icons.store_mall_directory_outlined,
                      addressText(delivery['pickup_address']),
                    ),
                  RiderLine(Icons.location_on_outlined, addressText(receiver)),
                  const Divider(height: 20),
                  RiderLine(
                    Icons.account_balance_wallet_outlined,
                    'COD amount: ${riderPesos(cents(parcel['cod_total']))}',
                    strong: true,
                  ),
                ],
              ),
            ),
          if (!widget.riderPresentation) ...[
            RiderPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Store',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                  RiderLine(
                    Icons.storefront_outlined,
                    '${parcel['store']?['name'] ?? 'LubosMart seller'}',
                  ),
                ],
              ),
            ),
            if (delivery['pickup_address'] != null)
              RiderPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Pickup',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    RiderLine(
                      Icons.location_on_outlined,
                      addressText(delivery['pickup_address']),
                    ),
                  ],
                ),
              ),
            RiderPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Delivery',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                  RiderLine(Icons.location_on_outlined, addressText(receiver)),
                ],
              ),
            ),
            RiderPanel(
              child: Row(
                children: [
                  const RiderIcon(
                    Icons.account_balance_wallet_outlined,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text('COD amount', style: TextStyle(fontSize: 14)),
                  ),
                  Flexible(
                    child: Text(
                      riderPesos(cents(parcel['cod_total'])),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (parcel['delivery']?['notes'] != null)
            Text('Delivery notes: ${parcel['delivery']['notes']}'),
          if (actions.isEmpty)
            InfoCard(
              delivery['status'] == 'delivered'
                  ? 'Delivery completed'
                  : 'Status: ${readable('${delivery['fulfillment_status'] ?? delivery['status']}')}',
              subtitle: 'No Rider action is currently available. Shipment history and existing evidence remain accessible below.',
            ),
          if (actions.isNotEmpty) ...[
            UploadStatus(widget.api),
            if (recovering)
              const InfoCard(
                'Earlier submission awaiting confirmation',
                subtitle: 'The saved action and request key will be reused on retry. Check the current parcel status first.',
              ),
            if (actions.contains('picked_up') ||
                actions.contains('accept_dispatch') ||
                actions.contains('accept_transfer') ||
                actions.contains('receive')) ...[
              TextField(
                controller: tracking,
                readOnly: true,
                decoration: const InputDecoration(
                  labelText: 'Attached waybill reference',
                  helperText: 'Use the camera scanner to confirm custody.',
                ),
                onChanged: (_) => method = 'manual',
              ),
              ActionButton('Scan parcel QR code', () async {
                final scanned = await Navigator.of(context).push<String>(
                  MaterialPageRoute(builder: (_) => const ScanPage()),
                );
                if (scanned != null && mounted) {
                  final matches = rows(
                    (await widget.api.request(
                      'GET',
                      'deliveries?search=${Uri.encodeQueryComponent(scanned.trim())}',
                    ))['data'],
                  );
                  if (!matches.any(
                    (item) =>
                        item['id'] == widget.id &&
                        item['tracking_reference'] == scanned.trim(),
                  )) {
                    throw const ApiFailure(
                      422,
                      'This QR code does not match the selected assigned parcel.',
                    );
                  }
                  if (!mounted) return;
                  setState(() {
                    tracking.text = scanned.trim();
                    method = 'scanner';
                  });
                }
              }, outlined: true),
              TextField(
                controller: reason,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Handover notes (optional)',
                ),
              ),
            ],
            if (actions.contains('receive'))
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(
                  labelText: 'Physical parcel condition',
                ),
                items: const [
                  DropdownMenuItem(value: 'intact', child: Text('Intact')),
                  DropdownMenuItem(
                    value: 'damaged',
                    child: Text('Damaged - hold for review'),
                  ),
                ],
                onChanged: (value) =>
                    setState(() => receiptCondition = value ?? ''),
              ),
            if (actions.contains('delivered')) ...[
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: ['delivered', 'failed_attempt'].contains(outcome)
                    ? outcome
                    : null,
                decoration: const InputDecoration(labelText: 'Delivery action'),
                items: const [
                  DropdownMenuItem(
                    value: 'delivered',
                    child: Text('Successful delivery'),
                  ),
                  DropdownMenuItem(
                    value: 'failed_attempt',
                    child: Text('Failed delivery'),
                  ),
                ],
                onChanged: (value) => setState(() {
                  outcome = value!;
                  note = '';
                  reason.clear();
                  photo = null;
                  codConfirmed = false;
                }),
              ),
              DropdownButtonFormField<String>(
                key: ValueKey(outcome),
                decoration: const InputDecoration(
                  labelText: 'Delivery notes (required)',
                ),
                items: [
                  for (final value in List<String>.from(
                    delivery['note_suggestions']?[outcome] ?? [],
                  ))
                    DropdownMenuItem(value: value, child: Text(value)),
                ],
                isExpanded: true,
                onChanged: (value) => setState(() => note = value ?? ''),
              ),
              if (note == 'Other / Custom notes')
                TextField(
                  controller: reason,
                  maxLength: 1000,
                  decoration: const InputDecoration(
                    labelText: 'Custom delivery notes',
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              if (outcome == 'delivered')
                TextField(
                  controller: recipient,
                  maxLength: 150,
                  decoration: const InputDecoration(
                    labelText: 'Person receiving the parcel (required)',
                  ),
                ),
              if (outcome == 'delivered' && cents(parcel['cod_total']) > 0)
                CheckboxListTile(
                  value: codConfirmed,
                  onChanged: (value) =>
                      setState(() => codConfirmed = value ?? false),
                  title: Text(
                    'I confirm receipt of the full COD payment of ${riderPesos(cents(parcel['cod_total']))}.',
                  ),
                ),
              if (outcome.isNotEmpty)
                ActionButton(
                  photo == null
                      ? (outcome == 'delivered'
                            ? 'Take delivery proof photo'
                            : 'Take supporting photo (optional, only when safe)')
                      : 'Replace proof photo',
                  () async {
                    final image = await captureRiderProof();
                    if (image != null && mounted) {
                      setState(() => photo = image);
                    }
                  },
                  outlined: true,
                ),
              if (photo != null)
                Image.file(
                  File(photo!),
                  height: 220,
                  semanticLabel: 'Captured delivery proof',
                ),
            ],
            for (final action in actions.where(
              (value) =>
                  !['delivered', 'failed_attempt'].contains(value) ||
                  value == outcome,
            ))
              ActionButton(
                {
                      'picked_up': 'Confirm physical pickup',
                      'accept_dispatch': 'Accept dispatch handover',
                      'out_for_delivery': 'Start delivery',
                      'delivered': 'Confirm delivery and COD',
                      'failed_attempt': 'Record failed attempt',
                    }[action] ??
                    readable(action),
                () async {
                  if (['sort', 'assign'].contains(action)) {
                    final configuration =
                        (await widget.api.request(
                              'GET',
                              'logistics/configuration',
                            ))['data']
                            as Json;
                    if (!context.mounted) return;
                    final areas = rows(configuration['areas']).where(
                      (area) =>
                          area['logistics_center_id'] ==
                          delivery['logistics_center_id'],
                    );
                    final riders = rows(configuration['riders']).where(
                      (rider) =>
                          rider['logistics_center_id'] ==
                          delivery['logistics_center_id'],
                    );
                    await open(
                      context,
                      EditPage(
                        title: action == 'sort'
                            ? 'Mark as sorted'
                            : 'Assign rider',
                        fields: [
                          InputSpec(
                            'service_area_id',
                            'Service area',
                            options: {
                              for (final area in areas)
                                area['id'].toString(): area['name'].toString(),
                            },
                          ),
                          if (action == 'sort')
                            const InputSpec(
                              'sorting_bin',
                              'Destination bin / route',
                            ),
                          if (action == 'assign')
                            InputSpec(
                              'rider_id',
                              'Approved rider',
                              options: {
                                for (final rider in riders)
                                  rider['id'].toString(): rider['name']
                                      .toString(),
                              },
                            ),
                        ],
                        submit: (fields) async {
                          await widget.api.intent(
                            'delivery:${widget.id}:$action',
                            'deliveries/${widget.id}/events',
                            {'action': action, ...fields},
                          );
                          reload();
                        },
                      ),
                    );
                    return;
                  }
                  if ([
                        'picked_up',
                        'accept_dispatch',
                        'accept_transfer',
                        'receive',
                      ].contains(action) &&
                      tracking.text != delivery['tracking_reference']) {
                    throw const ApiFailure(
                      422,
                      'Scan the QR label attached to this parcel.',
                    );
                  }
                  if ([
                        'picked_up',
                        'accept_dispatch',
                        'accept_transfer',
                        'receive',
                      ].contains(action) &&
                      method != 'scanner') {
                    throw const ApiFailure(
                      422,
                      'Use the camera scanner to confirm custody.',
                    );
                  }
                  if (action == 'delivered' &&
                      (photo == null ||
                          (cents(parcel['cod_total']) > 0 && !codConfirmed) ||
                          recipient.text.trim().isEmpty ||
                          note.isEmpty ||
                          (note == 'Other / Custom notes' &&
                              reason.text.trim().isEmpty))) {
                    throw const ApiFailure(
                      422,
                      'Enter the recipient name, capture proof, select delivery notes and confirm any COD payment.',
                    );
                  }
                  if (!await confirm(
                    context,
                    'Record ${readable(action)}?',
                    action == 'delivered'
                        ? 'Confirm receipt of the full displayed COD amount and delivery to the recipient.'
                        : 'Confirm the physical parcel and handover before recording.',
                  )) {
                    return;
                  }
                  final tag = 'delivery:${widget.id}:$action';
                  final pending = await widget.api.pending(tag);
                  final payload = pending != null
                      ? Json.from(pending['payload'] as Map)
                      : {
                          'action': action,
                          'tracking_reference': tracking.text.isEmpty
                              ? delivery['tracking_reference']
                              : tracking.text,
                          'capture_method': method,
                          'reason': reason.text,
                          if (action == 'receive')
                            'receipt_condition': receiptCondition,
                          if (['delivered', 'failed_attempt'].contains(action))
                            'note': note,
                          if (action == 'delivered')
                            'cod_confirmed': codConfirmed ? 1 : 0,
                          if (action == 'delivered')
                            'recipient_name': recipient.text.trim(),
                        };
                  await widget.api.intent(
                    tag,
                    'deliveries/${widget.id}/events',
                    payload,
                    files:
                        ['delivered', 'failed_attempt'].contains(action) &&
                            photo != null
                        ? {'proof': photo!}
                        : {},
                  );
                  if (context.mounted) {
                    feedback(context, 'Parcel status updated successfully.');
                  }
                  if (!mounted) return;
                  setState(() {
                    photo = null;
                    note = '';
                    outcome = '';
                    codConfirmed = false;
                    recovering = false;
                  });
                  reload();
                },
                enabled:
                    !['delivered', 'failed_attempt'].contains(action) ||
                    (note.isNotEmpty &&
                        (note != 'Other / Custom notes' ||
                            reason.text.trim().isNotEmpty) &&
                        (action != 'delivered' ||
                            (photo != null &&
                                (cents(parcel['cod_total']) == 0 ||
                                    codConfirmed)))),
              ),
          ],
          ExpansionTile(
            title: const Text('Shipment timeline'),
            children: [
              for (final event in rows(delivery['history']))
                InfoCard(
                  readable(event['type'].toString()),
                  subtitle:
                      '${localEventTime(event['occurred_at'])}\n${event['notes'] ?? ''}',
                  child: event['has_proof'] == true
                      ? ActionButton(
                          'View supporting photo',
                          () => privateFile(
                            context,
                            widget.api,
                            'deliveries/${widget.id}/proof?event=${event['id']}',
                          ),
                          outlined: true,
                        )
                      : null,
                ),
            ],
          ),
          if (parcel['delivery']?['has_proof'] == true)
            ActionButton(
              'View delivery proof',
              () => privateFile(
                context,
                widget.api,
                'deliveries/${widget.id}/proof',
              ),
              outlined: true,
            ),
        ],
      );
    },
  );
}

class ReturnsPage extends StatelessWidget {
  final Api api;
  const ReturnsPage(this.api, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: 'returns',
    title: 'Returns and refunds',
    builder: (context, data, reload) => Column(
      children: [
        if (rows(data['data']).isEmpty)
          const InfoCard(
            'No return records',
            subtitle:
                'Approved requests and their recorded progress appear here.',
          ),
        for (final item in rows(data['data']))
          InfoCard(
            'Return #${item['id']} · Parcel #${item['seller_order_id']}',
            subtitle:
                '${readable('${item['status']}')}\n${item['reason']}\n${item['decision_reason'] ?? ''}${item['refund_cents'] == null ? '' : '\nRecorded refund: ${pesos(item['refund_cents'] as int)}'}',
            child: Column(
              children: [
                Text(
                  'Financial responsibility: ${item['responsibility'] ?? 'Awaiting review'}',
                ),
                for (final event in rows(item['events']))
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(readable('${event['action']}')),
                    subtitle: Text('${event['notes'] ?? ''}'),
                  ),
                if (item['return_destination'] != null)
                  InfoCard(
                    'Return to seller',
                    subtitle:
                        '${item['return_destination']['line1']}, ${item['return_destination']['barangay']}, ${item['return_destination']['city']}\n${item['return_destination']['phone'] ?? ''}',
                  ),
                for (final action in List<String>.from(
                  item['allowed_actions'] as List? ?? [],
                ))
                  ActionButton(
                    action == 'collect'
                        ? 'Confirm return collection'
                        : 'Confirm seller receipt',
                    () => open(
                      context,
                      EditPage(
                        title: 'Confirm return ${readable(action)}',
                        fields: [
                          const InputSpec(
                            'tracking_reference',
                            'Original attached tracking reference',
                          ),
                          const InputSpec(
                            'reason',
                            'Physical handover notes',
                            multiline: true,
                          ),
                          if (action == 'receive') ...[
                            const InputSpec(
                              'condition',
                              'Returned condition',
                              options: {
                                'intact': 'Intact',
                                'damaged': 'Damaged',
                              },
                            ),
                            const InputSpec(
                              'restock',
                              'Restore returned stock?',
                              options: {
                                '0': 'No — keep out of available stock',
                                '1': 'Yes — inspected intact goods only',
                              },
                            ),
                          ],
                        ],
                        submit: (fields) async {
                          if (!await confirm(
                            context,
                            'Record this return handover?',
                            'Only confirm after physically checking the correct parcel. Stock can be restored once.',
                          )) {
                            return;
                          }
                          await api.request(
                            'PATCH',
                            'returns/${item['id']}',
                            body: {
                              ...fields,
                              'action': action,
                              if (action == 'receive')
                                'restock': fields['restock'] == '1',
                            },
                          );
                          reload();
                        },
                      ),
                    ),
                  ),
              ],
            ),
          ),
      ],
    ),
  );
}
