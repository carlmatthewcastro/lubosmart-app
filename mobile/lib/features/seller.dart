import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../core/api.dart';
import '../ui/common.dart';
import '../ui/rider_design.dart';

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
    appBarTitle: const RiderBrand(),
    builder: (context, response, reload) {
      final data = response['data'] as Json;
      final entries = rows(data['entries']);
      final totals = data['totals'] as Json;
      final fees = totals['fees'] as int;
      final paid = totals['paid'] as int;
      final pending = fees - paid;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Your earnings',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
          ),
          Text(
            'Track your earnings and payment history.',
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 16),
          Card(
            color: const Color(0xff6941a5),
            margin: const EdgeInsets.only(bottom: 16),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              children: [
                Positioned(
                  top: 14,
                  right: 12,
                  child: ExcludeSemantics(
                    child: Icon(
                      Icons.account_balance_wallet_outlined,
                      size: 88,
                      color: Colors.white.withValues(alpha: .13),
                    ),
                  ),
                ),
                Positioned(
                  top: 24,
                  right: 38,
                  child: ExcludeSemantics(
                    child: Container(
                      width: 15,
                      height: 15,
                      decoration: const BoxDecoration(
                        color: Color(0xfff59e42),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const RiderIcon(
                            Icons.account_balance_wallet_outlined,
                            color: Colors.white,
                            size: 24,
                          ),
                          const SizedBox(width: 10),
                          const Text(
                            'Total Earned',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        riderPesos(fees),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 30,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          _EarningsSummary(
                            label: 'Paid',
                            amount: paid,
                            icon: Icons.check_circle_outline,
                            color: const Color(0xff198754),
                          ),
                          const SizedBox(width: 8),
                          _EarningsSummary(
                            label: 'Pending',
                            amount: pending,
                            icon: Icons.schedule_outlined,
                            color: const Color(0xffd97706),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const RiderPanel(
            child: RiderLine(
              Icons.info_outline,
              'Logistics-approved fees only. COD and shipping collections are separate liabilities, not wages.',
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Compensation history',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          if (entries.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Column(
                children: [
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 100,
                        height: 100,
                        decoration: const BoxDecoration(
                          color: Color(0xfff1eafd),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const RiderIcon(
                        Icons.account_balance_wallet_outlined,
                        size: 56,
                        color: Color(0xff6941a5),
                      ),
                      const Positioned(
                        top: 10,
                        right: 6,
                        child: Icon(
                          Icons.auto_awesome,
                          size: 16,
                          color: Color(0xfff59e42),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'No payment records yet.',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Recorded fees and payments will appear here.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          for (final row in entries) _CompensationEntryCard(row),
        ],
      );
    },
  );
}

class _EarningsSummary extends StatelessWidget {
  final String label;
  final int amount;
  final IconData icon;
  final Color color;

  const _EarningsSummary({
    required this.label,
    required this.amount,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 5),
              Text(
                label,
                style: const TextStyle(
                  color: Color(0xff27232e),
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              riderPesos(amount),
              style: const TextStyle(
                color: Color(0xff18181b),
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _CompensationEntryCard extends StatelessWidget {
  final Json row;
  const _CompensationEntryCard(this.row);

  @override
  Widget build(BuildContext context) {
    final isPaid = row['paid_at'] != null;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final statusColor = isPaid
        ? (dark ? const Color(0xffa5e8b7) : const Color(0xff198754))
        : (dark ? const Color(0xffffce92) : const Color(0xffd97706));
    final reference = row['payment_reference']?.toString();
    return RiderPanel(
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: .12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: RiderIcon(
              isPaid ? Icons.check_circle_outline : Icons.schedule_outlined,
              size: 21,
              color: statusColor,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${riderDisplayValue('${row['leg']}')} compensation',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (row['delivery_id'] != null)
                  Text(
                    'Delivery #${row['delivery_id']}',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                if (row['paid_at'] != null)
                  Text(
                    riderDateTime(row['paid_at']),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontSize: 11,
                    ),
                  ),
                if (reference != null && reference.isNotEmpty)
                  Text(
                    'Ref. $reference',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontSize: 11,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                riderPesos(row['amount_cents'] as int),
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isPaid ? 'Paid' : 'Pending',
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
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

class FinancePage extends StatelessWidget {
  final Api api;
  const FinancePage(this.api, {super.key});

  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: 'finance',
    title: 'Finance overview',
    builder: (context, response, reload) {
      final data = response['data'] as Json;
      final amounts = data['amounts'] as Json;
      return Column(
        children: [
          const InfoCard(
            'Recorded amounts and cash custody',
            subtitle: 'Sales allocations, COD cash and paid fees are separate. Logistics retains shipping and remits product cash. Unsettled proceeds can be held for returns, debt or missing cash evidence. No money transfer is initiated here.',
          ),
          InfoCard(
            'Review queue',
            subtitle:
                'Cash discrepancies: ${data['discrepancies']}. Missing historical commission rates: ${data['legacy_rates']}.',
          ),
          for (final amount in amounts.entries)
            InfoCard(
              amount.key,
              subtitle: pesos((amount.value as num).toInt()),
            ),
        ],
      );
    },
  );
}
