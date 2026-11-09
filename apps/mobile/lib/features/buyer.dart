import 'package:flutter/material.dart';

import '../core/api.dart';
import '../ui/common.dart';

class CatalogPage extends StatelessWidget {
  final Api api;
  final bool wishlist;
  const CatalogPage(this.api, {this.wishlist = false, super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: wishlist ? 'wishlist' : 'products',
    title: wishlist ? 'Saved products' : 'Discover',
    actions: [
      IconButton(
        tooltip: 'Shopping bag',
        onPressed: () => open(context, CartPage(api)),
        icon: const Icon(Icons.shopping_bag_outlined),
      ),
    ],
    builder: (context, data, reload) {
      final products = rows(data['data']);
      return Column(
        children: [
          if (!wishlist)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: SearchBar(
                hintText: 'Search local products',
                onSubmitted: (query) =>
                    open(context, ProductSearch(api, query)),
              ),
            ),
          if (products.isEmpty)
            const InfoCard(
              'No products found',
              subtitle: 'Try another search or check back later.',
            ),
          for (final product in products)
            InfoCard(
              product['name'].toString(),
              subtitle:
                  '${pesos(cents(product['price']))} · ${product['stock']} in stock',
              onTap: () => open(context, ProductPage(api, product)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (product['image_url'] != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        product['image_url'].toString(),
                        height: 160,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => const SizedBox(
                          height: 80,
                          child: Center(child: Icon(Icons.image_outlined)),
                        ),
                      ),
                    ),
                  if (wishlist)
                    ActionButton('Remove from saved', () async {
                      await api.request(
                        'PUT',
                        'wishlist/${product['id']}',
                        body: {'saved': false},
                      );
                      reload();
                    }, outlined: true),
                ],
              ),
            ),
        ],
      );
    },
  );
}

class ProductSearch extends StatelessWidget {
  final Api api;
  final String query;
  const ProductSearch(this.api, this.query, {super.key});
  @override
  Widget build(BuildContext context) => ResourcePage(
    api: api,
    path: 'products?search=${Uri.encodeQueryComponent(query)}',
    title: 'Search results',
    builder: (context, data, reload) => Column(
      children: [
        for (final row in rows(data['data']))
          InfoCard(
            '${row['name']}',
            subtitle: pesos(cents(row['price'])),
            onTap: () => open(context, ProductPage(api, row)),
          ),
      ],
    ),
  );
}

class ProductPage extends StatefulWidget {
  final Api api;
  final Json product;
  const ProductPage(this.api, this.product, {super.key});
  @override
  State<ProductPage> createState() => _ProductPageState();
}

class _ProductPageState extends State<ProductPage> {
  final quantity = TextEditingController(text: '1');
  int? variant;
  @override
  void dispose() {
    quantity.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final options = rows(p['variants']);
    return PageFrame(
      '${p['name']}',
      ListView(
        padding: const EdgeInsets.all(24),
        children: [
          if (p['image_url'] != null)
            Image.network(
              '${p['image_url']}',
              height: 220,
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) =>
                  const Icon(Icons.image_outlined, size: 64),
            ),
          const SizedBox(height: 16),
          Text(
            pesos(cents(p['price'])),
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          Text('${p['store']?['name'] ?? ''} · ${p['stock']} in stock'),
          const SizedBox(height: 16),
          Text('${p['description'] ?? ''}'),
          if (options.isNotEmpty) ...[
            const SizedBox(height: 16),
            DropdownButtonFormField<int>(
              decoration: const InputDecoration(labelText: 'Size / color'),
              isExpanded: true,
              items: options
                  .map(
                    (v) => DropdownMenuItem(
                      value: v['id'] as int,
                      child: Text('${v['name']} · ${v['stock']} available'),
                    ),
                  )
                  .toList(),
              onChanged: (v) => setState(() => variant = v),
            ),
          ],
          const SizedBox(height: 16),
          TextField(
            controller: quantity,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Quantity'),
          ),
          const SizedBox(height: 16),
          ActionButton('Add to shopping bag', () async {
            final count = int.tryParse(quantity.text);
            if (count == null ||
                count < 1 ||
                count > 999 ||
                (options.isNotEmpty && variant == null)) {
              throw const ApiFailure(
                422,
                'Choose an available option and a quantity from 1 to 999.',
              );
            }
            final cart = rows(
              (await widget.api.request('GET', 'cart'))['data']['items'],
            );
            final current = cart
                .where(
                  (line) =>
                      line['product_id'] == p['id'] &&
                      line['product_variant_id'] == variant,
                )
                .firstOrNull;
            await widget.api.request(
              'PUT',
              'cart/items/${p['id']}',
              body: {
                'quantity': count + ((current?['quantity'] as int?) ?? 0),
                'product_variant_id': variant,
              },
            );
            if (context.mounted) feedback(context, 'Added to shopping bag.');
          }),
          ActionButton('Save product', () async {
            await widget.api.request(
              'PUT',
              'wishlist/${p['id']}',
              body: {'saved': true},
            );
            if (context.mounted) feedback(context, 'Product saved.');
          }, outlined: true),
          ActionButton(
            'Read verified reviews',
            () => open(
              context,
              ResourcePage(
                api: widget.api,
                path: 'products/${p['id']}/reviews',
                title: 'Verified reviews',
                builder: (context, data, reload) => Column(
                  children: [
                    for (final r in rows(data['data']))
                      InfoCard('${r['rating']} / 5', subtitle: '${r['body']}'),
                  ],
                ),
              ),
            ),
            outlined: true,
          ),
        ],
      ),
    );
  }
}

