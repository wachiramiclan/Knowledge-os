INSERT INTO projects (name) VALUES ('Personal OS'), ('Writing System'), ('AI Research');

INSERT INTO notes (title, body, tags, kind, project_id, created_at) VALUES
('Daily Note', 'Exploring the relationship between focus, creativity, and meaningful work. The deeper I go, the more connections I see.', '{reflection}', 'daily', 1, '2025-05-20'),
('The Art of Focus', E'Focus is a choice. In a world of distraction, attention is your greatest asset.\n- Eliminate distractions\n- Define clear priorities\n- Create deep work rituals\n- Reflect and iterate', '{focus,deepwork}', 'note', 1, now()),
('Creativity', 'Creative work grows when ideas from different areas meet.', '{creativity,focus,systems,writing}', 'note', 1, now()),
('Atomic Habits', 'Small habits compound. Design your environment so the good habit is the easy one.', '{habits,focus}', 'note', 1, now()),
('Writing Principles', 'Write plainly. One idea per paragraph. Edit after a break.', '{writing,creativity,public}', 'note', 2, now()),
('Building in Public', 'Share progress early. Feedback arrives faster than perfection.', '{public,writing}', 'note', 2, now()),
('Focus & Deep Work', 'Protect long blocks of time for the hardest task of the day.', '{focus,deepwork}', 'note', 1, now()),
('Productivity Tools', 'A tool is only useful if it removes steps from your day.', '{tools,systems}', 'note', 3, now()),
('Systems Thinking', 'Look at how parts connect, not just the parts.', '{systems,creativity}', 'note', 3, now()),
('Fixed ECONNREFUSED on Postgres', 'Error: connect ECONNREFUSED 127.0.0.1:5432 happened because the PostgreSQL service was not running. Fix: start the service, then check DATABASE_URL in .env.', '{bug,postgres,tools}', 'note', 1, now() - interval '90 days');
