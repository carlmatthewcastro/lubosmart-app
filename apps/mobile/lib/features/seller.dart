import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../core/api.dart';
import '../ui/common.dart';

class InventoryPage extends StatelessWidget {
  final Api api;
  const InventoryPage(this.api, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: 'seller/products',
    title: 'Your inventory',
    actions: [
      IconButton(
        tooltip: 'Add product',
        icon: const Icon(Icons.add),
        onPressed: () => open(context, InventoryEditor(api)),
      ),
    ],
    builder: (context, data, reload) => Column(
      children: [
        if (rows(data['data']).isEmpty)
          const InfoCard(
            'No listings yet',
            subtitle: 'Add a product in your registered department.',
          ),
        for (final item in rows(data['data']))
          InfoCard(
            '${item['name']}',
            subtitle:
                '${pesos(cents(item['price']))} · Stock ${item['stock']}\n${item['status']}${item['blocked'] == true ? ' · Admin clearance required' : ''}',
            child: Wrap(
              spacing: 8,
              children: [
                ActionButton('Edit product', () async {
                  await open(context, InventoryEditor(api, product: item));
                  reload();
                }, outlined: true),
                ActionButton('Size / color options', () async {
                  await open(context, VariantEditor(api, item));
                  reload();
                }, outlined: true),
              ],
            ),
          ),
      ],
    ),
  );
}

class InventoryEditor extends StatefulWidget {
  final Api api;
  final Json? product;
  const InventoryEditor(this.api, {this.product, super.key});
  @override
  State<InventoryEditor> createState() => _InventoryEditorState();
}

class _InventoryEditorState extends State<InventoryEditor> {
  late final fields = {
    for (final key in ['name', 'description', 'price', 'stock', 'weight_grams'])
      key: TextEditingController(text: widget.product?[key]?.toString() ?? ''),
  };
  List<Json> categories = [];
  int? category;
  String status = 'hidden';
  String? photo, error;
  final form = GlobalKey<FormState>();
  @override
  void initState() {
    super.initState();
    category = widget.product?['category_id'] as int?;
    status = widget.product?['blocked'] == true
        ? 'hidden'
        : (widget.product?['status'] as String? ?? 'hidden');
    prepare();
  }

  Future<void> prepare() async {
    try {
      final department = (await widget.api.request(
        'GET',
        'settings/profile',
      ))['data']['store']?['business_category_id'];
      categories = rows((await widget.api.request('GET', 'categories'))['data'])
          .where(
            (c) =>
                department == null ||
                c['id'] == department ||
                c['parent_id'] == department,
          )
          .toList();
      if (mounted) setState(() {});
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    }
  }

  @override
  void dispose() {
    for (final field in fields.values) {
      field.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PageFrame(
    widget.product == null ? 'Add product' : 'Edit product',
    Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          if (error != null) Text(error!),
          for (final key in fields.keys)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: TextFormField(
                controller: fields[key],
                enabled:
                    key != 'stock' || rows(widget.product?['variants']).isEmpty,
                maxLines: key == 'description' ? 4 : 1,
                keyboardType: ['price', 'stock', 'weight_grams'].contains(key)
                    ? const TextInputType.numberWithOptions(decimal: true)
                    : TextInputType.text,
                decoration: InputDecoration(
                  labelText: {
                    'name': 'Product name',
                    'description': 'Description',
                    'price': 'Price (PHP)',
                    'stock': 'Stock quantity',
                    'weight_grams': 'Packed weight (grams)',
                  }[key],
                ),
                validator: (value) =>
                    key != 'description' && (value == null || value.isEmpty)
                    ? 'Complete this field.'
                    : null,
              ),
            ),
          DropdownButtonFormField<int>(
            initialValue: category,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Category'),
            items: categories
                .map(
                  (c) => DropdownMenuItem(
                    value: c['id'] as int,
                    child: Text('${c['name']}'),
                  ),
                )
                .toList(),
            onChanged: (id) => category = id,
            validator: (id) =>
                id == null ? 'Choose a permitted category.' : null,
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: status,
            decoration: const InputDecoration(labelText: 'Visibility'),
            items: [
              if (widget.product?['blocked'] != true)
                const DropdownMenuItem(
                  value: 'active',
                  child: Text('Published'),
                ),
              const DropdownMenuItem(value: 'hidden', child: Text('Hidden')),
            ],
            onChanged: (value) => status = value!,
          ),
          ActionButton(
            photo == null ? 'Choose product image' : 'Replace selected image',
            () async {
              final picked = await ImagePicker().pickImage(
                source: ImageSource.gallery,
                maxWidth: 1800,
                imageQuality: 85,
              );
              if (picked != null && mounted) {
                setState(() => photo = picked.path);
              }
            },
            outlined: true,
          ),
          ActionButton('Save product', () async {
            if (!form.currentState!.validate()) return;
            if (!await confirm(
              context,
              'Save listing changes?',
              'Price, stock and visibility affect shoppers. Stock will be checked against the version you opened.',
            )) {
              return;
            }
            try {
              await widget.api.request(
                widget.product == null ? 'POST' : 'PUT',
                widget.product == null
                    ? 'seller/products'
                    : 'seller/products/${widget.product!['id']}',
                body: {
                  for (final field in fields.entries)
                    field.key: field.value.text,
                  'category_id': category,
                  'status': status,
                  if (widget.product != null)
                    'expected_stock': widget.product!['stock'],
                },
                files: photo == null ? {} : {'image': photo!},
              );
              if (context.mounted) Navigator.pop(context);
            } catch (e) {
              if (mounted) {
                setState(
                  () => error =
                      '$e\nIf stock changed, reopen this editor to review current quantities.',
                );
              }
            }
          }),
        ],
      ),
    ),
  );
}

