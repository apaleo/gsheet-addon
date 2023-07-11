#!/bin/bash
cd $(dirname "${BASH_SOURCE[0]}") || exit 1
cd .. || exit 1

WRD=./src/api/schema

rm -rf "$WRD"
mkdir "$WRD"

yarn openapi-typescript https://api.apaleo.com/swagger/finance-v1/swagger.json --output "$WRD/finance.ts"
yarn openapi-typescript https://api.apaleo.com/swagger/inventory-v1/swagger.json --output "$WRD/inventory.ts"
yarn openapi-typescript https://api.apaleo.com/swagger/booking-v1/swagger.json --output "$WRD/booking.ts"
yarn openapi-typescript https://api.apaleo.com/swagger/reports-v0-nsfw/swagger.json --output "$WRD/reports.ts"
yarn openapi-typescript https://identity.apaleo.com/swagger/identity-v1/swagger.json --output "$WRD/identity.ts"
