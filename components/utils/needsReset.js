  
    // Date comparison helper functions for reset checking
    const isSameWeek = (date1, date2) => {
      // Get Monday of each week
      const getMonday = (d) => {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
      };
  
      const monday1 = getMonday(new Date(date1));
      const monday2 = getMonday(new Date(date2));
  
      return monday1.toDateString() === monday2.toDateString();
    };
  
    const isSameMonth = (date1, date2) => {
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth()
      );
    };
  
    const isSameYear = (date1, date2) => {
      return date1.getFullYear() === date2.getFullYear();
    };
  
    const needsReset = (metric, now) => {
      if (!metric.lastReset) return false;
  
      const lastReset = new Date(metric.lastReset);
  
      switch (metric.timeframe) {
        case 'week':
          // Check if we're in a different week (Monday start)
          return !isSameWeek(lastReset, now);
  
        case 'month':
          // Check if we're in a different month
          return !isSameMonth(lastReset, now);
  
        case 'year':
          // Check if we're in a different year
          return !isSameYear(lastReset, now);
  
        default:
          return false;
      }
    };

    export { needsReset };