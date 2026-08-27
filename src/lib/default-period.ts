/** First day of the current calendar month — default reporting period in forms. */
export function defaultReportingMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}-01`;
}
