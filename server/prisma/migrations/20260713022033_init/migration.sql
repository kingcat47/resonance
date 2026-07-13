-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "shareX" TEXT NOT NULL,
    "shareY" TEXT NOT NULL,
    "incidentC" TEXT NOT NULL,
    "incidentEncryptedK" TEXT NOT NULL,
    "contactC" TEXT NOT NULL,
    "contactEncryptedK" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_tag_idx" ON "Report"("tag");