class VariantEditor extends StatefulWidget {
  final Api api;
  final Json product;
  const VariantEditor(this.api, this.product, {super.key});
  @override
  State<VariantEditor> createState() => _VariantEditorState();
}

class _VariantEditorState extends State<VariantEditor> {
  late final List<Json> variants = rows(widget.product['variants'])
      .map((v) => {...v, 'expected_stock': v['stock']})
      .toList();
  @override
  Widget build(BuildContext context) => PageFrame(
    'Size and color stock',
    ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const Text(
          'Retired options retain their identity. All options share this product’s price and packed weight.',
        ),
        const SizedBox(height: 16),
        for (var index = 0; index < variants.length; index++)
          InfoCard(
            'Option ${index + 1}',
            child: Column(
              children: [
                TextFormField(
                  initialValue: '${variants[index]['name']}',
                  enabled: variants[index]['is_legacy'] != true,
                  decoration: const InputDecoration(
                    labelText: 'Size / color name',
                  ),
                  onChanged: (value) => variants[index]['name'] = value,
                ),
                TextFormField(
                  initialValue: '${variants[index]['stock']}',
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Stock quantity',
                  ),
                  onChanged: (value) => variants[index]['stock'] = value,
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    variants[index]['is_legacy'] == true
                        ? 'Held historical stock'
                        : 'Available for purchase',
                  ),
                  value: variants[index]['is_active'] == true,
                  onChanged: variants[index]['is_legacy'] == true
                      ? null
                      : (value) => setState(
                          () => variants[index]['is_active'] = value,
                        ),
                ),
              ],
            ),
          ),
        OutlinedButton.icon(
          onPressed: () => setState(
            () => variants.add({'name': '', 'stock': 0, 'is_active': true}),
          ),
          icon: const Icon(Icons.add),
          label: const Text('Add option'),
        ),
        ActionButton('Save option stock', () async {
          if (!await confirm(
            context,
            'Save option quantities?',
            'Review physical quantities. Existing purchases remain linked to their original options.',
          )) {
            return;
          }
          await widget.api.request(
            'PUT',
            'seller/products/${widget.product['id']}/variants',
            body: {
              'expected_stock': widget.product['stock'],
              'variants': variants,
            },
          );
          if (context.mounted) Navigator.pop(context);
        }),
      ],
    ),
  );
}

class VouchersPage extends StatelessWidget {
  final Api api;
  const VouchersPage(this.api, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: 'seller/vouchers',
    title: 'Store vouchers',
    actions: [
      IconButton(
        tooltip: 'Create voucher',
        icon: const Icon(Icons.add),
        onPressed: () => open(
          context,
          EditPage(
            title: 'Create voucher',
            fields: [
              const InputSpec('code', 'Voucher code'),
              const InputSpec('amount', 'Discount (PHP)', number: true),
              const InputSpec(
                'minimum',
                'Minimum product subtotal (PHP)',
                number: true,
              ),
              const InputSpec('usage_limit', 'Maximum uses', number: true),
              InputSpec(
                'expires_at',
                'Expires on (YYYY-MM-DD)',
                initial: DateTime.now()
                    .add(const Duration(days: 7))
                    .toIso8601String()
                    .split('T')
                    .first,
              ),
            ],
            submit: (fields) async {
              final expiry = DateTime.parse('${fields['expires_at']}T23:59:00')
                  .toUtc()
                  .toIso8601String();
              await api.request(
                'POST',
                'seller/vouchers',
                body: {...fields, 'expires_at': expiry},
              );
            },
          ),
        ),
      ),
    ],
    builder: (context, response, reload) => Column(
      children: [
        const InfoCard(
          'Seller-funded discounts',
          subtitle: 'A voucher reduces your product sales and proceeds; shipping is excluded.',
        ),
        for (final row in rows(response['data']))
          InfoCard(
            '${row['code']}',
            subtitle:
                '${pesos(row['amount_cents'] as int)} off · Minimum ${pesos(row['minimum_cents'] as int)}\nExpires ${row['expires_at']}\n${row['is_active'] == true ? 'Available' : 'Paused'}',
            child: ActionButton(
              row['is_active'] == true ? 'Pause voucher' : 'Make available',
              () async {
                await api.request(
                  'PATCH',
                  'seller/vouchers/${row['id']}',
                  body: {'is_active': row['is_active'] != true},
                );
                reload();
              },
              outlined: true,
            ),
          ),
      ],
    ),
  );
}

