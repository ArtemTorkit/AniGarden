# Gem Economy and Character Selling Design

## Goal

Update AniGarden's MVP economy so a $1 support payment grants 15 gems, one gacha pull costs 3 gems, and users can sell owned characters back to AniGarden for fixed rarity-based gem values.

## Economy rules

- Base purchase rate: 15 gems per USD.
- $10 bonus: 25 additional gems, for 175 total gems.
- $15 bonus: 50 additional gems, for 275 total gems.
- Donation validation remains USD-only and uses the verified webhook amount.
- Gacha price: 3 gems per paid pull. Daily free pulls remain free.
- Sell values: Common 1, Rare 2, Epic 5, Legendary 12.
- Selling never creates cash value or an external marketplace.

## Sell flow

The user selects an inventory copy and confirms selling it. A server route calls a security-definer database function that locks the inventory row, verifies ownership, verifies that the copy is not reserved in a pending trade, deletes the inventory row, and inserts a completed positive gem transaction. The operation is atomic, so a character cannot be sold twice or sold while being transferred by a trade.

The UI displays the sell value by rarity and refreshes the collection and gem balance after success. It does not perform database writes directly.

## Data and API changes

- Add a migration updating the variable Buy Me a Coffee gem calculation and any existing purchase-intent calculations.
- Add a migration updating the active banner's paid pull cost to 3 gems.
- Add a security-definer `sell_inventory_character` function with service-role-only execution.
- Preserve existing webhook signature verification and idempotency.
- Record manual/sell transactions using the existing gem ledger; extend the allowed transaction kind to include `sell` if needed by the current schema.

## Validation and testing

- Unit-test purchase calculations at $1, $10, $15, and boundary values.
- Verify the webhook credits 15 gems for a $1 live USD event and applies the threshold bonuses.
- Verify a 3-gem pull succeeds only when the user has sufficient balance.
- Verify selling each rarity grants the correct amount, rejects another user's inventory, rejects pending-trade inventory, and cannot be repeated for the same inventory row.
- Run type-check, build, and the available test suite.
