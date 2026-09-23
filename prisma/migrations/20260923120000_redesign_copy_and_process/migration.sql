-- 2026 redesign: refresh the site copy and expand the process to six steps.
-- Data-only. Every UPDATE is guarded on the value still being the previous
-- copy, so anything already customised from /admin/content is left alone.

UPDATE "SiteSettings"
SET "heroHeadline" = 'I build digital products people actually use.'
WHERE "id" = 'singleton' AND "heroHeadline" = 'Building fast, modern web experiences that work.';

UPDATE "SiteSettings"
SET "heroIntro" = 'I design and engineer websites, web applications and SaaS platforms, taking ideas from a first conversation to a product running in production.'
WHERE "id" = 'singleton' AND "heroIntro" LIKE 'I''m Ugochukwu Chukwu Christian, a full-stack developer helping businesses%';

UPDATE "SiteSettings"
SET "siteTagline" = 'Software Engineer & Product Builder'
WHERE "id" = 'singleton' AND "siteTagline" = 'Full-Stack Web Developer';

UPDATE "SiteSettings"
SET "siteDescription" = 'Independent software engineer building websites, web applications, SaaS platforms and custom digital products, from concept to production.'
WHERE "id" = 'singleton' AND "siteDescription" LIKE 'Full-stack web developer building fast, modern websites%';

UPDATE "SiteSettings"
SET "footerBio" = 'Independent software engineer building websites, web applications and SaaS products, from first idea to production.'
WHERE "id" = 'singleton' AND "footerBio" LIKE 'Ugochukwu Chukwu Christian — full-stack web developer%';

UPDATE "SiteSettings"
SET "aboutBio" = 'I''m Ugochukwu, an independent software engineer. I build websites, web applications and SaaS products end to end, from the interface people touch to the database, payments and infrastructure underneath.

I work directly with founders and businesses. No account managers, no hand-offs. We start by understanding the problem, then I design, build and ship it, and keep you in the loop the whole way.

What I care about is simple: products that are fast, feel considered, and are built well enough that any engineer could pick them up after me.'
WHERE "id" = 'singleton' AND "aboutBio" LIKE 'I''m a full-stack web developer who helps businesses grow their online presence%';

-- Process: replace the four original seed steps with six, but only if the
-- admin hasn't touched them (same four rows, same titles, nothing added).
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "ProcessStep") = 4
     AND (SELECT COUNT(*) FROM "ProcessStep"
          WHERE ("id", "title") IN (
            ('seed-process-step-1', 'Discover'),
            ('seed-process-step-2', 'Design'),
            ('seed-process-step-3', 'Build'),
            ('seed-process-step-4', 'Launch & Support'))) = 4
  THEN
    DELETE FROM "ProcessStep";
    INSERT INTO "ProcessStep" ("id", "title", "description", "order", "createdAt", "updatedAt") VALUES
      ('seed-process-step-1', 'Discover', 'We talk through the problem, your users, goals and budget, and agree on what success looks like.', 0, NOW(), NOW()),
      ('seed-process-step-2', 'Plan', 'Architecture, features and technical direction, scoped with a clear quote and timeline.', 1, NOW(), NOW()),
      ('seed-process-step-3', 'Design', 'The experience and interface, shaped and agreed before production code begins.', 2, NOW(), NOW()),
      ('seed-process-step-4', 'Build', 'The product and the systems behind it (auth, data, payments, integrations), with regular updates.', 3, NOW(), NOW()),
      ('seed-process-step-5', 'Test', 'Performance, responsiveness, security and usability, checked on real devices.', 4, NOW(), NOW()),
      ('seed-process-step-6', 'Launch', 'Deployed, monitored and improved, with support after launch if you need it.', 5, NOW(), NOW());
  END IF;
END $$;
