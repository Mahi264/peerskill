-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "branch" TEXT,
    "graduationYear" INTEGER,
    "section" TEXT,
    "bio" TEXT,
    "helpAvailable" BOOLEAN NOT NULL DEFAULT true,
    "helpStatus" TEXT,
    "contactVisibility" TEXT NOT NULL DEFAULT 'CONNECTIONS',
    "chatRequestVisibility" TEXT NOT NULL DEFAULT 'CONNECTIONS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("avatarUrl", "bio", "branch", "chatRequestVisibility", "contactVisibility", "createdAt", "fullName", "graduationYear", "helpAvailable", "helpStatus", "section", "updatedAt", "userId") SELECT "avatarUrl", "bio", "branch", "chatRequestVisibility", "contactVisibility", "createdAt", "fullName", "graduationYear", "helpAvailable", "helpStatus", "section", "updatedAt", "userId" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
