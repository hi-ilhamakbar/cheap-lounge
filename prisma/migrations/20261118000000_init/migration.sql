-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PassengerType" AS ENUM ('ADULT', 'CHILD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LoungeSource" AS ENUM ('LOUNGEKEY', 'MANUAL');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('ORDER_CONFIRMATION', 'PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'ORDER_COMPLETED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('id', 'en');

-- CreateTable
CREATE TABLE "Airport" (
    "iata" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Airport_pkey" PRIMARY KEY ("iata")
);

-- CreateTable
CREATE TABLE "Lounge" (
    "id" TEXT NOT NULL,
    "source" "LoungeSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "airportIata" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "terminal" TEXT,
    "location" TEXT,
    "openingHours" TEXT,
    "description" TEXT,
    "facilities" TEXT[],
    "images" TEXT[],
    "conditions" TEXT,
    "accessInfo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "raw" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lounge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderCode" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'id',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "customerId" TEXT NOT NULL,
    "airportIata" TEXT NOT NULL,
    "airportName" TEXT NOT NULL,
    "airportCity" TEXT NOT NULL,
    "airportCountry" TEXT NOT NULL,
    "loungeId" TEXT,
    "loungeSource" "LoungeSource" NOT NULL,
    "loungeExternalId" TEXT NOT NULL,
    "loungeName" TEXT NOT NULL,
    "loungeTerminal" TEXT,
    "visitDate" DATE NOT NULL,
    "adultQty" INTEGER NOT NULL,
    "childQty" INTEGER NOT NULL,
    "adultUnitPrice" INTEGER NOT NULL,
    "childUnitPrice" INTEGER NOT NULL,
    "adultSubtotal" INTEGER NOT NULL,
    "childSubtotal" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "paymentVerifiedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "clientIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passenger" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "PassengerType" NOT NULL,
    "position" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,

    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'QRIS_STATIC',
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'SUBMITTED',
    "payerName" TEXT,
    "customerNote" TEXT,
    "proofData" BYTEA NOT NULL,
    "proofMime" TEXT NOT NULL,
    "proofFilename" TEXT NOT NULL,
    "proofSha256" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailNotification" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "EmailType" NOT NULL,
    "toEmail" TEXT NOT NULL,
    "ccEmails" TEXT[],
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "generation" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "providerMessageId" TEXT,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus",
    "action" TEXT NOT NULL,
    "note" TEXT,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Airport_city_idx" ON "Airport"("city");

-- CreateIndex
CREATE INDEX "Airport_name_idx" ON "Airport"("name");

-- CreateIndex
CREATE INDEX "Lounge_airportIata_idx" ON "Lounge"("airportIata");

-- CreateIndex
CREATE UNIQUE INDEX "Lounge_source_externalId_key" ON "Lounge"("source", "externalId");

-- CreateIndex
CREATE INDEX "Customer_whatsapp_idx" ON "Customer"("whatsapp");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_whatsapp_key" ON "Customer"("email", "whatsapp");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderCode_key" ON "Order"("orderCode");

-- CreateIndex
CREATE UNIQUE INDEX "Order_accessToken_key" ON "Order"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_visitDate_idx" ON "Order"("visitDate");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Passenger_orderId_type_position_key" ON "Passenger"("orderId", "type", "position");

-- CreateIndex
CREATE INDEX "Payment_orderId_status_idx" ON "Payment"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_proofSha256_key" ON "Payment"("orderId", "proofSha256");

-- CreateIndex
CREATE INDEX "EmailNotification_status_nextAttemptAt_idx" ON "EmailNotification"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailNotification_orderId_type_key" ON "EmailNotification"("orderId", "type");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_adminId_idx" ON "AdminSession"("adminId");

-- AddForeignKey
ALTER TABLE "Lounge" ADD CONSTRAINT "Lounge_airportIata_fkey" FOREIGN KEY ("airportIata") REFERENCES "Airport"("iata") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_loungeId_fkey" FOREIGN KEY ("loungeId") REFERENCES "Lounge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailNotification" ADD CONSTRAINT "EmailNotification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Business-rule guards at the database level
ALTER TABLE "Order" ADD CONSTRAINT "Order_qty_check" CHECK ("adultQty" >= 0 AND "childQty" >= 0 AND ("adultQty" + "childQty") >= 1);
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_check" CHECK ("totalAmount" = "adultSubtotal" + "childSubtotal");
