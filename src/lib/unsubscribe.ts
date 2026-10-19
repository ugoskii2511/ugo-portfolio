import "server-only";
import { prisma } from "@/lib/db";

export { unsubscribeToken, verifyUnsubscribe } from "@/lib/unsubscribe-token";

/// Marks the prospect do-not-contact and suppresses their email and phone,
/// so no future message (automatic or manual) can be prepared for them.
/// Safe to call more than once.
export async function doNotContact(prospectId: string, reason: string, eventType: string) {
  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) return false;
  await prisma.$transaction(async (tx) => {
    await tx.prospect.update({
      where: { id: prospectId },
      data: { doNotContact: true, stage: "DO_NOT_CONTACT", followUpAt: null, qualification: "do_not_contact", score: 0 },
    });
    await tx.followUpTask.updateMany({ where: { prospectId, status: "open" }, data: { status: "skipped" } });
    await tx.outreachDraft.updateMany({ where: { prospectId, status: { in: ["draft", "approved"] } }, data: { status: "rejected" } });
    for (const [kind, value] of [
      ["email", prospect.email],
      ["phone", prospect.phone],
    ] as const) {
      if (value) {
        await tx.suppression.upsert({
          where: { kind_value: { kind, value } },
          create: { kind, value, reason },
          update: {},
        });
      }
    }
    if (!prospect.doNotContact) {
      await tx.prospectEvent.create({ data: { prospectId, type: eventType, summary: reason.slice(0, 300) } });
    }
  });
  return true;
}
