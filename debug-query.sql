-- Sample query to check what's actually in the database
SELECT 
  e.id,
  e.goalId,
  e.amount,
  e.timestamp,
  datetime(e.timestamp / 1000, 'unixepoch') as readable_timestamp,
  g.createdAt,
  datetime(g.createdAt / 1000, 'unixepoch') as goal_created
FROM entries e
JOIN goals g ON e.goalId = g.id
ORDER BY e.timestamp DESC
LIMIT 5;
