// Get leaderboard data from external API
const leaderboardData = await getLeaderboardData();
if (!leaderboardData?.data?.monthly?.data) {
  throw new Error('Invalid leaderboard data format');
}

// Store the race data with real participants
await db.insert(wagerRaces).values({
  title: `Monthly Wager Race - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
  type: 'monthly',
  status: 'live',
});

// Store participants data
const participants = leaderboardData.data.monthly.data.slice(0, 10).map((entry, index) => ({
  uid: entry.uid,
  name: entry.name,
  wagered: entry.wagered.this_month,
  position: index + 1
}));

// Insert participants
for (const participant of participants) {
  await db.insert(wagerRaceParticipants).values(participant);
}

return { status: 'success', data: { participants } };