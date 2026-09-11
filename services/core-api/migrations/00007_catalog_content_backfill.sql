-- +goose Up
-- Content reconciliation for the 17 verified legacy catalogue records.
-- Adds missing taxonomy and public descriptions; only migrates lessons with real source URLs.

INSERT INTO categories (slug, name_ar, description, position) VALUES
  ('quality-safety', 'الجودة والسلامة', 'إدارة الجودة والمعايير الدولية والصحة والسلامة المهنية', 7),
  ('professional-development', 'التطوير المهني', 'المهارات المهنية والإدارية وتطوير الأداء', 8),
  ('training-education', 'التدريب والتعليم', 'إعداد المدربين وتقنيات التعليم والتعلم', 9),
  ('community-development', 'التنمية المجتمعية', 'برامج العمل الطوعي وخدمة المجتمع', 10)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  position = EXCLUDED.position;

UPDATE courses SET
  description = CASE slug
    WHEN 'english-language' THEN 'دورات متدرجة لبناء مهارات اللغة الإنجليزية من الأساسيات إلى الاستخدام المهني، مع التركيز على القواعد والمحادثة والنطق والكتابة.'
    WHEN 'volunteer-work' THEN 'برنامج تمهيدي يعرّف بمبادئ العمل الطوعي وإدارة المبادرات المجتمعية والمشروعات الخيرية بصورة منظمة وفعالة.'
    WHEN 'smart-board' THEN 'برنامج عملي لاستخدام السبورة الذكية والتطبيقات التعليمية ورفع مستوى التفاعل والتقييم داخل البيئة التعليمية.'
    WHEN 'mini-mba' THEN 'برنامج مكثف يقدم أساسيات الإدارة الاستراتيجية والتسويق والإدارة المالية والقيادة في إطار مهني متكامل.'
    WHEN 'crisis-management' THEN 'برنامج يطور القدرة على تحليل المخاطر وبناء خطط الطوارئ وإدارة الوقت واتخاذ القرار في المواقف الحرجة.'
    WHEN 'public-relations' THEN 'برنامج في بناء العلاقات المؤسسية وإدارة السمعة والتواصل الإعلامي وتنظيم الفعاليات والتسويق الرقمي.'
    WHEN 'health-safety' THEN 'برنامج شامل في مبادئ الصحة والسلامة المهنية وتحليل المخاطر وإدارة الحوادث وأنظمة الوقاية في بيئة العمل.'
    WHEN 'pmp-project-management' THEN 'برنامج متقدم في منهجيات إدارة المشاريع والتخطيط وإدارة المخاطر، مصمم لتطوير الممارسة المهنية في إدارة المشاريع.'
    WHEN 'time-management' THEN 'برنامج تطبيقي في إدارة الوقت وبناء الجداول الزمنية وترتيب الأولويات واستخدام أدوات التنظيم بكفاءة.'
    WHEN 'quality-management' THEN 'برنامج لتطبيق مبادئ إدارة الجودة الشاملة وأدوات التحسين المستمر ورفع كفاءة العمليات داخل المؤسسات.'
    WHEN 'iso-standards' THEN 'مقدمة تطبيقية للمعايير الدولية ISO 9001 وISO 14001 وISO 45001 ودورها في بناء أنظمة إدارة فعالة.'
    WHEN 'report-writing' THEN 'برنامج عملي في أنواع التقارير وهيكلتها واللغة المهنية وطرق عرض النتائج بوضوح ودقة.'
    WHEN 'human-resources-advanced' THEN 'برنامج في استقطاب المواهب وتقييم الأداء والتدريب والتطوير وإدارة التعويضات وبناء الكفاءات المؤسسية.'
    WHEN 'train-trainers' THEN 'برنامج متقدم لإعداد المدربين وتصميم البرامج وإدارة القاعة وقياس أثر التدريب ومتابعة المتعلمين.'
    WHEN 'organization-management' THEN 'برنامج يشرح أسس إدارة المنظمات والهياكل الإدارية وإدارة التغيير والتطوير التنظيمي والقيادة.'
    WHEN 'strategic-planning' THEN 'برنامج متقدم لتحليل البيئة وبناء الرؤية والرسالة وتحويل الأهداف إلى خطط تنفيذية قابلة للمتابعة والتقييم.'
    WHEN 'warehouse-accounting' THEN 'برنامج تطبيقي يجمع إدارة المخازن والتحكم في المخزون مع أساسيات المحاسبة والتكاليف والتقارير المالية.'
    ELSE description
  END,
  category_id = CASE
    WHEN slug = 'english-language' THEN (SELECT id FROM categories WHERE slug = 'languages')
    WHEN slug = 'volunteer-work' THEN (SELECT id FROM categories WHERE slug = 'community-development')
    WHEN slug = 'smart-board' THEN (SELECT id FROM categories WHERE slug = 'training-education')
    WHEN slug IN ('mini-mba', 'crisis-management', 'pmp-project-management', 'time-management', 'organization-management', 'strategic-planning') THEN (SELECT id FROM categories WHERE slug = 'management')
    WHEN slug = 'public-relations' THEN (SELECT id FROM categories WHERE slug = 'marketing')
    WHEN slug IN ('health-safety', 'quality-management', 'iso-standards') THEN (SELECT id FROM categories WHERE slug = 'quality-safety')
    WHEN slug = 'report-writing' THEN (SELECT id FROM categories WHERE slug = 'professional-development')
    WHEN slug = 'human-resources-advanced' THEN (SELECT id FROM categories WHERE slug = 'hr')
    WHEN slug = 'train-trainers' THEN (SELECT id FROM categories WHERE slug = 'training-education')
    WHEN slug = 'warehouse-accounting' THEN (SELECT id FROM categories WHERE slug = 'finance')
    ELSE category_id
  END,
  updated_at = now()
