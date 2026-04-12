export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function fmtDate(dateInput: any): string {
  if (!dateInput) return '';
  
  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'object' && 'seconds' in dateInput) {
    // Handle Firestore Timestamp
    date = new Date(dateInput.seconds * 1000);
  } else {
    date = new Date(dateInput);
  }
  
  // Check if date is valid
  if (!isValidDate(date)) {
    return 'Date invalide';
  }

  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Erreur format';
  }
}

export function daysLeft(dateStr: string): number {
  if (!dateStr) return 0;
  const target = new Date(dateStr);
  if (!isValidDate(target)) return 0;
  
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
