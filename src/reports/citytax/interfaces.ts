export interface BerlinCityTaxRowItemModel {
    channelCode: string,
    cityTaxWithoutVat: number,
    cityTaxWithVat: number,
    netAccommodationRevenue: number
}


export enum CityTax { BERLIN = 'BERLIN', HAMBURG = 'HAMBURG'}