-- Add user presence tracking table

CREATE TABLE IF NOT EXISTS "UserPresence" (
    "userId" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPresence_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX IF NOT EXISTS "UserPresence_lastSeen_idx" ON "UserPresence"("lastSeen");

ALTER TABLE "UserPresence"
    ADD CONSTRAINT "UserPresence_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("NIK")
    ON DELETE RESTRICT ON UPDATE CASCADE;