class CostsPage extends StatelessWidget {
  final Api api;
  const CostsPage(this.api, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: 'seller/costs',
    title: 'Costs and profit',
    actions: [
      IconButton(
        tooltip: 'Record cost',
        icon: const Icon(Icons.add),
        onPressed: () => open(
          context,
          EditPage(
            title: 'Record actual store cost',
            fields: [
              InputSpec(
                'incurred_on',
                'Date (YYYY-MM-DD)',
                initial: DateTime.now().toIso8601String().split('T').first,
              ),
              const InputSpec(
                'category',
                'Category',
                options: {
                  'goods': 'Goods',
                  'packaging': 'Packaging',
                  'operations': 'Operations',
                  'other': 'Other',
                },
              ),
              const InputSpec('description', 'Description', multiline: true),
              const InputSpec('amount', 'Actual cost (PHP)', number: true),
            ],
            submit: (data) async {
              await api.request('POST', 'seller/costs', body: data);
            },
          ),
        ),
      ),
    ],
    builder: (context, response, reload) {
      final data = response['data'] as Json;
      final totals = data['totals'] as Json;
      return Column(
        children: [
          InfoCard(
            'Recorded-cost profit',
            subtitle:
                '${pesos(totals['profit'] as int)}\nCosts: ${pesos(totals['costs'] as int)}\nActual payouts: ${pesos(totals['paid'] as int)}\nUnsettled balance: ${pesos(totals['balance'] as int)}\nProfit depends on complete cost entries; it is not your bank balance.',
          ),
          for (final row in rows(data['costs']))
            InfoCard(
              '${row['description']}',
              subtitle:
                  '${pesos(row['amount_cents'] as int)} · ${row['incurred_on']}\n${row['voided_at'] == null ? 'Recorded' : 'Voided: ${row['void_reason']}'}',
              child: row['voided_at'] == null
                  ? ActionButton(
                      'Void incorrect entry',
                      () => open(
                        context,
                        EditPage(
                          title: 'Void cost with reason',
                          fields: const [
                            InputSpec('reason', 'Reason', multiline: true),
                          ],
                          submit: (data) async {
                            await api.request(
                              'POST',
                              'seller/costs/${row['id']}/void',
                              body: data,
                            );
                            reload();
                          },
                        ),
                      ),
                      outlined: true,
                    )
                  : null,
            ),
        ],
      );
    },
  );
}

class SettlementsPage extends StatelessWidget {
  final Api api;
  const SettlementsPage(this.api, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: 'seller/settlements',
    title: 'Recorded seller payouts',
    builder: (context, response, reload) => Column(
      children: [
        const InfoCard(
          'Manual payment history',
          subtitle: 'Only Admin records eligible payouts after COD reconciliation. This screen does not transfer money.',
        ),
        for (final row in rows(response['data']))
          InfoCard(
            'Parcel #${row['seller_order_id']}',
            subtitle:
                '${pesos(row['amount_cents'] as int)}\nReference: ${row['reference']}\n${row['created_at']}',
          ),
      ],
    ),
  );
}

class EarningsPage extends StatelessWidget {
  final Api api;
  const EarningsPage(this.api, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: 'rider/earnings',
    title: 'Your earnings',
    builder: (context, response, reload) {
      final data = response['data'] as Json;
      return Column(
        children: [
          InfoCard(
            'Logistics-approved fees',
            subtitle:
                'Earned: ${pesos(data['totals']['fees'] as int)}\nPaid: ${pesos(data['totals']['paid'] as int)}\nCOD and shipping collections are separate liabilities, not wages.',
          ),
          for (final row in rows(data['entries']))
            InfoCard(
              '${row['leg']} · Delivery #${row['delivery_id']}',
              subtitle:
                  '${pesos(row['amount_cents'] as int)}\n${row['paid_at'] == null ? 'Unpaid fee' : 'Paid · ${row['payment_reference']}'}',
            ),
        ],
      );
    },
  );
}

class ReportsPage extends StatelessWidget {
  final Api api;
  final String role;
  const ReportsPage(this.api, this.role, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: '$role/reports',
    title: 'Your reports',
    builder: (context, response, reload) {
      final data = response['data'] as Json;
      return Column(
        children: [
          for (final total in (data['totals'] as Json).entries)
            InfoCard(
              total.key,
              subtitle: total.key == 'Completed parcels'
                  ? '${total.value}'
                  : pesos(cents(total.value)),
            ),
          if (data['adjustments'] != null) ...[
            for (final entry in (data['adjustments'] as Json).entries)
              InfoCard(entry.key, subtitle: pesos(cents(entry.value))),
          ],
        ],
      );
    },
  );
}
