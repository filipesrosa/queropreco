-- CreateTable
CREATE TABLE "random_values" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "random_values_pkey" PRIMARY KEY ("id")
);
