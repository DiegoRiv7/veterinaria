-- CreateTable
CREATE TABLE "VetWorkingHours" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vetId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isWorking" BOOLEAN NOT NULL DEFAULT true,
    "startMinutes" INTEGER NOT NULL DEFAULT 540,
    "endMinutes" INTEGER NOT NULL DEFAULT 1080,
    CONSTRAINT "VetWorkingHours_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "Veterinarian" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VetWorkingHours_vetId_dayOfWeek_key" ON "VetWorkingHours"("vetId", "dayOfWeek");
