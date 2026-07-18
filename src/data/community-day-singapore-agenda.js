export const EVENT = {
  name: 'AWS Community Day Singapore',
  shortName: 'CD SG',
  date: '2026-08-22',
  dateLabel: 'Sat, 22 Aug',
  hours: '9:00 AM to 5:30 PM',
  venue: 'AWS Singapore, IOI Central Boulevard Towers, Level 5',
  address: '2 Central Boulevard, Singapore',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=2+Central+Boulevard+Singapore',
};

export const TRACKS = [
  { id: 'all', label: 'All' },
  { id: 'main', label: 'Main stage' },
  { id: 'ai', label: 'AI & data' },
  { id: 'builders', label: 'Builders' },
  { id: 'community', label: 'Community' },
];

// The public 2026 agenda has not been announced yet. These programme blocks keep the
// companion useful without presenting invented speaker or talk names as confirmed.
export const SESSIONS = [
  { id: 'doors', start: '09:00', end: '09:30', title: 'Registration & breakfast', speaker: 'AWS User Group Singapore', track: 'community', room: 'Community lounge', type: 'Welcome' },
  { id: 'welcome', start: '09:30', end: '09:45', title: 'Community welcome', speaker: 'AWS User Group Singapore', track: 'main', room: 'Main stage', type: 'Opening' },
  { id: 'keynote', start: '09:45', end: '10:25', title: 'Opening keynote', speaker: 'Speaker to be announced', track: 'main', room: 'Main stage', type: 'Keynote' },
  { id: 'ai-1', start: '10:35', end: '11:15', title: 'AI & data session', speaker: 'Speaker to be announced', track: 'ai', room: 'Room 5A', type: 'Technical talk' },
  { id: 'builders-1', start: '10:35', end: '11:15', title: 'Builders session', speaker: 'Speaker to be announced', track: 'builders', room: 'Room 5B', type: 'Technical talk' },
  { id: 'break', start: '11:15', end: '11:35', title: 'Coffee & community break', speaker: 'Meet fellow AWS builders', track: 'community', room: 'Community lounge', type: 'Break' },
  { id: 'ai-2', start: '11:35', end: '12:15', title: 'AI & data session', speaker: 'Speaker to be announced', track: 'ai', room: 'Room 5A', type: 'Technical talk' },
  { id: 'builders-2', start: '11:35', end: '12:15', title: 'Architecture session', speaker: 'Speaker to be announced', track: 'builders', room: 'Room 5B', type: 'Technical talk' },
  { id: 'lunch', start: '12:15', end: '13:15', title: 'Lunch & networking', speaker: 'Community programme', track: 'community', room: 'Community lounge', type: 'Break' },
  { id: 'ai-3', start: '13:15', end: '13:55', title: 'Generative AI session', speaker: 'Speaker to be announced', track: 'ai', room: 'Room 5A', type: 'Technical talk' },
  { id: 'builders-3', start: '13:15', end: '13:55', title: 'Serverless builders session', speaker: 'Speaker to be announced', track: 'builders', room: 'Room 5B', type: 'Technical talk' },
  { id: 'panel', start: '14:10', end: '14:50', title: 'Community panel', speaker: 'Panellists to be announced', track: 'main', room: 'Main stage', type: 'Panel' },
  { id: 'ai-4', start: '15:00', end: '15:40', title: 'AI & data session', speaker: 'Speaker to be announced', track: 'ai', room: 'Room 5A', type: 'Technical talk' },
  { id: 'builders-4', start: '15:00', end: '15:40', title: 'Cloud operations session', speaker: 'Speaker to be announced', track: 'builders', room: 'Room 5B', type: 'Technical talk' },
  { id: 'closing', start: '16:50', end: '17:30', title: 'Closing, prizes & community photo', speaker: 'AWS User Group Singapore', track: 'main', room: 'Main stage', type: 'Closing' },
];

export const ROUTES = {
  downtown: {
    station: 'Downtown MRT', code: 'DT17', note: 'Recommended · about 5 minutes sheltered',
    steps: [
      { label: 'MRT exit', title: 'Take Exit E', detail: 'Follow signs for Central Boulevard and IOI Central Boulevard Towers.' },
      { label: 'Street level', title: 'Walk towards Central Boulevard', detail: 'Keep to the sheltered walkway after leaving the station.' },
      { label: 'Tower lobby', title: 'Enter IOI Central Boulevard Towers', detail: 'Use the office tower entrance at 2 Central Boulevard.' },
      { label: 'Arrival', title: 'Continue to Level 5', detail: 'Follow the AWS Community Day signs from the lift lobby.' },
    ],
  },
  shenton: {
    station: 'Shenton Way MRT', code: 'TE19', note: 'Alternative · about 7 minutes walk',
    steps: [
      { label: 'MRT exit', title: 'Take Exit 3', detail: 'Exit towards Shenton Way and Central Boulevard.' },
      { label: 'Crossing', title: 'Cross towards Central Boulevard', detail: 'Use the signal crossing and continue north.' },
      { label: 'Tower lobby', title: 'Enter IOI Central Boulevard Towers', detail: 'Look for the office tower entrance at number 2.' },
      { label: 'Arrival', title: 'Continue to Level 5', detail: 'Follow the AWS Community Day signs from the lift lobby.' },
    ],
  },
};
