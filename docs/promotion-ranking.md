# Promotion savings and ranking

Admin > Store apps & offers > Promotion ranking persists one global ranking count for all stores and markets: 10 to 300, increments of 10, default 30. Public ranking compares amounts only within the current marketplace/currency and selected category. Unknown amounts are excluded. All-offers mode remains available; no additional products are fetched by increasing this setting.

Cards show a row of promotion-type icons; the list begins with a horizontally scrollable legend. Known sale reductions and coupon/code savings are combined only if the administrator confirms stacking or enters a verified final checkout price. Example: regular 259, sale 229, final 194 => 65 total savings, not 100. Without stacking evidence, only the known individual discount is shown. Missing prices remain unknown and do not become invented savings.

In the offer editor, `Verified final price after all promotions` and the stacking checkbox are saved in existing promotion metadata (`finalPrice`, `stackable`). These values must describe the same variant and currency. Original promotion fields remain intact. Expiry/verification rules continue to govern Amazon card badges. Ranking is over registered offers, not a claim of exhaustive store-wide search.

Migration: 20261004010000_promotion_display_settings.sql. Access to settings and RPCs is restricted to service_role; writes additionally require authenticated admin and same-origin HTTP requests.
