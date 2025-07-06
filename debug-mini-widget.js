// Debug script to check mini widget date formatting
// Run this in the Foundry console to debug the issue

console.log('=== Mini Widget Debug ===');

// Get the calendar manager
const manager = game.seasonsStars?.manager;
if (!manager) {
  console.error('Calendar manager not available');
} else {
  console.log('Calendar manager found');

  // Get active calendar
  const activeCalendar = manager.getActiveCalendar();
  console.log('Active calendar:', activeCalendar?.id, activeCalendar?.name);

  if (activeCalendar) {
    console.log('Active calendar dateFormats:', activeCalendar.dateFormats);

    // Get current date
    const currentDate = manager.getCurrentDate();
    console.log('Current date:', currentDate?.toObject());

    if (currentDate) {
      // Test toShortString directly
      console.log('toShortString() result:', currentDate.toShortString());

      // Test formatWidget directly
      const formatter = new game.seasonsStars.DateFormatter(activeCalendar);
      console.log('formatWidget(mini) result:', formatter.formatWidget(currentDate, 'mini'));

      // Check if widgets.mini exists
      const widgetsMini = activeCalendar.dateFormats?.widgets?.mini;
      console.log('widgets.mini format:', widgetsMini);

      if (widgetsMini) {
        console.log(
          'Formatting with widgets.mini template:',
          formatter.format(currentDate, widgetsMini)
        );
      }
    }
  }
}
