-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "createdTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailAddress" TEXT NOT NULL,
    "failedOneTimePasswordLoginAttempts" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account.emailAddress_unique" ON "Account"("emailAddress");