WHERE slug IN (
  'english-language', 'volunteer-work', 'smart-board', 'mini-mba',
  'crisis-management', 'public-relations', 'health-safety',
  'pmp-project-management', 'time-management', 'quality-management',
  'iso-standards', 'report-writing', 'human-resources-advanced',
  'train-trainers', 'organization-management', 'strategic-planning',
  'warehouse-accounting'
);

-- The safety course is the only legacy course with verified, non-placeholder media URLs.
INSERT INTO course_sections (course_id, title, position)
SELECT id, 'أساسيات الصحة والسلامة المهنية', 1
FROM courses
WHERE slug = 'health-safety'
  AND NOT EXISTS (SELECT 1 FROM course_sections s WHERE s.course_id = courses.id);

INSERT INTO lessons (section_id, course_id, type, title, content, video_url, position, is_free_preview)
SELECT s.id, c.id, 'video', lesson.title, lesson.content, lesson.video_url, lesson.position, lesson.is_free_preview
FROM courses c
JOIN course_sections s ON s.course_id = c.id AND s.position = 1
CROSS JOIN (VALUES
  ('مقدمة في السلامة المهنية', 'التعريف بأساسيات السلامة المهنية والأهداف العامة.', 'https://alameed.b-cdn.net/first%20lesson.mp4', 1, true),
  ('المحاضرة الثانية — السلامة المهنية', 'موضوعات متقدمة في السلامة المهنية.', 'https://alameed.b-cdn.net/second%20lesson.mp4', 2, false),
  ('تطبيقات عملية في السلامة المهنية', 'تطبيقات ودراسات حالة في بيئة العمل.', 'https://youtu.be/C8mULJ9pJ_E?si=XIuE_eAHbQX49rcA', 3, false),
  ('إدارة المخاطر في بيئة العمل', 'التعرف على المخاطر وتحليلها وإدارتها بفاعلية.', 'https://youtu.be/ihPzsLJYao4?si=qp8jcLYUehaQAlJh', 4, false),
  ('أنظمة الوقاية والحماية', 'وسائل الوقاية والحماية في بيئات العمل المختلفة.', 'https://youtu.be/T3xgiq5KK14?si=TzFhY8v0cWYq_0H4', 5, false),
  ('التدريب والتوعية في السلامة المهنية', 'دور التدريب والتوعية في ترسيخ ممارسات السلامة.', 'https://youtu.be/ReP0pbSzVmU?si=cAIXqZYDKnljHiih', 6, false)
) AS lesson(title, content, video_url, position, is_free_preview)
WHERE c.slug = 'health-safety'
ON CONFLICT (section_id, position) DO NOTHING;

-- +goose Down
DELETE FROM course_sections
WHERE course_id = (SELECT id FROM courses WHERE slug = 'health-safety')
  AND title = 'أساسيات الصحة والسلامة المهنية';

UPDATE courses SET category_id = NULL
WHERE slug IN (
  'english-language', 'volunteer-work', 'smart-board', 'mini-mba',
  'crisis-management', 'public-relations', 'health-safety',
  'pmp-project-management', 'time-management', 'quality-management',
  'iso-standards', 'report-writing', 'human-resources-advanced',
  'train-trainers', 'organization-management', 'strategic-planning',
  'warehouse-accounting'
);

DELETE FROM categories WHERE slug IN ('quality-safety', 'professional-development', 'training-education', 'community-development');