class CartPage extends StatefulWidget {
  final Api api;
  const CartPage(this.api, {super.key});
  @override
  State<CartPage> createState() => _CartPageState();
}

class _CartPageState extends State<CartPage> {
  late Future<Json> load;
  final voucher = TextEditingController();
  List<Json> addresses = [], options = [];
  int? addressId, providerId;
  int discount = 0;
  bool voucherChecked = false;
  bool quoting = false;
  String? quoteError;
  Json? uncertain;
  @override
  void initState() {
    super.initState();
    refresh();
  }

  @override
  void dispose() {
    voucher.dispose();
    super.dispose();
  }

  void refresh() {
    setState(() {
      discount = 0;
      voucherChecked = false;
      load = fetch();
    });
  }

  Future<Json> fetch() async {
    addresses = rows((await widget.api.request('GET', 'addresses'))['data']);
    addressId ??= addresses.firstOrNull?['id'] as int?;
    uncertain = await widget.api.pending('checkout');
    final cart = await widget.api.request('GET', 'cart');
    options = [];
    providerId = null;
    quoteError = null;
    if (cart['data']['logistics_pricing'] == true && addressId != null) {
      await quote();
    }
    return Json.from(cart['data'] as Map);
  }

  Future<void> quote() async {
    if (addressId == null) return;
    setState(() {
      quoting = true;
      quoteError = null;
    });
    try {
      options = rows(
        (await widget.api.request(
          'GET',
          'shipping-quotes?address_id=$addressId',
        ))['options'],
      );
    } catch (error) {
      quoteError = '$error';
    } finally {
      if (mounted) setState(() => quoting = false);
    }
  }

  Future<void> finish(Json payload) async {
    await widget.api.intent(
      'checkout',
      'orders',
      payload,
      keyField: 'checkout_key',
    );
    if (!mounted) return;
    feedback(context, 'Purchase placed. Pay cash upon delivery.');
    refresh();
  }

