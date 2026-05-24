import { withTenant } from '@saas/db'

export class DealershipService {
  constructor(
    private tenantId: string,
    private connectionKey: string,
  ) {}

  async listListings(status?: string, limit = 50) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      let query = (db as any)
        .selectFrom('dealer_vehicle_listings')
        .selectAll()
        .limit(limit)
        .orderBy('created_at', 'desc')

      if (status) {
        query = query.where('status', '=', status)
      }

      return query.execute()
    })
  }

  async getListing(id: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return (db as any)
        .selectFrom('dealer_vehicle_listings')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst() ?? null
    })
  }

  async createListing(
    vin: string,
    make: string,
    model: string,
    year: number,
    mileage?: number,
    askingPrice?: number,
  ) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return (db as any)
        .insertInto('dealer_vehicle_listings')
        .values({
          id: crypto.randomUUID(),
          tenant_id: this.tenantId,
          vin,
          make,
          model,
          year,
          status: 'available',
          ...(mileage !== undefined && { mileage }),
          ...(askingPrice !== undefined && { asking_price: askingPrice }),
        })
        .returningAll()
        .executeTakeFirst()
    })
  }

  async updateListingStatus(id: string, status: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return (db as any)
        .updateTable('dealer_vehicle_listings')
        .set({ status })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst() ?? null
    })
  }

  async listDeals(limit = 50, includeClosed = false) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      let query = (db as any)
        .selectFrom('dealer_sales_deals as d')
        .innerJoin('dealer_vehicle_listings as l', 'l.id', 'd.listing_id')
        .select([
          'd.id',
          'd.tenant_id',
          'd.listing_id',
          'd.buyer_name',
          'd.sale_price',
          'd.financing_type',
          'd.closed_at',
          'd.created_at',
          'l.vin',
          'l.make',
          'l.model',
          'l.year',
        ])
        .limit(limit)
        .orderBy('d.created_at', 'desc')

      if (!includeClosed) {
        query = query.where('d.closed_at', 'is', null)
      }

      return query.execute()
    })
  }

  async getDeal(id: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return (db as any)
        .selectFrom('dealer_sales_deals')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst() ?? null
    })
  }

  async createDeal(
    listingId: string,
    buyerName: string,
    salePrice?: number,
    financingType?: string,
  ) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return (db as any)
        .insertInto('dealer_sales_deals')
        .values({
          id: crypto.randomUUID(),
          tenant_id: this.tenantId,
          listing_id: listingId,
          buyer_name: buyerName,
          ...(salePrice !== undefined && { sale_price: salePrice }),
          ...(financingType !== undefined && { financing_type: financingType }),
        })
        .returningAll()
        .executeTakeFirst()
    })
  }

  async closeDeal(id: string) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return (db as any)
        .updateTable('dealer_sales_deals')
        .set({ closed_at: new Date() })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst() ?? null
    })
  }

  async listTradeIns(limit = 50) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return (db as any)
        .selectFrom('dealer_trade_ins')
        .selectAll()
        .limit(limit)
        .orderBy('created_at', 'desc')
        .execute()
    })
  }

  async createTradeIn(
    vin: string,
    make: string,
    model: string,
    year: number,
    offeredValue?: number,
    listingId?: string,
  ) {
    return withTenant(this.tenantId, this.connectionKey, async (db) => {
      return (db as any)
        .insertInto('dealer_trade_ins')
        .values({
          id: crypto.randomUUID(),
          tenant_id: this.tenantId,
          vin,
          make,
          model,
          year,
          ...(offeredValue !== undefined && { offered_value: offeredValue }),
          ...(listingId !== undefined && { listing_id: listingId }),
        })
        .returningAll()
        .executeTakeFirst()
    })
  }
}
