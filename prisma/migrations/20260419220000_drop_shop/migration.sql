-- Shop feature retired. Drop all shop tables + enums.
-- Order depends on Product (via OrderItem), so drop OrderItem first, then
-- Order, then Product, then ProductCategory/ProductImage. Enums last.
-- Safe ordering: drop child/dependent tables before parents.

DROP TABLE IF EXISTS "OrderItem" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;
DROP TABLE IF EXISTS "ProductImage" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "ProductCategory" CASCADE;

DROP TYPE IF EXISTS "OrderStatus";
DROP TYPE IF EXISTS "PaymentStatus";
DROP TYPE IF EXISTS "FulfillmentStatus";
