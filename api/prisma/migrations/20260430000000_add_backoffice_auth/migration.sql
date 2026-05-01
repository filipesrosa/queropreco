-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ENTITY_ADMIN', 'READER');

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "logo" TEXT,
    "notificationPhone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'READER',
    "entityId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_readings" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "readerName" TEXT,
    "readerCpf" TEXT,
    "accessKey" TEXT NOT NULL,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "target" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entities_cnpj_key" ON "entities"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_entityId_idx" ON "users"("entityId");

-- CreateIndex
CREATE INDEX "user_readings_userId_idx" ON "user_readings"("userId");

-- CreateIndex
CREATE INDEX "user_readings_entityId_idx" ON "user_readings"("entityId");

-- CreateIndex
CREATE INDEX "user_readings_createdAt_idx" ON "user_readings"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reading_goals_userId_weekStart_key" ON "reading_goals"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "reading_goals_entityId_idx" ON "reading_goals"("entityId");

-- CreateIndex
CREATE INDEX "reading_goals_weekStart_idx" ON "reading_goals"("weekStart");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_readings" ADD CONSTRAINT "user_readings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_readings" ADD CONSTRAINT "user_readings_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_goals" ADD CONSTRAINT "reading_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_goals" ADD CONSTRAINT "reading_goals_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
