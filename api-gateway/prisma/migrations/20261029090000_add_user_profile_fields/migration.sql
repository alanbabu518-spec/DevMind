ALTER TABLE "User"
  ADD COLUMN "username" TEXT,
  ADD COLUMN "avatarId" TEXT NOT NULL DEFAULT 'identicon-01',
  ADD COLUMN "profileCompleted" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE UNIQUE INDEX "User_username_lower_key"
  ON "User" (LOWER("username"))
  WHERE "username" IS NOT NULL;
