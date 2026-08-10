CREATE TABLE "CrewCallApplication" (
    "id" TEXT NOT NULL,
    "productionRequestId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrewCallApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrewCallApplication_productionRequestId_idx" ON "CrewCallApplication"("productionRequestId");

CREATE UNIQUE INDEX "CrewCallApplication_productionRequestId_applicantId_key" ON "CrewCallApplication"("productionRequestId", "applicantId");

ALTER TABLE "CrewCallApplication" ADD CONSTRAINT "CrewCallApplication_productionRequestId_fkey" FOREIGN KEY ("productionRequestId") REFERENCES "ProductionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CrewCallApplication" ADD CONSTRAINT "CrewCallApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
