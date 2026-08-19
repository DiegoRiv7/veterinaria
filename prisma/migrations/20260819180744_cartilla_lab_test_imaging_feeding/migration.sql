-- CreateTable
CREATE TABLE "LabStudy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "performedAt" DATETIME NOT NULL,
    "result" TEXT,
    "notes" TEXT,
    "vetName" TEXT,
    "addedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LabStudy_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LabStudy_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiagnosticTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "performedAt" DATETIME NOT NULL,
    "result" TEXT,
    "notes" TEXT,
    "vetName" TEXT,
    "addedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiagnosticTest_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiagnosticTest_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImagingStudy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "region" TEXT,
    "performedAt" DATETIME NOT NULL,
    "findings" TEXT,
    "vetName" TEXT,
    "addedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImagingStudy_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImagingStudy_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeedingRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "foodType" TEXT NOT NULL,
    "brand" TEXT,
    "dailyGrams" REAL,
    "mealsPerDay" INTEGER,
    "weightKg" REAL,
    "notes" TEXT,
    "recordedAt" DATETIME NOT NULL,
    "addedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedingRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FeedingRecord_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LabStudy_petId_performedAt_idx" ON "LabStudy"("petId", "performedAt");

-- CreateIndex
CREATE INDEX "DiagnosticTest_petId_performedAt_idx" ON "DiagnosticTest"("petId", "performedAt");

-- CreateIndex
CREATE INDEX "ImagingStudy_petId_performedAt_idx" ON "ImagingStudy"("petId", "performedAt");

-- CreateIndex
CREATE INDEX "FeedingRecord_petId_recordedAt_idx" ON "FeedingRecord"("petId", "recordedAt");
