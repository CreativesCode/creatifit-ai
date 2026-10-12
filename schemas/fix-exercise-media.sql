-- 19 ejercicios apuntaban a un archivo de imagen que no existe en Storage.
-- Diez tienen una imagen ya subida con otro nombre (emparejadas a la vista el
-- 2026-10-12); se corrige su gif_url. Los nueve restantes no tienen ninguna
-- imagen: se deja gif_url en NULL para que la app muestre el icono generico en
-- vez de pedir un archivo inexistente, y generate-plan no los ofrece al modelo.
-- Si mas adelante se suben sus imagenes, basta con volver a poner el nombre.

UPDATE public.exercises e
SET gif_url = m.new_url
FROM (VALUES
  ('Face-Pull.gif',                 'Face-Pull(1).gif'),
  ('standing-side-bend.gif',        'standing-side-bend(1).gif'),
  ('Neck-Extension.gif',            'Neck-Extension-Stretching-360x360.png'),
  ('Neck-Flexion.gif',              'Neck-Flexion-Stretch-360x360.png'),
  ('Neck-Lateral-Flexion.gif',      'Side-Neck-Stretch.gif'),
  ('Neck-Rotation.gif',             'Rotating-Neck-Stretch.gif'),
  ('Neck-Stretch.gif',              'Front-and-Back-Neck-Stretch.gif'),
  ('Neck-Mobility.gif',             'Diagonal-Neck-Stretch-360x360.png'),
  ('Weighted-Neck-Extension.gif',   'Weighted-Neck-Harness-Extension.gif'),
  ('Weighted-Neck-Flexion.gif',     'Weighted-Lying-Neck-Flexion.gif')
) AS m(old_url, new_url)
WHERE e.gif_url = m.old_url;

UPDATE public.exercises
SET gif_url = NULL
WHERE gif_url IN (
  'Dumbbell-Neck-Extension.gif',
  'Dumbbell-Neck-Flexion.gif',
  'Dumbbell-Neck-Lateral-Flexion.gif',
  'Dumbbell-Neck-Rotation.gif',
  'Neck-Cool-down.gif',
  'Neck-Recovery.gif',
  'Neck-Warm-up.gif',
  'Weighted-Neck-Lateral-Flexion.gif',
  'Weighted-Neck-Rotation.gif'
);
