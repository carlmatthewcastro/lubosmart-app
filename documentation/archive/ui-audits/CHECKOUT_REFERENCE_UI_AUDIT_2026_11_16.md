> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Checkout reference implementation

Scoped checkout styling uses solid surfaces and primary action. Voucher dialog stages selection until Apply, preserves applied values on cancel/error, and uses existing server preview. Store IDs identify voucher scope. Existing backend supports one voucher per checkout, with discount restricted to its store; multiple simultaneous store vouchers were not introduced. Delivery options remain server-filtered and unavailable-provider notices were removed. Blocked checkout reasons remain visible.

Validation: 46 checkout/voucher feature tests passed (404 assertions); ESLint, TypeScript and production build passed. Existing image resolution warnings remain. Manual visual matching, responsive reflow, keyboard/screen reader and interactive browser flow verification remain outstanding; framework dialog primitives provide focus containment and Escape handling.
