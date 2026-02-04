export class TimeHelper {
  static timeStringToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  static getDiffMinutes(actual: Date, targetTimeStr: string): number {
    const actualMinutes = actual.getHours() * 60 + actual.getMinutes();
    const targetMinutes = this.timeStringToMinutes(targetTimeStr);
    return actualMinutes - targetMinutes;
  }

  /**
   * Tính số phút chồng lấn giữa (A -> B) và (C -> D)
   */
  static calculateOverlapMinutes(
    actualStart: Date,
    actualEnd: Date,
    configStartTimeStr: string,
    configEndTimeStr: string,
  ): number {
    if (!actualStart || !actualEnd || !configStartTimeStr || !configEndTimeStr) return 0;

    // Chuyển config time (string) thành Date cùng ngày với actualStart
    const configStart = new Date(actualStart);
    const [sH, sM] = configStartTimeStr.split(':').map(Number);
    configStart.setHours(sH, sM, 0, 0);

    const configEnd = new Date(actualStart);
    const [eH, eM] = configEndTimeStr.split(':').map(Number);
    configEnd.setHours(eH, eM, 0, 0);

    // Tính điểm bắt đầu muộn nhất và điểm kết thúc sớm nhất
    const overlapStart = actualStart > configStart ? actualStart : configStart;
    const overlapEnd = actualEnd < configEnd ? actualEnd : configEnd;

    const diffMs = overlapEnd.getTime() - overlapStart.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    return diffMins > 0 ? diffMins : 0;
  }
}