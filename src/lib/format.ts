const DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Makassar",
});

const SHORT_DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  timeZone: "Asia/Makassar",
});

const TIME_FMT = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Makassar",
});

export const formatDate = (iso: string) => DATE_FMT.format(new Date(iso));
export const formatShortDate = (iso: string) => SHORT_DATE_FMT.format(new Date(iso));
export const formatTime = (iso: string) => `${TIME_FMT.format(new Date(iso))} WITA`;
export const formatDateTime = (iso: string) => `${formatShortDate(iso)} • ${formatTime(iso)}`;

export const dateKey = (iso: string) => iso.slice(0, 10);

export const formatNumber = (value: number) => new Intl.NumberFormat("id-ID").format(value);
