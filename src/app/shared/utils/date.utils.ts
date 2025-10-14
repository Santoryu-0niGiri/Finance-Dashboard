export class DateUtils {
  static isoFromDateLocal(date: Date): string {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${y}-${this.pad(m)}-${this.pad(d)}`;
  }

  static isoToDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(s => parseInt(s, 10));
    return new Date(y, m - 1, d);
  }

  static pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }

  static getWeekKeyLocal(date: Date): string {
    const tmp = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
    const week1 = new Date(tmp.getFullYear(), 0, 4);
    const weekNo = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${tmp.getFullYear()}-W${this.pad(weekNo)}`;
  }
}