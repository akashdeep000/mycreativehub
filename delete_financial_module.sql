
-- First, query to find the Financial Management module
SELECT id, name FROM toolkit_modules WHERE name LIKE '%Financial%';

-- Then delete the Financial Management module
-- Replace :module_id with the actual ID found from the query above
DELETE FROM toolkit_modules WHERE id = :module_id AND name LIKE '%Financial%';
