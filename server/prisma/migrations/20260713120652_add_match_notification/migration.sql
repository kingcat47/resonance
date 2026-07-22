-- CreateTable
CREATE TABLE "MatchNotification" (
    "tag" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchNotification_pkey" PRIMARY KEY ("tag")
);
