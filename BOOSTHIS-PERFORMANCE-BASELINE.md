# Boosthis Performance Baseline

## Collection status

Instrumentation is installed, but a numeric baseline has **not** been collected. The Backend has one safe health request after deployment and its status page reports registration and measurement. The mobile apps built successfully through their Expo tunnels, but no app has run on a physical test device. No slow screens or backend operations should be inferred from this small sample.

| Surface | Instrumented signals | Samples | Confidence |
|---|---|---:|---|
| Customer | Boot phases, fixed screen timing, coarse network duration/outcome, image weight, unhandled-error counts | 0 verified sessions | No baseline |
| Admin | Boot phases, fixed screen timing, coarse network duration/outcome, image weight, unhandled-error counts | 0 verified sessions | No baseline |
| Courier | Boot phases, fixed screen timing, coarse network duration/outcome, image weight, unhandled-error counts | 0 verified sessions | No baseline |
| Backend | ASP.NET request timing and runtime observations through Boosthis middleware | 1 safe health request | Too little data for a baseline |

## Measurements configured

- Customer labels: Home, Categories, Stores, StoreDetails, ProductDetails, Cart, Checkout, Orders, OrderDetails, Profile, Authentication.
- Admin labels: Dashboard, Orders, Payments, BankTransfers, DriverCustody, Inventory, Categories, Stores, Products, Deals, ServiceAreas, ProductEditor, Financials, PriceChanges, SystemManagement, Notifications, Authentication.
- Courier labels: DriverHome, Delivery, Purchase, PriceChange, Earnings, Authentication.
- Network wrapping reports duration and coarse outcome only. It does not send URLs, paths, headers, query strings, bodies, or HTTP status codes.
- Trace propagation, route list/page map, control census, and detailed crash mode are off.

## Next measurement run

Use test devices and a test/staging backend. Launch each app, visit the instrumented routes, and exercise ordinary read-only app flows. Confirm the records appear in the correct project before interpreting comparisons. Avoid real checkout/payment/purchase actions. Once enough representative sessions and backend requests exist, record sample count, period, slowest stable labels/operations, error counts, confidence limits, and recommendations here. No performance fixes were made as part of instrumentation.
