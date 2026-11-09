import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../core/api.dart';
import '../ui/common.dart';

String readable(String value) => value.replaceAll('_', ' ');

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
          if (delivery != null) ...[
            Text('Delivery: ${readable('${delivery['status']}')}'),
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

class ScanPage extends StatelessWidget {
  const ScanPage({super.key});
  @override
  Widget build(BuildContext context) {
    bool returned = false;
    return PageFrame(
      'Scan attached waybill',
      MobileScanner(
        onDetect: (capture) {
          final value = capture.barcodes.firstOrNull?.rawValue;
          if (!returned && value != null && value.isNotEmpty) {
            returned = true;
            Navigator.pop(context, value);
          }
        },
      ),
    );
  }
}

class DeliveryPage extends StatefulWidget {
  final Api api;
  final int id;
  const DeliveryPage(this.api, this.id, {super.key});
  @override
  State<DeliveryPage> createState() => _DeliveryPageState();
}

class _DeliveryPageState extends State<DeliveryPage> {
  final tracking = TextEditingController(),
      reason = TextEditingController(),
      recipient = TextEditingController(),
      amount = TextEditingController();
  String method = 'manual';
  String? photo;
  @override
  void dispose() {
    for (final c in [tracking, reason, recipient, amount]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ResourcePage(
    api: widget.api,
    path: 'deliveries/${widget.id}',
    title: 'Parcel handover',
    builder: (context, response, reload) {
      final delivery = response['data'] as Json;
      final parcel = delivery['parcel'] as Json;
      final receiver = parcel['recipient'] as Json;
      final actions = List<String>.from(
        delivery['allowed_actions'] as List? ?? [],
      );
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InfoCard(
            '${delivery['tracking_reference']}',
            subtitle:
                '${readable('${delivery['status']}')}\n${receiver['name']} · ${receiver['phone']}\n${receiver['line1']}, ${receiver['barangay']}, ${receiver['city']}\nCOD to collect: ${pesos(cents(parcel['cod_total']))}',
          ),
          if (delivery['pickup_address'] != null)
            InfoCard(
              'Seller pickup address',
              subtitle:
                  '${delivery['pickup_address']['line1']}, ${delivery['pickup_address']['city']}\n${delivery['pickup_address']['phone']}',
            ),
          if (actions.isEmpty)
            const InfoCard(
              'Waiting for the next handover',
              subtitle: 'Check with Logistics for receipt, sorting, dispatch or exception handling.',
            ),
          if (actions.isNotEmpty) ...[
            TextField(
              controller: tracking,
              decoration: const InputDecoration(
                labelText: 'Attached waybill reference',
              ),
              onChanged: (_) => method = 'manual',
            ),
            ActionButton('Scan barcode with camera', () async {
              final scanned = await Navigator.of(context).push<String>(
                MaterialPageRoute(builder: (_) => const ScanPage()),
              );
              if (scanned != null && mounted) {
                setState(() {
                  tracking.text = scanned;
                  method = 'scanner';
                });
              }
            }, outlined: true),
            TextField(
              controller: reason,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Handover notes / manual entry reason',
              ),
            ),
            if (actions.contains('delivered')) ...[
              const SizedBox(height: 16),
              TextField(
                controller: recipient,
                decoration: const InputDecoration(
                  labelText: 'Recipient who received the parcel',
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: amount,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'Actual COD received (PHP)',
                ),
              ),
              ActionButton(
                photo == null
                    ? 'Take delivery proof photo'
                    : 'Replace proof photo',
                () async {
                  final image = await ImagePicker().pickImage(
                    source: ImageSource.camera,
                    imageQuality: 80,
                    maxWidth: 1800,
                  );
                  if (image != null && mounted) {
                    setState(() => photo = image.path);
                  }
                },
                outlined: true,
              ),
              if (photo != null)
                const Text('Proof photo selected. It remains private.'),
            ],
            for (final action in actions)
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
                  if (tracking.text != delivery['tracking_reference']) {
                    throw const ApiFailure(
                      422,
                      'Scan or enter the label attached to this parcel.',
                    );
                  }
                  if (method == 'manual' && reason.text.trim().isEmpty) {
                    throw const ApiFailure(
                      422,
                      'Explain manual tracking entry.',
                    );
                  }
                  if (action == 'delivered' &&
                      (photo == null ||
                          recipient.text.trim().isEmpty ||
                          cents(amount.text) != cents(parcel['cod_total']))) {
                    throw const ApiFailure(
                      422,
                      'Provide proof, recipient and the actual full COD amount.',
                    );
                  }
                  if (!await confirm(
                    context,
                    'Record ${readable(action)}?',
                    action == 'delivered'
                        ? 'Confirm actual receipt of ${pesos(cents(amount.text))} and delivery to ${recipient.text}.'
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
                          'tracking_reference': tracking.text,
                          'capture_method': method,
                          'reason': reason.text,
                          if (action == 'delivered') ...{
                            'recipient_name': recipient.text,
                            'amount': amount.text,
                          },
                        };
                  await widget.api.intent(
                    tag,
                    'deliveries/${widget.id}/events',
                    payload,
                    files: action == 'delivered' && photo != null
                        ? {'proof': photo!}
                        : {},
                  );
                  reload();
                },
              ),
          ],
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
