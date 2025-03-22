await db.insert(wagerRaces).values({
  title: `Monthly Wager Race - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
  type: 'monthly',
  status: 'live',
})