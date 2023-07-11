import {__} from "lodash";


export function addDays(date: string | Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function startOf(date: Date) {
    return date.toISOString().slice(0, 10) + "T00:00:00Z";
}

export function endOf(date: Date) {
    return date.toISOString().slice(0, 10) + "T23:59:59Z";
}

export function getDates(startDate: string, stopDate: string) {
    const dateArray = [];
    let currentDate = new Date(startDate);
    const endDate = new Date(stopDate);
    while (currentDate <= endDate) {
        dateArray.push(currentDate);
        currentDate = addDays(currentDate, 1);
    }
    return dateArray;
}


export function lodash() {
    // @ts-ignore
    return LodashGS.load() as __;
}