const DEFAULT_TIME_ZONE =
  process.env.APP_TIME_ZONE ?? process.env.APP_TIMEZONE ?? process.env.TZ ?? 'America/Sao_Paulo';

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function getDateParts(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;

  return {
    year: values.year,
    month: values.month,
    day: values.day,
  };
}

function getTimeZoneOffsetMillis(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;

  const localAsUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );

  return localAsUtc - date.getTime();
}

export function getAppTimeZone(): string {
  return DEFAULT_TIME_ZONE;
}

export function localDateToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
  timeZone: string = DEFAULT_TIME_ZONE,
): Date {
  let utcMillis = Date.UTC(year, month - 1, day, hour, minute, second, ms);

  for (let i = 0; i < 3; i += 1) {
    const offset = getTimeZoneOffsetMillis(new Date(utcMillis), timeZone);
    const nextUtcMillis = Date.UTC(year, month - 1, day, hour, minute, second, ms) - offset;

    if (nextUtcMillis === utcMillis) {
      break;
    }

    utcMillis = nextUtcMillis;
  }

  return new Date(utcMillis);
}

export function resolvePeriodRange(
  period?: 'today' | 'week' | 'month',
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIME_ZONE,
): { from: Date; to: Date } {
  const current = getDateParts(now, timeZone);

  if (period === 'today') {
    return {
      from: localDateToUtc(current.year, current.month, current.day, 0, 0, 0, 0, timeZone),
      to: now,
    };
  }

  if (period === 'week') {
    return {
      from: localDateToUtc(current.year, current.month, current.day - 6, 0, 0, 0, 0, timeZone),
      to: now,
    };
  }

  if (period === 'month') {
    return {
      from: localDateToUtc(current.year, current.month, 1, 0, 0, 0, 0, timeZone),
      to: now,
    };
  }

  return {
    from: new Date(0),
    to: now,
  };
}
