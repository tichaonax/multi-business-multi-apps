-- Delete all demo businesses to clean up duplicates
DELETE FROM businesses 
WHERE name LIKE '%Demo%' 
   OR id IN ('clothing-demo-business', 'hardware-demo-business', 'grocery-demo-business', 'restaurant-demo', 'contractors-demo-business');
