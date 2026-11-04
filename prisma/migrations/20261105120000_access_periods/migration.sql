-- Access periods: a single chapter lasts 3 months, a one-class course 1 year, and a course covering
-- both Class 11 and Class 12 lasts 2 years. Only new purchases use these; existing access keeps its end date.
ALTER TABLE "Chapter" ALTER COLUMN "validityDays" SET DEFAULT 90;
UPDATE "Chapter" SET "validityDays" = 90;
UPDATE "Course" c SET "validityDays" = CASE
  WHEN EXISTS (SELECT 1 FROM "CourseChapter" x JOIN "Chapter" ch ON ch."id" = x."chapterId" WHERE x."courseId" = c."id" AND ch."classLevel" = 11)
   AND EXISTS (SELECT 1 FROM "CourseChapter" x JOIN "Chapter" ch ON ch."id" = x."chapterId" WHERE x."courseId" = c."id" AND ch."classLevel" = 12)
  THEN 730 ELSE 365 END;
