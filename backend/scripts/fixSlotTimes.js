require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY are required');
}
const supabase = createClient(supabaseUrl, supabaseKey);

const formatLocalDateTime = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  const secs = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
};

const fixDateValue = (value) => {
  if (!value || typeof value !== 'string') return value;
  if (!value.includes('T')) return value;
  const utcDate = new Date(`${value}Z`);
  if (Number.isNaN(utcDate.getTime())) return value;
  return formatLocalDateTime(utcDate);
};

(async () => {
  console.log('Fetching all slots...');
  const { data, error } = await supabase
    .from('slots')
    .select('id, start_time, end_time');

  if (error) {
    console.error('Fetch error:', error);
    process.exit(1);
  }

  const rowsToUpdate = (data || []).filter(
    (slot) => slot.start_time?.includes('T') || slot.end_time?.includes('T')
  );

  if (rowsToUpdate.length === 0) {
    console.log('No old-format slots found. Nothing to update.');
    process.exit(0);
  }

  console.log(`Found ${rowsToUpdate.length} slots to update.`);

  for (const slot of rowsToUpdate) {
    const newStart = fixDateValue(slot.start_time);
    const newEnd = fixDateValue(slot.end_time);
    if (newStart === slot.start_time && newEnd === slot.end_time) {
      console.log(`Skipping slot ${slot.id}: no change needed.`);
      continue;
    }
    const { error: updateError } = await supabase
      .from('slots')
      .update({ start_time: newStart, end_time: newEnd })
      .eq('id', slot.id);
    if (updateError) {
      console.error(`Failed to update slot ${slot.id}:`, updateError);
    } else {
      console.log(`Updated slot ${slot.id}: ${slot.start_time} -> ${newStart}`);
    }
  }
  console.log('Slot time fix complete.');
})();
