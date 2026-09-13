-- Money must be exact: DOUBLE PRECISION cannot represent ordinary prices
-- without error, and the error compounds once totals and payouts are added.
ALTER TABLE "Course" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2);
