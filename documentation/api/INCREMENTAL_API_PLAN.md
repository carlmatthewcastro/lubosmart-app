# API scope and remaining acceptance

Updated November 5, 2026. The initial commerce/custody slice has expanded to 82 operations and a separate Flutter application for Buyer, Seller and Rider. See [implemented coverage](ROLE_COVERAGE.md) and [completion evidence](MOBILE_COMPLETION_2026_11_05.md).

| Work                                                                                    | Status                                                             |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Versioned catalog, stateless tokens and scoped resources                                | Implemented/tested                                                 |
| Buyer shopping, shipping/vouchers, checkout/cancellation                                | Implemented/tested                                                 |
| Seller orders, inventory/options, vouchers, waybill, costs/financial reads              | Implemented/tested                                                 |
| Assigned Rider custody, proof/COD, return collection and earnings                       | Implemented/tested                                                 |
| Three-role registration, verification, recovery, corrections and private support        | Implemented/tested                                                 |
| Separate Flutter app with three workspaces                                              | Source, analysis and Dart/widget tests pass                        |
| Native Android build and real plugin/device acceptance                                  | SDK installed; see Android setup report; device acceptance pending |
| Native iOS build                                                                        | Requires macOS/Xcode/signing; not performed                        |
| Production MySQL contention, real Google/mail, camera/printing/accessibility acceptance | Outstanding                                                        |
| Admin/Logistics management parity in mobile                                             | Outside current three-role app scope; website retained             |

No percentage represents production readiness. Automated acceptance and native/manual acceptance are separate evidence. No deployment, real transfers, destructive migration or Git publication was performed.
