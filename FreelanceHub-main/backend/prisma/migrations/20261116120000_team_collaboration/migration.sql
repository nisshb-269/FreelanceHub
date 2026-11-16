-- Additive collaboration schema. Existing project, proposal and contract records are preserved.
ALTER TABLE "Project"
  ADD COLUMN "teamEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "teamSize" INTEGER NOT NULL DEFAULT 1;

CREATE TYPE "TeamMemberStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED');
CREATE TYPE "TeamTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');

CREATE TABLE "ProjectMember" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "freelancerId" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "roleLabel" TEXT NOT NULL DEFAULT 'Contributor',
  "status" "TeamMemberStatus" NOT NULL DEFAULT 'PENDING',
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectTask" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "assigneeId" TEXT,
  "createdById" TEXT NOT NULL,
  "status" "TeamTaskStatus" NOT NULL DEFAULT 'TODO',
  "dueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectMember_projectId_freelancerId_key"
  ON "ProjectMember"("projectId", "freelancerId");
CREATE INDEX "ProjectMember_freelancerId_status_idx"
  ON "ProjectMember"("freelancerId", "status");
CREATE INDEX "ProjectMember_projectId_status_idx"
  ON "ProjectMember"("projectId", "status");
CREATE INDEX "ProjectTask_projectId_status_idx"
  ON "ProjectTask"("projectId", "status");
CREATE INDEX "ProjectTask_assigneeId_status_idx"
  ON "ProjectTask"("assigneeId", "status");

ALTER TABLE "ProjectMember"
  ADD CONSTRAINT "ProjectMember_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMember"
  ADD CONSTRAINT "ProjectMember_freelancerId_fkey"
  FOREIGN KEY ("freelancerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMember"
  ADD CONSTRAINT "ProjectMember_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectTask"
  ADD CONSTRAINT "ProjectTask_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTask"
  ADD CONSTRAINT "ProjectTask_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTask"
  ADD CONSTRAINT "ProjectTask_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProjectMessage" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectMessage_projectId_createdAt_idx"
  ON "ProjectMessage"("projectId", "createdAt");

ALTER TABLE "ProjectMessage"
  ADD CONSTRAINT "ProjectMessage_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMessage"
  ADD CONSTRAINT "ProjectMessage_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
