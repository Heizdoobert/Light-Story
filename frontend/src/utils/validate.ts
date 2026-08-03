export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhoneNumber(phone: string): boolean {
  return /^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(phone);
}
