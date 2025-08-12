export function formatDateDisplay(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
}

export function getCategoryEmoji(category) {
  const emojis = {
    food: '🍔',
    transport: '🚗',
    entertainment: '🎬',
    shopping: '🛍️',
    bills: '📄',
    healthcare: '🏥',
    other: '📝',
  };
  return emojis[category] || '📝';
}