  @override
  Widget build(BuildContext context) => PageFrame(
    'Shopping bag',
    FutureBuilder(
      future: load,
      builder: (context, snapshot) {
        if (snapshot.hasError) return Failure(snapshot.error!, refresh);
        if (!snapshot.hasData) return const Loading();
        final cart = snapshot.data!;
        final lines = rows(cart['items']);
        final subtotal = lines.fold<int>(
          0,
          (total, line) =>
              total + cents(line['price']) * (line['quantity'] as int),
        );
        final quoteOption = options
            .where((o) => o['id'] == providerId)
            .firstOrNull;
        final stores = lines.map((l) => l['store_id']).toSet().length;
        final shipping = cart['logistics_pricing'] == true
            ? cents(quoteOption?['total'] ?? 0)
            : cents(cart['shipping_fee_per_seller_order']) * stores;
        return ListView(
          padding: const EdgeInsets.all(24),
          children: [
            if (uncertain != null)
              InfoCard(
                'Purchase awaiting confirmation',
                subtitle: 'A previous response was interrupted. Retry the same purchase before changing your bag.',
                child: ActionButton(
                  'Confirm previous purchase',
                  () => finish(Json.from(uncertain!['payload'] as Map)),
                ),
              ),
            if (lines.isEmpty)
              const InfoCard(
                'Your bag is empty',
                subtitle: 'Discover products from local sellers.',
              ),
            for (final line in lines)
              InfoCard(
                '${line['name']}',
                subtitle:
                    '${line['variant_name'] ?? ''}\n${pesos(cents(line['price']))} · Quantity ${line['quantity']}${line['is_available'] == false ? '\nCurrently unavailable' : ''}',
                child: Wrap(
                  spacing: 12,
                  children: [
                    if (uncertain == null)
                      ActionButton(
                        'Change quantity',
                        () => open(
                          context,
                          EditPage(
                            title: 'Change quantity',
                            fields: [
                              InputSpec(
                                'quantity',
                                'Quantity (zero removes)',
                                initial: '${line['quantity']}',
                                number: true,
                              ),
                            ],
                            submit: (data) async {
                              await widget.api.request(
                                'PUT',
                                'cart/items/${line['product_id']}',
                                body: {
                                  'quantity': data['quantity'],
                                  'product_variant_id':
                                      line['product_variant_id'],
                                },
                              );
                              refresh();
                            },
                          ),
                        ),
                        outlined: true,
                      ),
                    if (uncertain == null)
                      ActionButton('Remove', () async {
                        if (!await confirm(
                          context,
                          'Remove item?',
                          '${line['name']} will leave your shopping bag.',
                        )) {
                          return;
                        }
                        await widget.api.request(
                          'PUT',
                          'cart/items/${line['product_id']}',
                          body: {
                            'quantity': 0,
                            'product_variant_id': line['product_variant_id'],
                          },
                        );
                        refresh();
                      }, outlined: true),
                  ],
                ),
              ),
            if (lines.isNotEmpty && uncertain == null) ...[
              DropdownButtonFormField<int>(
                initialValue: addressId,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Delivery address',
                ),
                items: addresses
                    .map(
                      (a) => DropdownMenuItem(
                        value: a['id'] as int,
                        child: Text(
                          '${a['label']}: ${a['line1']}, ${a['city']}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (id) {
                  setState(() {
                    addressId = id;
                    providerId = null;
                  });
                  if (cart['logistics_pricing'] == true) quote();
                },
              ),
              const SizedBox(height: 12),
              if (quoting) const Loading(),
              if (quoteError != null) Failure(quoteError!, quote),
              if (cart['logistics_pricing'] == true && !quoting) ...[
                if (options.isEmpty)
                  const Text(
                    'No provider can currently serve this address and bag.',
                  ),
                DropdownButtonFormField<int>(
                  initialValue: providerId,
                  decoration: const InputDecoration(
                    labelText: 'Delivery provider',
                  ),
                  items: options
                      .map(
                        (o) => DropdownMenuItem(
                          value: o['id'] as int,
                          child: Text(
                            '${o['name']} · ${pesos(cents(o['total']))}',
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (id) => setState(() => providerId = id),
                ),
              ],
              const SizedBox(height: 16),
              TextField(
                controller: voucher,
                decoration: const InputDecoration(
                  labelText: 'Store voucher (optional)',
                ),
                onChanged: (_) => setState(() {
                  discount = 0;
                  voucherChecked = false;
                }),
              ),
              ActionButton('Check voucher', () async {
                final preview = await widget.api.request(
                  'POST',
                  'vouchers/preview',
                  body: {'voucher_code': voucher.text},
                );
                setState(() {
                  discount = preview['discount_cents'] as int;
                  voucherChecked = true;
                });
              }, outlined: true),
              InfoCard(
                'Review your total',
                subtitle:
                    'Products: ${pesos(subtotal)}\nVoucher: −${pesos(discount)}\nDelivery: ${pesos(shipping)}\nCOD total: ${pesos(subtotal + shipping - discount)}',
              ),
              ActionButton('Place COD purchase', () async {
                if (voucher.text.trim().isNotEmpty && !voucherChecked) {
                  throw const ApiFailure(
                    422,
                    'Check your voucher before confirming the purchase.',
                  );
                }
                if (addressId == null ||
                    quoting ||
                    (cart['logistics_pricing'] == true && providerId == null)) {
                  throw const ApiFailure(
                    422,
                    'Choose an address and an available delivery provider.',
                  );
                }
                if (!await confirm(
                  context,
                  'Place this purchase?',
                  'Pay ${pesos(subtotal + shipping - discount)} in cash upon delivery. Each seller sends a separate parcel.',
                )) {
                  return;
                }
                await finish({
                  'address_id': addressId,
                  if (providerId != null) 'logistics_center_id': providerId,
                  'expected_items_subtotal': (subtotal / 100).toStringAsFixed(
                    2,
                  ),
                  'expected_shipping_total': (shipping / 100).toStringAsFixed(
                    2,
                  ),
                  if (voucher.text.trim().isNotEmpty)
                    'voucher_code': voucher.text.trim(),
                  if (voucher.text.trim().isNotEmpty)
                    'expected_discount_total': (discount / 100).toStringAsFixed(
                      2,
                    ),
                });
              }),
            ],
          ],
        );
      },
    ),
  );
}
