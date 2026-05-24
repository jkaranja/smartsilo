import type { DealershipService } from './service'

type McpResult = { content: Array<{ type: 'text'; text: string }> }

function ok(result: unknown): McpResult {
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
}

export const dealershipHandlers = {
  list_listings: async (
    service: DealershipService,
    input: { status?: string; limit?: number },
  ): Promise<McpResult> => {
    const result = await service.listListings(input.status, input.limit)
    return ok(result)
  },

  get_listing: async (service: DealershipService, input: { id: string }): Promise<McpResult> => {
    const result = await service.getListing(input.id)
    return ok(result)
  },

  create_listing: async (
    service: DealershipService,
    input: { vin: string; make: string; model: string; year: number; mileage?: number; asking_price?: number },
  ): Promise<McpResult> => {
    const result = await service.createListing(
      input.vin,
      input.make,
      input.model,
      input.year,
      input.mileage,
      input.asking_price,
    )
    return ok(result)
  },

  update_listing_status: async (
    service: DealershipService,
    input: { id: string; status: string },
  ): Promise<McpResult> => {
    const result = await service.updateListingStatus(input.id, input.status)
    return ok(result)
  },

  list_deals: async (
    service: DealershipService,
    input: { limit?: number; include_closed?: boolean },
  ): Promise<McpResult> => {
    const result = await service.listDeals(input.limit, input.include_closed)
    return ok(result)
  },

  get_deal: async (service: DealershipService, input: { id: string }): Promise<McpResult> => {
    const result = await service.getDeal(input.id)
    return ok(result)
  },

  create_deal: async (
    service: DealershipService,
    input: { listing_id: string; buyer_name: string; sale_price?: number; financing_type?: string },
  ): Promise<McpResult> => {
    const result = await service.createDeal(
      input.listing_id,
      input.buyer_name,
      input.sale_price,
      input.financing_type,
    )
    return ok(result)
  },

  close_deal: async (service: DealershipService, input: { id: string }): Promise<McpResult> => {
    const result = await service.closeDeal(input.id)
    return ok(result)
  },

  list_trade_ins: async (
    service: DealershipService,
    input: { limit?: number },
  ): Promise<McpResult> => {
    const result = await service.listTradeIns(input.limit)
    return ok(result)
  },

  create_trade_in: async (
    service: DealershipService,
    input: {
      vin: string
      make: string
      model: string
      year: number
      offered_value?: number
      listing_id?: string
    },
  ): Promise<McpResult> => {
    const result = await service.createTradeIn(
      input.vin,
      input.make,
      input.model,
      input.year,
      input.offered_value,
      input.listing_id,
    )
    return ok(result)
  },
}
