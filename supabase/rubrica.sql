
alter table criteria add column if not exists question text;

update criteria set question = case name
  when 'Comida'        then '¿Qué tal estaba la comida?'
  when 'Cantidad'      then '¿Quedaste bien servido, sin pasarte?'
  when 'Presentación'  then '¿Qué tal la presentación del plato y la mesa?'
  when 'Ambiente'      then '¿Qué tal el ambiente, la música y la conversación?'
  when 'Postre y café' then '¿Cómo estuvieron el postre y el café?'
  else question end;

notify pgrst, 'reload schema';
